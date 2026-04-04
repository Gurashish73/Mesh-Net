import { createSlice } from '@reduxjs/toolkit';

export const authSlice = createSlice({
  name: 'auth',
  initialState: {
    uid: null,
    displayName: '',
    role: null,
    isAuthenticated: false,
  },
  reducers: {
    loginUser: (state, action) => {
      state.uid = action.payload.uid;
      state.displayName = action.payload.displayName;
      state.isAuthenticated = true;
    },
    setRole: (state, action) => {
      state.role = action.payload;
    },
    logoutUser: (state) => {
      state.uid = null;
      state.displayName = '';
      state.role = null;
      state.isAuthenticated = false;
    }
  }
});

export const { loginUser, setRole, logoutUser } = authSlice.actions;
export default authSlice.reducer;