# README - Design Control CSS

`design-control.css` is the final visual-control layer for the CDR dashboard.

It is imported last from `src/main.tsx`, so it overrides the older CSS files.

## Main editing rule

Change variables in:

```css
SECTION 01 - MASTER PARAMETERS
```

Do not edit random old CSS patches unless you are intentionally cleaning legacy code.

## What this file controls

- Header and logos
- Dashboard tabs
- All buttons
- Filter labels, dropdowns, search box, reset, info button
- Hero and workbook profile card
- Section titles and arrows
- All 30 KPI cards
- Data quality cards
- Chart panels and legends
- Tables and records register
- Reports tab
- Upload home page
- Footer/status strip
- Responsive filter behavior

## Why this file exists

The project had many older layered CSS patches. This file gives one clear location to change the visual design without breaking dashboard logic.
