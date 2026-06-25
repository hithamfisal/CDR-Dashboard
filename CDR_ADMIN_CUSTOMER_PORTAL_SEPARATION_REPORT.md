# CDR Admin / Customer Portal Separation Report

## Implemented

- Added separate static portal entry files:
  - `admin.html` opens `index.html#admin-portal`
  - `customer.html` opens `index.html#customer-portal`
- Admin Portal remains the only place for:
  - CDR workbook upload
  - Raw system upload
  - Master Fleetmap upload
  - Fixed Fleetmap upload
  - Loading saved/sample workbook
  - Report/admin actions
- Customer Portal is now read-only:
  - No upload file inputs
  - No fleetmap management buttons
  - No visible Admin Portal switcher inside the customer page
  - Customer page has its own standalone header and customer badge
- Customer Portal keeps only customer-facing analytics:
  - Filters
  - KPI summary strip
  - Modern overview
  - Empty state if no workbook is loaded

## Direct URLs

- Admin Portal: `/admin.html` or `/index.html#admin-portal`
- Customer Portal: `/customer.html` or `/index.html#customer-portal`

## Modified files

- `src/App.tsx`
- `src/styles.css`
- `admin.html`
- `customer.html`
- `CDR_ADMIN_CUSTOMER_PORTAL_SEPARATION_REPORT.md`
