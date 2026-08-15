import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';

const app = express();
app.use(cors());
app.use(express.json({ limit: '32kb' }));

const PORT = process.env.PORT || 8787;
const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_ME_IN_PRODUCTION';
const devices = new Map();
const allowedCommands = new Set(['open_app','open_url','stop_agent','device_status']);

app.get('/health', (_req,res)=>res.json({ok:true,service:'sentinel-ai-server'}));
app.post('/pair', (req,res)=>{
  const {deviceId} = req.body || {};
  if(!deviceId || typeof deviceId !== 'string' || deviceId.length > 128) return res.status(400).json({error:'invalid_device_id'});
  const token = jwt.sign({deviceId}, JWT_SECRET, {expiresIn:'30d'});
  devices.set(deviceId, {deviceId, connected:true, pairedAt:new Date().toISOString()});
  res.json({token, deviceId});
});

function auth(req,res,next){
  try {
    const value = String(req.headers.authorization || '');
    const token = value.startsWith('Bearer ') ? value.slice(7) : '';
    req.auth = jwt.verify(token, JWT_SECRET);
    next();
  } catch { res.status(401).json({error:'unauthorized'}); }
}

app.get('/devices/:deviceId', auth, (req,res)=>{
  if(req.auth.deviceId !== req.params.deviceId) return res.status(403).json({error:'forbidden'});
  res.json(devices.get(req.params.deviceId) || {deviceId:req.params.deviceId,connected:false});
});

app.post('/commands', auth, (req,res)=>{
  const {deviceId, type, payload={}} = req.body || {};
  if(req.auth.deviceId !== deviceId) return res.status(403).json({error:'forbidden'});
  if(!allowedCommands.has(type)) return res.status(400).json({error:'command_not_allowed'});
  if(type === 'open_url' && (typeof payload.url !== 'string' || !/^https?:\/\//i.test(payload.url))) return res.status(400).json({error:'invalid_url'});
  res.status(202).json({accepted:true, command:{deviceId,type,payload}, requiresLocalAndroidPermission:true});
});

app.listen(PORT, ()=>console.log(`Sentinel AI server listening on ${PORT}`));
