# CDR Customer Admin / Customer Permissions Patch

## Implemented

- Added a third local role: `Customer Admin`.
- Kept one unified interface and local IndexedDB credential storage.
- Customer Admin can upload customer sheets without system admin controls.
- Customer has dashboard view-only access.
- Customer does not see Admin Access, Local Settings, Add Region, New workbook(s), Upload Sheet, sample-data upload, Master Fleetmap, or Fixed Fleetmap controls.
- Local Settings remains visible only to System Admin.
- Removed default admin credentials from the login screen so admin codes are not displayed to customers.

## Default local credentials

- System Admin: `admin / Admin@12345`
- Customer Admin: `customeradmin / CustomerAdmin@12345`
- Customer: `customer / Customer@12345`

## Entry shortcuts

- `admin.html` -> `index.html#admin`
- `customer-admin.html` -> `index.html#customer-admin`
- `customer.html` -> `index.html#customer`

## Files changed

- `src/App.tsx`
- `src/components/UploadView.tsx`
- `src/lib/localAppDatabase.ts`
- `admin.html`
- `customer.html`
- `customer-admin.html`
