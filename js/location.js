/* =============================================================
   location.js  –  Browser Geolocation wrapper
============================================================= */
const Location = {
  get() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject('Geolocation is not supported by your browser.');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
        err => {
          const msgs = { 1:'Location permission denied.', 2:'Location unavailable.', 3:'Location request timed out.' };
          reject(msgs[err.code] || 'Unknown location error.');
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    });
  },
  mapsUrl(lat, lng) { return 'https://www.google.com/maps?q=' + lat + ',' + lng; }
};
