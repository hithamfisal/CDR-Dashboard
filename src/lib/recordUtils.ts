export function cleanText(value: unknown, fallback = "Unknown") {
  const text = `${value ?? ""}`.replace(/\s+/g, " ").trim();
  return text || fallback;
}

export function normalizeRadioKey(value: unknown) {
  return `${value ?? ""}`
    .replace(/^\uFEFF/, "")
    .replace(/^,+|,+$/g, "")
    .replace(/^["']+|["']+$/g, "")
    .replace(/\.0$/, "")
    .replace(/[\s,"]/g, "")
    .trim();
}

export function isKnownLabel(value: string) {
  return !["", "unknown", "not found"].includes(`${value ?? ""}`.trim().toLowerCase());
}

export function parseNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const numeric = Number(`${value ?? ""}`.replace(/,/g, "").trim());
  return Number.isFinite(numeric) ? numeric : fallback;
}

function numericText(value: unknown) {
  const text = `${value ?? ""}`
    .replace(/^\ufeff/, "")
    .replace(/^,+|,+$/g, "")
    .replace(/\t/g, "")
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .trim();
  return /^\d+(?:\.\d+)?$/.test(text) ? text : "";
}

function excelSerialNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = numericText(value);
  if (!text) return null;
  const numeric = Number(text);
  return Number.isFinite(numeric) ? numeric : null;
}

function dateFromExcelSerial(value: unknown) {
  const numeric = excelSerialNumber(value);
  if (numeric === null) return null;
  const wholeDays = Math.floor(numeric);
  const dayFraction = numeric - wholeDays;
  const epoch = Date.UTC(1899, 11, 30);
  const utc = new Date(epoch + wholeDays * 86400000 + Math.round(dayFraction * 86400000));
  return new Date(
    utc.getUTCFullYear(),
    utc.getUTCMonth(),
    utc.getUTCDate(),
    utc.getUTCHours(),
    utc.getUTCMinutes(),
    utc.getUTCSeconds()
  );
}

function isLikelyExcelDateSerial(value: unknown) {
  const numeric = excelSerialNumber(value);
  return numeric !== null && numeric >= 20000 && numeric <= 80000;
}

export function parseDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  if (isLikelyExcelDateSerial(value)) {
    const excelDate = dateFromExcelSerial(value);
    if (excelDate && !Number.isNaN(excelDate.getTime())) return excelDate;
  }

  const text = `${value ?? ""}`
    .replace(/^\ufeff/, "")
    .replace(/^,+|,+$/g, "")
    .replace(/\t/g, "")
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .trim();

  const dayFirst = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(text);
  if (dayFirst) {
    const yearRaw = Number(dayFirst[3]);
    const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
    return new Date(year, Number(dayFirst[2]) - 1, Number(dayFirst[1]), Number(dayFirst[4] ?? 0), Number(dayFirst[5] ?? 0), Number(dayFirst[6] ?? 0));
  }

  const isoLike = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(text);
  if (isoLike) {
    return new Date(Number(isoLike[1]), Number(isoLike[2]) - 1, Number(isoLike[3]), Number(isoLike[4] ?? 0), Number(isoLike[5] ?? 0), Number(isoLike[6] ?? 0));
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function weekLabelFromDate(value: unknown) {
  const date = parseDate(value);
  if (!date) return "Unknown";
  const weekOfMonth = Math.ceil(date.getDate() / 7);
  const monthYear = date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  return `Week ${weekOfMonth} of ${monthYear}`;
}
