# CDR Admin Branding, Login, and Local Database Patch

## Implemented

1. **Removed role selector from login**
   - Login now asks only for username and password.
   - The portal role is resolved automatically from the saved credential record.
   - User privilege is determined by the username stored under Admin / Customer Admin / Customer in the local database.

2. **Added admin-managed branding fields**
   - Dashboard header title.
   - Dashboard header description.
   - Admin portal title.
   - Admin portal description.
   - Customer portal title.
   - Customer portal description.
   - Admin Portal Left Logo.
   - Admin Portal Right Logo.
   - Upload Page Picture.

3. **Added logo/image upload controls in Local Settings**
   - Left logo upload with preview.
   - Right logo upload with preview.
   - Upload page picture upload with preview.
   - Default image reset buttons.
   - Recommended pixel sizes displayed in the settings panel.

4. **Header layout adjustment**
   - Left and right logos now scale to the height of the header box.
   - Title and description are vertically centered in the middle column.
   - The header layout preserves left logo / centered title / right logo.

5. **Upload page picture is configurable**
   - The restored upload visual can now be replaced from Local Settings.
   - If no custom image is uploaded, `/assets/h.png` remains the default.

## Local database location

Credentials and settings are stored in browser IndexedDB:

- Database: `CDR_LOCAL_APP_DATABASE`
- Object store: `local_app_store`
- Key: `credentials`
- Key: `settings`

Saved workbook and fleetmap data are stored separately in browser IndexedDB:

- Database: `cdr-dashboard-cache`
- Object store: `workbooks`

This is a local browser database, not MySQL. It is stored on the same computer/browser profile running the app.

## Recommended image sizes

- Header left logo: 320×96 px, transparent PNG or SVG.
- Header right logo: 320×96 px, transparent PNG or SVG.
- Upload page picture: 1600×1000 px, JPG/PNG/WebP.
- Dashboard background images: 1920×1080 px or 2560×1440 px.
- Icon images: 512×512 px PNG/SVG.
- Report/export cover image: 1600×900 px.

## Validation

- Source TS/TSX files were syntax-transpiled with TypeScript `transpileModule`.
- Prebuilt `dist` JavaScript syntax passed `node --check`.
- Static `dist` CSS was patched directly.
