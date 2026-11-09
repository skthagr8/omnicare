export type Coordinates = { latitude: number; longitude: number };

/**
 * Calculates the great-circle distance between two points on Earth using the Haversine formula.
 * Returns distance in meters.
 */
export function calculateHaversineDistance(coords1: Coordinates, coords2: Coordinates): number {
  const EARTH_RADIUS_METERS = 6371000;

  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  const dLat = toRadians(coords2.latitude - coords1.latitude);
  const dLon = toRadians(coords2.longitude - coords1.longitude);

  const lat1Rad = toRadians(coords1.latitude);
  const lat2Rad = toRadians(coords2.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1Rad) * Math.cos(lat2Rad);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(EARTH_RADIUS_METERS * c);
}

/**
 * Computes OpenStreetMap bounding box parameters (bbox) for embedding an iframe map.
 * Enforces valid latitude [-90, 90] and longitude [-180, 180] boundaries.
 */
export function calculateOSMBoundingBox(
  center: Coordinates,
  deltaLat = 0.005,
  deltaLon = 0.008
): string {
  const minLon = Math.max(-180, center.longitude - deltaLon);
  const minLat = Math.max(-90, center.latitude - deltaLat);
  const maxLon = Math.min(180, center.longitude + deltaLon);
  const maxLat = Math.min(90, center.latitude + deltaLat);

  return `${minLon},${minLat},${maxLon},${maxLat}`;
}