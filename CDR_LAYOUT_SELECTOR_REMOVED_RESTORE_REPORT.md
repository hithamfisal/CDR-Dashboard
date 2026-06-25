# CDR Layout Selector Removed / Fixed Layout Restored

## Request
Remove the Layout selector and return the dashboard to a single fixed layout as before.

## Applied Changes

### Source updates
- Removed `LayoutSelector` import and usage from `src/App.tsx`.
- Removed layout props from the login screen and upload screen.
- Removed `useDashboardLayout`, `layoutClass`, and layout storage logic from `src/lib/browserCache.ts`.
- Removed `LayoutName` type from `src/types/dashboard.ts`.
- Removed `src/components/LayoutSelector.tsx`.
- Updated `src/components/UploadView.tsx` so it uses only the selected CDR theme and no layout mode.

### Static `dist` updates
- Removed the external `layout-selector.js` injection from `dist/index.html`.
- Replaced `dist/layout-selector.js` with a safe no-op cleanup file.
- Added startup cleanup to remove old `cdr-selected-ui-layout` from localStorage.
- Added CSS override to hide any old layout selector rendered by the existing prebuilt JS.
- Neutralized old `layout-command-center`, `layout-executive-analytics`, and `layout-futuristic-ops` classes so they no longer change spacing, grids, navigation, or card layout.

## What remains
- The 3-theme selector remains active:
  - Proposal 1 - Dark Command
  - Proposal 2 - Light Modern
  - Proposal 3 - Neon Futuristic
- The dashboard layout is now fixed again.
- The row separation remains:
  - Row 1: non-tab action buttons and Theme selector
  - Row 2: dashboard tab buttons only

## Validation
- `node --check dist/layout-selector.js`
- `node --check dist/assets/index-BFb2d_NV.js`
- ZIP integrity check

`npm run check` / `npm run build` were not run because the uploaded package does not include `node_modules`.
