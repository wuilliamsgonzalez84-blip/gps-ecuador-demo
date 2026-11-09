// Validation helpers for an authenticated, consent-based phone tracking endpoint.
// No secrets or user positions are stored in this module.
export function validatePhoneFix(value, now = Date.now()) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const { latitude, longitude, accuracy, recordedAt } = value;
  if (![latitude, longitude, accuracy].every(Number.isFinite)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  if (accuracy < 0 || accuracy > 10000) return null;
  if (typeof recordedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(recordedAt)) return null;
  const timestamp = Date.parse(recordedAt);
  if (!Number.isFinite(timestamp) || timestamp > now + 60000 || timestamp < now - 300000) return null;
  return { latitude, longitude, accuracy, recordedAt: new Date(timestamp).toISOString() };
}
export function canWriteVehicle(userVehicleIds, vehicleId) {
  return Number.isSafeInteger(vehicleId) && vehicleId > 0 &&
    userVehicleIds instanceof Set && userVehicleIds.has(vehicleId);
}
