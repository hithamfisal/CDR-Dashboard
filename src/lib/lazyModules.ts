export async function loadExcelJS() {
  return (await import("exceljs")).default;
}

export async function loadJsPdf() {
  return (await import("jspdf")).jsPDF;
}

export async function loadPptxgen() {
  return (await import("pptxgenjs")).default;
}

export async function loadWorkbookParser() {
  return import("./workbookParser");
}

export async function loadChartWorkbookExport() {
  return import("./chartWorkbookExport");
}

export async function loadTablePdfExport() {
  return import("./tablePdfExport");
}
