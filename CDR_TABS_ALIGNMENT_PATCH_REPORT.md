# CDR Tabs Alignment Patch

## Implemented
- Adjusted the unified portal tabs/actions bar to prevent overlap between dashboard tabs and admin action buttons.
- Kept tabs and actions in one clean command row on wide screens.
- Added responsive behavior:
  - Wide screens: tabs on the left and action buttons on the right.
  - Medium screens: tabs row first, actions row below.
  - Small screens: tabs become horizontally scrollable.
- Reduced button height/padding/font scaling so all actions fit better.
- Fixed Admin Access pill sizing/alignment inside the same action bar.
- Prevented long tab labels such as Advanced Analytics and Executive Summary from breaking layout.

## Modified file
- src/styles.css

## Notes
- No KPI cards or dashboard data elements were removed.
- This is a CSS/layout-only patch.
- Build/check could not be completed in this sandbox because dependency installation requires downloading Electron from GitHub and the environment has no external network access.
