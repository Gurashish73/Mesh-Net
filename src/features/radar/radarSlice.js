import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // Starts as null until your phone's GPS gets a lock
  myLocation: null, 
  
  // This will hold the array of other devices pinged on the network
  nearbyNodes: [], 
  
  // Toggles between the circular radar and the static fallback map
  showMap: false,
};

export const radarSlice = createSlice({
  name: 'radar',
  initialState,
  reducers: {
    setMyLocation: (state, action) => {
      state.myLocation = action.payload;
    },
    setNearbyNodes: (state, action) => {
      state.nearbyNodes = action.payload;
    },
    toggleMapView: (state) => {
      state.showMap = !state.showMap;
    }
  }
});

export const { setMyLocation, setNearbyNodes, toggleMapView } = radarSlice.actions;
export default radarSlice.reducer;