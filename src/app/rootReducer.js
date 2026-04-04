import { combineReducers } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import commsReducer from '../features/comms/commsSlice';
import radarReducer from '../features/radar/radarSlice';
const rootReducer = combineReducers({
    auth: authReducer,
    comms: commsReducer,
    radar: radarReducer,
    network: (state = { connectedNodes: 0 }) => state,
});

export default rootReducer;