# CDR One Interface + Role Permissions + Local Database Report

## Implemented

- Converted the project to one main interface through `index.html`.
- Removed the user-facing Admin/Customer portal switch concept from the login flow.
- Added one login screen with role-based access:
  - Admin: full upload, fleetmap, saved workbook, report/admin controls.
  - Customer: read-only customer dashboard view.
- Added a local browser database using IndexedDB.
- Added default seeded local credentials on first run:
  - Admin: `admin` / `Admin@12345`
  - Customer: `customer` / `Customer@12345`
- Added local settings saved in IndexedDB:
  - Company name
  - Admin title
  - Customer title
  - Customer description
  - Support email
  - Support phone
  - Primary color
- Added Admin-only local settings panel to update credentials and interface settings.
- Added session storage login state and logout.
- Updated `admin.html` and `customer.html` to redirect to the same `index.html` interface.

## Main Files Changed

- `src/App.tsx`
- `src/components/UploadView.tsx`
- `src/lib/localAppDatabase.ts`
- `src/styles.css`
- `admin.html`
- `customer.html`

## Validation

- `npm exec tsc -- --noEmit` passed.
- `npm run build` passed.

## Notes

This is a local browser database implementation. Data is saved on the same browser/device profile using IndexedDB. For multi-user/shared-server authentication, a backend database and API would still be required later.
