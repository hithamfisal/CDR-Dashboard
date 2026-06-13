import { COLORS, COMPANY_COLORS, MOBILE_TYPE_COLORS, MOBILE_TYPE_LABELS } from "./dashboardConstants";

export function truncateLabel(value: unknown, max = 24) {
  const text = `${value ?? "Unknown"}`;
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

export function shortMonthLabel(value: unknown) {
  return `${value ?? "Unknown"}`.replace(/\s+/g, " ").trim().replace(/^([A-Za-z]{3})[a-z]*\s+((?:19|20)\d{2})$/, "$1 $2");
}

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const value = Number.parseInt(clean, 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

function colorMix(hex: string, target: "light" | "dark") {
  const { r, g, b } = hexToRgb(hex);
  const amount = target === "light" ? 0.28 : -0.18;
  const mix = (channel: number) => {
    const next = amount >= 0 ? channel + (255 - channel) * amount : channel * (1 + amount);
    return Math.round(Math.max(0, Math.min(255, next))).toString(16).padStart(2, "0");
  };
  return `#${mix(r)}${mix(g)}${mix(b)}`;
}

export function companyColor(company: string) {
  let hash = 0;
  for (const char of company) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return COMPANY_COLORS[hash % COMPANY_COLORS.length];
}

export function companyMetricColor(company: string, metric: "duration" | "calls") {
  return colorMix(companyColor(company), metric === "duration" ? "light" : "dark");
}

export function dataKey(value: string) {
  return `m_${value.replace(/[^a-zA-Z0-9]/g, "_")}`;
}

export function mobileTypeKey(value: string) {
  return `type_${value.replace(/[^a-zA-Z0-9]/g, "_")}`;
}

export function mobileTypeColor(type: string) {
  const knownIndex = MOBILE_TYPE_LABELS.indexOf(type);
  if (knownIndex >= 0) return MOBILE_TYPE_COLORS[knownIndex % MOBILE_TYPE_COLORS.length];
  let hash = 0;
  for (const char of type) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return COLORS[hash % COLORS.length];
}
