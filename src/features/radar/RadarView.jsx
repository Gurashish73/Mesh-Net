import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { calculateDistance, calculateBearing } from '../../utils/haversine';
import { toggleMapView } from './radarSlice'; 
import OfflineMap from './OfflineMap';

// Tactical scaling: 100 meters per concentric ring, with an absolute outer limit
const RING_INTERVAL = 100;
const RADAR_MAX_RANGE = 500; 

export default function RadarView() {
  const dispatch = useDispatch();
  const { myLocation, nearbyNodes, showMap } = useSelector((state) => state.radar);
  const currentUser = useSelector((state) => state.auth.displayName); 
  const [isScanning, setIsScanning] = useState(false);

  // 1. THE VISUAL SCANNER
  const handleScanNetwork = () => {
    if (!myLocation) return;
    setIsScanning(true);

    setTimeout(() => {
      setIsScanning(false);
    }, 3000); 
  };

  // 2. CALCULATE POSITIONS FOR TACTICAL BLIPS
  const blips = nearbyNodes
    // STRICT FILTER: Never show yourself on your own radar!
    .filter(node => node.name !== currentUser && node.name !== `${currentUser} (SOS)`)
    .map(node => {
      if (!myLocation) return null;
      
      const distance = calculateDistance(myLocation.lat, myLocation.lng, node.lat, node.lng);
      const bearing = calculateBearing(myLocation.lat, myLocation.lng, node.lat, node.lng);
      
      // Map Bearing & Distance to CSS X/Y percentages (0% to 100%)
      const angleRad = (bearing - 90) * (Math.PI / 180);
      const distancePct = Math.min(distance / RADAR_MAX_RANGE, 1); // Cap at edge
      
      // Convert angle/distance to X/Y relative to center (50%, 50%)
      const xPct = 50 + (Math.cos(angleRad) * distancePct * 50);
      const yPct = 50 + (Math.sin(angleRad) * distancePct * 50);

      return { ...node, distance, bearing, xPct, yPct };
    }).filter(Boolean);

  const sortedBlips = [...blips].sort((a, b) => a.distance - b.distance);

  return (
    <div className="flex flex-col h-full w-full px-4 relative">
      <h1 className="text-center text-sm font-bold tracking-widest mt-6 mb-4 text-gray-200">
        {showMap ? 'MAP VIEW' : 'MESH NETWORK RADAR'}
      </h1>

      {!myLocation ? (
        <div className="flex flex-col items-center justify-center mt-20 text-emerald-500 animate-pulse">
           <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
           <p>Initializing GPS Lock...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center flex-1">
          
          {/* --- THE TACTICAL RADAR UI --- */}
          {!showMap ? (
            <div className="relative w-64 h-64 mt-4 border border-emerald-900 rounded-full flex items-center justify-center bg-black shadow-[0_0_30px_rgba(16,185,129,0.05)] shrink-0 overflow-hidden">
              
              {/* Distance Rings */}
              {[100, 200, 300, 400, 500].map(dist => (
                <div 
                  key={dist}
                  className="absolute border border-emerald-900/40 rounded-full"
                  style={{ width: `${(dist / RADAR_MAX_RANGE) * 100}%`, height: `${(dist / RADAR_MAX_RANGE) * 100}%` }}
                >
                   <span className="absolute top-1/2 left-1 text-[8px] text-emerald-800 -translate-y-1/2">{dist}m</span>
                </div>
              ))}
              
              {/* Minimalist Crosshairs */}
              <div className="absolute w-full h-px bg-emerald-900/30"></div>
              <div className="absolute h-full w-px bg-emerald-900/30"></div>
              <div className="absolute top-2 text-[10px] text-emerald-700 font-bold">N</div>

              {/* Center Dot (Compass Star) */}
              <div className="absolute w-5 h-5 z-10 text-white drop-shadow-[0_0_8px_rgba(255,255,255,1)]">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L14.5 9.5H22L16 14.5L18.5 22L12 17L5.5 22L8 14.5L2 9.5H9.5L12 2Z"/>
                </svg>
              </div>
              
              {/* TACTICAL NODE ICONS (The Blips) */}
              {blips.map(blip => (
                 <div 
                   key={blip.id}
                   className="absolute text-[9px] font-bold transition-all duration-300"
                   style={{ left: `${blip.xPct}%`, top: `${blip.yPct}%`, transform: 'translate(-50%, -50%)' }}
                 >
                    <div className={`w-3.5 h-3.5 border-t-2 border-l-2 rounded-tl-sm -rotate-45 relative ${blip.type === 'EmergencyNode' ? 'border-red-500 shadow-[0_0_8px_rgba(239,68,68,1)]' : 'border-emerald-400'}`}>
                       <div className={`absolute top-0 right-0 h-1.5 w-1.5 border-r border-b ${blip.type === 'EmergencyNode' ? 'border-red-600' : 'border-emerald-500'}`}></div>
                    </div>
                    
                    <span className={`absolute top-2.5 left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap ${blip.type === 'EmergencyNode' ? 'text-red-300' : 'text-emerald-100'}`}>
                        {blip.name}
                    </span>
                 </div>
              ))}
              
              {/* Sweeping Scanner line */}
              <div className="absolute w-full h-full rounded-full border-r-2 border-emerald-500/20 animate-[spin_4s_linear_infinite] opacity-30">
                <div className="w-1/2 h-full bg-linear-to-r from-transparent to-emerald-500/10 rounded-r-full"></div>
              </div>
            </div>
          ) : (
            /* --- STATIC MAP FALLBACK --- */
             <div className="relative w-full h-64 mt-4 shrink-0">
               <OfflineMap />
            </div>
          )}

          {/* --- PEER LIST BELOW RADAR --- */}
          <div className="w-full mt-6 flex-1 overflow-y-auto space-y-2 pb-4">
            {sortedBlips.length === 0 ? (
               <button 
                 onClick={handleScanNetwork}
                 disabled={isScanning}
                 className="w-full py-6 border border-emerald-900/50 text-emerald-600/70 rounded-xl hover:border-emerald-700/50 flex flex-col items-center justify-center group"
               >
                 {isScanning ? (
                    <div className="flex gap-2 items-center text-emerald-500 animate-pulse">
                      <div className="w-2.5 h-2.5 border-t-2 border-l-2 border-current -rotate-45 rounded-tl-sm shrink-0"></div>
                      <span>PINGING MESH NODES...</span>
                    </div>
                 ) : (
                   <span className="text-sm font-bold tracking-wider group-hover:text-emerald-500">TAP TO SCAN NETWORK</span>
                 )}
               </button>
            ) : (
               <>
                 <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-1 mb-2">Connected Devices ({sortedBlips.length})</div>
                 {sortedBlips.map(blip => (
                    <div key={blip.id} className="bg-black border border-emerald-950/70 p-3 rounded-lg flex justify-between items-center transition-colors hover:border-emerald-700/50">
                       <div className="flex gap-3 items-center">
                          <div className={`w-3 h-3 border-t-2 border-l-2 -rotate-45 rounded-tl-sm ${blip.type === 'EmergencyNode' ? 'border-red-500' : 'border-emerald-400'}`}></div>
                          <div>
                             <div className={`font-bold text-sm tracking-tight ${blip.type === 'EmergencyNode' ? 'text-red-300' : 'text-gray-200'}`}>{blip.name}</div>
                             <div className={`text-[10px] uppercase font-bold tracking-wider ${blip.type === 'EmergencyNode' ? 'text-red-600' : 'text-emerald-600/70'}`}>{blip.role}</div>
                          </div>
                       </div>
                       <div className="text-right">
                          <div className="font-mono text-xl font-black text-emerald-400 leading-none">{blip.distance}m</div>
                          <div className="text-[10px] text-gray-500 leading-none">{Math.round(blip.bearing)}°</div>
                       </div>
                    </div>
                 ))}
               </>
            )}
          </div>

        </div>
      )}

      {/* --- TOGGLE MAP BUTTON --- */}
      <div className="w-full pb-4 pt-2 shrink-0">
        <button 
          onClick={() => dispatch(toggleMapView())}
          className="w-full py-3 border border-emerald-500/50 text-emerald-400 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-500/10 transition-colors"
        >
          {showMap ? 'VIEW RADAR' : 'VIEW VENUE MAP'}
        </button>
      </div>
    </div>
  );
}