# CDR Vercel API Routes Conversion Report

Implemented Option B: converted the MySQL backend integration so the deployed Vercel project can serve `/api/*` endpoints directly.

## Added

- `api/[...path].js`
  - Vercel catch-all API route for the existing MySQL API paths.
  - Reuses the existing server logic from `server/index.cjs`.
  - Caches the MySQL pool per warm serverless instance.

- `api/health.js`
  - Direct Vercel route for `/api/health`.

## Updated

- `server/index.cjs`
  - Exported `createPool`, `route`, and `sendJson` for Vercel API routes.
  - Kept local `yarn dev:api` behavior unchanged using `require.main === module`.
  - Added stateless signed session tokens so login sessions work across Vercel serverless function instances.
  - Added support for Vercel-parsed `req.body` and normal Node request streams.
  - Added `CDR_SKIP_CREATE_DATABASE=1` support for cloud MySQL providers that do not allow CREATE DATABASE.

- `.env.example`
  - Added Vercel/cloud MySQL guidance.
  - Added `CDR_SESSION_SECRET`.
  - Added `CDR_SKIP_CREATE_DATABASE`.

- `vercel.json`
  - Uses public npm registry in install command.
  - Uses Vite build and `dist` output.
  - Configures API functions for Node.js 22.

## Vercel environment variables required

Set these in Vercel → Project → Settings → Environment Variables:

```env
MYSQL_HOST=your-cloud-mysql-host
MYSQL_PORT=3306
MYSQL_USER=your-cloud-mysql-user
MYSQL_PASSWORD=your-cloud-mysql-password
MYSQL_DATABASE=cdr_dashboard
CDR_SKIP_CREATE_DATABASE=1
CDR_SESSION_SECRET=use-a-long-random-secret-here
CDR_SESSION_TTL_HOURS=8
CDR_MAX_FAILED_LOGINS=5
```

Do not use `127.0.0.1` on Vercel unless the MySQL server is inside the same Vercel function environment, which is not the normal case.

## Endpoints now expected on Vercel

- `/api/health`
- `/api/app/bootstrap`
- `/api/auth/login`
- `/api/app/settings`
- `/api/app/users`
- `/api/app/audit-logs`
- `/api/app/credentials/:role`

## Local run still works

```powershell
yarn mysql:init
yarn dev:api
```

In another terminal:

```powershell
yarn dev
```

## Vercel install fix

The `yarn.lock` file was also cleaned so package tarball URLs use `https://registry.npmjs.org` instead of the internal OpenAI/artifactory package URL that Vercel cannot access.
