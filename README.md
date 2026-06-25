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
- `.xls`
- `.xlsb`

The workbook is parsed in the browser. It is not uploaded to a server and is not modified.

## MySQL credentials and settings database

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

Default seeded users:

```text
System Admin:    admin / Admin@12345
Customer Admin:  customeradmin / CustomerAdmin@12345
Customer:        customer / Customer@12345
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

For development, Vite proxies `/api` to `http://127.0.0.1:4000`.
For production hosting, serve the frontend from the same domain as the Node API, or set `window.__CDR_API_BASE__` before the app bundle loads.

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
