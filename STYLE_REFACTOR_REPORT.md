# Style Refactor Report
## What was added
- Added `src/styles/design-control.css` as the final imported visual-control layer.
- Updated `src/main.tsx` to import `design-control.css` after `styles.css`, `header-clean.css`, and `upload-clean.css`.
- Kept `src/styles.legacy.backup.css` as a full backup of the original large CSS file before this refactor.
- The dashboard logic, Excel parsing, filtering, tabs, exports, calculations, and all 30 KPI cards were not changed.

## Why this approach was used
The project contains a long history of layered CSS patches. Removing those patches directly can change the layout because many later rules override earlier rules with `!important`. The safe approach is to add one final imported control layer that becomes the single editable layer for visual settings.

## Conflict / duplication check
The existing CSS still contains repeated historical selectors. They are intentionally kept for safety, while `design-control.css` is imported last to override them consistently. High-repeat selector areas include filters, summary KPI cards, section navigation, buttons, tables, and theme surfaces.

### Most repeated selector groups found
- `.app-shell .cdr-command-shell .followup-header-badge-right` appears about 34 times.
- `.app-shell .cdr-command-shell .followup-header-badge-left` appears about 32 times.
- `@media (max-width: 1180px)` appears about 30 times.
- `@media (max-width: 720px)` appears about 29 times.
- `.summary-cards` appears about 23 times.
- `.summary-cards.summary-cards-arranged` appears about 23 times.
- `@media (max-width: 900px)` appears about 22 times.
- `.app-shell.light-background-theme .cdr-command-shell` appears about 21 times.
- `.app-shell .cdr-command-shell` appears about 21 times.
- `.app-shell .cdr-command-shell .filters-panel` appears about 21 times.
- `.upload-shell.light-background-theme .followup-upload-card` appears about 20 times.
- `.upload-shell.dark-background-theme .followup-upload-card` appears about 20 times.
- `.upload-shell .followup-upload-card` appears about 20 times.
- `.app-shell.light-background-theme .cdr-command-shell > .topbar.followup-style-topbar.cdr-navy-banner` appears about 19 times.
- `.app-shell .cdr-command-shell > .topbar.followup-style-topbar.cdr-navy-banner` appears about 18 times.
- `.app-shell .filters-panel` appears about 17 times.
- `.upload-shell.light-background-theme .followup-upload-visual img` appears about 17 times.
- `.app-shell .cdr-command-shell .followup-header-badge-right img` appears about 17 times.
- `.app-shell.dark-background-theme .cdr-command-shell > .topbar.followup-style-topbar.cdr-navy-banner` appears about 17 times.
- `.app-shell.se-theme .cdr-command-shell > .topbar.followup-style-topbar.cdr-navy-banner` appears about 17 times.
- `@media (max-width: 980px)` appears about 16 times.
- `.app-shell .cdr-command-shell .followup-header-badge-left img` appears about 16 times.
- `.app-shell .cdr-command-shell .followup-dashboard-title` appears about 16 times.
- `.app-shell .cdr-command-shell .filter-count` appears about 16 times.
- `.upload-shell.dark-background-theme` appears about 15 times.

## Safe cleanup recommendation
Do not delete `styles.css` sections immediately. First adjust variables in `src/styles/design-control.css`. When the dashboard is stable, old duplicated blocks in `styles.css` can be removed one section at a time and tested after each removal.

## Build/test checklist after any style change
1. Run `npm run build` or `yarn build`.
2. Open the dashboard and test Upload, Overview, Charts, Fleet/Network, Company/Talkgroup/Users, Performance/KPI, Records, and Reports tabs.
3. Test dark and light theme.
4. Test filter dropdowns, search box, reset button, and info count.
