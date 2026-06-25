# CDR Customer Upload Sheet Patch

## Implemented

- Customer users now start from the upload screen when no workbook is loaded.
- The upload screen is still one interface with role-based permissions.
- Customer can upload/select:
  - CDR workbook files
  - Raw call log files
  - Continue previous workbook from local database
- Admin-only actions remain restricted:
  - Master Fleetmap upload
  - Fixed Fleetmap upload
  - Sample data loading
  - Local Settings
- After a customer workbook is loaded, the customer dashboard header now includes an **Upload Sheet** button.
- Customer dashboard remains view-only for management/settings features.

## Validation

- `npm run check` completed successfully.
- `npm run build` completed successfully.
