/**
 * Converts Latitude and Longitude to Cartesian (X, Y, Z) coordinates
 * @param {number} lat - Latitude in degrees
 * @param {number} lon - Longitude in degrees
 * @param {number} radius - Radius of the Three.js sphere (e.g., 2)
 * @returns {Object} { x, y, z }
 */
export function latLongToCartesian(lat, lon, radius) {
  // Convert degrees to radians
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  // Calculate cartesian coordinates mapping to Three.js space
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = (radius * Math.sin(phi) * Math.sin(theta));
  const y = (radius * Math.cos(phi));

  return { x, y, z };
}
