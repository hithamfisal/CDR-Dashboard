# CDR Professional Improvements Patch Report

## Requested name change
The design selector options were simplified to:

- Dark Blue
- Light Executive
- Dark Emerald

Old long proposal labels were removed from the source UI labels.

## Implemented UI/UX improvements

### 1. Cleaner proposal design system coverage
- Kept the 3 proposal model as the active UI design system.
- Strengthened final CSS coverage using design tokens for buttons, cards, filters, tables, scrollbars, selected states and hover states.
- Improved Light Executive contrast for controls, KPI cards and filters.
- Added consistent sticky table headers and token-based table rows.

### 2. Design previews in Local Settings
- Added 3 design preview cards inside Local Settings:
  - Dark Blue
  - Light Executive
  - Dark Emerald
- Clicking a preview applies the design instantly.

### 3. KPI/card visual improvement
- Added token-based KPI/card surfaces.
- Added subtle card accent overlays.
- Kept all KPI cards and values unchanged.

### 4. Filter UX improvement
- Added a selected filters summary row below the filter area.
- Each selected filter appears as a clearable chip.
- Search chip can be cleared directly.
- Existing filter logic and calculations were not changed.

### 5. MySQL user management
Added System Admin user management inside Local Settings:

- Add user
- Select user role
- Enable / disable users
- Reset password
- View last login
- View failed login count

Supported roles:
- System Admin
- Customer Admin
- Customer

### 6. MySQL audit log
Added `cdr_audit_logs` table and API logic.

Tracked actions include:
- Successful login
- Failed login
- Locked login attempt
- Settings update
- User creation
- User update
- Credential update

### 7. Login security improvements
- Added failed login counter.
- Added automatic temporary lockout after repeated failed attempts.
- Added last login timestamp.
- Preserved MySQL-backed login without user type selector.

### 8. Settings backup and reset tools
Inside Local Settings:

- Export settings backup as JSON.
- Reset branding defaults in the form.
- Save after reset to apply to MySQL.

### 9. Database schema update
Updated MySQL schema with:

- `cdr_users.failed_attempts`
- `cdr_users.locked_until`
- `cdr_users.last_login_at`
- `cdr_audit_logs`

Also removed the old one-user-per-role restriction to support real user management.

## Preserved functionality
- MySQL login
- Role detection from username
- System Admin / Customer Admin / Customer visibility
- Upload logic
- Sample data
- Continue previous workbook
- Master Fleetmap
- Fixed Fleetmap
- Dashboard tabs
- KPI calculations
- Charts
- Reports/export functions

## Validation performed here
- `node --check server/index.cjs`
- ZIP integrity check

Full `yarn check` and `yarn build` should be run on your PC after installing dependencies.
