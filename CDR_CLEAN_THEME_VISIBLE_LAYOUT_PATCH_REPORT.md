# CDR Clean Theme + Visible Layout Selector Patch

## Date
2026-06-24

## Scope
This patch cleans the CDR UI proposal selectors so the program uses the proposed CDR themes only and makes the layout selector visibly change the dashboard structure.

## Theme cleanup
Removed the old dark/light theme class dependency from the app runtime class output.

The active shell classes are now clean proposal classes only:

- `theme-dark-command`
- `theme-light-modern`
- `theme-neon-futuristic`

Legacy theme classes are no longer emitted by the source theme helper:

- Removed `dark-background-theme` from theme output
- Removed `light-background-theme` from theme output
- Added cleanup for older localStorage theme keys
- Kept the new selected theme saved under `cdr-selected-ui-theme`

## Theme selector options
The theme dropdown now shows:

1. Proposal 1 - Dark Command Center
2. Proposal 2 - Light Modern Analytics
3. Proposal 3 - Neon Futuristic

## Layout selector options
The layout dropdown now shows:

1. Layout 1 - Command Center
2. Layout 2 - Executive Analytics
3. Layout 3 - Futuristic Ops

## What the layout selector changes now

### Layout 1 - Command Center
- Full-width NOC/operations layout
- Horizontal tabs
- Full-width CDR command shell
- Standard dashboard density

### Layout 2 - Executive Analytics
- Centered report-style dashboard frame
- Softer card grouping
- Wider reading space
- Centered tabs and actions
- KPI cards arranged for executive review
- Main content constrained to a presentation-friendly width

### Layout 3 - Futuristic Ops
- Compact control-room layout
- Dashboard navigation becomes a left vertical rail on wide screens
- Filters move beside the navigation rail
- Higher KPI/card density
- Smaller radius and tighter spacing
- More visible operations-console structure

## Static dist patch
Because this package includes a prebuilt static `dist`, the patch also updates:

- `dist/assets/index-BFb2d_NV.js`
- `dist/assets/index-B4xNOs8u.css`
- `dist/layout-selector.js`

This allows the theme/layout selectors to work even if the user opens the prebuilt `dist` without rebuilding first.

## Modified files
- `src/lib/browserCache.ts`
- `src/components/UploadView.tsx`
- `src/components/ThemeSelector.tsx`
- `src/components/LayoutSelector.tsx`
- `src/styles.css`
- `dist/assets/index-BFb2d_NV.js`
- `dist/assets/index-B4xNOs8u.css`
- `dist/layout-selector.js`

## Validation
- Static layout selector JavaScript syntax checked with `node --check dist/layout-selector.js`.
- Legacy emitted theme class strings removed from source helpers and patched static JS.

## Notes
Full `npm run check` and `npm run build` were not run in this environment because `node_modules` are not included in the uploaded ZIP. The static `dist` was patched directly so the delivered package remains usable without rebuilding.
