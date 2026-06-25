# CDR Customer Sample Data Enabled Patch

## Change
Enabled **Load sample data** for customer users in the unified role-based interface.

## Permission result
- Admin: can load sample data.
- Customer: can load sample data.
- Customer still cannot directly upload/manage Master Fleetmap or Fixed Fleetmap files.
- Customer still cannot open Local Settings.

## Modified file
- `src/components/UploadView.tsx`

## Technical detail
Removed the `!isAdmin` condition from the `Load sample data` button disabled state. The button is now disabled only while the app is already loading/parsing data.
