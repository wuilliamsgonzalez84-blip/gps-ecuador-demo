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
