# CDR Filter Compact + Talkgroup Row Patch

Implemented requested filter layout adjustment:

- Reduced filter label/value font size so the filter bar matches the overall dashboard scale.
- Reduced dropdown/search/reset/count control height.
- Reduced horizontal/vertical gaps between filters.
- Moved **Talkgroup** from row 2 to row 1.
- Row 1 now contains:
  - Search Radio / User
  - Region
  - Year
  - Month
  - Company
  - Base Station
  - Talkgroup
- Row 2 now starts from the left with:
  - Call Type
  - Radio Type
  - Encryption
  - Duplex Mode
  - Reset
  - Filtered records info box
- Filtered records info box now dynamically expands to fill the remaining row width.
- Added responsive fallback for smaller screens.

Files patched:

- `src/components/DashboardFilters.tsx`
- `src/styles.css`
- `src/styles.legacy.backup.css`
- `dist/assets/index-B4xNOs8u.css`
- `dist/assets/index-BFb2d_NV.js`

No CDR logic, filters behavior, upload logic, MySQL, login, permissions, charts, KPI calculations, or exports were changed.
