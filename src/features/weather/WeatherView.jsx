import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchWeather, setSelectedTime } from './weatherSlice';

export default function WeatherView() {
  const dispatch = useDispatch();
  const { forecastData, currentTimeWeather, selectedTime, loading, error, source } = useSelector((state) => state.weather);
  const myLocation = useSelector((state) => state.radar.myLocation);

  useEffect(() => {
    if (myLocation) {
      dispatch(fetchWeather({ lat: myLocation.lat, lng: myLocation.lng }));
    }
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

  const getSourceText = () => {
    if (source === 'local') return 'Source: Direct API';
    if (source === 'mesh') return 'Source: Mesh Node';
    if (source === 'cache') return 'Source: Cached';
    return 'Source: Unknown';
  };

  const forecastPreview = forecastData?.list?.slice(0, 7) || [];

  // Get weather for selected time
  const selectedWeather = forecastData?.list?.find((item) => item.dt === selectedTime) || currentTimeWeather;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        <p className="mt-2 text-sm">Fetching forecast...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <p className="text-sm">Forecast unavailable</p>
        <p className="text-xs text-gray-500 mt-1">{error}</p>
      </div>
    );
  }

  if (!forecastData || !selectedWeather) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <p className="text-sm">No forecast data</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 text-center overflow-y-auto pb-24">
      <h1 className="text-2xl font-bold text-white mb-2 tracking-wider">
        WEATHER<span className="text-emerald-500"> FORECAST</span>
      </h1>
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400 mb-4">
        {getSourceText()}
      </div>

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
        {forecastPreview.map((forecast) => (
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