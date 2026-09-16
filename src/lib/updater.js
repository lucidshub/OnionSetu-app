import { Capacitor, registerPlugin } from '@capacitor/core';
import { platform, isNative } from './native';

const AppUpdate = registerPlugin('AppUpdate');
const REPO = 'lucidshub/OnionSetu-app';

function norm(v) {
  return String(v || '').replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
}

/** -1 current older, 0 equal, 1 current newer */
export function compareVersions(a, b) {
  const pa = norm(a), pb = norm(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0, y = pb[i] || 0;
    if (x < y) return -1;
    if (x > y) return 1;
  }
  return 0;
}

export const supportsInAppUpdate = () => isNative() && platform() === 'android';

export async function getCurrentVersion() {
  if (!supportsInAppUpdate()) return null;
  try {
    const { versionName } = await AppUpdate.getVersion();
    return versionName;
  } catch {
    return null;
  }
}

/**
 * Returns { current, latest, url, notes } when an update is available, else null.
 * Source of truth: latest GitHub Release with an .apk asset.
 */
export async function checkForUpdate() {
  if (!supportsInAppUpdate()) return null;
  const [current, res] = await Promise.all([
    getCurrentVersion(),
    fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json' },
    }),
  ]);
  if (!res.ok) return null;
  const rel = await res.json();
  if (rel.draft || rel.prerelease) return null;
  const apk = (rel.assets || []).find(a => /\.apk$/i.test(a.name || ''));
  if (!apk) return null;
  if (compareVersions(current, rel.tag_name) >= 0) return null;
  return {
    current,
    latest: rel.tag_name,
    url: apk.browser_download_url,
    fileName: apk.name,
    notes: rel.body || '',
    page: rel.html_url,
  };
}

export async function startUpdate(url, fileName, onEvent) {
  const sub1 = await AppUpdate.addListener('downloadComplete', () => onEvent?.('installing'));
  const sub2 = await AppUpdate.addListener('installError', (e) => onEvent?.('error', e?.error));
  try {
    await AppUpdate.downloadAndInstall({ url, fileName });
    onEvent?.('downloading');
  } catch (e) {
    onEvent?.('error', String(e?.message || e));
  }
  return () => { sub1.remove(); sub2.remove(); };
}
