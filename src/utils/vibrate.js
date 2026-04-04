export const triggerSosVibration = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate([500, 200, 500, 200, 1000]);
  } else {
    console.warn("Vibration API is not supported on this device/browser.");
  }
};