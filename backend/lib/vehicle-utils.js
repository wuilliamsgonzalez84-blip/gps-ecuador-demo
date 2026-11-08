export function normalizeVehicle(device) {
  if (!device || !Number.isSafeInteger(device.id) || device.id <= 0) return null;
  return {
    id: device.id,
    name: typeof device.name === 'string' ? device.name.slice(0, 120) : 'Vehículo',
    status: ['online', 'offline', 'unknown'].includes(device.status) ? device.status : 'unknown',
    lastUpdate: typeof device.lastUpdate === 'string' ? device.lastUpdate : null
  };
}

export function filterAllowedVehicles(devices, allowedIds) {
  if (!Array.isArray(devices) || !(allowedIds instanceof Set)) return [];
  return devices.filter(d => allowedIds.has(d?.id)).map(normalizeVehicle).filter(Boolean);
}

export function validateHistoryRange(from, to, maxDays = 31) {
  if (typeof from !== 'string' || typeof to !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}T/.test(from) || !/^\d{4}-\d{2}-\d{2}T/.test(to)) return false;
  const start = Date.parse(from), end = Date.parse(to);
  return Number.isFinite(start) && Number.isFinite(end) && end > start && end - start <= maxDays * 86400000;
}

export function classifyDeviceStatus(lastUpdate, now = Date.now(), staleMinutes = 15) {
  const time = typeof lastUpdate === 'string' ? Date.parse(lastUpdate) : NaN;
  if (!Number.isFinite(time)) return 'unknown';
  if (time > now + 60000) return 'unknown';
  return now - time > staleMinutes * 60000 ? 'stale' : 'recent';
}

export function filterAllowedPositions(positions, allowedIds) {
  if (!Array.isArray(positions) || !(allowedIds instanceof Set)) return [];
  return positions.filter(p => p && Number.isSafeInteger(p.deviceId) && allowedIds.has(p.deviceId))
    .map(p => ({
      deviceId: p.deviceId,
      latitude: Number.isFinite(p.latitude) && p.latitude >= -90 && p.latitude <= 90 ? p.latitude : null,
      longitude: Number.isFinite(p.longitude) && p.longitude >= -180 && p.longitude <= 180 ? p.longitude : null,
      fixTime: typeof p.fixTime === 'string' && Number.isFinite(Date.parse(p.fixTime)) ? p.fixTime : null,
      speed: Number.isFinite(p.speed) && p.speed >= 0 ? p.speed : null,
      valid: p.valid === true
    }))
    .filter(p => p.latitude !== null && p.longitude !== null && p.valid && p.fixTime !== null);
}
