export async function captureElementPng(element: HTMLElement, backgroundColor = "#ffffff") {
  const { default: html2canvas } = await import("html2canvas");
  const canvas = await html2canvas(element, { backgroundColor, scale: 2, useCORS: true });
  return canvas.toDataURL("image/png");
}
