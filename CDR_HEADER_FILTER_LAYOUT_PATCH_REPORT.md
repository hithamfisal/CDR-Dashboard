# CDR Header / Filter Layout Patch

## Scope
- Returned the command header to full width across the page.
- Moved the sidebar tabs to the far-left edge directly under the header.
- Moved the filter panel up beside the tabs, removing the large empty area.
- Expanded dashboard content below the shell to use the full available page width.
- Removed the logo from the sidebar/tabs area.
- Removed the Dashboard PDF button from the top header actions.

## Preserved
No CDR data, KPI cards, charts, filters, parsing logic, fleetmap mapping, reports, or export functions were intentionally removed. Only the requested Dashboard PDF header shortcut was removed from the visible header.

## Files changed
- `src/App.tsx`
- `src/styles.css`
