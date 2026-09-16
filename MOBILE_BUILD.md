# OnionSetu Mobile — Android + iOS (Capacitor)

Same React prototype (`src/`, Supabase backend) wrapped as a native app.
App ID: `com.onionsetu.app` · Name: `OnionSetu` · Web dir: `dist/`

## Daily workflow (web code → native)

```bash
npm run build:app   # vite build + cap sync (copies dist/ into android/ + ios/)
npm run app:android # build + open Android Studio
npm run app:ios     # build + open Xcode (macOS only)
```

## First-time native builds

### Android APK (needs Android Studio + JDK 17)
1. `npm run app:android`
2. Android Studio → `Build > Build Bundle(s)/APK(s) > Build APK(s)`
3. Debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`
4. Release: `Build > Generate Signed Bundle/APK` with your keystore.

No SDK on this machine yet — install Android Studio (includes SDK + JDK).

### iOS IPA (needs Mac + Xcode)
1. `npm run app:ios`
2. Xcode → select Team (Signing & Capabilities, bundle id `com.onionsetu.app`)
3. `Product > Archive` → Distribute (TestFlight/App Store or Ad-hoc IPA).

Camera + photo permissions are pre-declared:
- Android: `CAMERA`, `READ_MEDIA_IMAGES` (+ legacy storage ≤32)
- iOS `Info.plist`: `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`

## Mobile adaptations already in
- `capacitor.config.json` (deep links safe, splash + status bar maroon `#7A263A`)
- `vite.config.js` → `base: './'` so `file://` WebView loads chunks
- `src/App.jsx` → `HashRouter` on native, `BrowserRouter` on web
- `src/lib/native.js` → `isNative()`, `pickImageNative()` (Capacitor Camera, prompt source), `initNativeShell()`
- `src/index.css` → safe-area insets, no overscroll bounce, 16px inputs (no iOS zoom)
- Existing `<input type=file accept=image capture>` keeps working as fallback in WebView.

## Backend
Unchanged — Supabase JS + `/api/*` serverless. Ensure `VITE_SUPABASE_URL` /
`VITE_SUPABASE_ANON_KEY` are set in `.env` before `npm run build:app`.
Native uses HTTPS, so no mixed-content issues.

## What this machine can't do yet
- `flutter` / `java` / `xcodebuild` / Android SDK all missing → no local
  `gradlew assembleDebug` or `xcodebuild archive` here.
- Open `android/` in Android Studio or `ios/App/App.xcworkspace` in Xcode to produce signed binaries.

## In-app updates (Android)
Fixes ship without manual reinstalls: tag a release (`git tag vX.Y.Z && git push origin vX.Y.Z`), CI stamps the version and attaches the APK. Phones show an update banner that downloads + opens the installer in-app. See `src/lib/updater.js` + `AppUpdatePlugin.java`.
