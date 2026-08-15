import { useMemo, useState } from 'react';
import { Activity, Bot, Check, ChevronRight, Command, Lock, Mic, Play, Power, Shield, Smartphone, Wifi } from 'lucide-react';

const initialPermissions = [
  ['Open apps', 'Launch an installed app', true],
  ['Browser control', 'Open approved URLs and pages', true],
  ['Workspace files', 'Read/write only in the approved workspace', true],
  ['Notifications', 'Requires Android notification permission', false],
  ['Accessibility actions', 'Requires the user to enable the companion service', false],
  ['Sensitive actions', 'Always require confirmation', false],
] as const;

export default function App() {
  const [command, setCommand] = useState('');
  const [running, setRunning] = useState(false);
  const [connected, setConnected] = useState(false);
  const [voice, setVoice] = useState(false);
  const [permissions, setPermissions] = useState(initialPermissions.map(([name, desc, on]) => ({ name, desc, on })));
  const [logs, setLogs] = useState<{time:string; text:string; status:string}[]>([]);
  const enabled = useMemo(() => permissions.filter(p => p.on).length, [permissions]);

  const run = () => {
    const text = command.trim();
    if (!text || running) return;
    setRunning(true);
    setLogs(p => [{ time: new Date().toLocaleTimeString(), text, status: connected ? 'Policy check' : 'Device offline' }, ...p].slice(0, 10));
    window.setTimeout(() => setRunning(false), 700);
  };

  return <div className="agent-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-icon"><Bot size={20}/></span><div><strong>Sentinel AI</strong><small>PHONE AGENT</small></div></div>
      <div className="safe"><Shield size={13}/> USER-CONTROLLED</div>
      <nav><a className="active"><Activity size={17}/> Dashboard</a><a><Command size={17}/> Commands</a><a><Lock size={17}/> Permissions</a><a><Smartphone size={17}/> Android</a></nav>
      <div className="device"><small>ANDROID COMPANION</small><b><span className={connected ? 'dot on' : 'dot'}/> {connected ? 'Connected' : 'Not connected'}</b><p>Pair the companion app before device actions can execute.</p><button className="secondary" onClick={() => setConnected(v => !v)}>{connected ? 'Disconnect' : 'Pair device'}</button></div>
    </aside>
    <main>
      <header><div><small>PERSONAL AI AUTOMATION</small><h1>Sentinel AI</h1><p>Command your approved phone actions from one secure control center.</p></div><div className={connected ? 'status connected' : 'status'}><Wifi size={14}/>{connected ? 'Android connected' : 'Android offline'}</div></header>
      <section className="grid">
        <div className="card command-card"><div className="head"><div><small>COMMAND CENTER</small><h2>What should I do?</h2></div><button className={voice ? 'icon active' : 'icon'} onClick={() => setVoice(v => !v)}><Mic size={18}/></button></div><textarea value={command} onChange={e => setCommand(e.target.value)} placeholder="Example: Open Chrome and go to…"/><div className="actions"><button className="primary" onClick={run}><Play size={15}/>{running ? 'Checking…' : 'Run command'}</button><span>{voice ? 'Voice mode on' : 'Text mode'}</span></div><div className="policy"><Shield size={17}/><span><b>Permission-first execution.</b> The agent cannot grant itself new Android permissions.</span></div></div>
        <div className="card"><div className="head"><div><small>PERMISSION POLICY</small><h2>{enabled} enabled</h2></div><Lock size={17}/></div>{permissions.map((p,i)=><div className="permission" key={p.name}><div><b>{p.name}</b><small>{p.desc}</small></div><button className={p.on ? 'toggle on' : 'toggle'} onClick={() => setPermissions(x => x.map((v,j)=>j===i?{...v,on:!v.on}:v))}><span/></button></div>)}</div>
        <div className="card"><div className="head"><div><small>ACTIVITY LOG</small><h2>Recent commands</h2></div><Activity size={17}/></div>{logs.length===0?<div className="empty"><Command size={22}/><b>No commands yet</b><span>Approved actions will appear here.</span></div>:logs.map((l,i)=><div className="log" key={i}><time>{l.time}</time><b>{l.text}</b><span>{l.status}</span></div>)}</div>
        <div className="card roadmap"><small>PRODUCTION BUILD</small><h2>System status</h2>{[['Web control center',true],['Policy engine',true],['Android companion API',false],['Accessibility service',false],['Authenticated device channel',false],['Voice pipeline',false]].map(([x,done])=><div key={String(x)}><Check size={15}/><span>{x}</span><em>{done?'READY':'BUILD NEXT'}</em><ChevronRight size={14}/></div>)}</div>
      </section>
      <footer><span><Power size={13}/> Sentinel AI</span><span>Explicit commands only</span><span>Android permissions required for device actions</span></footer>
    </main>
  </div>;
}
