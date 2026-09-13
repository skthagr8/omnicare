export const geolocationService = {
  getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      });
    });
  },

  watchPosition(callback: (position: GeolocationPosition) => void): number {
    return navigator.geolocation.watchPosition(callback, console.error, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  },

  clearWatch(watchId: number): void {
    navigator.geolocation.clearWatch(watchId);
  },
};