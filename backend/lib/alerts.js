export function evaluateAlerts(vehicle, position, settings = {}) {
  if (!vehicle || !position || vehicle.id !== position.deviceId || position.valid !== true) return [];
  const alerts = [];
  const limitKmh = settings.speedLimitKmh;
  // Traccar reports speed in knots. Convert to km/h before comparing.
  if (Number.isFinite(limitKmh) && limitKmh > 0 && Number.isFinite(position.speed) && position.speed >= 0) {
    const kmh = position.speed * 1.852;
    if (kmh > limitKmh) alerts.push({type:'speeding',deviceId:vehicle.id,speedKmh:Math.round(kmh),thresholdKmh:limitKmh});
  }
  return alerts;
}
export function connectionAlert(vehicle, now = Date.now(), minutes = 30) {
  if (!vehicle || !Number.isSafeInteger(vehicle.id) || !Number.isFinite(minutes) || minutes <= 0) return null;
  const last = Date.parse(vehicle.lastUpdate);
  if (!Number.isFinite(last) || last > now + 60000) return null;
  return now - last >= minutes * 60000 ? {type:'offline',deviceId:vehicle.id,lastUpdate:vehicle.lastUpdate} : null;
}
