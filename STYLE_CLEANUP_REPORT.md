# CDR Project CSS Cleanup Report

## What was changed

The main CSS file was cleaned and reduced while preserving the active dashboard design.

### Main updated file

- `src/styles.css`

### Backup kept

- `src/styles.legacy.backup.css`

This backup is **not imported** by the app. It is included only so you can restore any old CSS if needed.

## Cleanup summary

| Item | Before | After |
|---|---:|---:|
| `src/styles.css` lines | 18,606 | 14,598 |
| `src/styles.css` size | 623 KB | 492 KB |
| Top-level selector rules | 2,093 | 1,715 |
| Repeated selector groups | 320 | 248 |
| Extra repeated selector rules | 503 | 400 |

## Removed / skipped duplicate stacks

The cleanup removed old patch stacks that were already superseded by newer final rules, mainly:

- Old dashboard restoration/theme patches before the modern CDR command-center layer
- Older summary card layouts before the final 10-card KPI layout
- Older search/filter alignment attempts before the final 6 + 5 filter-row layout
- Older filter fit/overlap patches superseded by the current hard width override
- Older background/image-fit attempts replaced by later final background rules

## Important active control areas now

### 1. Filter widths and layout

Use the bottom of `src/styles.css`, section:

```css
USER TEST WIDTH VALUES - HARD FINAL OVERRIDE
```

This controls:

```css
--cdr-filter-search-width
--cdr-filter-region-width
--cdr-filter-year-width
--cdr-filter-month-width
--cdr-filter-company-width
--cdr-filter-base-station-width
--cdr-filter-talkgroup-width
--cdr-filter-call-type-width
--cdr-filter-radio-type-width
--cdr-filter-encryption-width
--cdr-filter-duplex-width
--cdr-filter-reset-width
--cdr-filter-info-width
```

### 2. Font sizes and weights

Use the bottom of `src/styles.css`, section:

```css
FINAL FONT SIZE + WEIGHT CONTROL
```

This controls:

```css
--cdr-font-filter-label-size
--cdr-font-filter-label-weight
--cdr-font-filter-value-size
--cdr-font-filter-value-weight
--cdr-font-button-size
--cdr-font-button-weight
--cdr-font-kpi-label-size
--cdr-font-kpi-value-size
--cdr-font-table-header-size
--cdr-font-table-body-size
--cdr-font-chart-title-size
--cdr-font-tab-size
```

## Remaining duplicates

Some duplicate selectors still remain intentionally because they are active override layers. Removing them without browser-by-browser visual comparison may change the dashboard.

The remaining repeated areas are mainly:

- Header/banner styling
- KPI visual card styling
- Filter final override rules
- Register table column sizing
- Upload page image/layout rules

## Validation completed

- CSS syntax parsed successfully with no parser errors.
- Brace counts are balanced.
- Production build completed successfully using `npm run build`.

Build result: **success**.

## How to continue cleaning safely

1. Keep `src/styles.legacy.backup.css` until you confirm the dashboard visually.
2. Test upload page, Overview, Records, Charts, Reports, and light/dark themes.
3. Only after confirming the UI, delete `src/styles.legacy.backup.css` if you do not need rollback.
4. Future changes should be done in the final control sections at the bottom of `src/styles.css`.
