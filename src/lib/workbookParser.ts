import type * as XLSXTypes from "xlsx";
import { FLEETMAP_HEADER_ALIASES, HEADER_ALIASES, MOBILE_TYPE_LABELS, RAW_SYSTEM_HEADER_ALIASES } from "./dashboardConstants";
import { formatNumber } from "./formatters";
import { cleanText, isKnownLabel, normalizeRadioKey, parseDate, parseNumber, weekLabelFromDate } from "./recordUtils";
import type { CallRecord, DashboardData, FleetmapRecord, LookupRecord, RawRow } from "../types/dashboard";

type WorkBook = XLSXTypes.WorkBook;

async function loadXlsx() {
  return import("xlsx");
}

function normalizeHeader(value: unknown) {
  return `${value ?? ""}`.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function cleanRawSystemValue(value: unknown, fallback = "") {
  const text = `${value ?? ""}`
    .replace(/^\uFEFF/, "")
    .replace(/^,+/, "")
    .replace(/\t/g, "")
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .trim();
  return text || fallback;
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

function isLikelyExcelDateSerial(value: unknown) {
  const numeric = excelSerialNumber(value);
  return numeric !== null && numeric >= 20000 && numeric <= 80000;
}

function normalizeRawSystemCsvText(text: string) {
  return text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\t,/g, ",")
    .replace(/\t/g, "");
}

export async function readWorkbookFromUploadedFile(file: File) {
  const XLSX = await loadXlsx();
  const isCsv = /\.csv$/i.test(file.name) || /csv/i.test(file.type);
  if (isCsv) {
    const text = await file.text();
    return XLSX.read(normalizeRawSystemCsvText(text), { type: "string", cellDates: false, raw: false });
  }
  return XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: false });
}

function findValue(row: RawRow, aliases: string[]) {
  const entries = Object.keys(row).map((key) => ({ key, normalized: normalizeHeader(key) }));
  for (const alias of aliases) {
    const target = normalizeHeader(alias);
    const exact = entries.find((entry) => entry.normalized === target);
    if (exact) return row[exact.key];
  }
  for (const alias of aliases) {
    const target = normalizeHeader(alias);
    const loose = entries.find((entry) => entry.normalized.includes(target));
    if (loose) return row[loose.key];
  }
  return undefined;
}

function parseDuration(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value > 0 && value < 2) return Math.round(value * 86400);
    return value;
  }
  const text = `${value ?? ""}`.trim();
  const parts = text.split(":").map(Number);
  if (parts.length === 3 && parts.every(Number.isFinite)) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return parseNumber(value, 0);
}

function parseDurationSeconds(row: RawRow) {
  const secondsRaw = findValue(row, ["durationseconds", "duration seconds", "duration sec", "duration (sec)", "seconds"]);
  if (secondsRaw !== undefined && `${secondsRaw}`.trim() !== "") return parseNumber(secondsRaw, 0);
  return parseDuration(findValue(row, ["duration", "call duration"]));
}

function formatDate(value: unknown) {
  const date = parseDate(value);
  return date ? date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : cleanText(value);
}

function formatDateNumeric(value: unknown) {
  const date = value instanceof Date ? value : parseDate(value);
  return date ? date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }) : cleanText(value);
}

