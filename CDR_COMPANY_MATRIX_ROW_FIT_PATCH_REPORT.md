# CDR Company Matrix Row Fit Patch

Implemented requested layout update for the Ticket Portal / company analytics area.

## Change
- Placed **Region Performance Matrix** and **TG Efficiency Matrix** on the same horizontal row.
- Each matrix uses 50% of the row on wide screens.
- On smaller screens, the two matrices automatically stack to avoid layout breakage.
- Matrix tables now use compact, content-aware column widths so all columns fit inside each card.
- Removed forced oversized matrix table minimum widths for this view.
- Kept all CDR logic, rows, metrics, filters, permissions, MySQL login and exports unchanged.

## Files touched
- `src/App.tsx`
- `src/styles.css`
- `src/styles.legacy.backup.css`
- `src/styles/design-proposals.css`
- `dist/assets/index-B4xNOs8u.css`

## Validation
- Static CSS and source patch applied.
- Prebuilt `dist` CSS patched directly for immediate testing without rebuilding.
