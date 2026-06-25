# CDR Dashboard Design Control Guide

This guide explains where to change fonts, colors, alignment, widths, heights, card boxes, buttons, labels, headers, tables, and chart panels after the visual-control refactor.

## Main file to edit

Edit this file first:

```txt
src/styles/design-control.css
```

It is imported last in:

```txt
src/main.tsx
```

Because it is imported last, it overrides the older CSS patch blocks in `src/styles.css`, `src/header-clean.css`, and `src/upload-clean.css`.

---

# 1. Global colors and shared boxes

Go to:

```css
SECTION 01 - MASTER PARAMETERS
```

Change these variables:

```css
--cdr-box-bg-dark
--cdr-box-bg-light
--cdr-box-border-dark
--cdr-box-border-light
--cdr-box-radius
--cdr-box-shadow-dark
--cdr-box-shadow-light
--cdr-box-padding
--cdr-box-gap
```

These control the common look of dashboard cards, panels, boxes, and headers.

---

# 2. Top header / dashboard title / logos

Change:

```css
--cdr-header-height
--cdr-header-bg
--cdr-header-border
--cdr-header-radius
--cdr-header-title-size
--cdr-header-title-weight
--cdr-header-title-color
--cdr-header-title-align
--cdr-header-subtitle-size
--cdr-header-subtitle-weight
--cdr-header-subtitle-color
--cdr-header-logo-width
--cdr-header-logo-height
```

Used by:

```css
SECTION 03 - TOP HEADER / LOGOS / TITLE
```

---

# 3. Dashboard tabs and navigation buttons

Change:

```css
--cdr-tab-height
--cdr-tab-padding-x
--cdr-tab-font-size
--cdr-tab-font-weight
--cdr-tab-color
--cdr-tab-active-color
--cdr-tab-bg
--cdr-tab-active-bg
--cdr-tab-border
--cdr-tab-radius
--cdr-tab-horizontal-align
--cdr-tab-vertical-align
```

Used by:

```css
SECTION 04 - DASHBOARD TABS AND SECTION NAVIGATION
```

---

# 4. All buttons in the project

Change:

```css
--cdr-button-height
--cdr-button-min-width
--cdr-button-padding-x
--cdr-button-font-size
--cdr-button-font-weight
--cdr-button-color
--cdr-button-bg
--cdr-button-border
--cdr-button-radius
--cdr-button-horizontal-align
--cdr-button-vertical-align
--cdr-button-gap
--cdr-button-hover-bg
--cdr-button-hover-color
--cdr-button-hover-border
```

Used by:

```css
SECTION 05 - BUTTONS
```

This controls:

- Header buttons
- Upload buttons
- Export buttons
- Report buttons
- Reset button base style
- Panel menu buttons
- Normal dashboard action buttons

---

# 5. Filter bar: rows, dropdowns, search box, reset, info

Change filter row spacing and container:

```css
--cdr-filter-row-gap
--cdr-filter-column-gap
--cdr-filter-panel-padding
--cdr-filter-panel-radius
--cdr-filter-panel-bg
--cdr-filter-panel-border
```

Change individual filter widths:

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

Change filter label font and alignment:

```css
--cdr-filter-label-height
--cdr-filter-label-size
--cdr-filter-label-weight
--cdr-filter-label-color
--cdr-filter-label-align
```

Change dropdown/search box size and text:

```css
--cdr-filter-control-height
--cdr-filter-control-font-size
--cdr-filter-control-font-weight
--cdr-filter-control-color
--cdr-filter-control-bg
--cdr-filter-control-border
--cdr-filter-control-radius
--cdr-filter-control-padding-x
--cdr-filter-control-text-align
--cdr-filter-control-horizontal-align
--cdr-filter-control-vertical-align
```

Used by:

```css
SECTION 06 - FILTER BAR
SECTION 16 - QUICK PER-ELEMENT WIDTH OVERRIDES
```

Layout rule:

- First row = 6 controls
- Second row = 5 controls + Reset + Info

---

# 6. Hero and workbook profile box

Change:

```css
--cdr-hero-bg
--cdr-hero-border
--cdr-hero-radius
--cdr-hero-padding
--cdr-hero-gap
--cdr-hero-title-size
--cdr-hero-title-weight
--cdr-hero-title-color
--cdr-hero-title-align
--cdr-hero-subtitle-size
--cdr-hero-subtitle-weight
--cdr-hero-subtitle-color
--cdr-workbook-card-width
--cdr-workbook-title-size
--cdr-workbook-title-weight
--cdr-workbook-meta-size
--cdr-workbook-meta-weight
```

Used by:

```css
SECTION 07 - HERO / WORKBOOK PROFILE BOX
```

---

# 7. Section headers and collapse arrows

