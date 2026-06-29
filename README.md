# CDR Dashboard Premium Concept

This is a separate experimental dashboard concept. It does not overwrite the existing CDR dashboard.

## Run locally

```powershell
yarn install
yarn dev
```

Then open the local URL shown by Vite.

## Supported uploads

- `.xlsx`
- `.xlsm`
- `.csv` raw call logs

The workbook is parsed in the browser. It is not uploaded to a server and is not modified.

## Dashboard service, credentials, and settings

This version uses a MySQL backend for user credentials, roles, portal permissions, branding and interface settings.

### Configure MySQL

Copy `.env.example` to `.env` and update the MySQL password/user if needed:

```bash
copy .env.example .env
```

Default database:

```text
cdr_dashboard
```

Default users are not seeded unless `CDR_SEED_DEFAULT_USERS=1` is set in `.env`.
For local bootstrap only, set strong passwords in these variables before running `yarn mysql:init`:

```text
CDR_DEFAULT_ADMIN_PASSWORD=<strong password>
CDR_DEFAULT_CUSTOMER_ADMIN_PASSWORD=<strong password>
CDR_DEFAULT_CUSTOMER_PASSWORD=<strong password>
```

### Run

```bash
npm install
npm run mysql:init
npm run dev:api
npm run dev
```

or with Yarn:

```bash
yarn install
yarn mysql:init
yarn dev:api
yarn dev
```

For development, Vite proxies `/api` to `http://127.0.0.1:4100` unless `CDR_API_PORT` or `CDR_API_PROXY_TARGET` is set.
For production hosting, set `public/config.js` before the app bundle loads. Current Namecheap value:

```js
window.__CDR_API_BASE__ = "https://api.cdr.hitham.app/api";
```

## Namecheap upload package

Build and prepare FileZilla/cPanel-ready folders:

```powershell
yarn prepare:namecheap
```

Use this when the app is already built and you only want to recreate the upload folders:

```powershell
yarn prepare:namecheap:skip-build
```

The script creates:

```text
artifacts/namecheap-upload/FileZilla-upload-ready/UPLOAD_TO_public_html_cdr
artifacts/namecheap-upload/FileZilla-upload-ready/UPLOAD_TO_api-cdr
artifacts/namecheap-upload/FileZilla-upload-ready/cdr-web-upload-for-cpanel-filemanager.zip
artifacts/namecheap-upload/FileZilla-upload-ready/cdr-api-upload-for-cpanel-filemanager.zip
```

For FileZilla, upload the contents of `UPLOAD_TO_public_html_cdr` to `public_html/cdr`.
Delete the old remote `public_html/cdr/assets` folder before uploading a new frontend build.

For the backend, upload the contents of `UPLOAD_TO_api-cdr` to `/home/hitham/api-cdr`, run NPM Install in cPanel, restart the Node.js app, then test:

```text
https://api.cdr.hitham.app/api/health
```

## v8 UI/UX improvement patch

Design names were simplified to:

- Dark Blue
- Light Executive
- Dark Emerald

The Design dropdown still saves the selected design locally and applies the design immediately.

### Added professional admin improvements

- System Admin user management in Local Settings.
- Add MySQL users with roles: System Admin, Customer Admin, Customer.
- Enable/disable users.
- Reset user passwords.
- View failed login count and last login.
- View recent audit logs.
- Login lockout after repeated failed attempts.
- Audit logging for login, settings, user and credential actions.
- Design preview cards inside Local Settings.
- Selected filter chips below filters with one-click clear.
- Stronger design-token coverage across cards, filters, tables, buttons, charts and scrollbars.

### MySQL tables

- cdr_users
- cdr_app_settings
- cdr_audit_logs

Run schema/update:

```bash
yarn mysql:init
```

Then run the API and dashboard:

```bash
yarn dev:api
yarn dev
```
