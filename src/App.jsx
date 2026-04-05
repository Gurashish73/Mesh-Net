import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import AppShell from './shared/AppShell';
import RoleSelector from './features/auth/RoleSelector';
// IMPORTANT: Adjust this path if your radarSlice is located elsewhere!
import { setMyLocation } from './features/radar/radarSlice'; 

// --- THE GLOBAL DEV TOOLS COMPONENT ---
function GlobalDevTools() {
  const dispatch = useDispatch();
  const myLocation = useSelector((state) => state.radar.myLocation);

  const handleNudgeLocation = (latOffset, lngOffset) => {
    if (!myLocation) {
      alert("Waiting for initial GPS lock...");
      return;
    }
    const newLat = myLocation.lat + latOffset;
    const newLng = myLocation.lng + lngOffset;
    
    // Updates Redux, instantly syncing CommsBoard and Radar maps!
    dispatch(setMyLocation({ lat: newLat, lng: newLng }));
    console.log(`📍 Mock GPS Moved to: ${newLat}, ${newLng}`);
  };

  return (
    // CHANGED: 'absolute' and '-left-[270px]' tethers this directly to the phone wrapper!
    <div className="absolute top-1/2 -translate-y-1/2 -left-67.5 w-60 bg-gray-900 border-2 border-emerald-500 rounded-xl p-4 shadow-2xl z-999 hidden lg:block">
      <h3 className="text-emerald-400 text-sm font-bold mb-2 text-center">MULTI-HOP TEST</h3>
      <p className="text-xs text-gray-400 mb-4 leading-tight text-center">Simulate device distance</p>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => handleNudgeLocation(0, -0.005)} className="bg-gray-800 text-white text-sm font-semibold py-2 rounded hover:bg-emerald-600 transition-colors">← 500m</button>
        <button onClick={() => handleNudgeLocation(0, 0.005)} className="bg-gray-800 text-white text-sm font-semibold py-2 rounded hover:bg-emerald-600 transition-colors">500m →</button>
        <button onClick={() => handleNudgeLocation(0.005, 0)} className="bg-gray-800 text-white text-sm font-semibold py-2 rounded hover:bg-emerald-600 transition-colors col-span-2">↑ 500m North</button>
      </div>
    </div>
  );
}

// --- YOUR MAIN APP COMPONENT ---
function App() {
  const currentRole = useSelector((state) => state.auth.role);

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-950 font-sans sm:p-4">
      
      {/* NEW WRAPPER: This hugs the phone tightly, allowing the tools to tether to it without getting clipped */}
      <div className="relative flex items-center justify-center">

        {/* 1. RENDER THE TOOLS HERE */}
        {currentRole && <GlobalDevTools />}

        {/* 2. YOUR EXACT PHONE CONTAINER */}
        <div className="w-full h-dvh sm:h-[85vh] sm:max-h-212.5 sm:aspect-9/19.5 sm:w-auto sm:rounded-[3rem] bg-[#0A110D] text-white flex flex-col relative overflow-hidden sm:border-8 sm:border-gray-800 shadow-2xl">
          
          {/* The Gatekeeper Logic */}
          {!currentRole ? (
            <RoleSelector />
          ) : (
            <AppShell />
          )}

        </div>

      </div>

    </div>
  );
}

export default App;