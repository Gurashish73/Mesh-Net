import React, { useState } from 'react';
import { survivalData } from './survivalData';

export default function WikiSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  // Instantly filter articles based on search text
  const filteredArticles = survivalData.filter(article => 
    article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full w-full px-4">
      <h1 className="text-center text-sm font-bold tracking-widest mt-6 mb-4 text-gray-200">
        SURVIVAL WIKI
      </h1>
      
      {/* --- SEARCH BAR --- */}
      <div className="relative mb-6 shrink-0 z-10">
         <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search CPR, Water, Fire..." 
            className="w-full bg-[#0a0a0a] border border-emerald-800/60 rounded-full py-3 px-4 pl-12 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors shadow-[0_4px_10px_rgba(0,0,0,0.5)]" 
         />
         {/* Magnifying Glass Icon */}
         <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
      </div>

      {/* --- RESULTS LIST --- */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-6">
         {filteredArticles.length === 0 ? (
            <div className="text-center text-gray-500 mt-10">No articles found.</div>
         ) : (
            filteredArticles.map(article => (
               <div 
                  key={article.id} 
                  onClick={() => setExpandedId(expandedId === article.id ? null : article.id)}
                  className="bg-[#0f1a14] border border-emerald-900/40 rounded-xl p-4 flex flex-col cursor-pointer hover:border-emerald-500/50 transition-all"
               >
                  <div className="flex items-center gap-4">
                     <div className="text-2xl">{article.icon}</div>
                     <div className="flex-1">
                        <h3 className="text-white font-semibold text-sm">{article.title}</h3>
                        <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">{article.category}</span>
                     </div>
                     {/* Dropdown chevron */}
                     <svg className={`w-5 h-5 text-gray-500 transition-transform ${expandedId === article.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                  
                  {/* Expanded Content */}
                  {expandedId === article.id && (
                     <div className="mt-4 pt-4 border-t border-emerald-900/50 text-sm text-gray-300 leading-relaxed animate-fadeIn">
                        {article.content}
                     </div>
                  )}
               </div>
            ))
         )}
      </div>
    </div>
  );
}