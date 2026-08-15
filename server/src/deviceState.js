const devices = new Map();

export function setDeviceOnline(deviceId, extra = {}) {
  const current = devices.get(deviceId) || {};
  const device = { ...current, deviceId, connected: true, lastSeen: new Date().toISOString(), ...extra };
  devices.set(deviceId, device);
  return device;
}

export function setDeviceOffline(deviceId) {
  const current = devices.get(deviceId) || { deviceId };
  const device = { ...current, connected: false, lastSeen: current.lastSeen || null, disconnectedAt: new Date().toISOString() };
  devices.set(deviceId, device);
  return device;
}

export function getDevice(deviceId) {
  return devices.get(deviceId) || { deviceId, connected: false, lastSeen: null };
}

export function listDevices() { return [...devices.values()]; }
