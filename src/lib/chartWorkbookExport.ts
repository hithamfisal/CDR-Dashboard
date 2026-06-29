import type ExcelJS from "exceljs";
import { COLORS } from "./dashboardConstants";
import { downloadBlob, excelRange, patchWorkbookWithNativeCharts } from "./exportUtils";
import { loadExcelJS } from "./lazyModules";
import type { ChartExportDataset, NativeChartConfig } from "../types/dashboard";

function isNumericLike(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "string") return false;
  const normalized = value.replace(/,/g, "").trim();
  return normalized !== "" && Number.isFinite(Number(normalized));
}

function toNumericValue(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const normalized = value.replace(/,/g, "").trim();
    return normalized === "" ? value : Number(normalized);
  }
  return value;
}

function safeSheetName(value: string, usedSheetNames: Set<string>) {
  const base =
    value
      .replace(/[\\/?*[\]:]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 31) || "Chart Data";
  let name = base;
  let index = 2;
  while (usedSheetNames.has(name)) {
    const suffix = ` ${index}`;
    name = `${base.slice(0, 31 - suffix.length)}${suffix}`;
    index += 1;
  }
  usedSheetNames.add(name);
  return name;
}

function chartTypeForTitle(title: string): NativeChartConfig["type"] {
  const lower = title.toLowerCase();
  if (lower.includes("radios per month") || lower.includes("total avg")) return "doughnut";
  if (lower.includes("month") || lower.includes("hour") || lower.includes("kpi")) return "line";
  return "bar";
}

export async function exportChartWorkbookXlsx({
  fileName,
  datasets,
  titleFor,
}: {
  fileName: string;
  datasets: Record<string, ChartExportDataset>;
  titleFor: (title: string) => string;
}) {
  const ExcelJS = await loadExcelJS();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CDR Dashboard";
  workbook.created = new Date();
  const border = {
    top: { style: "thin" as const },
    left: { style: "thin" as const },
    bottom: { style: "thin" as const },
    right: { style: "thin" as const },
  };
  const headerFill = {
    type: "pattern" as const,
    pattern: "solid" as const,
    fgColor: { argb: "FF0F5F8F" },
  };
  const titleFill = {
    type: "pattern" as const,
    pattern: "solid" as const,
    fgColor: { argb: "FF082033" },
  };
  const usedSheetNames = new Set<string>();
  const chartConfigs: NativeChartConfig[] = [];

  Object.entries(datasets).forEach(([title, dataset]) => {
    if (!dataset.headers.length) return;
    const sheetName = safeSheetName(title, usedSheetNames);
    const sheetIndex = workbook.worksheets.length + 1;
    const worksheet = workbook.addWorksheet(sheetName, {
      views: [{ showGridLines: false }],
    });
    const numericColumns = dataset.headers
      .map((_, index) => index)
      .filter((index) => index > 0 && dataset.rows.some((row) => isNumericLike(row[index])));
    const chartRows = dataset.rows.map((row) =>
      row.map((cell, index) => (numericColumns.includes(index) ? toNumericValue(cell) : cell)),
    );

    worksheet.addRow([titleFor(title)]);
    worksheet.mergeCells(1, 1, 1, Math.max(1, dataset.headers.length));
    worksheet.addRow([]);
    worksheet.addRow(dataset.headers);
    chartRows.forEach((row) => worksheet.addRow(row));
    worksheet.columns = dataset.headers.map((header, index) => {
      const max = Math.max(`${header}`.length, ...chartRows.map((row) => `${row[index] ?? ""}`.length));
      return { width: Math.min(42, Math.max(12, max + 2)) };
    });
    worksheet.eachRow((row, rowNumber) => {
      row.height = rowNumber === 1 ? 26 : 22;
      row.eachCell((cell) => {
        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
          wrapText: true,
        };
        cell.border = border;
        if (rowNumber === 1) {
          cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 13 };
          cell.fill = titleFill;
        } else if (rowNumber === 3) {
          cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
          cell.fill = headerFill;
        }
      });
    });

    if (numericColumns.length > 0 && chartRows.length > 0) {
      const type = chartTypeForTitle(title);
      const firstDataRow = 4;
      const lastDataRow = firstDataRow + chartRows.length - 1;
      const seriesColumns = type === "doughnut" ? numericColumns.slice(0, 1) : numericColumns.slice(0, 8);
      chartConfigs.push({
        sheetIndex,
        chartIndex: chartConfigs.length + 1,
        title: titleFor(title),
        type,
        categoriesRef: excelRange(sheetName, 1, firstDataRow, lastDataRow),
        series: seriesColumns.map((columnIndex, seriesIndex) => ({
          name: dataset.headers[columnIndex],
          valuesRef: excelRange(sheetName, columnIndex + 1, firstDataRow, lastDataRow),
          color: COLORS[seriesIndex % COLORS.length].replace("#", "").toUpperCase(),
        })),
        from: { col: Math.max(4, dataset.headers.length + 1), row: 1 },
        to: { col: Math.max(14, dataset.headers.length + 11), row: 24 },
      });
    }
  });

  let output: Blob | ExcelJS.Buffer = await workbook.xlsx.writeBuffer();
  if (chartConfigs.length > 0) {
    output = await patchWorkbookWithNativeCharts(output, chartConfigs);
  }
  downloadBlob(
    fileName,
    output instanceof Blob
      ? output
      : new Blob([output], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
  );
}
