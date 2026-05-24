# SOA Local Dashboard — Run Instructions

This package contains a **local-only web dashboard** for presenting SOA call-traffic data from your Excel workbook. It reads the file in your browser and does **not** modify, repair, upload, or rewrite the Excel workbook.

## What the dashboard does

| Feature | Description |
|---|---|
| Excel upload | Upload `.xlsx`, `.xls`, or `.xlsm` from the dashboard page. |
| Browser-only parsing | Workbook data is parsed locally in memory using the `Raw_Data` sheet. |
| KPI cards | Total calls, total duration, traffic hours, active radios, companies, and talkgroups. |
| Filters | Year, month, week, company, base station, talkgroup, and keyword search. |
| Charts | Monthly demand, company share, busy-hour curve, top talkgroups, and top base stations. |
| Tables | Top radios, top users, filtered source call register, and data-quality checks. |
| Print/export | Use **Print / save PDF** in the dashboard to present or export a PDF through your browser. |

## Requirements

Install [Node.js](https://nodejs.org/) version 20 or newer. This project uses `pnpm`; if you do not have it installed, run:

```bash
npm install -g pnpm
```

## Run locally

Open a terminal in the extracted project folder and run:

```bash
pnpm install
pnpm dev
```

Then open the local address shown in the terminal, usually:

```text
http://localhost:3000
```

Upload your SOA Excel workbook from the page. The workbook should contain a `Raw_Data` sheet with columns such as `Radio ID`, `Company`, `Talkgroup Alias`, `Call Date`, `Hour Label`, `Duration Seconds`, `Traffic Hours`, and `Caller Base Station`.

## Optional production preview

If you want to run the optimized local build:

```bash
pnpm build
pnpm preview
```

## Important note

The dashboard intentionally avoids writing anything back into Excel. This prevents the workbook corruption/repair warning that occurred when trying to add a dashboard sheet directly into the workbook.
