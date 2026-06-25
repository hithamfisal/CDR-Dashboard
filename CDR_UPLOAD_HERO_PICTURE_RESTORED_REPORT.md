# CDR Upload Hero Picture Restored

## Change Applied
Restored the right-side CDR/Hytera visual image on the upload/customer landing screen.

## Fixed
- The previous cleanup patch hid `.followup-upload-visual` with `display: none`.
- The upload card was forced to one column, so the image area disappeared.
- Restored a safe two-column upload layout on desktop:
  - Left: CDR upload controls and workbook actions
  - Right: visual image `/assets/h.png`
- Kept responsive behavior:
  - Desktop: image on the right
  - Smaller screens: image moves below the upload controls

## Preserved
- Theme selector remains active.
- Layout selector remains removed.
- Role permissions remain unchanged.
- Upload buttons, sample data, continue previous workbook, and fleetmap upload remain unchanged.

## Files Patched
- `src/styles/design-control.css`
- `dist/assets/index-B4xNOs8u.css`
