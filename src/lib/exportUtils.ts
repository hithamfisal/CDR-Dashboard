import type ExcelJS from "exceljs";
import type { jsPDF } from "jspdf";
import { COLORS } from "./dashboardConstants";
import type { ChartExportDataset, NativeChartConfig, NativeChartSeries } from "../types/dashboard";

export function csvEscape(value: unknown) {
  const text = `${value ?? ""}`.replace(/\r?\n/g, " ");
  return /[",]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function notifyGeneratedFile(fileName: string, blob: Blob, mimeType = blob.type) {
  window.dispatchEvent(new CustomEvent("cdr-report-generated-file", { detail: { fileName, blob, mimeType } }));
}

function shouldSuppressBrowserDownload() {
  return Boolean((window as Window & { __cdrSuppressBrowserDownload?: boolean }).__cdrSuppressBrowserDownload);
}

function triggerBrowserDownload(fileName: string, url: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function dataUrlToBlob(dataUrl: string) {
  const [header = "", data = ""] = dataUrl.split(",");
  const mimeType = header.match(/^data:([^;]+)/)?.[1] ?? "application/octet-stream";
  const isBase64 = header.includes(";base64");
  const binary = isBase64 ? atob(data) : decodeURIComponent(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

export function downloadText(fileName: string, text: string) {
  const blob = new Blob(["\ufeff", text], { type: "text/csv;charset=utf-8" });
  notifyGeneratedFile(fileName, blob);
  if (shouldSuppressBrowserDownload()) return;
  const url = URL.createObjectURL(blob);
  triggerBrowserDownload(fileName, url);
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export function downloadBlob(fileName: string, blob: Blob) {
  notifyGeneratedFile(fileName, blob);
  if (shouldSuppressBrowserDownload()) return;
  const url = URL.createObjectURL(blob);
  triggerBrowserDownload(fileName, url);
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export function downloadPdf(pdf: jsPDF, fileName: string) {
  downloadBlob(fileName, pdf.output("blob"));
}

export async function downloadPptx(pptx: { write: (options: Record<string, unknown>) => Promise<unknown> }, fileName: string) {
  const output = await pptx.write({ outputType: "arraybuffer", compression: true });
  const blob = output instanceof Blob
    ? output
    : typeof output === "string"
      ? new Blob([output], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" })
      : new Blob([output as BlobPart], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });
  downloadBlob(fileName, blob);
}

export function downloadDataUrl(fileName: string, dataUrl: string) {
  try {
    notifyGeneratedFile(fileName, dataUrlToBlob(dataUrl));
  } catch {
    // Keep the browser download working even if a malformed data URL cannot be converted to a Blob for history tracking.
  }
  if (shouldSuppressBrowserDownload()) return;
  triggerBrowserDownload(fileName, dataUrl);
}

async function createExcelWorkbook() {
  const ExcelJSModule = await import("exceljs");
  return new ExcelJSModule.default.Workbook();
}

function applyExportSheetColumns(worksheet: ExcelJS.Worksheet, headers: string[], rows: unknown[][]) {
  worksheet.columns = headers.map((header, index) => {
    const max = Math.max(`${header}`.length, ...rows.map((row) => `${row[index] ?? ""}`.length));
    return { width: Math.min(42, Math.max(12, max + 2)) };
  });
}

async function writeExcelWorkbook(workbook: ExcelJS.Workbook, fileName: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(fileName, new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
}

export async function downloadWorkbookData(fileName: string, sheetName: string, title: string, dataset: ChartExportDataset) {
  const workbook = await createExcelWorkbook();
  const worksheet = workbook.addWorksheet(sheetName.slice(0, 31) || "Chart Data");
  worksheet.addRow([title]);
  worksheet.addRow([]);
  worksheet.addRow(dataset.headers);
  dataset.rows.forEach((row) => worksheet.addRow(row));
  applyExportSheetColumns(worksheet, dataset.headers, dataset.rows);
  await writeExcelWorkbook(workbook, fileName);
}

function safeSheetName(value: string, usedNames: Set<string>) {
  const base = value.replace(/[\\/?*[\]:]/g, " ").replace(/\s+/g, " ").trim().slice(0, 31) || "Chart Data";
  let name = base;
  let index = 2;
  while (usedNames.has(name)) {
    const suffix = ` ${index}`;
    name = `${base.slice(0, 31 - suffix.length)}${suffix}`;
    index += 1;
  }
  usedNames.add(name);
  return name;
}

export async function downloadWorkbookDatasets(fileName: string, title: string, datasets: Record<string, ChartExportDataset>) {
  const workbook = await createExcelWorkbook();
  const usedSheetNames = new Set<string>();
  const entries = Object.entries(datasets).filter(([, dataset]) => dataset.headers.length > 0);

  const indexRows = entries.map(([name], index) => [index + 1, name]);
  const indexSheet = workbook.addWorksheet(safeSheetName("Index", usedSheetNames));
  indexSheet.addRow([title]);
  indexSheet.addRow([]);
  indexSheet.addRow(["SN", "Chart Data Sheet"]);
  indexRows.forEach((row) => indexSheet.addRow(row));
  indexSheet.columns = [{ width: 8 }, { width: 42 }];

  entries.forEach(([name, dataset]) => {
    const worksheet = workbook.addWorksheet(safeSheetName(name, usedSheetNames));
    worksheet.addRow([name]);
    worksheet.addRow([]);
    worksheet.addRow(dataset.headers);
    dataset.rows.forEach((row) => worksheet.addRow(row));
    applyExportSheetColumns(worksheet, dataset.headers, dataset.rows);
  });

  await writeExcelWorkbook(workbook, fileName);
}

export function fileSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90) || "cdr-export";
}

export function exportIconSvg(kind: "png" | "xlsx" | "ppt" | "pdf" | "view" | "csv") {
  if (kind === "view") return `<svg class="file-export-svg file-export-svg-view" viewBox="0 0 64 64" aria-hidden="true"><path d="M6 32s9-16 26-16 26 16 26 16-9 16-26 16S6 32 6 32Z"/><circle cx="32" cy="32" r="8"/></svg>`;
  if (kind === "png") return `<svg class="file-export-svg file-export-svg-png" viewBox="0 0 64 64" aria-hidden="true"><path class="file-page" d="M14 5h25l11 11v43H14Z"/><path class="file-fold" d="M39 5v12h11"/><circle class="file-mark" cx="25" cy="24" r="5"/><path class="file-mark" d="m18 49 11-13 7 8 5-6 8 11Z"/></svg>`;
  const meta = {
    xlsx: { label: "XLSX", color: "#21a366", grid: false, chart: false },
    csv: { label: "CSV", color: "#26a65b", grid: true, chart: false },
    pdf: { label: "PDF", color: "#f0182d", grid: false, chart: false },
    ppt: { label: "PPT", color: "#d24726", grid: false, chart: true },
  }[kind];
  const lines = meta.grid ? `<path class="file-mark" d="M20 22h24M20 29h24M20 36h24M28 18v24M36 18v24"/>` : `<path class="file-mark" d="M21 22h22M21 29h22M21 36h16"/>`;
  const chart = meta.chart ? `<path class="file-mark" d="M24 48a10 10 0 1 0 10-10v10Z"/>` : "";
  const grid = kind === "xlsx" ? `<path class="file-mark" d="M21 20h22v18H21Zm7 0v18m8-18v18M21 26h22M21 32h22"/>` : "";
  return `<svg class="file-export-svg file-export-svg-${kind}" viewBox="0 0 64 64" aria-hidden="true" style="--file-color:${meta.color}"><path class="file-page" d="M14 5h25l11 11v43H14Z"/><path class="file-fold" d="M39 5v12h11"/>${lines}${grid}${chart}<rect class="file-ribbon" x="6" y="34" width="52" height="20" rx="3"/><text class="file-label" x="32" y="49" text-anchor="middle">${meta.label}</text></svg>`;
}

export function escapeXml(value: unknown) {
  return `${value ?? ""}`.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export function htmlEscape(value: unknown) {
  return `${value ?? ""}`.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const ARABIC_TEXT_RE = /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\ufb50-\ufdff\ufe70-\ufeff]/;
const PDF_ARABIC_FONT = "TahomaArabic";
const PDF_ARABIC_FONT_FILE = "tahoma.ttf";
let pdfArabicFontBase64: string | null = null;
let pdfArabicFontLoadPromise: Promise<string | null> | null = null;

function hasArabicText(value: unknown) {
  return ARABIC_TEXT_RE.test(`${value ?? ""}`);
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function loadPdfArabicFontBase64() {
  if (pdfArabicFontBase64) return Promise.resolve(pdfArabicFontBase64);
  if (!pdfArabicFontLoadPromise) {
    pdfArabicFontLoadPromise = fetch(`/assets/${PDF_ARABIC_FONT_FILE}`)
      .then((response) => response.ok ? response.arrayBuffer() : null)
      .then((buffer) => {
        pdfArabicFontBase64 = buffer ? arrayBufferToBase64(buffer) : null;
        return pdfArabicFontBase64;
      })
      .catch(() => null);
  }
  return pdfArabicFontLoadPromise;
}

export async function ensurePdfArabicFont(pdf: jsPDF) {
  const fontBase64 = await loadPdfArabicFontBase64();
  if (!fontBase64) return;
  const pdfWithFont = pdf as unknown as {
    addFileToVFS: (fileName: string, data: string) => void;
    addFont: (fileName: string, fontName: string, fontStyle: string) => void;
  };
  pdfWithFont.addFileToVFS(PDF_ARABIC_FONT_FILE, fontBase64);
  pdfWithFont.addFont(PDF_ARABIC_FONT_FILE, PDF_ARABIC_FONT, "normal");
  pdfWithFont.addFont(PDF_ARABIC_FONT_FILE, PDF_ARABIC_FONT, "bold");
}

export function applyWorkbookArabicSupport(workbook: ExcelJS.Workbook) {
  workbook.eachSheet((worksheet) => {
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        const rtl = hasArabicText(cell.value);
        cell.font = { ...(cell.font ?? {}), name: "Arial" };
        cell.alignment = {
          ...(cell.alignment ?? {}),
          wrapText: true,
          vertical: cell.alignment?.vertical ?? "middle",
          readingOrder: rtl ? "rtl" : "ltr",
        } as Partial<ExcelJS.Alignment>;
      });
    });
  });
}

function pdfExportText(pdf: jsPDF, value: unknown) {
  const text = `${value ?? ""}`;
  return hasArabicText(text) && typeof (pdf as unknown as { processArabic?: (txt: string) => string }).processArabic === "function"
    ? (pdf as unknown as { processArabic: (txt: string) => string }).processArabic(text)
    : text;
}

export function pdfText(pdf: jsPDF, value: unknown, x: number, y: number, options?: Parameters<jsPDF["text"]>[3]) {
  const rtl = hasArabicText(value);
  const api = pdf as unknown as { setR2L?: (enabled: boolean) => void; getR2L?: () => boolean };
  const previousR2L = api.getR2L?.() ?? false;
  const previousFont = pdf.getFont();
  if (rtl) {
    api.setR2L?.(true);
    if (pdfArabicFontBase64) pdf.setFont(PDF_ARABIC_FONT, previousFont.fontStyle === "bold" ? "bold" : "normal");
  }
  pdf.text(pdfExportText(pdf, value), x, y, { ...(options ?? {}), ...(rtl ? { isInputRtl: true, isOutputRtl: true } : {}) } as Parameters<jsPDF["text"]>[3]);
  if (rtl) {
    api.setR2L?.(previousR2L);
    pdf.setFont(previousFont.fontName, previousFont.fontStyle);
  }
}

export function pptTextOptions(value: unknown, options: Record<string, unknown>): any {
  return {
    ...options,
    fontFace: "Arial",
    lang: hasArabicText(value) ? "ar-SA" : "en-US",
  };
}

export function excelColumnName(index: number) {
  let value = index; let name = "";
  while (value > 0) { const r = (value - 1) % 26; name = String.fromCharCode(65 + r) + name; value = Math.floor((value - 1) / 26); }
  return name;
}

export function excelRange(sheetName: string, col: number, startRow: number, endRow: number) {
  const safeName = sheetName.replace(/'/g, "''");
  return `'${safeName}'!$${excelColumnName(col)}$${startRow}:$${excelColumnName(col)}$${endRow}`;
}

function nativeSeriesXml(series: NativeChartSeries, index: number, categoriesRef: string, chartType: "bar" | "line" | "doughnut") {
  const shape = `<c:spPr><a:solidFill><a:srgbClr val="${series.color}"/></a:solidFill><a:ln><a:solidFill><a:srgbClr val="${series.color}"/></a:solidFill></a:ln></c:spPr>`;
  const marker = chartType === "line" ? `<c:marker><c:symbol val="circle"/><c:size val="6"/><c:spPr><a:solidFill><a:srgbClr val="${series.color}"/></a:solidFill><a:ln><a:solidFill><a:srgbClr val="${series.color}"/></a:solidFill></a:ln></c:spPr></c:marker>` : "";
  const dPts = chartType === "doughnut" ? COLORS.map((color, i) => `<c:dPt><c:idx val="${i}"/><c:spPr><a:solidFill><a:srgbClr val="${color.replace("#", "")}"/></a:solidFill></c:spPr></c:dPt>`).join("") : "";
  return `<c:ser><c:idx val="${index}"/><c:order val="${index}"/><c:tx><c:v>${escapeXml(series.name)}</c:v></c:tx>${shape}${marker}${dPts}<c:cat><c:strRef><c:f>${escapeXml(categoriesRef)}</c:f></c:strRef></c:cat><c:val><c:numRef><c:f>${escapeXml(series.valuesRef)}</c:f></c:numRef></c:val></c:ser>`;
}

function nativeChartXml(config: NativeChartConfig) {
  const series = config.series.map((item, index) => nativeSeriesXml(item, index, config.categoriesRef, config.type)).join("");
  const chartBody = config.type === "bar"
    ? `<c:barChart><c:barDir val="bar"/><c:grouping val="clustered"/><c:varyColors val="0"/>${series}<c:dLbls><c:showVal val="1"/><c:showLegendKey val="0"/><c:showCatName val="0"/><c:showSerName val="0"/></c:dLbls><c:axId val="10"/><c:axId val="20"/></c:barChart>`
    : config.type === "line"
      ? `<c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/>${series}<c:dLbls><c:showVal val="1"/><c:showLegendKey val="0"/><c:showCatName val="0"/><c:showSerName val="0"/></c:dLbls><c:axId val="10"/><c:axId val="20"/></c:lineChart>`
      : `<c:doughnutChart><c:varyColors val="1"/>${series}<c:dLbls><c:showVal val="1"/><c:showLeaderLines val="1"/><c:showLegendKey val="0"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="0"/></c:dLbls><c:holeSize val="55"/></c:doughnutChart>`;
  const axes = config.type === "doughnut" ? "" : `<c:catAx><c:axId val="10"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:tickLblPos val="nextTo"/><c:crossAx val="20"/><c:crosses val="autoZero"/></c:catAx><c:valAx><c:axId val="20"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:majorGridlines/><c:numFmt formatCode="#,##0" sourceLinked="0"/><c:tickLblPos val="nextTo"/><c:crossAx val="10"/><c:crosses val="autoZero"/></c:valAx>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><c:date1904 val="0"/><c:lang val="en-US"/><c:roundedCorners val="0"/><c:chart><c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" b="1" sz="1400"/><a:t>${escapeXml(config.title)}</a:t></a:r></a:p></c:rich></c:tx><c:layout/></c:title><c:plotArea><c:layout/>${chartBody}${axes}</c:plotArea><c:legend><c:legendPos val="r"/><c:layout/></c:legend><c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart></c:chartSpace>`;
}

export async function patchWorkbookWithNativeCharts(buffer: ExcelJS.Buffer, configs: NativeChartConfig[]) {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(buffer);
  const contentTypePath = "[Content_Types].xml";
  let contentTypes = await zip.file(contentTypePath)?.async("string");
  for (const config of configs) {
    const chartPath = `xl/charts/chart${config.chartIndex}.xml`;
    const drawingPath = `xl/drawings/drawing${config.chartIndex}.xml`;
    const drawingRelPath = `xl/drawings/_rels/drawing${config.chartIndex}.xml.rels`;
    const sheetRelPath = `xl/worksheets/_rels/sheet${config.sheetIndex}.xml.rels`;
    const sheetPath = `xl/worksheets/sheet${config.sheetIndex}.xml`;
    const from = config.from ?? { col: 4, row: 1 };
    const to = config.to ?? { col: 14, row: 24 };
    zip.file(chartPath, nativeChartXml(config));
    zip.file(drawingPath, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><xdr:twoCellAnchor><xdr:from><xdr:col>${from.col}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${from.row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>${to.col}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${to.row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="2" name="${escapeXml(config.title)}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rId1"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor></xdr:wsDr>`);
    zip.file(drawingRelPath, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart${config.chartIndex}.xml"/></Relationships>`);
    const sheetRelXml = await zip.file(sheetRelPath)?.async("string");
    const existingRids = [...(sheetRelXml ?? "").matchAll(/Id="rId(\d+)"/g)].map((m) => Number(m[1]));
    const nextRid = `rId${Math.max(0, ...existingRids) + 1}`;
    const drawingRel = `<Relationship Id="${nextRid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${config.chartIndex}.xml"/>`;
    zip.file(sheetRelPath, sheetRelXml ? sheetRelXml.replace("</Relationships>", `${drawingRel}</Relationships>`) : `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${drawingRel}</Relationships>`);
    const sheetXml = await zip.file(sheetPath)?.async("string");
    if (sheetXml && !sheetXml.includes("<drawing ")) {
      const withNs = sheetXml.includes("xmlns:r=") ? sheetXml : sheetXml.replace("<worksheet ", '<worksheet xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ');
      zip.file(sheetPath, withNs.replace("</worksheet>", `<drawing r:id="${nextRid}"/></worksheet>`));
    }
    if (contentTypes) {
      const chartOverride = `<Override PartName="/${chartPath}" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`;
      const drawingOverride = `<Override PartName="/${drawingPath}" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`;
      if (!contentTypes.includes(chartPath)) contentTypes = contentTypes.replace("</Types>", `${chartOverride}</Types>`);
      if (!contentTypes.includes(drawingPath)) contentTypes = contentTypes.replace("</Types>", `${drawingOverride}</Types>`);
    }
  }
  if (contentTypes) zip.file(contentTypePath, contentTypes);
  return zip.generateAsync({ type: "blob" });
}
