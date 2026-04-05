// Utility to check if the current node has internet connectivity
export const checkInternetConnection = async () => {
  try {
    const response = await fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
      timeout: 3000
    });
    return true;
  } catch (error) {
    return false;
  }
};

// Alternative check using OpenWeatherMap API
export const checkInternetViaWeatherAPI = async () => {
  try {
    const API_KEY = 'fa5f82e629e641a7541da8f26ef3104f';
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=0&lon=0&appid=${API_KEY}`,
      { timeout: 3000 }
    );
    return response.ok;
  } catch (error) {
    return false;
  }
};