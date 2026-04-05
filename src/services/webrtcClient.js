import { io } from 'socket.io-client';
import { store } from '../app/store';
import { addMessage } from '../features/comms/commsSlice';
import { setNearbyNodes } from '../features/radar/radarSlice';
import { triggerSosVibration } from '../utils/vibrate';
import { calculateDistance } from '../utils/haversine'; 

let socket = null;
const peers = {}; 
const dataChannels = {}; 

// 🛑 THE GHOST KILLER VARIABLE
let heartbeatInterval = null;

// --- LOCAL MEMORY BANK TO PREVENT NETWORK CRASHES ---
const seenPackets = new Set();

const rtcConfig = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

const MAX_RADIO_RANGE = 700; 

export const handleIncomingMeshPacket = (rawJsonString) => {
  try {
    const envelope = JSON.parse(rawJsonString);
    if (!envelope.immediateSenderLocation) return; 

    // 👇 We unpack the immediateSenderName to see who physically handed us the packet
    const { immediateSenderLocation, immediateSenderName, data: packet } = envelope;

    const currentStore = store.getState();
    const myLocation = currentStore.radar.myLocation;
    const myName = currentStore.auth.displayName;

    // 🛑 1. THE RADIO RANGE GATEKEEPER
    if (myLocation && immediateSenderLocation) {
       const dist = calculateDistance(myLocation.lat, myLocation.lng, immediateSenderLocation.lat, immediateSenderLocation.lng);
       if (dist > MAX_RADIO_RANGE) return; // Silently drop out-of-range signals
    }

    // 🛡️ 2. INFINITE ECHO SHIELD
    const uniquePacketId = packet.payload.packetId || packet.payload.id;
    if (uniquePacketId) {
        if (seenPackets.has(uniquePacketId)) return;
        seenPackets.add(uniquePacketId);
    }

    // 🕵️‍♂️ 3. CHECK IF THIS IS A HOPPED PACKET!
    // If the node who handed this to me is not the original author, it was routed!
    const isHopped = packet.payload.originalSender !== immediateSenderName;

    // 4. PROCESS THE DATA
    switch (packet.type) {
      case 'GENERAL':
      case 'SOS': {
        // Dispatch the message with the Routing Data attached for the UI
        store.dispatch(addMessage({ 
            ...packet.payload, 
            type: packet.type, 
            status: 'Delivered',
            isHopped: isHopped,
            viaNode: isHopped ? immediateSenderName : null
        }));

        if (packet.type === 'SOS') {
          if (packet.payload.location) {
             const currentNodes = currentStore.radar.nearbyNodes || [];
             const existingIndex = currentNodes.findIndex(n => n.name.replace(' (SOS)', '') === packet.payload.senderName);

             if (existingIndex >= 0) {
               let updatedNodes = [...currentNodes];
               updatedNodes[existingIndex] = {
                 ...updatedNodes[existingIndex],
                 name: `${packet.payload.senderName} (SOS)`,
                 type: 'EmergencyNode',
                 lat: packet.payload.location.lat,
                 lng: packet.payload.location.lng,
                 lastPing: Date.now(),
                 isHopped: isHopped,
                 viaNode: isHopped ? immediateSenderName : null
               };
               store.dispatch(setNearbyNodes(updatedNodes));
             } else {
               store.dispatch(setNearbyNodes([
                 ...currentNodes, 
                 {
                   id: packet.payload.senderId,
                   name: `${packet.payload.senderName} (SOS)`,
                   role: 'Injured',
                   lat: packet.payload.location.lat,
                   lng: packet.payload.location.lng,
                   type: 'EmergencyNode',
                   lastPing: Date.now(),
                   isHopped: isHopped,
                   viaNode: isHopped ? immediateSenderName : null
                 }
               ]));
             }
          }

          const myRole = currentStore.auth.role;
          if (myRole === 'Doctor' || myRole === 'Firefighter') {
             triggerSosVibration();
          }
        }

        // TEXT MULTI-HOP
        if (packet.payload.ttl > 1 && packet.payload.originalSender !== myName) {
          const hoppedPacket = {
            ...packet,
            payload: { ...packet.payload, ttl: packet.payload.ttl - 1, status: 'Hopping' }
          };
          console.log(`🦘 CHAT HOP ACTIVATED! Proxying message from ${packet.payload.originalSender}.`);
          setTimeout(() => broadcastToMesh(hoppedPacket), 200);
        }
        break;
      }

      case 'NODE_DISCOVERY': {
        const currentNodes = currentStore.radar.nearbyNodes || [];

        if (packet.payload.name === myName) break;

        const cleanPayloadName = packet.payload.name.replace(' (SOS)', '');
        const existingNodeIndex = currentNodes.findIndex(n => n.name.replace(' (SOS)', '') === cleanPayloadName);
        
        let updatedNodes = [...currentNodes];
        
        if (existingNodeIndex >= 0) {
          const isCurrentlySOS = updatedNodes[existingNodeIndex].type === 'EmergencyNode';
          updatedNodes[existingNodeIndex] = {
            ...packet.payload,
            name: isCurrentlySOS ? `${cleanPayloadName} (SOS)` : cleanPayloadName,
            type: isCurrentlySOS ? 'EmergencyNode' : 'TacticalNode',
            role: isCurrentlySOS ? 'Injured' : packet.payload.role,
            lastPing: Date.now(),
            isHopped: isHopped,
            viaNode: isHopped ? immediateSenderName : null
          };
        } else {
          updatedNodes.push({ 
            ...packet.payload, 
            lastPing: Date.now(),
            isHopped: isHopped,
            viaNode: isHopped ? immediateSenderName : null 
          });
        }
        
        store.dispatch(setNearbyNodes(updatedNodes));

        // --- RADAR MULTI-HOP! ---
        if (packet.payload.ttl > 1 && packet.payload.originalSender !== myName) {
            const hoppedPacket = {
              ...packet,
              payload: { ...packet.payload, ttl: packet.payload.ttl - 1 }
            };
            setTimeout(() => broadcastToMesh(hoppedPacket), 200);
        }
        break;
      }
    }
  } catch (error) {
    console.error("Failed to parse mesh packet:", error);
  }
};

