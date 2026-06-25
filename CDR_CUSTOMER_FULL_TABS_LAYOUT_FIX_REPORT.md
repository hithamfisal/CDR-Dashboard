# CDR Customer Full Tabs Layout Fix

## Scope
Fixed the Customer loaded-dashboard layout and restored the same dashboard tab navigation used by Admin.

## Changes
- Removed the separate loaded Customer-only dashboard branch that was causing the compressed/broken layout.
- Customer and Admin now use one shared dashboard interface after data is loaded.
- Customer can see all dashboard tabs/pages.
- Admin-only control remains hidden from Customer:
  - Local Settings
- Customer upload action remains available in the shared toolbar.
- Customer toolbar label now shows Upload Sheet instead of New workbook(s).

## Validation
- npm run check: passed
- npm run build: passed
