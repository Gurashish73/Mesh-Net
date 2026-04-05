import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchWeather, setSelectedTime } from './weatherSlice';
import { broadcastWeatherToMesh, requestWeatherFromMesh } from '../../services/webrtcClient';
import { checkInternetViaWeatherAPI } from '../../utils/internetCheck';

export default function WeatherView() {
  const dispatch = useDispatch();
  const { forecastData, currentTimeWeather, selectedTime, loading, error, source, hasInternet } = useSelector((state) => state.weather);
  const myLocation = useSelector((state) => state.radar.myLocation);
  const nearbyNodes = useSelector((state) => state.radar.nearbyNodes);

  useEffect(() => {
    if (!myLocation) return;

    const initializeWeather = async () => {
      try {
        // Check if we have internet
        const hasConnection = await checkInternetViaWeatherAPI();

        if (hasConnection) {
          // We have internet - fetch directly
          console.log('🌐 Internet available - fetching weather...');
          dispatch(fetchWeather({ lat: myLocation.lat, lng: myLocation.lng }));

          // Also broadcast to mesh if we fetched successfully
          setTimeout(() => {
            const state = useSelector((state) => state);
            if (state.weather.forecastData) {
              broadcastWeatherToMesh(state.weather.forecastData);
            }
          }, 1000);
        } else {
          // No internet - request from mesh
          console.log('📡 No internet - requesting weather from mesh...');
          requestWeatherFromMesh();

          // Also try cached fallback
          const cached = localStorage.getItem('weatherForecastData');
          if (cached) {
            console.log('💾 Using cached weather data...');
            try {
              const cachedData = JSON.parse(cached);
              dispatch({ type: 'weather/receiveWeatherFromMesh', payload: { forecastData: cachedData, fromNode: 'local_cache' } });
            } catch (e) {
              console.error('Failed to parse cached weather:', e);
            }
          }
        }
      } catch (err) {
        console.error('Error initializing weather:', err);
        const cached = localStorage.getItem('weatherForecastData');
        if (cached) {
          try {
            const cachedData = JSON.parse(cached);
            dispatch({ type: 'weather/receiveWeatherFromMesh', payload: { forecastData: cachedData, fromNode: 'local_cache' } });
          } catch (e) {
            console.error('Failed to parse cached weather:', e);
          }
        }
      }
    };

    initializeWeather();
  }, [myLocation, dispatch]);

  const getWeatherIcon = (iconCode) => {
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getSourceBadge = () => {
    if (source === 'local') return '🌐 Direct Fetch';
    if (source === 'mesh') return '📡 From Mesh';
    if (source === 'cache') return '💾 Cached';
    return '❓ Unknown';
  };

  // Get weather for selected time
  const selectedWeather = forecastData?.list?.find((item) => item.dt === selectedTime) || currentTimeWeather;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        <p className="mt-2 text-sm">Fetching forecast...</p>
        <p className="text-xs text-gray-500 mt-1">Checking internet & mesh network...</p>
      </div>
    );
  }

  if (error && !selectedWeather) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 p-4">
        <p className="text-sm font-semibold mb-2">⚠️ Forecast Unavailable</p>
        <p className="text-xs text-gray-500 text-center">{error}</p>
        <p className="text-xs text-gray-600 mt-2">
          • No internet connection
          • No nearby nodes with weather data
          • No cached forecast available
        </p>
      </div>
    );
  }

  if (!forecastData || !selectedWeather) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <p className="text-sm">Searching for weather...</p>
        <p className="text-xs text-gray-500 mt-2">Checking mesh nodes...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 text-center overflow-y-auto pb-24">
      <h1 className="text-2xl font-bold text-white mb-4 tracking-wider">
        WEATHER<span className="text-emerald-500"> FORECAST</span>
      </h1>

      {/* --- SOURCE BADGE --- */}
      <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-4 px-3 py-1 bg-emerald-900/20 border border-emerald-900/40 rounded-full inline-block mx-auto">
        {getSourceBadge()}
      </div>

      {/* --- MESH STATUS --- */}
      {!hasInternet && nearbyNodes && nearbyNodes.length > 0 && (
        <div className="bg-blue-900/20 border border-blue-900/40 rounded-lg p-3 mb-4 text-xs">
          <p className="text-blue-300">🌐 Nearby Mesh Nodes: <span className="font-bold">{nearbyNodes.length}</span></p>
          <p className="text-gray-400 text-[10px] mt-1">Searching for weather data across network...</p>
        </div>
      )}

      {/* --- CURRENT/SELECTED WEATHER --- */}
      <div className="bg-gray-900/50 border border-emerald-900/40 rounded-xl p-6 w-full mb-6">
        <div className="text-sm text-gray-400 mb-2">
          {formatDate(selectedWeather.dt)} at {formatTime(selectedWeather.dt)}
        </div>

        <div className="flex items-center justify-center mb-4">
          <img
            src={getWeatherIcon(selectedWeather.weather[0].icon)}
            alt={selectedWeather.weather[0].description}
            className="w-20 h-20"
          />
        </div>

        <div className="text-5xl font-bold text-white mb-2">
          {Math.round(selectedWeather.main.temp)}°C
        </div>

        <div className="text-lg text-gray-300 capitalize mb-4">
          {selectedWeather.weather[0].description}
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="text-left">
            <div className="text-gray-400">Feels like</div>
            <div className="text-white font-semibold">{Math.round(selectedWeather.main.feels_like)}°C</div>
          </div>
          <div className="text-left">
            <div className="text-gray-400">Humidity</div>
            <div className="text-white font-semibold">{selectedWeather.main.humidity}%</div>
          </div>
          <div className="text-left">
            <div className="text-gray-400">Wind</div>
            <div className="text-white font-semibold">{selectedWeather.wind.speed} m/s</div>
          </div>
          <div className="text-left">
            <div className="text-gray-400">Pressure</div>
            <div className="text-white font-semibold">{selectedWeather.main.pressure} hPa</div>
          </div>
        </div>

        <div className="mt-4 text-xs text-gray-500">
          {forecastData.city.name}, {forecastData.city.country}
        </div>
      </div>

      {/* --- HOURLY FORECAST CAROUSEL --- */}
      <div className="text-left mb-4">
        <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">5-Day Hourly Forecast</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
        {forecastData.list.map((forecast) => (
          <button
            key={forecast.dt}
            onClick={() => dispatch(setSelectedTime(forecast.dt))}
            className={`flex-shrink-0 p-3 rounded-lg border transition-all ${
              selectedTime === forecast.dt
                ? 'bg-emerald-900/40 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                : 'bg-gray-900/30 border-gray-700 hover:border-gray-500'
            }`}
          >
            <div className="text-xs text-gray-400 mb-1">{formatTime(forecast.dt)}</div>
            <img
              src={getWeatherIcon(forecast.weather[0].icon)}
              alt={forecast.weather[0].description}
              className="w-10 h-10 mb-1"
            />
            <div className="text-sm font-bold text-white">{Math.round(forecast.main.temp)}°C</div>
            <div className="text-[10px] text-gray-500">{forecast.main.humidity}%</div>
          </button>
        ))}
      </div>

      {/* Custom scrollbar styling injected via style tag */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}