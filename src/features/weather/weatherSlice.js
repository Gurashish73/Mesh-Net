import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { checkInternetViaWeatherAPI } from '../../utils/internetCheck';

// Async thunk to fetch full day hourly forecast data
export const fetchWeather = createAsyncThunk(
  'weather/fetchWeather',
  async ({ lat, lng }, { rejectWithValue }) => {
    try {
      // Check cache first (valid for 12 hours for full day forecast)
      const cached = localStorage.getItem('weatherForecastData');
      const cacheTime = localStorage.getItem('weatherCacheTime');
      const now = Date.now();

      if (cached && cacheTime && (now - parseInt(cacheTime)) < 43200000) { // 12 hours
        return JSON.parse(cached);
      }

      // Fetch 5-day/3-hour forecast from OpenWeatherMap API
      const API_KEY = 'fa5f82e629e641a7541da8f26ef3104f';
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&units=metric&appid=${API_KEY}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch weather data');
      }

      const data = await response.json();

      // Structure: { city, list: [ { dt, main: { temp, feels_like, humidity, pressure }, weather, wind, ... }, ... ] }
      // Cache the full forecast data
      localStorage.setItem('weatherForecastData', JSON.stringify(data));
      localStorage.setItem('weatherCacheTime', now.toString());

      return data;
    } catch (error) {
      // If offline or error, return cached data if available
      const cached = localStorage.getItem('weatherForecastData');
      if (cached) {
        return JSON.parse(cached);
      }
      return rejectWithValue(error.message);
    }
  }
);

// Async thunk to check internet and attempt to fetch weather
export const checkInternetAndFetch = createAsyncThunk(
  'weather/checkInternetAndFetch',
  async ({ lat, lng }, { rejectWithValue }) => {
    try {
      const hasInternet = await checkInternetViaWeatherAPI();
      return { hasInternet, lat, lng };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const weatherSlice = createSlice({
  name: 'weather',
  initialState: {
    forecastData: null, // Full 5-day forecast list
    currentTimeWeather: null, // Weather for current time
    selectedTime: null, // User-selected time
    loading: false,
    error: null,
    lastFetchTime: null,
    hasInternet: false, // Track if this node has internet
    meshWeatherProviders: [], // Nearby nodes with internet/weather
    source: 'local', // 'local' = direct fetch, 'mesh' = from nearby node, 'cache' = offline
  },
  reducers: {
    clearWeather: (state) => {
      state.forecastData = null;
      state.currentTimeWeather = null;
      state.error = null;
    },
    setSelectedTime: (state, action) => {
      state.selectedTime = action.payload;
    },
    updateCurrentWeather: (state, action) => {
      state.currentTimeWeather = action.payload;
    },
    setHasInternet: (state, action) => {
      state.hasInternet = action.payload;
    },
    // Called when receiving weather from mesh
    receiveWeatherFromMesh: (state, action) => {
      const { forecastData, fromNode } = action.payload;

      // Preserve direct API weather if already loaded locally.
      if (state.source === 'local' && state.forecastData && state.forecastData.list?.length > 0) {
        return;
      }

      state.forecastData = forecastData;
      state.source = 'mesh';
      state.lastFetchTime = Date.now();
      
      if (forecastData && forecastData.list) {
        const now = Date.now();
        const closestForecast = forecastData.list.reduce((prev, current) => {
          const prevTime = Math.abs(prev.dt * 1000 - now);
          const currentTime = Math.abs(current.dt * 1000 - now);
          return currentTime < prevTime ? current : prev;
        });
        state.currentTimeWeather = closestForecast;
        state.selectedTime = closestForecast.dt;
      }
    },
    // Called to track which nodes have internet/weather
    updateMeshWeatherProviders: (state, action) => {
      state.meshWeatherProviders = action.payload;
    },
    setWeatherSource: (state, action) => {
      state.source = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWeather.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWeather.fulfilled, (state, action) => {
        state.loading = false;
        state.forecastData = action.payload;
        state.lastFetchTime = Date.now();
        state.source = 'local';
        state.hasInternet = true;
        
        // Auto-select weather for current time
        if (action.payload && action.payload.list) {
          const now = Date.now();
          const closestForecast = action.payload.list.reduce((prev, current) => {
            const prevTime = Math.abs(prev.dt * 1000 - now);
            const currentTime = Math.abs(current.dt * 1000 - now);
            return currentTime < prevTime ? current : prev;
          });
          state.currentTimeWeather = closestForecast;
          state.selectedTime = closestForecast.dt;
        }
      })
      .addCase(fetchWeather.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.hasInternet = false;
        state.source = 'cache';
      })
      .addCase(checkInternetAndFetch.pending, (state) => {
        state.loading = true;
      })
      .addCase(checkInternetAndFetch.fulfilled, (state, action) => {
        state.loading = false;
        state.hasInternet = action.payload.hasInternet;
      })
      .addCase(checkInternetAndFetch.rejected, (state) => {
        state.hasInternet = false;
      });
  },
});

export const { 
  clearWeather, 
  setSelectedTime, 
  updateCurrentWeather, 
  setHasInternet,
  receiveWeatherFromMesh,
  updateMeshWeatherProviders,
  setWeatherSource
} = weatherSlice.actions;
export default weatherSlice.reducer;