export const initMeshNetwork = (signalingServerUrl, userProfile) => {
  if (socket) return; 
  console.log("🔌 Connecting to Signaling Server...");
  socket = io(signalingServerUrl);

  socket.on('connect', () => {
    socket.emit('join-network', userProfile);
  });

  socket.on('user-connected', async (newUserId) => {
    const peerConnection = createPeerConnection(newUserId);
    const dataChannel = peerConnection.createDataChannel('mesh-chat');
    setupDataChannel(dataChannel, newUserId);
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', { target: newUserId, caller: socket.id, sdp: offer });
  });

  socket.on('offer', async ({ caller, sdp }) => {
    const peerConnection = createPeerConnection(caller);
    await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', { target: caller, caller: socket.id, sdp: answer });
  });

  socket.on('answer', async ({ caller, sdp }) => {
    const peerConnection = peers[caller];
    if (peerConnection) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
    }
  });

  socket.on('ice-candidate', async ({ sender, candidate }) => {
    const peerConnection = peers[sender];
    if (peerConnection && candidate) {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  });
};

const createPeerConnection = (peerId) => {
  const peerConnection = new RTCPeerConnection(rtcConfig);
  peers[peerId] = peerConnection;
  peerConnection.oniceconnectionstatechange = () => {
    console.log(`🧊 ICE State with ${peerId}:`, peerConnection.iceConnectionState);
  };
  peerConnection.onsignalingstatechange = () => {
    console.log(`🚦 Signaling State with ${peerId}:`, peerConnection.signalingState);
  };
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('ice-candidate', { target: peerId, sender: socket.id, candidate: event.candidate });
    }
  };
  peerConnection.ondatachannel = (event) => setupDataChannel(event.channel, peerId);
  return peerConnection;
};

const setupDataChannel = (channel, peerId) => {
  dataChannels[peerId] = channel;
  channel.onopen = () => console.log(`🟢 P2P Channel OPEN with ${peerId}!`);
  channel.onclose = () => {
    delete dataChannels[peerId];
    delete peers[peerId];
  };
  channel.onmessage = (event) => handleIncomingMeshPacket(event.data);
};

export const broadcastToMesh = (packetObject) => {
  const state = store.getState();
  const myLocation = state.radar.myLocation;
  // Grab my own name to stamp on the envelope
  const myName = state.auth.displayName; 

  // 🛑 THE SELF-ECHO SHIELD 🛑
  const uniqueId = packetObject.payload?.packetId || packetObject.payload?.id;
  if (uniqueId) {
    seenPackets.add(uniqueId);
  }

  const envelope = {
    immediateSenderLocation: myLocation,
    immediateSenderName: myName, // Stamping who routed it
    data: packetObject
  };

  const jsonString = JSON.stringify(envelope);
  let sentCount = 0;

  Object.values(dataChannels).forEach(channel => {
    if (channel.readyState === 'open') {
      channel.send(jsonString);
      sentCount++;
    }
  });
  return sentCount > 0; 
};

export const startMeshHeartbeat = () => {
  // 🛑 THE GHOST KILLER: Destroy any old background loops before starting a new one!
  if (heartbeatInterval) clearInterval(heartbeatInterval);

  heartbeatInterval = setInterval(() => {
    const state = store.getState();
    const myLocation = state.radar.myLocation;
    const myRole = state.auth.role;
    const myName = state.auth.displayName;

    // --- FAST SWEEPER ACTIVATED ---
    const currentNodes = state.radar.nearbyNodes || [];
    if (currentNodes.length > 0) {
        const now = Date.now();
        // SWEEPER REDUCED TO 15 SECONDS FOR FAST UI UPDATES
        const aliveNodes = currentNodes.filter(n => n.lastPing && (now - n.lastPing < 15000));
        
        if (aliveNodes.length !== currentNodes.length) {
            store.dispatch(setNearbyNodes(aliveNodes));
            console.log("🧹 Swept away disconnected nodes.");
        }
    }

    if (myLocation) {
      broadcastToMesh({
        type: 'NODE_DISCOVERY',
        payload: {
          packetId: `hb_${myName}_${Date.now()}`,
          id: socket.id, 
          name: myName || 'Unknown Node',
          role: myRole,
          lat: myLocation.lat,
          lng: myLocation.lng,
          type: 'TacticalNode',
          ttl: 2, 
          originalSender: myName
        }
      });
    }
  }, 5000); 
};