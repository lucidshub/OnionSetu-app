import { useEffect, useState } from 'react';
import { checkForUpdate, startUpdate, supportsInAppUpdate } from '../lib/updater';

/**
 * In-app update banner (Android sideloaded builds).
 * Checks latest GitHub Release on launch; downloads + opens installer in-app.
 */
export default function AppUpdater() {
  const [info, setInfo] = useState(null);
  const [phase, setPhase] = useState('idle'); // idle | downloading | installing | error
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!supportsInAppUpdate()) return;
    let live = true;
    const last = localStorage.getItem('onionsetu_update_dismissed');
    checkForUpdate().then(r => {
      if (!live || !r) return;
      if (last === r.latest) return; // user dismissed this version
      setInfo(r);
    }).catch(() => {});
    return () => { live = false; };
  }, []);

  if (!info || !supportsInAppUpdate()) return null;

  function dismiss() {
    localStorage.setItem('onionsetu_update_dismissed', info.latest);
    setInfo(null);
  }

  async function update() {
    setPhase('downloading');
    setErr('');
    await startUpdate(info.url, info.fileName, (ev, msg) => {
      if (ev === 'downloading') setPhase('downloading');
      if (ev === 'installing') setPhase('installing');
      if (ev === 'error') { setPhase('error'); setErr(msg || 'Update failed'); }
    });
  }

  const text =
    phase === 'downloading' ? 'Downloading update… keep the app open. You can keep working.' :
    phase === 'installing' ? 'Download done — opening installer… tap Install when asked.' :
    phase === 'error' ? `Update failed${err ? `: ${err}` : ''}. Try again or grab it from GitHub Releases.` :
    `New version ${info.latest} available (you have ${info.current || 'dev'}).`;

  return (
    <div style={{
      margin: 12, padding: 12, borderRadius: 12, display: 'flex', gap: 10, alignItems: 'center',
      background: '#FEF3D8', border: '1px solid #F2B84B', fontSize: 13,
    }}>
      <span style={{ fontSize: 18 }}>⬆️</span>
      <div style={{ flex: 1 }}>{text}</div>
      {phase !== 'downloading' && phase !== 'installing' && (
        <>
          <button className="btn btn-primary" style={{ padding: '8px 12px', fontSize: 13 }} onClick={update}>
            {phase === 'error' ? 'Retry' : 'Update'}
          </button>
          <button className="btn btn-secondary" style={{ padding: '8px 10px', fontSize: 13 }} onClick={dismiss}>Later</button>
        </>
      )}
    </div>
  );
}
