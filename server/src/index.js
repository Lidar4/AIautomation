import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

const app = express();
app.use(cors());
app.use(express.json({ limit: '32kb' }));

const PORT = Number(process.env.PORT || 8787);
const JWT_SECRET = process.env.JWT_SECRET;
const CONTROL_PANEL_SECRET = process.env.CONTROL_PANEL_SECRET;
const PAIRING_TTL_MS = 5 * 60 * 1000;
const DEVICE_TOKEN_TTL = '30d';

const devices = new Map();
const pairingSessions = new Map();
const commandQueues = new Map();
const allowedCommands = new Set(['open_app', 'open_url', 'stop_agent', 'device_status']);

app.get('/health', (_req, res) => res.json({
  ok: true,
  service: 'sentinel-ai-server',
  pairing: Boolean(JWT_SECRET && CONTROL_PANEL_SECRET),
}));

function requireProductionSecrets(res) {
  if (!JWT_SECRET || !CONTROL_PANEL_SECRET) {
    res.status(503).json({ error: 'server_not_configured' });
    return false;
  }
  return true;
}

function requireControlSecret(req, res, next) {
  if (!requireProductionSecrets(res)) return;
  const supplied = String(req.headers['x-control-secret'] || '');
  const a = Buffer.from(supplied);
  const b = Buffer.from(CONTROL_PANEL_SECRET);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: 'invalid_control_credentials' });
  }
  next();
}

function auth(req, res, next) {
  if (!requireProductionSecrets(res)) return;
  try {
    const value = String(req.headers.authorization || '');
    const token = value.startsWith('Bearer ') ? value.slice(7) : '';
    req.auth = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'unauthorized' });
  }
}

function cleanExpiredPairingSessions() {
  const now = Date.now();
  for (const [code, session] of pairingSessions) {
    if (session.expiresAt <= now || session.claimed) pairingSessions.delete(code);
  }
}

app.post('/pairing/start', requireControlSecret, (_req, res) => {
  cleanExpiredPairingSessions();
  const code = crypto.randomInt(100000, 1000000).toString();
  pairingSessions.set(code, { expiresAt: Date.now() + PAIRING_TTL_MS, claimed: false });
  res.json({ code, expiresInSeconds: PAIRING_TTL_MS / 1000 });
});

app.post('/pairing/claim', (req, res) => {
  if (!requireProductionSecrets(res)) return;
  cleanExpiredPairingSessions();
  const { code, deviceId } = req.body || {};
  if (!/^\d{6}$/.test(String(code || '')) || !/^[A-Za-z0-9._:-]{8,128}$/.test(String(deviceId || ''))) {
    return res.status(400).json({ error: 'invalid_pairing_request' });
  }
  const session = pairingSessions.get(String(code));
  if (!session || session.claimed || session.expiresAt <= Date.now()) {
    return res.status(410).json({ error: 'pairing_code_expired_or_used' });
  }
  session.claimed = true;
  const token = jwt.sign({ sub: deviceId, deviceId, scope: 'device' }, JWT_SECRET, { expiresIn: DEVICE_TOKEN_TTL });
  devices.set(deviceId, { deviceId, connected: true, pairedAt: new Date().toISOString(), lastSeenAt: new Date().toISOString() });
  commandQueues.set(deviceId, commandQueues.get(deviceId) || []);
  res.json({ token, deviceId, expiresIn: DEVICE_TOKEN_TTL });
});

app.post('/devices/:deviceId/heartbeat', auth, (req, res) => {
  if (req.auth.deviceId !== req.params.deviceId) return res.status(403).json({ error: 'forbidden' });
  const device = devices.get(req.params.deviceId) || { deviceId: req.params.deviceId };
  device.connected = true;
  device.lastSeenAt = new Date().toISOString();
  devices.set(req.params.deviceId, device);
  res.json({ ok: true, device });
});

app.get('/devices/:deviceId', auth, (req, res) => {
  if (req.auth.deviceId !== req.params.deviceId) return res.status(403).json({ error: 'forbidden' });
  res.json(devices.get(req.params.deviceId) || { deviceId: req.params.deviceId, connected: false });
});

app.get('/channel/next', auth, (req, res) => {
  const deviceId = req.auth.deviceId;
  const queue = commandQueues.get(deviceId) || [];
  const command = queue.shift() || null;
  commandQueues.set(deviceId, queue);
  res.json({ command });
});

app.post('/channel/ack', auth, (req, res) => {
  const { commandId, ok, error } = req.body || {};
  if (typeof commandId !== 'string' || commandId.length < 8 || commandId.length > 128) {
    return res.status(400).json({ error: 'invalid_command_id' });
  }
  res.json({ ok: true, commandId, accepted: Boolean(ok), error: error || null });
});

app.post('/commands', requireControlSecret, (req, res) => {
  const { deviceId, type, payload = {} } = req.body || {};
  if (!devices.has(deviceId)) return res.status(404).json({ error: 'device_not_paired' });
  if (!allowedCommands.has(type)) return res.status(400).json({ error: 'command_not_allowed' });
  if (type === 'open_url' && (typeof payload.url !== 'string' || !/^https?:\/\//i.test(payload.url))) {
    return res.status(400).json({ error: 'invalid_url' });
  }
  const command = { commandId: crypto.randomUUID(), deviceId, type, payload, createdAt: new Date().toISOString() };
  const queue = commandQueues.get(deviceId) || [];
  queue.push(command);
  commandQueues.set(deviceId, queue);
  res.status(202).json({ accepted: true, command });
});

app.listen(PORT, () => console.log(`Sentinel AI server listening on ${PORT}`));
