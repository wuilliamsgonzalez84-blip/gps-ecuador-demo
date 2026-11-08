// Future multi-tenant authorization primitives. Never trust organizationId from a browser request.
export function canReadVehicle(user, vehicle) {
  if (!user || !vehicle || user.active !== true) return false;
  if (!Number.isSafeInteger(user.organizationId) || !Number.isSafeInteger(vehicle.organizationId)) return false;
  if (user.organizationId !== vehicle.organizationId) return false;
  if (user.role === 'owner' || user.role === 'admin') return true;
  return user.role === 'viewer' && Array.isArray(user.vehicleIds) && user.vehicleIds.includes(vehicle.id);
}
export function visibleVehicles(user, vehicles) {
  return Array.isArray(vehicles) ? vehicles.filter(vehicle => canReadVehicle(user,vehicle)) : [];
}
