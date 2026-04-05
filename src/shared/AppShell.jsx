import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import CommsBoard from '../features/comms/CommsBoard';
import WikiSearch from '../features/wiki/WikiSearch';
import RadarView from '../features/radar/RadarView';
import { addMessage } from '../features/comms/commsSlice';
import { setMyLocation } from '../features/radar/radarSlice';
import { broadcastToMesh } from '../services/webrtcClient';
import { triggerSosVibration } from '../utils/vibrate';
// 👇 NEW: We need the math formula to check the distance between our peers!
import { calculateDistance } from '../utils/haversine'; 

export default function AppShell() {
  const [activeTab, setActiveTab] = useState('comms');
  
  const dispatch = useDispatch();
  const role = useSelector((state) => state.auth.role);
  const currentUser = useSelector((state) => state.auth.displayName);
  const myLocation = useSelector((state) => state.radar.myLocation);
  
  const nearbyNodes = useSelector((state) => state.radar.nearbyNodes);
  
  // 🧠 SMART COUNTER: Only grab nodes that are DIRECT physical connections
  const directNodes = nearbyNodes ? nearbyNodes.filter(node => !node.isHopped) : [];
  const activeNodeCount = directNodes.length;

  // 🕵️‍♂️ THE TRUE BRIDGE DETECTOR
  // We are ONLY a router if we have 2+ direct friends AND those friends 
  // are more than 700m away from EACH OTHER!
  let isActivelyRouting = false;
  if (directNodes.length >= 2) {
      for (let i = 0; i < directNodes.length; i++) {
          for (let j = i + 1; j < directNodes.length; j++) {
              const dist = calculateDistance(
                  directNodes[i].lat, directNodes[i].lng,
                  directNodes[j].lat, directNodes[j].lng
              );
              // If Peer A and Peer B are out of range of each other, WE are the bridge!
              if (dist > 700) { 
                  isActivelyRouting = true;
                  break;
              }
          }
      }
  }

  // --- FIXED: GLOBAL BACKGROUND GPS TRACKER ---
  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        dispatch(setMyLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }));
      },
      (error) => console.warn("GPS Error:", error.message),
      { enableHighAccuracy: true }
    );
  }, [dispatch]);

  // 👇 THE MISSING MULTI-HOP ENGINES INTEGRATED HERE 👇
  const handleGlobalSOS = () => {
    triggerSosVibration();

    const emergencyMessage = {
      id: `sos_${currentUser}_${Date.now()}`,
      packetId: `sos_${currentUser}_${Date.now()}`, // Added redundancy for the Echo Shield
      senderId: currentUser,
      senderName: currentUser,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: "🚨 EMERGENCY: I need immediate assistance at my location!",
      location: myLocation || { lat: 28.6139, lng: 77.2090 },
      // MULTI-HOP ENGINES
      ttl: 3, 
      originalSender: currentUser
    };

    dispatch(addMessage({ ...emergencyMessage, type: 'SOS', status: 'Sent' }));

    broadcastToMesh({
      type: 'SOS',
      payload: emergencyMessage
    });
    
    alert("SOS Signal Broadcasted to Mesh Network!"); 
  };

  return (
    <div className="flex flex-col h-full w-full relative">
      
      {/* --- TOP HUD --- */}
      <header className="flex justify-between items-center p-4 bg-linear-to-b from-gray-900 to-transparent z-10">
        <div className="font-bold text-lg tracking-widest text-gray-200">
          MESH<span className="text-emerald-500">NET</span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* 👇 THE NEW "CENTRAL ROUTER" BADGE 👇 */}
          {/* Now it ONLY lights up if we are actually bridging a gap! */}
          {isActivelyRouting && (
            <div className="flex items-center gap-1 bg-orange-900/30 px-2 py-1 rounded border border-orange-500/50 shadow-[0_0_10px_rgba(249,115,22,0.3)]">
              <svg className="w-3 h-3 text-orange-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
              <span className="text-[9px] font-black text-orange-400 tracking-wider">ROUTER ACTIVE</span>
            </div>
          )}

          {/* The Standard Node Counter */}
          <div className="flex items-center gap-1.5 bg-black/50 px-3 py-1 rounded-full border border-emerald-900/50">
            <div className={`w-2 h-2 rounded-full ${activeNodeCount > 0 ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-gray-600'}`}></div>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${activeNodeCount > 0 ? 'text-emerald-400' : 'text-gray-500'}`}>
              {activeNodeCount} {activeNodeCount === 1 ? 'NODE' : 'NODES'}
            </span>
          </div>
        </div>
        
        <div className="bg-gray-800 border border-gray-700 px-3 py-1 rounded text-xs font-bold text-gray-300 uppercase">
          {role}
        </div>
      </header>

      {/* --- DYNAMIC MAIN CONTENT AREA --- */}
      <main className="flex-1 overflow-hidden relative pb-20">
        {activeTab === 'comms' && <CommsBoard />}
        {activeTab === 'radar' && (
           <div className="flex flex-col h-full items-center justify-center text-gray-500">
              <RadarView />
           </div>
        )}
        {activeTab === 'wiki' && <WikiSearch />}
      </main>

      {/* --- FLOATING SOS BUTTON --- */}
      <div className="absolute bottom-20 left-0 right-0 flex justify-center z-50 pointer-events-none">
        <button onClick={handleGlobalSOS} className="pointer-events-auto w-16 h-16 bg-red-600 hover:bg-red-500 text-white rounded-full font-black text-lg shadow-[0_0_20px_rgba(220,38,38,0.4)] border-4 border-red-900 flex items-center justify-center transition-transform active:scale-90">
          SOS
        </button>
      </div>

      {/* --- BOTTOM NAVIGATION BAR --- */}
      <nav className="absolute bottom-0 w-full h-20 bg-linear-to-t from-[#050806] to-[#0A110D] border-t border-emerald-900/30 flex justify-around items-center px-2 pb-safe z-40">
        <button onClick={() => setActiveTab('comms')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'comms' ? 'text-emerald-400' : 'text-gray-500'}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
          <span className="text-[10px] font-semibold">Comms</span>
        </button>
        <button onClick={() => setActiveTab('radar')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'radar' ? 'text-emerald-400' : 'text-gray-500'}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <span className="text-[10px] font-semibold">Radar</span>
        </button>
        <button onClick={() => setActiveTab('wiki')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'wiki' ? 'text-emerald-400' : 'text-gray-500'}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          <span className="text-[10px] font-semibold">Wiki</span>
        </button>
      </nav>

    </div>
  );
}