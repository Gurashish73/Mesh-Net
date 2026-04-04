import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  messages: [
    { id: '1', senderName: 'Ansh', time: '7:09 AM', text: 'Water available at Sector 4', type: 'GENERAL', status: 'Delivered' },
    // mock image message
    { id: 'img_1', senderName: 'Sarah', time: '9:15 AM', text: 'Bridge collapsed on Main St.', imageUrl: 'https://tse4.mm.bing.net/th/id/OIP.L3_g-Ed75hCQOw3S6rxuhgHaE8?rs=1&pid=ImgDetMain&o=7&rm=3', type: 'GENERAL', status: 'Delivered' },
    { id: '3', senderName: 'Ravi', time: '6:20 AM', text: 'Need medic at base camp.', type: 'SOS', severity: 5, status: 'Hopping' },
  ],
  // NEW: The Memory Bank to prevent infinite mesh echoes!
  // Pre-filled with mock IDs so they are ignored by the router.
  seenMessageIds: ['1', 'img_1', '3'], 
};

export const commsSlice = createSlice({
  name: 'comms',
  initialState,
  reducers: {
    addMessage: (state, action) => {
      // MULTI-HOP FIX: Only add the message to the UI if we haven't seen this ID before
      if (!state.seenMessageIds.includes(action.payload.id)) {
        state.messages.push(action.payload);
        state.seenMessageIds.push(action.payload.id); // Add to memory bank
      }
    },
    
    // Function to update message status (Sent -> Hopping -> Delivered)
    updateMessageStatus: (state, action) => {
      const msg = state.messages.find(m => m.id === action.payload.id);
      if (msg) msg.status = action.payload.status;
    },
    
    // NEW: Utility to manually register an ID as seen without adding a message to the UI
    markMessageSeen: (state, action) => {
      if (!state.seenMessageIds.includes(action.payload)) {
        state.seenMessageIds.push(action.payload);
      }
    }
  }
});

// Make sure to export the new markMessageSeen action!
export const { addMessage, updateMessageStatus, markMessageSeen } = commsSlice.actions;
export default commsSlice.reducer;