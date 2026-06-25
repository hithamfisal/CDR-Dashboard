# Report History Download Location Update - Text Only

## Change Applied

The **Downloaded Folder / File** column in the Generated Reports History table now displays the browser download location as plain text only:

```text
Downloads / file-name.xlsx
```

The location value is no longer a hyperlink and no longer opens or downloads the file again.

## Files Updated

- `src/components/ReportsPanel.tsx`
- `src/styles/design-control.css`

## Behavior Kept

- Generated reports history still shows file name, date, format, download location, and action buttons.
- Clear History still only clears the visible generated report history list.
- Uploaded CDR files are not deleted.
- Saved fleetmap data is not deleted.
- Continue Previous Dashboard data is not deleted.
- Dashboard filters are not cleared.
- Report generation/export functions are unchanged.

## Important Browser Note

A normal web browser cannot directly open files from the physical Downloads folder by path. The displayed path is informational only. Use the browser Downloads bar or the computer Downloads folder to open Excel/PowerPoint files.