Change:

```css
--cdr-section-title-size
--cdr-section-title-weight
--cdr-section-title-color
--cdr-section-title-align
--cdr-section-subtitle-size
--cdr-section-subtitle-weight
--cdr-section-subtitle-color
--cdr-section-header-height
--cdr-section-header-padding
--cdr-section-header-gap
```

Used by:

```css
SECTION 08 - SECTION HEADERS / COLLAPSE ARROWS
```

---

# 8. KPI cards and data quality cards

Change:

```css
--cdr-kpi-card-bg
--cdr-kpi-card-border
--cdr-kpi-card-radius
--cdr-kpi-card-height
--cdr-kpi-card-padding
--cdr-kpi-card-gap
--cdr-kpi-label-size
--cdr-kpi-label-weight
--cdr-kpi-label-color
--cdr-kpi-label-align
--cdr-kpi-value-size
--cdr-kpi-value-weight
--cdr-kpi-value-color
--cdr-kpi-value-align
--cdr-kpi-subtitle-size
--cdr-kpi-subtitle-weight
--cdr-kpi-subtitle-color
--cdr-kpi-subtitle-align
--cdr-kpi-icon-size
--cdr-kpi-icon-bg
```

Used by:

```css
SECTION 09 - KPI CARDS / DATA QUALITY CARDS
```

All 30 KPI cards remain controlled from here.

---

# 9. Chart panels and legends

Change:

```css
--cdr-chart-panel-bg
--cdr-chart-panel-border
--cdr-chart-panel-radius
--cdr-chart-panel-padding
--cdr-chart-panel-min-height
--cdr-chart-title-size
--cdr-chart-title-weight
--cdr-chart-title-color
--cdr-chart-title-align
--cdr-chart-subtitle-size
--cdr-chart-subtitle-weight
--cdr-chart-subtitle-color
--cdr-chart-legend-size
--cdr-chart-legend-weight
--cdr-chart-legend-color
--cdr-chart-label-size
--cdr-chart-label-weight
--cdr-chart-label-color
```

Used by:

```css
SECTION 10 - CHART PANELS / MODERN OVERVIEW PANELS / LEGENDS
```

Controls:

- Overview charts
- Deep dive charts
- Charts tab panels
- Performance panels
- Legends
- Pie/donut center labels
- Recharts axis labels

---

# 10. Tables and register tables

Change:

```css
--cdr-table-bg
--cdr-table-border
--cdr-table-radius
--cdr-table-header-bg
--cdr-table-header-color
--cdr-table-header-size
--cdr-table-header-weight
--cdr-table-header-align
--cdr-table-row-color
--cdr-table-row-size
--cdr-table-row-weight
--cdr-table-row-align
--cdr-table-row-height
--cdr-table-cell-padding-y
--cdr-table-cell-padding-x
--cdr-table-hover-bg
```

Used by:

```css
SECTION 11 - TABLES
```

Controls:

- Performance Matrix
- Top 10 tables
- Radio Behavior
- User Behavior
- Filtered Calls Register
- Reports generated table
- Unmatched Fleetmap table
- All normal dashboard tables

---

# 11. Reports tab

Change:

```css
--cdr-report-panel-bg
--cdr-report-card-bg
--cdr-report-title-size
--cdr-report-title-weight
--cdr-report-text-size
--cdr-report-text-weight
```

Used by:

```css
SECTION 12 - REPORTS TAB
```

---

# 12. Upload home page

Change:

```css
--cdr-upload-card-bg
--cdr-upload-card-border
--cdr-upload-card-radius
--cdr-upload-title-size
--cdr-upload-title-weight
--cdr-upload-card-title-size
--cdr-upload-card-title-weight
--cdr-upload-card-text-size
--cdr-upload-card-text-weight
```

Used by:

```css
SECTION 13 - UPLOAD HOME PAGE
```

---

# 13. Footer/status strip

Change:

```css
--cdr-footer-height
--cdr-footer-bg
--cdr-footer-border
--cdr-footer-color
--cdr-footer-font-size
--cdr-footer-font-weight
--cdr-footer-align
```

Used by:

```css
SECTION 14 - FOOTER / STATUS / DATA QUALITY STRIPS
```

---

# 14. Responsive behavior

Go to:

```css
SECTION 15 - RESPONSIVE CONTROL
```

This controls how filters collapse on smaller screens.

Current behavior:

- Above 1500px: exact 6 + 5 + reset + info layout
- Below 1500px: filters become 3 columns
- Below 900px: filters become 1 column

---

# Important rule

Do not edit old repeated blocks in `src/styles.css` for normal design changes. Use:

```txt
src/styles/design-control.css
```

Only clean old CSS after visual testing because old rules are historical patches.
