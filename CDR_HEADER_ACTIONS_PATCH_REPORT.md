# CDR Header Actions Patch Report

## Request
Return the original CDR header to the top and place the main action buttons on the header.

## Applied
- Moved these buttons into the top header bar:
  - Light/Dark Theme
  - Home
  - Add Region
  - New workbook(s)
  - Dashboard PDF
- Removed the separate action toolbar row from below the header.
- Kept the original header structure with:
  - SE logo on the left
  - Active page title centered
  - NASCO logo on the right
- Reduced header height so the dashboard starts closer to the top like the reference layout.

## Preserved
No dashboard data, KPI cards, filters, charts, tables, parsing logic, fleetmap mapping, exports, or report logic were removed.

## Files changed
- `src/App.tsx`
- `src/styles/design-control.css`
