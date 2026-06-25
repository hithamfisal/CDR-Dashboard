# CDR KPI Card Label and Density Patch

## Request
Increase KPI card label readability and reduce the right/left internal margins so long KPI values have more space to fit.

## Applied
- Increased KPI label font size and weight.
- Reduced card horizontal padding to the minimum safe spacing.
- Reduced icon size slightly to give more vertical and horizontal content space.
- Reduced KPI grid gap.
- Kept KPI cards in a 10-column row on wide screens.
- Added responsive fallback so cards auto-fit on smaller screens.
- Kept values single-line with ellipsis for very long values.
- Added `title` tooltip support already present in the component for long values.

## Files patched
- `src/styles/design-proposals.css`
- `src/styles.css`
- `dist/assets/*.css`

## Preserved
- All KPI data and calculations
- MySQL login and settings
- Upload logic
- Permissions
- Charts and filters
- Exports
