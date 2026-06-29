import { downloadPdf, ensurePdfArabicFont, pdfText } from "./exportUtils";
import { loadJsPdf } from "./lazyModules";

export async function exportTablePdf({
  fileName,
  title,
  headers,
  rows,
  titleFor,
}: {
  fileName: string;
  title: string;
  headers: string[];
  rows: (string | number)[][];
  titleFor: (title: string) => string;
}) {
  const jsPDF = await loadJsPdf();
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4",
  });
  await ensurePdfArabicFont(pdf);
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 24;
  const tableWidth = pageWidth - margin * 2;
  const colWidth = tableWidth / Math.max(1, headers.length);
  const rowHeight = 20;
  let y = 54;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(15);
  pdf.setTextColor(0, 0, 0);
  pdfText(pdf, titleFor(title), pageWidth / 2, 28, { align: "center" });

  const drawRow = (row: (string | number)[], isHeader = false) => {
    if (y + rowHeight > pageHeight - margin) {
      pdf.addPage("a4", "landscape");
      y = margin;
    }
    let x = margin;
    row.forEach((cell) => {
      pdf.setDrawColor(20, 36, 48);
      pdf.setFillColor(isHeader ? "#fff200" : "#ffffff");
      pdf.rect(x, y, colWidth, rowHeight, "FD");
      pdf.setFont("helvetica", isHeader ? "bold" : "normal");
      pdf.setFontSize(isHeader ? 7 : 7.2);
      pdf.setTextColor(0, 0, 0);
      pdfText(pdf, cell, x + colWidth / 2, y + 13, {
        align: "center",
        maxWidth: colWidth - 4,
      });
      x += colWidth;
    });
    y += rowHeight;
  };

  drawRow(headers, true);
  rows.forEach((row) => drawRow(row));
  downloadPdf(pdf, fileName);
}
