const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const app = express();
app.use(cors()); // Allows React app to talk to this server
app.use('/maps', express.static(path.join(__dirname, 'tiles')));
const server = http.createServer(app);

// Configure Socket.io with permissive CORS for the hackathon network
const io = new Server(server, {
  cors: {
    origin: "*", // Allows any phone on our local Wi-Fi to connect
    methods: ["GET", "POST"]
  }
});

// The Switchboard Logic
io.on('connection', (socket) => {
  console.log('⚡ New Device Connected:', socket.id);

  // 1. When a user clicks "JOIN NETWORK" on the React app
  socket.on('join-network', (userProfile) => {
    console.log(`👤 Device ${socket.id} joined as ${userProfile.role}`);
    
    // Broadcast to ALL OTHER connected phones: "Hey, initiate a handshake with this new guy!"
    socket.broadcast.emit('user-connected', socket.id);
  });

  // 2. Relay WebRTC "Offers" (Phone A wants to connect to Phone B)
  socket.on('offer', (data) => {
    io.to(data.target).emit('offer', {
      caller: data.caller,
      sdp: data.sdp
    });
  });

  // 3. Relay WebRTC "Answers" (Phone B accepts Phone A's connection)
  socket.on('answer', (data) => {
    io.to(data.target).emit('answer', {
      caller: data.caller,
      sdp: data.sdp
    });
  });

  // 4. Relay ICE Candidates (The complex network routing data)
  socket.on('ice-candidate', (data) => {
    io.to(data.target).emit('ice-candidate', {
      sender: data.sender,
      candidate: data.candidate
    });
  });

  socket.on('disconnect', () => {
    console.log('❌ Device Disconnected:', socket.id);
  });
});

// Listen on all network interfaces (0.0.0.0) so phones can reach it via your laptop's IP
const PORT = 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 MESHNET SIGNALING SERVER RUNNING ON PORT ${PORT}`);
  console.log(`📡 Ready to matchmake local devices...`);
});