import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { setRole, loginUser } from './authSlice';
import { initMeshNetwork, startMeshHeartbeat } from '../../services/webrtcClient';

export default function RoleSelector() {
  const dispatch = useDispatch();
  const [selected, setSelected] = useState(null);
  
  const roles = [
    { id: 'Citizen', icon: '👤', desc: 'Standard network access' },
    { id: 'Doctor', icon: '⚕️', desc: 'Receives medical SOS alerts' },
    { id: 'Firefighter', icon: '🚒', desc: 'Receives fire & hazard alerts' },
  ];

  const handleJoin = () => {
    if (!selected) return;
    
    // 1. Generate a random 4-digit ID
    const randomId = Math.floor(1000 + Math.random() * 9000);
    
    // 2. Pass that unique name into Redux 
    dispatch(loginUser({ 
      uid: `user_${Date.now()}`, 
      displayName: `Node-${randomId}` 
    }));
    
    dispatch(setRole(selected));
    
    // START THE MESH NETWORK! 
    // This automatically grabs whatever IP or localhost you are currently using!
    const serverUrl = `https://ten-hounds-allow.loca.l`;
    initMeshNetwork(serverUrl, { role: selected });
    
    // START THE RADAR PING!
    setTimeout(() => {
      startMeshHeartbeat();
    }, 2000); 
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <h1 className="text-3xl font-bold text-white mb-2 tracking-wider">
        MESH<span className="text-emerald-500">NET</span>
      </h1>
      <p className="text-gray-400 text-sm mb-8">
        Identify yourself to configure emergency routing.
      </p>

      <div className="w-full space-y-4 mb-8">
        {roles.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelected(r.id)}
            className={`w-full flex items-center p-4 border rounded-xl transition-all ${
              selected === r.id 
                ? 'bg-emerald-900/30 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                : 'bg-gray-900 border-gray-700 hover:border-gray-500'
            }`}
          >
            <span className="text-2xl mr-4">{r.icon}</span>
            <div className="text-left">
              <div className={`font-bold ${selected === r.id ? 'text-emerald-400' : 'text-white'}`}>
                {r.id}
              </div>
              <div className="text-xs text-gray-400">{r.desc}</div>
            </div>
          </button>
        ))}
      </div>

      <button 
        onClick={handleJoin}
        disabled={!selected}
        className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
          selected 
            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(52,211,153,0.4)]' 
            : 'bg-gray-800 text-gray-500 cursor-not-allowed'
        }`}
      >
        JOIN NETWORK
      </button>
    </div>
  );
}