import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

export const isNative = () => Capacitor.isNativePlatform();
export const platform = () => Capacitor.getPlatform(); // 'ios' | 'android' | 'web'

export async function initNativeShell() {
  if (!isNative()) return;
  try {
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: '#7A263A' });
  } catch {}
  try {
    await SplashScreen.hide();
  } catch {}
}

/** Camera-first image pick with web <input> fallback. Returns dataUrl or null. */
export async function pickImageNative() {
  if (!isNative()) return null;
  try {
    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      source: CameraSource.Prompt,
      resultType: CameraResultType.DataUrl,
    });
    return photo.dataUrl || null;
  } catch (e) {
    if (String(e?.message || e).includes('cancel')) return null;
    return null;
  }
}
