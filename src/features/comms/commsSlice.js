import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  messages: [
    { id: '1', senderName: 'Ansh', time: '7:09 AM', text: 'Water available at Sector 4', type: 'GENERAL', status: 'Delivered' },
    // mock image message
    { id: 'img_1', senderName: 'Sarah', time: '9:15 AM', text: 'Bridge collapsed on Main St.', imageUrl: 'https://tse4.mm.bing.net/th/id/OIP.L3_g-Ed75hCQOw3S6rxuhgHaE8?rs=1&pid=ImgDetMain&o=7&rm=3', type: 'GENERAL', status: 'Delivered' },
    { id: '3', senderName: 'Ravi', time: '6:20 AM', text: 'Need medic at base camp.', type: 'SOS', severity: 5, status: 'Hopping' },
  ],
};

export const commsSlice = createSlice({
  name: 'comms',
  initialState,
  reducers: {
    addMessage: (state, action) => {
      state.messages.push(action.payload);
    },
    //function to update message status (Sent -> Hopping -> Delivered) later
    updateMessageStatus: (state, action) => {
      const msg = state.messages.find(m => m.id === action.payload.id);
      if (msg) msg.status = action.payload.status;
    }
  }
});

export const { addMessage, updateMessageStatus } = commsSlice.actions;
export default commsSlice.reducer;