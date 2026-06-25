# CDR KPI Row Layout Patch Report

## Request
Make **KPI Measurements** take a full separate row, then move **KPI Average Duration per Company** and **KPI Calls and Duration per Company** to the next row together.

## Applied layout
- Row 1: KPI Measurements full width.
- Row 2: KPI Average Duration per Company + KPI Calls and Duration per Company side by side.
- Row 3: Monthly KPI + KPI Total Avg. Duration side by side.
- On smaller screens, all cards stack safely to prevent overlap.

## Fit changes
- KPI Measurements table now uses full row width.
- Table columns use fixed percentage distribution from the existing colgroup.
- Cells keep single-line content with ellipsis instead of breaking layout.
- On small screens, the table can scroll horizontally to avoid clipping.

## Files patched
- `src/styles.css`
- `src/styles.legacy.backup.css`
- `dist/assets/index-B4xNOs8u.css`

## Logic impact
No CDR calculations, MySQL login, upload logic, permissions, filters, charts, exports, or KPI data logic were changed.
