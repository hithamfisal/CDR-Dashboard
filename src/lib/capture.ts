import html2canvas from "html2canvas";

export async function captureElementPng(element: HTMLElement, backgroundColor = "#ffffff") {
  const canvas = await html2canvas(element, { backgroundColor, scale: 2, useCORS: true });
  return canvas.toDataURL("image/png");
}
