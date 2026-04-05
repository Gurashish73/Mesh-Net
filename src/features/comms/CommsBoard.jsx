import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { addMessage } from './commsSlice';
import { triggerSosVibration } from '../../utils/vibrate';
import { broadcastToMesh } from '../../services/webrtcClient';

export default function CommsBoard() {
  const dispatch = useDispatch();
  const allMessages = useSelector((state) => state.comms.messages);
  const currentUser = useSelector((state) => state.auth.displayName);
  const myLocation = useSelector((state) => state.radar.myLocation); //GPS Pull
  
  const [activeTab, setActiveTab] = useState('general'); 
  const [inputText, setInputText] = useState('');
  
  // Transfer State
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferProgress, setTransferProgress] = useState(0);

  const displayedMessages = allMessages.filter(msg => 
    activeTab === 'general' ? msg.type === 'GENERAL' : msg.type === 'SOS'
  );

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    // --- MULTI-HOP PACKET STRUCTURE ---
    const newMessage = {
      id: `msg_${currentUser || 'Me'}_${Date.now()}`,
      senderId: currentUser || 'Me', 
      senderName: currentUser || 'Me',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: inputText,
      ttl: 3, 
      originalSender: currentUser || 'Me',
      location: myLocation 
    };

    // 1. Save locally to UI Redux
    dispatch(addMessage({
      ...newMessage, 
      type: activeTab === 'general' ? 'GENERAL' : 'SOS', 
      status: 'Sent' 
    }));

    // 2. BLAST IT TO THE MESH
    broadcastToMesh({
      type: activeTab === 'general' ? 'GENERAL' : 'SOS',
      payload: newMessage
    });

    if (activeTab === 'sos') triggerSosVibration();
    setInputText(''); 
  };

  // HANDLE REAL FILE SELECTION
  const handleImageSelection = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const img = new Image();
    img.src = URL.createObjectURL(file);
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 400; 
      const scaleSize = MAX_WIDTH / img.width;
      canvas.width = MAX_WIDTH;
      canvas.height = img.height * scaleSize;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const compressedBase64String = canvas.toDataURL('image/jpeg', 0.5);

      simulateNetworkTransfer(compressedBase64String, file.name);
    };
    
    e.target.value = ''; 
  };

  // 2. THE FILE TRANSFER THEATER ---
  const simulateNetworkTransfer = (base64ImageString, fileName) => {
    setIsTransferring(true);
    setTransferProgress(0);
    
    let progress = 0;
    const interval = setInterval(() => {
      progress += 25; 
      setTransferProgress(progress);
      
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setIsTransferring(false);
          
          const imageMessage = {
            id: `img_${currentUser || 'Me'}_${Date.now()}`,
            senderId: currentUser || 'Me',
            senderName: currentUser || 'Me',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: `Sent image: ${fileName}`,
            imageUrl: base64ImageString, 
            type: activeTab === 'general' ? 'GENERAL' : 'SOS',
            status: 'Delivered',
            ttl: 3, 
            originalSender: currentUser || 'Me',
            location: myLocation 
          };

          dispatch(addMessage(imageMessage));

          broadcastToMesh({
            type: activeTab === 'general' ? 'GENERAL' : 'SOS',
            payload: imageMessage
          });

        }, 300);
      }
    }, 400);
  };

  return (
    <div className="flex flex-col h-full w-full relative">
      <h1 className="text-center text-sm font-bold tracking-widest mt-6 mb-4 text-gray-200">
        COMMUNICATIONS
      </h1>
      
      {/* Segmented Control Toggle */}
      <div className="flex mx-4 mb-4 bg-black border border-emerald-900/50 rounded-full p-1 z-10 shrink-0">
        <button 
          onClick={() => setActiveTab('general')}
          className={`flex-1 rounded-full py-2 text-xs font-bold transition-all ${activeTab === 'general' ? 'bg-emerald-500 text-black' : 'text-gray-500'}`}
        >
          GENERAL
        </button>
        <button 
          onClick={() => setActiveTab('sos')}
          className={`flex-1 rounded-full py-2 text-xs font-bold transition-all ${activeTab === 'sos' ? 'bg-red-500 text-black' : 'text-gray-500'}`}
        >
          SOS ALERTS
        </button>
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden hide-scrollbar px-4 space-y-3 pb-4">
        {displayedMessages.map(msg => (
          <div 
            key={msg.id} 
            className={`border rounded-lg p-3 relative ${
              msg.type === 'SOS' 
                ? 'bg-[#1a0f0f] border-red-800' 
                : 'bg-[#0f1a14] border-emerald-800/50'
            }`}
          >
             <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-2">
                   <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${msg.type === 'SOS' ? 'bg-red-700' : 'bg-emerald-700'}`}>
                     {msg.senderName ? msg.senderName[0] : '?'}
                   </div>
                   <span className={`text-sm font-semibold ${msg.type === 'SOS' ? 'text-red-400' : 'text-white'}`}>
                     {msg.senderName || 'Unknown'}
                   </span>
                </div>
                <span className={`text-[10px] ${msg.type === 'SOS' ? 'text-red-500/70' : 'text-gray-500'}`}>
                  {msg.time}
                </span>
             </div>
             
             {/* THE IMAGE RENDERER */}
             {msg.imageUrl && (
               <div className="mt-3 mb-2 rounded-md overflow-hidden border border-gray-700">
                 <img src={msg.imageUrl} alt="Attachment" className="w-full h-auto max-h-48 object-cover" />
               </div>
             )}

             <p className={`text-sm mt-1 wrap-break-word ${msg.type === 'SOS' ? 'font-bold text-red-100' : 'text-gray-300'}`}>
               {msg.text}
             </p>

             {/* 👇 FIXED: ONLY RENDER GPS COORDINATES IF IT'S AN SOS ALERT 👇 */}
             {msg.location && msg.type === 'SOS' && (
               <div className="mt-2 flex items-center gap-1.5 bg-black/40 p-2 rounded flex-wrap border border-red-900/30 text-red-400 font-mono text-[10px]">
                 <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                 <span>LAT: {msg.location.lat.toFixed(5)}</span>
                 <span className="text-red-900/50">|</span>
                 <span>LNG: {msg.location.lng.toFixed(5)}</span>
               </div>
             )}

             {/* THE MESH HOP VISUAL PROOF (Added back so you don't lose it!) */}
             {msg.isHopped && (
               <div className="mt-2 flex items-center gap-1.5 bg-orange-900/20 p-1.5 rounded border border-orange-500/30 text-orange-400 font-bold text-[10px]">
                 <svg className="w-3 h-3 shrink-0 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                 MESH HOP: Routed via {msg.viaNode}
               </div>
             )}
             
             <div className={`flex justify-between mt-2 text-[10px] ${msg.type === 'SOS' ? 'text-red-500/70' : 'text-emerald-600/70'}`}>
                <span>{msg.type === 'SOS' ? 'Status:' : 'Sent'}</span>
                <span>{msg.status}</span>
             </div>
          </div>
        ))}

        {/* --- Active Transfer UI --- */}
        {isTransferring && (
          <div className="border border-emerald-500/50 bg-black rounded-lg p-3 animate-pulse">
            <div className="flex justify-between text-xs font-mono text-emerald-400 mb-2">
              <span>CHUNKING_FILE_DATA...</span>
              <span>{transferProgress}%</span>
            </div>
            <div className="w-full bg-gray-900 rounded-full h-1.5">
              <div 
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300" 
                style={{ width: `${transferProgress}%` }}
              ></div>
            </div>
            <div className="text-[9px] text-gray-500 mt-2 text-right">Routing via WebRTC DataChannel</div>
          </div>
        )}
        <div className="h-2"></div>
      </div>

      {/* --- CHAT INPUT WITH FILE PICKER --- */}
      <div className="px-4 pb-4 shrink-0 bg-[#0A110D] pt-2">
        <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
          
          <label 
            className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center cursor-pointer transition-colors border ${
              isTransferring 
                ? 'bg-gray-800 border-gray-700 text-gray-600 cursor-not-allowed' 
                : 'bg-[#0a0a0a] border-gray-700 text-gray-400 hover:text-emerald-400 hover:border-emerald-500'
            }`}
          >
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleImageSelection}
              disabled={isTransferring}
            />
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
            </svg>
          </label>
          
          <div className="relative flex-1">
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={activeTab === 'general' ? "Type general message..." : "Type SOS alert..."} 
              className={`w-full bg-[#0a0a0a] border rounded-full py-3 px-4 pr-12 text-sm text-white focus:outline-none transition-colors ${
                activeTab === 'general' ? 'border-gray-700 focus:border-emerald-500' : 'border-red-900/50 focus:border-red-500'
              }`} 
            />
            <button 
              type="submit"
              className={`absolute right-3 top-1/2 -translate-y-1/2 ${activeTab === 'general' ? 'text-emerald-600 hover:text-emerald-400' : 'text-red-600 hover:text-red-400'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}