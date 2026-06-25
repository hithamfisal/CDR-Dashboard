# CDR Admin Settings Radio Picture Patch

## Applied changes

- Renamed the visible **MySQL Settings** controls to **Admin Settings** in the dashboard header and upload/customer landing page.
- Added a new **Radio Showcase Picture** upload card inside Admin Settings.
- The radio showcase image is saved in MySQL-backed app settings together with the logos and upload page image.
- The radio showcase image now controls the visual used in the Fleetmap/unmatched radio showcase area instead of always using `/assets/radio.png`.
- Added reset-to-default support for the radio picture.
- Added schema support and migration columns for existing MySQL databases.

## New MySQL setting columns

- `radio_showcase_image_name`
- `radio_showcase_image_data_url`

## Recommended radio picture dimensions

- Recommended: **1200 × 1280 px**
- Also acceptable: **1275 × 1359 px** to match the current default picture ratio
- Format: transparent **PNG** or **WebP** preferred
- Keep the subject centered with transparent/clean background

## Existing recommended image sizes

- Header Left Logo: **320 × 96 px**, transparent PNG/SVG
- Header Right Logo: **320 × 96 px**, transparent PNG/SVG
- Upload Page Picture: **1600 × 1000 px**, JPG/PNG/WebP
- Radio Showcase Picture: **1200 × 1280 px**, transparent PNG/WebP

## Files updated

- `src/App.tsx`
- `src/components/UploadView.tsx`
- `src/lib/localAppDatabase.ts`
- `src/styles.css`
- `src/styles.legacy.backup.css`
- `src/styles/design-control.css`
- `src/styles/design-proposals.css`
- `server/index.cjs`
- `server/schema.mysql.sql`
- `dist/assets/index-BFb2d_NV.js`
- `dist/assets/index-B4xNOs8u.css`

## Notes

- Dashboard logic, MySQL login, roles, permissions, upload, KPI calculations, charts, filters and exports were not changed.
- Run `yarn mysql:init` once after replacing the package so the new MySQL columns are added to an existing database.
