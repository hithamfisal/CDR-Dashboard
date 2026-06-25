# CDR Vercel API createPool Export Fix

## Fixed issue
Vercel Function crashed with:

```text
TypeError: createPool is not a function
```

## Cause
The catch-all Vercel API route was destructuring exports from the CommonJS backend module. In the Vercel serverless/bundled runtime, the CommonJS module can be exposed under a `default` object instead of direct named keys.

## Applied fix
- Updated `api/[...path].js` to support both CommonJS export shapes:
  - `module.createPool`
  - `module.default.createPool`
- Added a safe fallback JSON response writer.
- Added a clearer diagnostic error if expected exports are missing.
- Added `module.exports.default = module.exports` in `server/index.cjs` to make the backend exports compatible with Vercel's ESM/serverless runtime.

## No functional dashboard changes
No UI, KPI, filter, upload, permission, MySQL schema, or dashboard calculation logic was changed.

## Next deployment steps
1. Replace the project files with this package.
2. Commit and push to GitHub.
3. Redeploy Vercel without cache.
4. Test `/api/health`.
