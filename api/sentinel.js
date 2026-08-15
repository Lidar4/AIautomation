const backend = () => String(process.env.SENTINEL_BACKEND_URL || '').replace(/\/$/, '');

export default async function handler(req, res) {
  const base = backend();
  if (!base) return res.status(503).json({ error: 'backend_not_configured' });
  const path = String(req.query?.path || '');
  const allowed = /^\/(pairing\/start|pairing\/status\/[A-Za-z0-9._:-]+|control\/devices\/[A-Za-z0-9._:-]+|commands)$/.test(`/${path}`);
  if (!allowed) return res.status(404).json({ error: 'route_not_found' });
  const secret = String(req.headers['x-control-secret'] || '');
  if (!secret) return res.status(401).json({ error: 'missing_control_credentials' });
  const method = req.method || 'GET';
  const response = await fetch(`${base}/${path}`, {
    method,
    headers: { 'content-type': 'application/json', 'x-control-secret': secret },
    body: method === 'GET' ? undefined : JSON.stringify(req.body || {})
  });
  const text = await response.text();
  res.status(response.status).setHeader('content-type', response.headers.get('content-type') || 'application/json').send(text);
}
