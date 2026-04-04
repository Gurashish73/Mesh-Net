import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import { useSelector } from 'react-redux';
import 'leaflet/dist/leaflet.css';

//Default Leaflet icon paths in React
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

export default function OfflineMap() {
  const myLocation = useSelector((state) => state.radar.myLocation);
  const nearbyNodes = useSelector((state) => state.radar.nearbyNodes);
  const currentUser = useSelector((state) => state.auth.displayName);

  // Fallback to New Delhi if GPS is completely dead
  const center = myLocation ? [myLocation.lat, myLocation.lng] : [28.6139, 77.2090];
  
  // Point this to the IP address where your Node server is running!
  const TILE_SERVER_URL = "http://10.200.121.47:3001/maps/{z}/{x}/{y}.png";

  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-emerald-900/50 relative z-0">
      <MapContainer 
        center={center} 
        zoom={15} 
        style={{ height: "100%", width: "100%", backgroundColor: '#0a0a0a' }}
        zoomControl={false}
      >
        {/* OFFLINE TILE LAYER */}
        <TileLayer
          url={TILE_SERVER_URL}
          attribution='MeshNet Offline Tactical Grid'
        />

        {/* 1. Plot YOU */}
        {myLocation && (
          <CircleMarker 
            center={[myLocation.lat, myLocation.lng]} 
            pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.5 }} 
            radius={8}
          >
            <Popup className="text-xs font-bold">YOU ({currentUser})</Popup>
          </CircleMarker>
        )}

        {/* 2. Plot EVERYONE ELSE in the Mesh */}
        {nearbyNodes.map(node => {
          // Don't plot yourself twice
          if (node.name === currentUser || node.name === `${currentUser} (SOS)`) return null;

          const isSOS = node.type === 'EmergencyNode';
          
          return (
            <CircleMarker 
              key={node.id}
              center={[node.lat, node.lng]} 
              pathOptions={{ 
                color: isSOS ? '#ef4444' : '#34d399', 
                fillColor: isSOS ? '#ef4444' : '#34d399', 
                fillOpacity: 0.8 
              }} 
              radius={isSOS ? 12 : 6}
            >
              <Popup>
                <div className="text-center">
                  <strong className={isSOS ? 'text-red-600' : 'text-emerald-700'}>
                    {node.name}
                  </strong><br/>
                  <span className="text-xs text-gray-500 uppercase">{node.role}</span>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}