# CDR MySQL Database Implementation Report

## What changed

The app credential/settings storage was converted from browser IndexedDB to a MySQL-backed API.

Users, roles, passwords, branding, header titles, descriptions, logos and upload-page picture are now saved in MySQL.

## MySQL database

Default database name:

```text
cdr_dashboard
```

Tables added:

```text
cdr_users
cdr_app_settings
```

## Default users

The MySQL API seeds these default users on first start:

| Role | Username | Password |
|---|---|---|
| System Admin | admin | Admin@12345 |
| Customer Admin | customeradmin | CustomerAdmin@12345 |
| Customer | customer | Customer@12345 |

The login page has no role selector. Role/privilege is detected directly from the username stored in MySQL.

## API added

```text
GET  /api/health
GET  /api/app/bootstrap
POST /api/auth/login
PUT  /api/app/settings
PUT  /api/app/credentials/:role
```

Credential updates require System Admin session.
Settings updates require System Admin or Customer Admin session.

## Files added/modified

Added:

```text
server/index.cjs
server/schema.mysql.sql
.env.example
CDR_MYSQL_DATABASE_IMPLEMENTATION_REPORT.md
```

Modified:

```text
package.json
vite.config.ts
src/lib/localAppDatabase.ts
src/App.tsx
src/components/UploadView.tsx
src/styles/design-control.css
dist/assets/index-BFb2d_NV.js
```

## Run steps

1. Create `.env` from `.env.example` and enter your MySQL password.
2. Install dependencies:

```bash
npm install
```

or:

```bash
yarn install
```

3. Initialize/check MySQL tables:

```bash
npm run mysql:init
```

or:

```bash
yarn mysql:init
```

4. Start the MySQL API:

```bash
npm run dev:api
```

or:

```bash
yarn dev:api
```

5. In another terminal, start the dashboard:

```bash
npm run dev
```

or:

```bash
yarn dev
```

Alternative single command:

```bash
npm run dev:full
```

or:

```bash
yarn dev:full
```

## Notes

- MySQL is required for login and settings now.
- The browser no longer acts as the source of truth for credentials/settings.
- Workbook cache can still use the existing browser workbook cache for continue-previous-workbook behavior unless separately moved to MySQL later.
