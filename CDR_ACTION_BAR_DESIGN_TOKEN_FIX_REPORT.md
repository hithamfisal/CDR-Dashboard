# CDR Action Bar Design Token Fix

## Issue fixed
The upper action container around the Design selector, Home, MySQL Settings, Logout, Add Region and New Workbook controls was still using a legacy fixed dark/navy panel color in some designs.

## Fix applied
Added a final high-specificity design-token CSS layer so the action container now reads from the selected design proposal variables:

- `--design-nav-bg`
- `--design-card-soft`
- `--design-card-2`
- `--design-border-strong`
- `--design-text`
- `--design-accent-2`
- `--design-hover`
- `--design-glow`

## Scope
Patched both source CSS and built CSS:

- `src/styles/design-proposals.css`
- `dist/assets/index-B4xNOs8u.css`

## Result
The control/action bar now changes correctly for:

- Dark Blue
- Light Executive
- Dark Emerald

No logic, login, MySQL, upload, permission, KPI, chart or filter behavior was changed.
