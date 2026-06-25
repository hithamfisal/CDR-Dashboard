# CDR Theme Background + Chart Visibility Patch

## What was fixed

- Removed dependency on the old `dark-background-theme` / `light-background-theme` dashboard background coloring.
- Disabled old background image pseudo-layers when legacy classes are accidentally present.
- Re-applied only the 3 proposed CDR themes:
  1. Proposal 1 - Dark Command Center
  2. Proposal 2 - Light Modern Analytics
  3. Proposal 3 - Neon Futuristic
- Made Proposal 1 and Proposal 3 visually different:
  - Dark Command Center: clean enterprise navy operations style.
  - Neon Futuristic: cyber grid background with cyan/magenta accents.
- Improved font visibility across headings, cards, tables, filters, dropdowns, buttons, and status areas.
- Improved chart visibility across themes by overriding Recharts axis labels, grid lines, legends, SVG text, and tooltips with theme-aware colors.
- Patched both source CSS and the prebuilt `dist` CSS so the ZIP can be tested immediately without rebuilding.

## Files modified

- `src/styles.css`
- `src/styles.legacy.backup.css`
- `dist/assets/index-*.css`
- `dist/layout-selector.js`

## Validation

- `node --check dist/layout-selector.js` passed.

## Notes

The old theme CSS blocks may still exist earlier in the stylesheet for history/backward compatibility, but the final patch overrides them completely. Active shells now use only:

- `theme-dark-command`
- `theme-light-modern`
- `theme-neon-futuristic`

No old dashboard background image coloring should control the active dashboard theme anymore.