function formatDateTime(value: unknown) {
  const date = parseDate(value);
  if (!date) return cleanText(value, "");
  return date.toLocaleString("en-GB", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
}

function formatTimeValue(value: unknown) {
  const numeric = excelSerialNumber(value);
  if (numeric !== null) {
    const secondsOfDay = Math.round((numeric % 1) * 86400);
    const hours = Math.floor(secondsOfDay / 3600);
    const minutes = Math.floor((secondsOfDay % 3600) / 60);
    const seconds = secondsOfDay % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  }
  const date = parseDate(value);
  if (date) return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const time = /(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(`${value ?? ""}`);
  if (time) return `${String(Number(time[1])).padStart(2, "0")}:${time[2]}:${time[3] ?? "00"}`;
  return cleanText(value, "");
}

function formatSourceDateTime(value: unknown) {
  const text = cleanRawSystemValue(value, "") || cleanText(value, "");
  const time = formatTimeValue(value);
  const parsed = parseDate(value);
  const textHasDate = /\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(text)
    || /^\d{4}-\d{1,2}-\d{1,2}/.test(text)
    || value instanceof Date
    || isLikelyExcelDateSerial(value);
  if (parsed && textHasDate) return formatDateTime(parsed);
  if (time && textHasDate) return `${formatDateNumeric(parsed ?? value)} ${time}`;
  return text || formatDateTime(value);
}

function combineDateAndTime(dateValue: unknown, timeValue: unknown) {
  const parsedTimeDate = parseDate(timeValue);
  const text = cleanText(timeValue, "");
  const textHasDate = /\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(text) || timeValue instanceof Date || (typeof timeValue === "number" && timeValue >= 1);
  if (textHasDate && parsedTimeDate) return formatDateTime(parsedTimeDate);
  const date = parseDate(dateValue);
  const time = formatTimeValue(timeValue);
  if (date && time) return `${formatDateNumeric(date)} ${time}`;
  return formatSourceDateTime(timeValue);
}

function monthLabel(value: unknown, dateRaw: unknown) {
  const explicit = cleanText(value, "");
  if (explicit) return explicit;
  const date = parseDate(dateRaw);
  return date ? date.toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "Unknown";
}

function yearLabel(value: unknown, dateRaw: unknown) {
  const explicit = cleanText(value, "");
  if (/^(19|20)\d{2}$/.test(explicit)) return explicit;
  const date = parseDate(dateRaw);
  return date ? `${date.getFullYear()}` : explicit || "Unknown";
}

function hourLabel(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return `${String(value).padStart(2, "0")}:00`;
  const text = cleanText(value);
  return /^\d{1,2}$/.test(text) ? `${text.padStart(2, "0")}:00` : text;
}

function companyFromRadioId(radioId: string, company: string) {
  const currentCompany = cleanText(company, "Unknown");
  if (!["", "unknown", "not found"].includes(currentCompany.toLowerCase())) return currentCompany;
  const firstDigit = /^\s*([1-4])/.exec(radioId)?.[1];
  const fallback: Record<string, string> = {
    "1": "HSSE", "2": "GENERATION", "3": "NATIONAL GRID", "4": "DISTRIBUTION & CUSTOMER SERVICES",
  };
  return firstDigit ? fallback[firstDigit] ?? currentCompany : currentCompany;
}

function mobileTypeFromRadioId(radioId: string, mobileType: string) {
  const currentType = cleanText(mobileType, "Unknown");
  if (!["", "unknown", "not found"].includes(currentType.toLowerCase())) return currentType;
  const thirdDigit = `${radioId ?? ""}`.trim().charAt(2);
  const fallback: Record<string, string> = {
    "1": MOBILE_TYPE_LABELS[0],
    "2": MOBILE_TYPE_LABELS[1],
    "3": MOBILE_TYPE_LABELS[2],
    "4": MOBILE_TYPE_LABELS[3],
    "5": MOBILE_TYPE_LABELS[4],
  };
  return thirdDigit ? fallback[thirdDigit] ?? currentType : currentType;
}

function baseStationOrRadioType(baseStation: string, mobileType: string) {
  return isKnownLabel(baseStation) ? baseStation : (isKnownLabel(mobileType) ? mobileType : "Unknown");
}

export async function parseFleetmap(workbook: WorkBook, source: "master" | "fixed"): Promise<FleetmapRecord[]> {
  const XLSX = await loadXlsx();
  const preferred = workbook.SheetNames.find((n) => /fleet|master|fixed|lookup/i.test(n));
  const sheetName = preferred ?? workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json<RawRow>(workbook.Sheets[sheetName], { defval: "", raw: true });
  return rows
    .map((row): FleetmapRecord => {
      const radioId = cleanText(findValue(row, FLEETMAP_HEADER_ALIASES.radioId), "");
      const company = cleanText(findValue(row, FLEETMAP_HEADER_ALIASES.company), "");
      const mobileType = cleanText(findValue(row, FLEETMAP_HEADER_ALIASES.mobileType), "");
      return {
        radioId,
        radioAlias: cleanText(findValue(row, FLEETMAP_HEADER_ALIASES.radioAlias), ""),
        employeeName: cleanText(findValue(row, FLEETMAP_HEADER_ALIASES.employeeName), ""),
        employeeId: cleanText(findValue(row, FLEETMAP_HEADER_ALIASES.employeeId), ""),
        company: companyFromRadioId(radioId, company),
        region: cleanText(findValue(row, FLEETMAP_HEADER_ALIASES.region), ""),
        talkgroup: cleanText(findValue(row, FLEETMAP_HEADER_ALIASES.talkgroup), ""),
        mobileType: mobileTypeFromRadioId(radioId, mobileType),
        source,
      };
    })
    .filter((r) => r.radioId && r.radioId !== "Unknown");
}

export function unionFleetmaps(master: FleetmapRecord[], fixed: FleetmapRecord[]): FleetmapRecord[] {
  const map = new Map<string, FleetmapRecord>();
  [...master, ...fixed].forEach((rec) => { if (!map.has(rec.radioId)) map.set(rec.radioId, rec); });
  return [...map.values()];
}

async function parseWorkbook(workbook: WorkBook, fileName: string, fleetmap: FleetmapRecord[] = []): Promise<DashboardData> {
  const XLSX = await loadXlsx();
  const sourceSheet = workbook.SheetNames.includes("Raw_Data") ? "Raw_Data" : workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sourceSheet];
  const rows = XLSX.utils.sheet_to_json<RawRow>(worksheet, { defval: "", raw: true });

  const fleetIndex = new Map<string, FleetmapRecord>();
  fleetmap.forEach((rec) => fleetIndex.set(normalizeRadioKey(rec.radioId), rec));

  const lookupRows = workbook.SheetNames.includes("lookup")
    ? XLSX.utils.sheet_to_json<RawRow>(workbook.Sheets.lookup, { defval: "", raw: true })
    : [];

  const pickFleet = (cdrValue: string, fleetValue: string | undefined, fallback: string) =>
    isKnownLabel(cdrValue) ? cdrValue : (fleetValue && isKnownLabel(fleetValue) ? fleetValue : fallback);

  const records = rows
    .map((row): CallRecord => {
      const dateRaw = findValue(row, HEADER_ALIASES.callDate);
      const startRaw = findValue(row, HEADER_ALIASES.startTime);
      const endRaw = findValue(row, HEADER_ALIASES.endTime);
      const durationSeconds = parseDurationSeconds(row);
      const radioId = cleanText(findValue(row, HEADER_ALIASES.radioId));
      const fleet = fleetIndex.get(normalizeRadioKey(radioId));

      const rawCompany = cleanText(findValue(row, HEADER_ALIASES.company), "Unknown");
      const rawMobileType = cleanText(findValue(row, HEADER_ALIASES.mobileType), "Unknown");
      const rawAlias = cleanText(findValue(row, HEADER_ALIASES.radioAlias), "Not labelled");
      const rawEmpName = cleanText(findValue(row, HEADER_ALIASES.employeeName), "Unknown");
      const rawEmpId = cleanText(findValue(row, HEADER_ALIASES.employeeId), "Unknown");
      const rawRegion = cleanText(findValue(row, HEADER_ALIASES.region), "Unknown");
      const rawTalkgroup = cleanText(findValue(row, HEADER_ALIASES.talkgroup), "Unknown");
      const rawCallType = cleanText(findValue(row, HEADER_ALIASES.callType), "Unknown");
      const rawDuplexType = cleanText(findValue(row, HEADER_ALIASES.duplexType), "Unknown");
      const rawCallPriority = cleanText(findValue(row, HEADER_ALIASES.callPriority), "Unknown");
      const rawEncrypted = cleanText(findValue(row, HEADER_ALIASES.encrypted), "Unknown");
      const mappedMobileType = mobileTypeFromRadioId(radioId, pickFleet(rawMobileType, fleet?.mobileType, "Unknown"));
      const mappedBaseStation = baseStationOrRadioType(cleanText(findValue(row, HEADER_ALIASES.baseStation), "Unknown"), mappedMobileType);

      return {
        radioId,
        radioAlias: pickFleet(rawAlias, fleet?.radioAlias, "Not labelled"),
        mobileType: mappedMobileType,
        employeeName: pickFleet(rawEmpName, fleet?.employeeName, "Unknown"),
        employeeId: pickFleet(rawEmpId, fleet?.employeeId, "Unknown"),
        region: pickFleet(rawRegion, fleet?.region, "Unknown"),
        company: companyFromRadioId(radioId, pickFleet(rawCompany, fleet?.company, "Unknown")),
        talkgroup: pickFleet(rawTalkgroup, fleet?.talkgroup, "Unknown"),
        callDate: formatDate(dateRaw),
        startTime: combineDateAndTime(dateRaw, startRaw),
        endTime: combineDateAndTime(dateRaw, endRaw),
        year: yearLabel(findValue(row, HEADER_ALIASES.year), dateRaw),
        month: monthLabel(findValue(row, HEADER_ALIASES.month), dateRaw),
        week: cleanText(findValue(row, HEADER_ALIASES.week), "Unknown"),
        hour: hourLabel(findValue(row, HEADER_ALIASES.hour)),
        durationSeconds,
        trafficHours: parseNumber(findValue(row, HEADER_ALIASES.trafficHours), durationSeconds / 3600),
        baseStation: mappedBaseStation,
        callType: rawCallType,
        duplexType: rawDuplexType,
        callPriority: rawCallPriority,
        encrypted: rawEncrypted,
      };
    })
    .filter((record) => record.radioId !== "Unknown" || record.company !== "Unknown" || record.durationSeconds > 0);

  const lookupRecords = lookupRows
    .map((row): LookupRecord => {
      const radioId = cleanText(findValue(row, HEADER_ALIASES.radioId), "");
      const company = cleanText(findValue(row, HEADER_ALIASES.company), "");
      return { radioId, company: companyFromRadioId(radioId, company), region: cleanText(findValue(row, HEADER_ALIASES.region), ""), talkgroup: cleanText(findValue(row, HEADER_ALIASES.talkgroup), "") };
    })
    .filter((record) => record.radioId && record.company);

  const fleetAsLookup: LookupRecord[] = fleetmap
    .filter((r) => r.radioId && r.company)
    .map((r) => ({ radioId: r.radioId, company: r.company, region: r.region, talkgroup: r.talkgroup }));

  const lookupMap = new Map<string, LookupRecord>();
  [...lookupRecords, ...fleetAsLookup].forEach((rec) => { if (!lookupMap.has(rec.radioId)) lookupMap.set(rec.radioId, rec); });
  const combinedLookup = [...lookupMap.values()];

  const warnings: string[] = [];
  if (!workbook.SheetNames.includes("Raw_Data")) warnings.push("Raw_Data sheet was not found. The first sheet was used.");
  if (!workbook.SheetNames.includes("lookup") && fleetmap.length === 0) warnings.push("No lookup sheet or fleetmap loaded. KPI activated users will fall back to calling radio users.");
  if (records.length === 0) warnings.push("No CDR rows could be parsed. Check the header row.");
  if (records.some((record) => record.durationSeconds <= 0)) warnings.push("Some rows have zero or missing duration.");

  return {
    fileName,
    sourceSheet,
    loadedAt: new Date().toLocaleString("en-GB"),
    rawRows: rows.length,
    records,
    lookupRecords: combinedLookup,
    fleetmapRecords: fleetmap,
    cdrSources: [{ fileName, rawRows: rows.length, loadedAt: new Date().toLocaleString("en-GB"), recordCount: records.length }],
    warnings,
  };
}

async function isRawSystemWorkbook(workbook: WorkBook) {
  const XLSX = await loadXlsx();
  const sourceSheet = workbook.SheetNames[0];
  if (!sourceSheet) return false;
  const worksheet = workbook.Sheets[sourceSheet];
  const rows = XLSX.utils.sheet_to_json<RawRow>(worksheet, { defval: "", raw: true });
  if (rows.length === 0) return false;
  const sample = rows.slice(0, 5);
  return sample.some((row) => {
    const callerNumber = findValue(row, RAW_SYSTEM_HEADER_ALIASES.callerNumber);
    const startTime = findValue(row, RAW_SYSTEM_HEADER_ALIASES.startTime);
    const endTime = findValue(row, RAW_SYSTEM_HEADER_ALIASES.endTime);
    const duration = findValue(row, RAW_SYSTEM_HEADER_ALIASES.durationSeconds);
    const baseStation = findValue(row, RAW_SYSTEM_HEADER_ALIASES.baseStation);
    return callerNumber !== undefined && startTime !== undefined && (endTime !== undefined || duration !== undefined || baseStation !== undefined);
  });
}

export async function parseUploadedTrafficWorkbook(workbook: WorkBook, fileName: string, fleetmap: FleetmapRecord[] = []): Promise<DashboardData> {
  return await isRawSystemWorkbook(workbook)
    ? parseRawSystemWorkbook(workbook, fileName, fleetmap)
    : parseWorkbook(workbook, fileName, fleetmap);
}

export async function parseRawSystemWorkbook(workbook: WorkBook, fileName: string, fleetmap: FleetmapRecord[] = []): Promise<DashboardData> {
  const XLSX = await loadXlsx();
  const sourceSheet = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sourceSheet];
  const rows = XLSX.utils.sheet_to_json<RawRow>(worksheet, { defval: "", raw: true });

  const fleetIndex = new Map<string, FleetmapRecord>();
  fleetmap.forEach((rec) => fleetIndex.set(normalizeRadioKey(rec.radioId), rec));

  const records = rows
    .map((row): CallRecord => {
      const startRaw = cleanRawSystemValue(findValue(row, RAW_SYSTEM_HEADER_ALIASES.startTime));
      const endRaw = cleanRawSystemValue(findValue(row, RAW_SYSTEM_HEADER_ALIASES.endTime));
      const durationSeconds = parseNumber(cleanRawSystemValue(findValue(row, RAW_SYSTEM_HEADER_ALIASES.durationSeconds)), 0);
      const radioId = normalizeRadioKey(findValue(row, RAW_SYSTEM_HEADER_ALIASES.callerNumber));
      const fleet = fleetIndex.get(normalizeRadioKey(radioId));
      const hasFleetMatch = Boolean(fleet);
      const mappedRegion = hasFleetMatch
        ? (fleet?.region && isKnownLabel(fleet.region) ? fleet.region : "Unknown")
        : "Unmatched Fleetmap";
      const rawAlias = cleanRawSystemValue(findValue(row, RAW_SYSTEM_HEADER_ALIASES.callerAlias), "Not labelled");
      const rawTalkgroup = cleanRawSystemValue(
        findValue(row, RAW_SYSTEM_HEADER_ALIASES.calleeAlias),
        cleanRawSystemValue(findValue(row, RAW_SYSTEM_HEADER_ALIASES.calleeNumber), "Unknown")
      );
      const rawCallType = cleanText(findValue(row, RAW_SYSTEM_HEADER_ALIASES.callType), "Unknown");
      const rawDuplexType = cleanText(findValue(row, RAW_SYSTEM_HEADER_ALIASES.duplexType), "Unknown");
      const rawCallPriority = cleanText(findValue(row, RAW_SYSTEM_HEADER_ALIASES.callPriority), "Unknown");
      const rawEncrypted = cleanText(findValue(row, RAW_SYSTEM_HEADER_ALIASES.encrypted), "Unknown");
      const parsedStart = parseDate(startRaw);

      const preferKnown = (primary: string, fallbackValue: string | undefined, fallback = "Unknown") =>
        isKnownLabel(primary) ? primary : (fallbackValue && isKnownLabel(fallbackValue) ? fallbackValue : fallback);
      const mappedMobileType = mobileTypeFromRadioId(radioId, fleet?.mobileType ?? "Unknown");
      const mappedBaseStation = baseStationOrRadioType(cleanRawSystemValue(findValue(row, RAW_SYSTEM_HEADER_ALIASES.baseStation), "Unknown"), mappedMobileType);

      return {
        radioId,
        radioAlias: preferKnown(rawAlias, fleet?.radioAlias, "Not labelled"),
        mobileType: mappedMobileType,
        employeeName: fleet?.employeeName && isKnownLabel(fleet.employeeName) ? fleet.employeeName : "Unknown",
        employeeId: fleet?.employeeId && isKnownLabel(fleet.employeeId) ? fleet.employeeId : "Unknown",
        region: mappedRegion,
        company: companyFromRadioId(radioId, fleet?.company ?? "Unknown"),
        talkgroup: preferKnown(rawTalkgroup, fleet?.talkgroup, "Unknown"),
        callDate: formatDate(startRaw),
        startTime: formatSourceDateTime(startRaw),
        endTime: formatSourceDateTime(endRaw),
        year: parsedStart ? `${parsedStart.getFullYear()}` : yearLabel("", startRaw),
        month: monthLabel("", startRaw),
        week: weekLabelFromDate(startRaw),
        hour: parsedStart ? `${String(parsedStart.getHours()).padStart(2, "0")}:00` : hourLabel(startRaw),
        durationSeconds,
        trafficHours: durationSeconds / 3600,
        baseStation: mappedBaseStation,
        callType: rawCallType,
        duplexType: rawDuplexType,
        callPriority: rawCallPriority,
        encrypted: rawEncrypted,
      };
    })
    .filter((record) => record.radioId !== "Unknown" || record.durationSeconds > 0);

  const lookupRecords: LookupRecord[] = fleetmap
    .filter((r) => r.radioId && r.company)
    .map((r) => ({ radioId: r.radioId, company: r.company, region: r.region, talkgroup: r.talkgroup }));

  const warnings: string[] = [];
  if (fleetmap.length === 0) warnings.push("Raw system file was loaded without Master/Fixed Fleetmap. Company, region, user and radio type lookup may be incomplete.");
  if (records.length === 0) warnings.push("No raw system call rows could be parsed. Check the raw file headers.");
  if (records.some((record) => record.durationSeconds <= 0)) warnings.push("Some raw rows have zero or missing duration.");
  const unmatchedRows = records.filter((record) => record.region === "Unmatched Fleetmap" || record.company === "Unknown").length;
  if (unmatchedRows > 0) warnings.push(`${formatNumber(unmatchedRows)} raw rows could not be matched to Master/Fixed Fleetmap lookup. Check whether those Caller Numbers exist in the fleetmap.`);

  return {
    fileName,
    sourceSheet,
    loadedAt: new Date().toLocaleString("en-GB"),
    rawRows: rows.length,
    records,
    lookupRecords,
    fleetmapRecords: fleetmap,
    cdrSources: [{ fileName, rawRows: rows.length, loadedAt: new Date().toLocaleString("en-GB"), recordCount: records.length }],
    warnings,
  };
}

