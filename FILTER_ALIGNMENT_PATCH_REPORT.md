# Filter Alignment Patch Report

This package starts from the secure V7 build and applies the V7 fixed UI settings for the dashboard header, search filters, filter fonts, filter heights, reset button, and filter count/info label alignment.

## Applied from V7 fixed
- `src/styles.css`
- `src/header-clean.css`
- `src/styles/design-control.css`

## Preserved from secure version
- Security patch in `src/App.tsx` replacing direct HTML assignment with safer DOM insertion for the PNG export button.
- Session-based workbook metadata behavior in `src/lib/browserCache.ts`.
- `V7_SECURITY_AUDIT_REPORT.md`.
- No debug runtime or log collector references were added.

## Important
After replacing these files, run:

```bash
yarn install
yarn build
```

Then upload the generated `dist` contents to hosting.
