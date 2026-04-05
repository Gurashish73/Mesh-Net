import { combineReducers } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import commsReducer from '../features/comms/commsSlice';
import radarReducer from '../features/radar/radarSlice';
import weatherReducer from '../features/weather/weatherSlice';
const rootReducer = combineReducers({
    auth: authReducer,
    comms: commsReducer,
    radar: radarReducer,
    weather: weatherReducer,
    network: (state = { connectedNodes: 0 }) => state,
});

export default rootReducer;