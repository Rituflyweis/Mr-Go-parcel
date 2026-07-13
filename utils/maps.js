const https = require("https");

const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_KEY;

// Make HTTP GET request helper
const httpGet = (url) =>
  new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error("Invalid JSON response")); }
      });
    }).on("error", reject);
  });

// Get distance + duration between two lat/lng points
// Returns: { distanceKm, durationMin, distanceText, durationText }
const getDistanceAndDuration = async (originLat, originLng, destLat, destLng) => {
  if (!GOOGLE_MAPS_KEY || GOOGLE_MAPS_KEY === "your_google_maps_api_key") {
    // Mock response when key not set — for development
    const mockKm = parseFloat(
      (Math.sqrt(Math.pow(destLat - originLat, 2) + Math.pow(destLng - originLng, 2)) * 111).toFixed(1)
    );
    return {
      distanceKm: mockKm || 5,
      durationMin: Math.round((mockKm || 5) * 2.5),
      distanceText: `${mockKm || 5} km`,
      durationText: `${Math.round((mockKm || 5) * 2.5)} mins`,
      isMock: true,
    };
  }

  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originLat},${originLng}&destinations=${destLat},${destLng}&units=metric&key=${GOOGLE_MAPS_KEY}`;

  const data = await httpGet(url);

  if (data.status !== "OK") throw new Error(`Google Maps error: ${data.status}`);

  const element = data.rows?.[0]?.elements?.[0];
  if (!element || element.status !== "OK") throw new Error("No route found between locations");

  return {
    distanceKm: parseFloat((element.distance.value / 1000).toFixed(1)),
    durationMin: Math.round(element.duration.value / 60),
    distanceText: element.distance.text,
    durationText: element.duration.text,
    isMock: false,
  };
};

// Convert address string → { lat, lng }
const geocodeAddress = async (address) => {
  if (!GOOGLE_MAPS_KEY || GOOGLE_MAPS_KEY === "your_google_maps_api_key") {
    return { lat: 19.076, lng: 72.8777, isMock: true };
  }

  const encoded = encodeURIComponent(address);
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${GOOGLE_MAPS_KEY}`;

  const data = await httpGet(url);
  if (data.status !== "OK") throw new Error(`Geocoding error: ${data.status}`);

  const location = data.results?.[0]?.geometry?.location;
  if (!location) throw new Error("Address not found");

  return { lat: location.lat, lng: location.lng, isMock: false };
};

// Calculate ETA from driver's current location to pickup point
// Returns: { etaMin, etaText }
const getETA = async (driverLat, driverLng, pickupLat, pickupLng) => {
  const result = await getDistanceAndDuration(driverLat, driverLng, pickupLat, pickupLng);
  return {
    etaMin: result.durationMin,
    etaText: result.durationText,
    distanceKm: result.distanceKm,
  };
};

module.exports = { getDistanceAndDuration, geocodeAddress, getETA };