function combineDashboardWarnings(warnings: string[]) {
  const rawUnmatchedPattern = /^(\d[\d,]*) raw rows could not be matched to Master\/Fixed Fleetmap lookup\. Check whether those Caller Numbers exist in the fleetmap\.$/;
  let rawUnmatchedTotal = 0;
  const otherWarnings: string[] = [];

  warnings.forEach((warning) => {
    const match = rawUnmatchedPattern.exec(warning);
    if (match) {
      rawUnmatchedTotal += Number(match[1].replace(/,/g, ""));
    } else if (!otherWarnings.includes(warning)) {
      otherWarnings.push(warning);
    }
  });

  if (rawUnmatchedTotal > 0) {
    otherWarnings.push(`${new Intl.NumberFormat("en-US").format(rawUnmatchedTotal)} raw rows could not be matched to Master/Fixed Fleetmap lookup. Check whether those Caller Numbers exist in the fleetmap.`);
  }

  return otherWarnings;
}

export function mergeCdrIntoData(base: DashboardData, addition: DashboardData): DashboardData {
  return {
    ...base,
    records: [...base.records, ...addition.records],
    rawRows: base.rawRows + addition.rawRows,
    cdrSources: [...base.cdrSources, ...addition.cdrSources],
    warnings: combineDashboardWarnings([...base.warnings, ...addition.warnings]),
    loadedAt: new Date().toLocaleString("en-GB"),
  };
}
