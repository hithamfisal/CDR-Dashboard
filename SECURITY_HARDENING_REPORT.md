# Security Hardening Check Report

## Result
The project output was checked and a hardened package was prepared.

## Confirmed clean
- No runtime Manus plugin imports were found in `vite.config.ts`.
- No `vite-plugin-manus-runtime` dependency was found in `package.json`.
- No `__manus__` runtime folder was present in the source output.
- No hardcoded API keys, bearer tokens, passwords, or backend secrets were found in the source files.

## Hardened items added
- Added `.htaccess` to the project root and `dist/.htaccess`.
- Added Apache security headers:
  - `Content-Security-Policy`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy` disabling camera, microphone, geolocation, payment, USB, Bluetooth, serial, accelerometer, gyroscope, and magnetometer.
- Added SPA fallback rules for React/Vite routing.
- Added CSP meta tag to `dist/index.html` so the built output keeps browser-side protection even if server headers are not active.

## Remaining security notes
1. The dashboard stores uploaded workbook/fleetmap data in browser IndexedDB for the “continue previous workbook” feature. This is convenient, but on a shared PC it means data may remain in the browser profile. For stricter confidentiality, add a visible “Clear Saved Dashboard Data” button or disable browser persistence.
2. Google Fonts are loaded from `fonts.googleapis.com` and `fonts.gstatic.com`. For maximum offline/privacy security, self-host the fonts and remove those external domains from the CSP.
3. The sample files in `public/Samples` and `dist/Samples` are public when uploaded to hosting. Keep only safe sample data there.
4. The package includes desktop build scripts in `package.json`, but no `electron/` folder was present in this ZIP. Remove those scripts/dependencies if you are not using the desktop package.

## Recommended upload to Namecheap
Upload only the contents of `dist/` to `public_html`:

```text
public_html/
  index.html
  assets/
  Samples/
  .htaccess
```

Do not upload source folders such as `src/`, `public/`, or `node_modules/` to public hosting.
