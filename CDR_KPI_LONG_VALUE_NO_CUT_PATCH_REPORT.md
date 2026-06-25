# CDR KPI Long Value No-Cut Patch

## Request
Explain and fix why some KPI values are truncated while other longer-looking values fit.

## Cause
The KPI values were forced into a single line with `white-space: nowrap`, `overflow: hidden`, and `text-overflow: ellipsis`. The Peak Radio value contains more actual characters than the visible screenshot because the full value continues after `East...`, while the Peak Week value has a more favorable character width and fits in the same one-line box.

## Applied fix
- Allowed KPI values to wrap into compact natural lines instead of forcing one-line ellipsis.
- Reduced KPI card left/right padding further.
- Slightly increased KPI card minimum height to avoid vertical clipping.
- Kept short KPI values visually centered and single-line.
- Patched source CSS and prebuilt dist CSS.

## Files changed
- `src/styles.css`
- `dist/assets/index-B4xNOs8u.css`

## Logic impact
No CDR data logic, MySQL logic, permissions, uploads, filters, charts, exports, or KPI calculations were changed.
