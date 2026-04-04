import { io } from 'socket.io-client';
import { store } from '../app/store';
import { addMessage } from '../features/comms/commsSlice';
import { setNearbyNodes } from '../features/radar/radarSlice';
import { triggerSosVibration } from '../utils/vibrate';

// State to hold our peer-to-peer connections
let socket = null;
const peers = {}; // Stores RTCPeerConnection objects mapped by socket IDs
const dataChannels = {}; // Stores RTCDataChannel objects mapped by socket IDs

// We use Google's public STUN server just to help phones find their IP addresses
const rtcConfig = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

// 1. HANDLE INCOMING MESH DATA
const handleIncomingMeshPacket = (rawJsonString) => {
  try {
    const packet = JSON.parse(rawJsonString);
    console.log("📥 Incoming Mesh Packet:", packet);

    switch (packet.type) {
      case 'GENERAL': {
        store.dispatch(addMessage({ ...packet.payload, type: packet.type, status: 'Delivered' }));
        break;
      }

      case 'SOS': {
        store.dispatch(addMessage({ ...packet.payload, type: packet.type, status: 'Delivered' }));
        
        // Add or Update Radar
        if (packet.payload.location) {
           const currentNodes = store.getState().radar.nearbyNodes;
           
           // Check if this person is already on the radar by matching their name
           const existingIndex = currentNodes.findIndex(n => n.name.replace(' (SOS)', '') === packet.payload.senderName);

           if (existingIndex >= 0) {
             // UPDATE existing dot to RED SOS
             let updatedNodes = [...currentNodes];
             updatedNodes[existingIndex] = {
               ...updatedNodes[existingIndex],
               name: `${packet.payload.senderName} (SOS)`,
               type: 'EmergencyNode',
               lat: packet.payload.location.lat,
               lng: packet.payload.location.lng,
             };
             store.dispatch(setNearbyNodes(updatedNodes));
           } else {
             // CREATE new SOS dot
             store.dispatch(setNearbyNodes([
               ...currentNodes, 
               {
                 id: packet.payload.senderId,
                 name: `${packet.payload.senderName} (SOS)`,
                 role: 'Injured',
                 lat: packet.payload.location.lat,
                 lng: packet.payload.location.lng,
                 type: 'EmergencyNode'
               }
             ]));
           }
        }

        // Vibrate if Doctor or Firefighter
        const myRole = store.getState().auth.role;
        if (myRole === 'Doctor' || myRole === 'Firefighter') {
           triggerSosVibration();
        }
        break;
      }

      case 'NODE_DISCOVERY': {
        const currentNodes = store.getState().radar.nearbyNodes;
        const myName = store.getState().auth.displayName;

        if (packet.payload.name === myName) break;

        // Matching users by their NAME, not their socket ID (which can change)
        const cleanPayloadName = packet.payload.name.replace(' (SOS)', '');
        const existingNodeIndex = currentNodes.findIndex(n => 
          n.name.replace(' (SOS)', '') === cleanPayloadName
        );
        
        let updatedNodes = [...currentNodes];
        
        if (existingNodeIndex >= 0) {
          // 3. Update their location, but DO NOT erase their SOS status if they are injured!
          const isCurrentlySOS = updatedNodes[existingNodeIndex].type === 'EmergencyNode';
          
          updatedNodes[existingNodeIndex] = {
            ...packet.payload,
            // Keep the SOS label and red color if they are currently in an emergency
            name: isCurrentlySOS ? `${cleanPayloadName} (SOS)` : cleanPayloadName,
            type: isCurrentlySOS ? 'EmergencyNode' : 'TacticalNode',
            role: isCurrentlySOS ? 'Injured' : packet.payload.role
          };
        } else {
          // 4. If they are totally new, add them to the map
          updatedNodes.push(packet.payload);
        }
        
        store.dispatch(setNearbyNodes(updatedNodes));
        break;
      }
    }
  } catch (error) {
    console.error("Failed to parse mesh packet:", error);
  }
};

