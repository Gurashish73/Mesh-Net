import React from 'react';
import { useSelector } from 'react-redux';
import AppShell from './shared/AppShell';
import RoleSelector from './features/auth/RoleSelector';

function App() {
  const currentRole = useSelector((state) => state.auth.role);

  return (
    
    <div className="flex justify-center items-center min-h-screen bg-gray-950 font-sans sm:p-4">
      <div className="w-full h-dvh sm:h-[85vh] sm:max-h-212.5 sm:aspect-9/19.5 sm:w-auto sm:rounded-[3rem] bg-[#0A110D] text-white flex flex-col relative overflow-hidden sm:border-8 sm:border-gray-800 shadow-2xl">
        
        {/* The Gatekeeper Logic */}
        {!currentRole ? (
          <RoleSelector />
        ) : (
          <AppShell />
        )}

      </div>
    </div>
  );
}

export default App;