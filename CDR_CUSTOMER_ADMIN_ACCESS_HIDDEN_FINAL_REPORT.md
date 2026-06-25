# CDR Customer Admin Access Hidden Final Fix

Applied final correction for Customer role visibility.

## Fixes

- Removed the `Admin Access` badge from the loaded dashboard action bar.
- Removed the `Admin Access` badge from the upload screen header.
- Added route-aware session protection:
  - Opening `customer.html` / `#customer-portal` will not reuse an old Admin session.
  - If an Admin session exists and the customer route is opened, the session is cleared and the login screen starts as Customer.
- Login role dropdown now defaults from the route:
  - `#customer-portal` defaults to Customer.
  - `#admin-portal` defaults to Admin.

## Preserved

- Customer still sees all dashboard tabs.
- Customer still sees Upload Sheet.
- Customer still can load sample data.
- Local Settings remains Admin-only.
- Master/Fixed Fleetmap management remains Admin-only.