//2. INITIALIZE THE NETWORK
export const initMeshNetwork = (signalingServerUrl, userProfile) => {
  if (socket) return; // Prevent double connections

  console.log("🔌 Connecting to Signaling Server...");
  socket = io(signalingServerUrl);

  socket.on('connect', () => {
    console.log("✅ Connected to Matchmaker with ID:", socket.id);
    socket.emit('join-network', userProfile);
  });

  // When a new phone joins, we initiate the handshake!
  socket.on('user-connected', async (newUserId) => {
    console.log("📱 New device found. Initiating handshake with:", newUserId);
    const peerConnection = createPeerConnection(newUserId);
    
    // Create the P2P Data Channel for text/images
    const dataChannel = peerConnection.createDataChannel('mesh-chat');
    setupDataChannel(dataChannel, newUserId);

    // Create the WebRTC Offer
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', { target: newUserId, caller: socket.id, sdp: offer });
  });

  // When we receive an offer from another phone
  socket.on('offer', async ({ caller, sdp }) => {
    console.log("🤝 Received offer from:", caller);
    const peerConnection = createPeerConnection(caller);
    await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
    
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', { target: caller, caller: socket.id, sdp: answer });
  });

  // When our offer is answered
  socket.on('answer', async ({ caller, sdp }) => {
    const peerConnection = peers[caller];
    if (peerConnection) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
    }
  });

  // ICE Candidates (Network routing info)
  socket.on('ice-candidate', async ({ sender, candidate }) => {
    const peerConnection = peers[sender];
    if (peerConnection && candidate) {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  });
};

// 3.HELPER: CREATE PEER CONNECTION
const createPeerConnection = (peerId) => {
  const peerConnection = new RTCPeerConnection(rtcConfig);
  peers[peerId] = peerConnection;

  // Send network routing info to the other phone
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('ice-candidate', { target: peerId, sender: socket.id, candidate: event.candidate });
    }
  };

  // If THEY created the data channel, receive it here
  peerConnection.ondatachannel = (event) => {
    setupDataChannel(event.channel, peerId);
  };

  return peerConnection;
};

//4. HELPER: SETUP DATA CHANNEL
const setupDataChannel = (channel, peerId) => {
  dataChannels[peerId] = channel;
  
  channel.onopen = () => console.log(`🟢 P2P Channel OPEN with ${peerId}!`);
  channel.onclose = () => {
    console.log(`🔴 P2P Channel CLOSED with ${peerId}`);
    delete dataChannels[peerId];
    delete peers[peerId];
  };
  
  // Send incoming data to our Redux handler
  channel.onmessage = (event) => handleIncomingMeshPacket(event.data);
};

//BROADCAST FUNCTION
// Call this from the UI to send a message to all connected phones
export const broadcastToMesh = (packetObject) => {
  const jsonString = JSON.stringify(packetObject);
  let sentCount = 0;

  Object.values(dataChannels).forEach(channel => {
    if (channel.readyState === 'open') {
      channel.send(jsonString);
      sentCount++;
    }
  });

  console.log(`📡 Broadcasted to ${sentCount} peers.`);
  return sentCount > 0; // Returns true if it actually reached someone
};

// 6. THE RADAR HEARTBEAT
export const startMeshHeartbeat = () => {
  setInterval(() => {
    // Get my current location and role from Redux
    const state = store.getState();
    const myLocation = state.radar.myLocation;
    const myRole = state.auth.role;
    const myName = state.auth.displayName;

    if (myLocation) {
      broadcastToMesh({
        type: 'NODE_DISCOVERY',
        payload: {
          id: socket.id, // Using socket ID as a unique identifier
          name: myName || 'Unknown Node',
          role: myRole,
          lat: myLocation.lat,
          lng: myLocation.lng,
          type: 'TacticalNode'
        }
      });
    }
  }, 5000); // Pings every 5 seconds
};