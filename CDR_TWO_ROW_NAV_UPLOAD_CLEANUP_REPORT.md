# CDR Two-Row Navigation and Upload Cleanup Patch

## Fixed

- Separated dashboard controls into two rows:
  - Row 1: non-tab controls such as Theme, Layout, Home, Local Settings, Logout and Upload Sheet/New Workbook.
  - Row 2: dashboard tab selector buttons only.
- Stopped tab buttons from being clipped or mixed with selectors.
- Removed the unwanted Futuristic Ops left-side navigation behavior that caused the controls/tabs to feel broken.
- Cleaned the upload/workbook page:
  - Toolbar now stays in normal page flow.
  - Theme/Layout/Logout no longer overlap the hero area.
  - Oversized right-side visual image is hidden.
  - Upload page now uses the full width for the actual upload workflow.
- Improved upload button contrast for Dark Command Center, Light Modern Analytics and Neon Futuristic themes.

## Files patched

- `src/styles/design-control.css`
- `dist/assets/index-B4xNOs8u.css`

## Notes

The patch is applied to both source CSS and the prebuilt `dist` CSS, so the static version can be tested without rebuilding first.
