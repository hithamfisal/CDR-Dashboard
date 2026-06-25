# CDR Role Permission Correction Report

## Implemented role matrix

### System Admin
- Sees Local Settings.
- Can modify credentials from Local Settings.
- Can upload CDR / Raw workbooks.
- Can load sample data.
- Can continue previous workbook.
- Can upload Master Fleetmap and Fixed Fleetmap.
- Sees all dashboard tabs.
- Sees System Admin-only actions such as Add Region / New workbook(s).

### Customer Admin
- Can upload sheet.
- Can load sample data.
- Can continue previous workbook.
- Sees all dashboard tabs.
- Sees Local Settings.
- Does not see Admin Access.
- Sees and can upload Master Fleetmap and Fixed Fleetmap.
- Does not get credential management inside Local Settings.

### Customer
- Can upload sheet.
- Can load sample data.
- Can continue previous workbook.
- Sees all dashboard tabs.
- Does not see Local Settings.
- Does not see Admin Access.
- Sees and can upload Master Fleetmap and Fixed Fleetmap.

## Files updated
- `src/App.tsx`
- `src/components/UploadView.tsx`

## Validation
- `npm run check` passed.
- `npm run build` passed.
