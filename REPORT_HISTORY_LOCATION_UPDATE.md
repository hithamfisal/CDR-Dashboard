# Reports History Location Column Update

## What changed

- Added a **Downloaded Folder / File** column to the Generated Reports History table.
- The column displays the browser-safe location format:

```text
Downloads / <file-name>
```

- The displayed value is clickable when the in-session generated file Blob URL is still available.
- PDF, PNG, and CSV files open in a new browser tab when supported.
- Excel and PowerPoint files are served back through the browser from the retained in-session Blob URL. Depending on browser settings, they may download again instead of opening directly.

## Browser limitation

A normal web browser does not expose the real local Downloads folder path to JavaScript for security reasons. Therefore, the dashboard cannot create a true local file-system link like `C:\Users\...\Downloads\file.xlsx`.

The dashboard displays the expected browser Downloads location and keeps a safe in-session file link for opening or re-downloading the generated file.

## What was not changed

- Uploaded CDR files were not changed.
- Fleetmap cache/saved data was not changed.
- Continue Previous Dashboard data was not changed.
- Dashboard filters were not changed.
- Charts, KPI cards, tabs, and export generation logic were not changed.
