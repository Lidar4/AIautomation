import { useEffect, useMemo, useState } from 'react';
import { Activity, Bot, Check, ChevronRight, Command, KeyRound, Lock, Mic, Play, Power, Shield, Smartphone, Wifi, X } from 'lucide-react';
import './sentinel.css';
import './pairing.css';

const API = (import.meta.env.VITE_SENTINEL_API || '').replace(/\/$/, '');
const initialPermissions = [
  ['Open apps', 'Launch an installed app', true],
  ['Browser control', 'Open approved URLs and pages', true],
  ['Workspace files', 'Read/write only in the approved workspace', true],
  ['Notifications', 'Requires Android notification permission', false],
  ['Accessibility actions', 'Requires the user to enable the companion service', false],
  ['Sensitive actions', 'Always require confirmation', false],
] as const;

type Log = { time: string; text: string; status: string };

export default function App() {
  const [command, setCommand] = useState(''); const [running, setRunning] = useState(false); const [connected, setConnected] = useState(false); const [voice, setVoice] = useState(false);
  const [deviceId, setDeviceId] = useState(localStorage.getItem('sentinelDeviceId') || '');
  const [controlSecret, setControlSecret] = useState(sessionStorage.getItem('sentinelControlSecret') || ''); const [pairingCode, setPairingCode] = useState(''); const [pairingSession, setPairingSession] = useState(''); const [pairingBusy, setPairingBusy] = useState(false); const [pairingOpen, setPairingOpen] = useState(false);
  const [permissions, setPermissions] = useState(initialPermissions.map(([name, desc, on]) => ({ name, desc, on }))); const [logs, setLogs] = useState<Log[]>([]); const enabled = useMemo(() => permissions.filter(p => p.on).length, [permissions]);

  function saveControlSecret(value: string) { setControlSecret(value); if (value) sessionStorage.setItem('sentinelControlSecret', value); else sessionStorage.removeItem('sentinelControlSecret'); }
  function log(text: string, status: string) { setLogs(p => [{ time: new Date().toLocaleTimeString(), text, status }, ...p].slice(0, 10)); }

  async function startPairing() {
    if (!API || !controlSecret.trim()) return log('Pairing session', 'API URL + control secret required');
    setPairingBusy(true); setPairingCode(''); setPairingSession('');
    try { const r = await fetch(`${API}/pairing/start`, { method: 'POST', headers: { 'x-control-secret': controlSecret.trim() } }); const d = await r.json(); if (!r.ok) throw new Error(d.error || 'pairing_start_failed'); setPairingCode(d.code); setPairingSession(d.sessionId); setPairingOpen(true); log('Pairing session started', `Code ${d.code}`); }
    catch (e) { log('Pairing session', e instanceof Error ? e.message : 'Network error'); } finally { setPairingBusy(false); }
  }

  useEffect(() => {
    if (!pairingSession || !controlSecret || !API) return; let stopped = false;
    const poll = async () => { try { const r = await fetch(`${API}/pairing/status/${encodeURIComponent(pairingSession)}`, { headers: { 'x-control-secret': controlSecret } }); const d = await r.json(); if (!r.ok) throw new Error(d.error || 'pairing_status_failed'); if (d.status === 'paired' && d.deviceId && !stopped) { localStorage.setItem('sentinelDeviceId', d.deviceId); setDeviceId(d.deviceId); setConnected(true); setPairingOpen(false); setPairingSession(''); log('Android companion paired', 'Authenticated channel ready'); } } catch (e) { if (!stopped) log('Pairing channel', e instanceof Error ? e.message : 'Network error'); } };
    poll(); const id = window.setInterval(poll, 2000); return () => { stopped = true; window.clearInterval(id); };
  }, [pairingSession, controlSecret]);

  async function sync() { if (!controlSecret || !deviceId || !API) return setConnected(false); try { const r = await fetch(`${API}/control/devices/${encodeURIComponent(deviceId)}`, { headers: { 'x-control-secret': controlSecret } }); if (!r.ok) return setConnected(false); const d = await r.json(); setConnected(Boolean(d.connected)); } catch { setConnected(false); } }
  useEffect(() => { sync(); const id = window.setInterval(sync, 5000); return () => window.clearInterval(id); }, [controlSecret, deviceId]);

  async function run() {
    const text = command.trim(); if (!text || running) return; if (!controlSecret || !deviceId) return log(text, 'Pair Android first'); setRunning(true);
    try { const r = await fetch(`${API}/commands`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-control-secret': controlSecret }, body: JSON.stringify({ deviceId, type: 'open_url', payload: { url: text } }) }); const d = await r.json(); log(text, r.ok ? `Accepted · ${d.command?.commandId?.slice(0, 8) || 'queued'}` : (d.error || 'Rejected')); } catch { log(text, 'Network error'); } finally { setRunning(false); }
  }

  return <div className="agent-shell"><aside className="sidebar"><div className="brand"><span className="brand-icon"><Bot size={20}/></span><div><strong>Sentinel AI</strong><small>PHONE AGENT</small></div></div><div className="safe"><Shield size={13}/> USER-CONTROLLED</div><nav><a className="active" href="#dashboard"><Activity size={17}/> Dashboard</a><a href="#commands"><Command size={17}/> Commands</a><a href="#permissions"><Lock size={17}/> Permissions</a><a href="#android"><Smartphone size={17}/> Android</a></nav><div className="device"><small>ANDROID COMPANION</small><b><span className={connected?'dot on':'dot'}/> {connected?'Connected':'Not connected'}</b><p>{connected?'Authenticated device channel is active.':'Pair the companion app before device actions can execute.'}</p><button className="secondary" onClick={() => setPairingOpen(true)}>{connected?'Manage pairing':'Pair device'}</button></div></aside>
    <main id="dashboard"><header><div><small>PERSONAL AI AUTOMATION</small><h1>Sentinel AI</h1><p>Command your approved phone actions from one secure control center.</p></div><div className={connected?'status connected':'status'}><Wifi size={14}/>{connected?'Android connected':'Android offline'}</div></header>
      <section className="grid"><div className="card command-card" id="commands"><div className="head"><div><small>COMMAND CENTER</small><h2>What should I do?</h2></div><button className={voice?'icon active':'icon'} onClick={()=>setVoice(v=>!v)}><Mic size={18}/></button></div><textarea value={command} onChange={e=>setCommand(e.target.value)} placeholder="Enter an approved URL…"/><div className="actions"><button className="primary" onClick={run}><Play size={15}/>{running?'Sending…':'Run command'}</button><span>{voice?'Voice mode on':'Text mode'}</span></div><div className="policy"><Shield size={17}/><span><b>Permission-first execution.</b> The agent cannot grant itself new Android permissions.</span></div></div>
        <div className="card" id="permissions"><div className="head"><div><small>PERMISSION POLICY</small><h2>{enabled} enabled</h2></div><Lock size={17}/></div>{permissions.map((p,i)=><div className="permission" key={p.name}><div><b>{p.name}</b><small>{p.desc}</small></div><button className={p.on?'toggle on':'toggle'} onClick={()=>setPermissions(x=>x.map((v,j)=>j===i?{...v,on:!v.on}:v))}><span/></button></div>)}</div>
        <div className="card" id="android"><div className="head"><div><small>ACTIVITY LOG</small><h2>Recent commands</h2></div><Activity size={17}/></div>{logs.length===0?<div className="empty"><Command size={22}/><b>No commands yet</b><span>Approved actions will appear here.</span></div>:logs.map((l,i)=><div className="log" key={i}><time>{l.time}</time><b>{l.text}</b><span>{l.status}</span></div>)}</div>
        <div className="card roadmap"><small>PRODUCTION BUILD</small><h2>System status</h2>{[['Web control center',true],['Policy engine',true],['Authenticated pairing session',true],['Android companion channel',true],['Accessibility service',false],['Voice pipeline',false]].map(([x,done])=><div key={String(x)}><Check size={15}/><span>{x}</span><em>{done?'READY':'BUILD NEXT'}</em><ChevronRight size={14}/></div>)}</div></section>
      <footer><span><Power size={13}/> Sentinel AI</span><span>Explicit commands only</span><span>Android permissions required for device actions</span></footer></main>
      {pairingOpen && <div className="modal-backdrop"><div className="pair-modal"><button className="modal-close" onClick={()=>setPairingOpen(false)}><X size={18}/></button><div className="pair-icon"><KeyRound size={20}/></div><small>SECURE ANDROID PAIRING</small><h2>{connected?'Android companion connected':'Pair your Android companion'}</h2><p>The control secret stays in this browser session and is never sent to the Android companion.</p><label>Server API URL<input value={API} readOnly placeholder="Set VITE_SENTINEL_API in production"/></label><label>Control secret<input type="password" value={controlSecret} onChange={e=>saveControlSecret(e.target.value)} placeholder="Your CONTROL_PANEL_SECRET"/></label><button className="primary wide" disabled={pairingBusy || !controlSecret.trim()} onClick={startPairing}>{pairingBusy?'Starting…':'Generate pairing code'}</button>{pairingCode && <div className="pair-code"><small>ENTER THIS CODE IN THE ANDROID COMPANION</small><strong>{pairingCode}</strong><span>{pairingSession?'Waiting for authenticated claim…':''}</span></div>}</div></div>}
  </div>;
}
