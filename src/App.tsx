import { CSSProperties, ChangeEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ExcelJS from "exceljs";
import html2canvas from "html2canvas";
import JSZip from "jszip";
import { jsPDF } from "jspdf";
import pptxgen from "pptxgenjs";
import {
  Activity,
  AlertTriangle,
  ArrowUp,
  BarChart3,
  Building2,
  ChevronDown,
  CheckCircle2,
  Clock3,
  Eye,
  FileImage,
  FileSpreadsheet,
  FileText,
  Filter,
  Gauge,
  HardDrive,
  Home,
  Palette,
  Presentation,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  UploadCloud,
  Users,
  Waves,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import * as XLSX from "xlsx";

type RawRow = Record<string, unknown>;

type CallRecord = {
  radioId: string;
  radioAlias: string;
  mobileType: string;
  employeeName: string;
  employeeId: string;
  region: string;
  company: string;
  talkgroup: string;
  callDate: string;
  startTime: string;
  endTime: string;
  year: string;
  month: string;
  week: string;
  hour: string;
  durationSeconds: number;
  trafficHours: number;
  baseStation: string;
};

type LookupRecord = {
  radioId: string;
  company: string;
  region: string;
  talkgroup: string;
};

type FleetmapRecord = {
  radioId: string;
  radioAlias: string;
  employeeName: string;
  employeeId: string;
  company: string;
  region: string;
  talkgroup: string;
  mobileType: string;
  source: "master" | "fixed";
};

type FleetmapMeta = { fileName: string; loadedAt: string };

type FleetmapState = {
  records: FleetmapRecord[];
  meta: FleetmapMeta | null;
  isParsing: boolean;
};

type CdrSource = {
  fileName: string;
  rawRows: number;
  loadedAt: string;
  recordCount: number;
};

type DashboardData = {
  fileName: string;
  sourceSheet: string;
  loadedAt: string;
  rawRows: number;
  records: CallRecord[];
  lookupRecords: LookupRecord[];
  fleetmapRecords: FleetmapRecord[];
  cdrSources: CdrSource[];
  warnings: string[];
};

type SavedWorkbookMeta = {
  fileName: string;
  sourceSheet: string;
  loadedAt: string;
  rawRows: number;
};

type Filters = {
  region: string[];
  year: string[];
  company: string[];
  month: string[];
  baseStation: string[];
  talkgroup: string[];
  search: string;
};

type Ranking = {
  name: string;
  calls: number;
  durationSeconds: number;
  trafficHours: number;
  radios: number;
};

type ExportCell = string | number | boolean | null;
type ChartExportDataset = {
  headers: string[];
  rows: ExportCell[][];
};

const SECTION_NAV_ITEMS = [
  { id: "networkUtilization", label: "Network Utilization" },
  { id: "unmatchedFleetmap", label: "Unmatched Fleetmap" },
  { id: "regionPerformance", label: "Region Performance" },
  { id: "trafficIntensity", label: "Traffic Intensity" },
  { id: "talkgroupEfficiency", label: "Talkgroup Efficiency" },
  { id: "kpi", label: "KPI Table" },
  { id: "Company", label: "Company Contribution" },
  { id: "Performance", label: "Performance Charts" },
  { id: "General", label: "General Charts" },
  { id: "Charts", label: "Top 10 Charts" },
  { id: "users", label: "Radio & User Behavior" },
  { id: "records", label: "Filtered Calls Register" },
];

const DASHBOARD_TABS = [
  { id: "overview", label: "Overview & Records" },
  { id: "fleet", label: "Fleet Activation" },
  { id: "region", label: "Region & Traffic" },
  { id: "company", label: "Company, Talkgroup & Users" },
  { id: "kpi", label: "Performance KPI" },
  { id: "reports", label: "Reports" },
] as const;

type DashboardTab = typeof DASHBOARD_TABS[number]["id"];

const SAVED_WORKBOOK_DB = "cdr-dashboard-cache";
const SAVED_WORKBOOK_STORE = "workbooks";
const SAVED_WORKBOOK_KEY = "last-workbook";
const SAVED_WORKBOOK_META_KEY = "cdr-dashboard-last-workbook-meta";
const SAVED_MASTER_FLEETMAP_KEY = "master-fleetmap";
const SAVED_FIXED_FLEETMAP_KEY = "fixed-fleetmap";

const EMPTY_FILTERS: Filters = {
  region: [],
  year: [],
  company: [],
  month: [],
  baseStation: [],
  talkgroup: [],
  search: "",
};

const COLORS = ["#0078D4", "#00A6A6", "#FFB000", "#6F5BD5", "#D95F5F", "#009E73", "#9A6B00", "#C64E9C"];
const COMPANY_COLORS = ["#0078D4", "#00A6A6", "#FFB000", "#6F5BD5", "#D95F5F", "#009E73", "#9A6B00", "#C64E9C", "#006D77", "#7A4CC2"];
const CHART_COLORS = {
  calls: "#0078D4",
  callsLight: "#6EC9FF",
  callsDeep: "#004E91",
  duration: "#FFB000",
  durationLight: "#FFE08A",
  durationDeep: "#B87500",
  total: "#005B99",
  used: "#64B5F6",
  totalGreen: "#007A5A",
  usedGreen: "#7ADFA5",
  grid: "#6E8394",
  axis: "#617789",
  label: "#FFFFFF",
  labelStroke: "#08202E",
  tooltipBg: "#102331",
  tooltipBorder: "#2F5D73",
  tooltipText: "#F8FCFF",
};
const TOOLTIP_STYLE = { background: CHART_COLORS.tooltipBg, border: `1px solid ${CHART_COLORS.tooltipBorder}`, color: CHART_COLORS.tooltipText };
const MOBILE_TYPE_LABELS = [
  "PORTABLE - \u062c\u0647\u0627\u0632 \u0645\u062d\u0645\u0648\u0644",
  "ATEX - \u0645\u062d\u0645\u0648\u0644 \u062e\u0627\u0635",
  "MOBILE - \u0633\u064a\u0627\u0631",
  "FIXED - \u0645\u0643\u062a\u0628\u064a",
  "Dispatcher",
];
const MOBILE_TYPE_COLORS = ["#0078D4", "#FFB000", "#00A6A6", "#6F5BD5", "#D95F5F"];
const NUMERIC_TALKGROUP_FILTER = "__NUMERIC_TALKGROUPS__";

const HEADER_ALIASES = {
  radioId: ["radioid", "radio id", "radio"],
  radioAlias: ["radioalias", "radio alias", "alias"],
  mobileType: ["mobiletype", "mobile type", "radio type", "radiotype", "terminal type", "terminaltype", "device type"],
  employeeName: ["employeename", "employee name", "employee", "user name", "username"],
  employeeId: ["employeeid", "employee id", "user id", "userid"],
  region: ["region", "area"],
  company: ["company", "company / bl", "call source"],
  talkgroup: ["talkgroupalias", "talkgroup alias", "talkgroup", "talkgroup name"],
  callDate: ["calldate", "call date", "date"],
  startTime: ["starttime", "start time"],
  endTime: ["endtime", "end time", "call end", "call end time", "stop time", "stoptime"],
  year: ["year"],
  month: ["month"],
  week: ["week"],
  hour: ["hour", "hour label", "hourlabel", "hournumber", "hour number"],
  durationSeconds: ["durationseconds", "duration seconds", "duration sec", "duration (sec)", "seconds"],
  trafficHours: ["traffichours", "traffic hours", "traffic", "erlangs"],
  baseStation: ["callerbasestation", "caller base station", "base station", "station"],
};

const FLEETMAP_HEADER_ALIASES = {
  radioId:      ["radioid", "radio id", "radio", "id", "subscriberid", "subscriber id"],
  radioAlias:   ["radioalias", "radio alias", "alias", "name"],
  employeeName: ["employeename", "employee name", "user name", "username", "user", "employee"],
  employeeId:   ["employeeid", "employee id", "user id", "userid"],
  company:      ["company", "company / bl", "department", "bl", "business line"],
  region:       ["region", "area", "site", "location"],
  talkgroup:    ["talkgroupalias", "talkgroup alias", "talkgroup", "talk group", "group"],
  mobileType:   ["mobiletype", "mobile type", "radio type", "radiotype", "terminal type", "device type", "type"],
};

const RAW_SYSTEM_HEADER_ALIASES = {
  callerNumber: ["caller number", "callernumber", "caller radio", "caller radio id", "radio id", "radioid"],
  callerAlias: ["caller alias", "calleralias", "radio alias", "alias"],
  calleeNumber: ["callee number", "calleenumber", "called number", "callednumber", "talkgroup id", "talkgroup number"],
  calleeAlias: ["callee alias", "calleealias", "called alias", "calledalias", "talkgroup alias", "talkgroup"],
  startTime: ["start time", "starttime", "call start", "callstart"],
  endTime: ["end time", "endtime", "call end", "callend", "stop time", "stoptime"],
  durationSeconds: ["duration (s)", "duration s", "duration seconds", "durationseconds", "duration sec", "seconds"],
  baseStation: ["caller base station", "callerbasestation", "base station", "station"],
};

function normalizeHeader(value: unknown) {
  return `${value ?? ""}`.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function cleanText(value: unknown, fallback = "Unknown") {
  const text = `${value ?? ""}`.replace(/\s+/g, " ").trim();
  return text || fallback;
}

function normalizeRadioKey(value: unknown) {
  return `${value ?? ""}`
    .replace(/^\uFEFF/, "")
    .replace(/^,+|,+$/g, "")
    .replace(/^["']+|["']+$/g, "")
    .replace(/\.0$/, "")
    .replace(/[\s,"]/g, "")
    .trim();
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
    .replace(/	/g, "")
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

function dateFromExcelSerial(value: unknown) {
  const numeric = excelSerialNumber(value);
  if (numeric === null) return null;
  const parsed = XLSX.SSF.parse_date_code(numeric);
  if (!parsed) return null;
  return new Date(parsed.y, parsed.m - 1, parsed.d, parsed.H ?? 0, parsed.M ?? 0, parsed.S ?? 0);
}

function normalizeRawSystemCsvText(text: string) {
  return text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\t,/g, ",")
    .replace(/\t/g, "");
}

async function readWorkbookFromUploadedFile(file: File) {
  const isCsv = /\.csv$/i.test(file.name) || /csv/i.test(file.type);
  if (isCsv) {
    const text = await file.text();
    return XLSX.read(normalizeRawSystemCsvText(text), { type: "string", cellDates: false, raw: false });
  }
  return XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: false });
}

function isKnownLabel(value: string) {
  return !["", "unknown", "not found"].includes(`${value ?? ""}`.trim().toLowerCase());
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

function parseNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const numeric = Number(`${value ?? ""}`.replace(/,/g, "").trim());
  return Number.isFinite(numeric) ? numeric : fallback;
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

function parseDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  // XLSX can read CSV date/time cells as Excel serial values or numeric strings.
  // Handle both number and string forms before falling back to JavaScript Date parsing.
  if (isLikelyExcelDateSerial(value)) {
    const excelDate = dateFromExcelSerial(value);
    if (excelDate && !Number.isNaN(excelDate.getTime())) return excelDate;
  }

  const text = `${value ?? ""}`
    .replace(/^\ufeff/, "")
    .replace(/^,+|,+$/g, "")
    .replace(/	/g, "")
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
    const parsed = XLSX.SSF.parse_date_code(numeric);
    if (parsed) {
      const hours = Math.floor(parsed.H ?? 0);
      const minutes = Math.floor(parsed.M ?? 0);
      const seconds = Math.floor(parsed.S ?? 0);
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }
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

// Fleetmap helpers

function parseFleetmap(workbook: XLSX.WorkBook, source: "master" | "fixed"): FleetmapRecord[] {
  const preferred = workbook.SheetNames.find((n) => /fleet|master|fixed|lookup/i.test(n));
  const sheetName = preferred ?? workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json<RawRow>(workbook.Sheets[sheetName], { defval: "", raw: true });
  return rows
    .map((row): FleetmapRecord => {
      const radioId   = cleanText(findValue(row, FLEETMAP_HEADER_ALIASES.radioId), "");
      const company   = cleanText(findValue(row, FLEETMAP_HEADER_ALIASES.company), "");
      const mobileType = cleanText(findValue(row, FLEETMAP_HEADER_ALIASES.mobileType), "");
      return {
        radioId,
        radioAlias:   cleanText(findValue(row, FLEETMAP_HEADER_ALIASES.radioAlias), ""),
        employeeName: cleanText(findValue(row, FLEETMAP_HEADER_ALIASES.employeeName), ""),
        employeeId:   cleanText(findValue(row, FLEETMAP_HEADER_ALIASES.employeeId), ""),
        company:      companyFromRadioId(radioId, company),
        region:       cleanText(findValue(row, FLEETMAP_HEADER_ALIASES.region), ""),
        talkgroup:    cleanText(findValue(row, FLEETMAP_HEADER_ALIASES.talkgroup), ""),
        mobileType:   mobileTypeFromRadioId(radioId, mobileType),
        source,
      };
    })
    .filter((r) => r.radioId && r.radioId !== "Unknown");
}

function unionFleetmaps(master: FleetmapRecord[], fixed: FleetmapRecord[]): FleetmapRecord[] {
  const map = new Map<string, FleetmapRecord>();
  [...master, ...fixed].forEach((rec) => { if (!map.has(rec.radioId)) map.set(rec.radioId, rec); });
  return [...map.values()];
}

// Workbook parser

function parseWorkbook(workbook: XLSX.WorkBook, fileName: string, fleetmap: FleetmapRecord[] = []): DashboardData {
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

      const rawCompany    = cleanText(findValue(row, HEADER_ALIASES.company),    "Unknown");
      const rawMobileType = cleanText(findValue(row, HEADER_ALIASES.mobileType), "Unknown");
      const rawAlias      = cleanText(findValue(row, HEADER_ALIASES.radioAlias), "Not labelled");
      const rawEmpName    = cleanText(findValue(row, HEADER_ALIASES.employeeName),"Unknown");
      const rawEmpId      = cleanText(findValue(row, HEADER_ALIASES.employeeId),  "Unknown");
      const rawRegion     = cleanText(findValue(row, HEADER_ALIASES.region),      "Unknown");
      const rawTalkgroup  = cleanText(findValue(row, HEADER_ALIASES.talkgroup),   "Unknown");
      const mappedMobileType = mobileTypeFromRadioId(radioId, pickFleet(rawMobileType, fleet?.mobileType, "Unknown"));
      const mappedBaseStation = baseStationOrRadioType(cleanText(findValue(row, HEADER_ALIASES.baseStation), "Unknown"), mappedMobileType);

      return {
        radioId,
        radioAlias:   pickFleet(rawAlias,     fleet?.radioAlias,   "Not labelled"),
        mobileType:   mappedMobileType,
        employeeName: pickFleet(rawEmpName,   fleet?.employeeName, "Unknown"),
        employeeId:   pickFleet(rawEmpId,     fleet?.employeeId,   "Unknown"),
        region:       pickFleet(rawRegion,    fleet?.region,       "Unknown"),
        company:      companyFromRadioId(radioId, pickFleet(rawCompany, fleet?.company, "Unknown")),
        talkgroup:    pickFleet(rawTalkgroup, fleet?.talkgroup,    "Unknown"),
        callDate:     formatDate(dateRaw),
        startTime:    combineDateAndTime(dateRaw, startRaw),
        endTime:      combineDateAndTime(dateRaw, endRaw),
        year:         yearLabel(findValue(row, HEADER_ALIASES.year), dateRaw),
        month:        monthLabel(findValue(row, HEADER_ALIASES.month), dateRaw),
        week:         cleanText(findValue(row, HEADER_ALIASES.week), "Unknown"),
        hour:         hourLabel(findValue(row, HEADER_ALIASES.hour)),
        durationSeconds,
        trafficHours: parseNumber(findValue(row, HEADER_ALIASES.trafficHours), durationSeconds / 3600),
        baseStation:  mappedBaseStation,
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



function isRawSystemWorkbook(workbook: XLSX.WorkBook) {
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

function parseUploadedTrafficWorkbook(workbook: XLSX.WorkBook, fileName: string, fleetmap: FleetmapRecord[] = []): DashboardData {
  return isRawSystemWorkbook(workbook)
    ? parseRawSystemWorkbook(workbook, fileName, fleetmap)
    : parseWorkbook(workbook, fileName, fleetmap);
}

function parseRawSystemWorkbook(workbook: XLSX.WorkBook, fileName: string, fleetmap: FleetmapRecord[] = []): DashboardData {
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

function mergeCdrIntoData(base: DashboardData, addition: DashboardData): DashboardData {
  return {
    ...base,
    records:    [...base.records, ...addition.records],
    rawRows:    base.rawRows + addition.rawRows,
    cdrSources: [...base.cdrSources, ...addition.cdrSources],
    warnings:   combineDashboardWarnings([...base.warnings, ...addition.warnings]),
    loadedAt:   new Date().toLocaleString("en-GB"),
  };
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(value || 0));
}

function formatDecimal(value: number, digits = 2) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value || 0);
}

function formatPercent(value: number, digits = 1) {
  return `${formatDecimal(value, digits)}%`;
}

function secondsToClock(totalSeconds: number) {
  const safe = Math.max(0, Math.round(totalSeconds || 0));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function sumValues(data: { value: number }[]) {
  return data.reduce((sum, item) => sum + item.value, 0);
}

function modeBy<T extends string>(records: CallRecord[], getValue: (record: CallRecord) => T) {
  const counts = new Map<T, { count: number; durationSeconds: number }>();
  records.forEach((record) => {
    const value = getValue(record);
    const current = counts.get(value) ?? { count: 0, durationSeconds: 0 };
    current.count += 1;
    current.durationSeconds += record.durationSeconds;
    counts.set(value, current);
  });
  return [...counts.entries()].sort((a, b) => b[1].count - a[1].count || b[1].durationSeconds - a[1].durationSeconds)[0];
}

function chartLabel(value: unknown) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return "";
  if (numeric >= 1_000_000) return `${formatDecimal(numeric / 1_000_000, 1)}M`;
  if (numeric >= 1_000) return `${formatDecimal(numeric / 1_000, 1)}K`;
  return formatNumber(numeric);
}

function KpiBarLabel(props: any) {
  const value = Number(props.value ?? 0);
  if (!Number.isFinite(value) || value <= 0) return null;
  const x = Number(props.x ?? 0) + Number(props.width ?? 0) / 2;
  const y = Number(props.y ?? 0) - 8;
  return <text x={x} y={y} textAnchor="middle" fill={CHART_COLORS.label} stroke={CHART_COLORS.labelStroke} strokeWidth={3} paintOrder="stroke" fontSize={11} fontWeight={900}>{chartLabel(value)}</text>;
}

function KpiLineLabel(props: any) {
  const value = Number(props.value ?? 0);
  if (!Number.isFinite(value) || value <= 0) return null;
  const x = Number(props.x ?? 0);
  const y = Number(props.y ?? 0) - 16;
  return <text x={x} y={y} textAnchor="middle" fill={CHART_COLORS.duration} stroke={CHART_COLORS.labelStroke} strokeWidth={3} paintOrder="stroke" fontSize={11} fontWeight={900}>{chartLabel(value)}</text>;
}

function TopValueLabel(props: any) {
  const value = Number(props.value ?? 0);
  if (!Number.isFinite(value) || value <= 0) return null;
  const x = Number(props.x ?? 0) + Number(props.width ?? 0) / 2;
  const y = Number(props.y ?? 0) - 7;
  return <text x={x} y={y} textAnchor="middle" fill={CHART_COLORS.label} stroke={CHART_COLORS.labelStroke} strokeWidth={3} paintOrder="stroke" fontSize={10} fontWeight={900}>{chartLabel(value)}</text>;
}

function RightValueLabel(props: any) {
  const value = Number(props.value ?? 0);
  if (!Number.isFinite(value) || value <= 0) return null;
  const x = Number(props.x ?? 0) + Number(props.width ?? 0) + 8;
  const y = Number(props.y ?? 0) + Number(props.height ?? 0) / 2 + 4;
  return <text x={x} y={y} textAnchor="start" fill={CHART_COLORS.label} stroke={CHART_COLORS.labelStroke} strokeWidth={3} paintOrder="stroke" fontSize={10} fontWeight={900}>{chartLabel(value)}</text>;
}

function PointValueLabel(props: any) {
  const value = Number(props.value ?? 0);
  if (!Number.isFinite(value) || value <= 0) return null;
  const x = Number(props.x ?? 0);
  const y = Number(props.y ?? 0) - 12;
  return <text x={x} y={y} textAnchor="middle" fill={props.fill ?? CHART_COLORS.label} stroke={CHART_COLORS.labelStroke} strokeWidth={3} paintOrder="stroke" fontSize={10} fontWeight={900}>{chartLabel(value)}</text>;
}

function PieValueLabel(props: any) {
  const value = Number(props.value ?? 0);
  if (!Number.isFinite(value) || value <= 0) return null;
  return <text x={props.x} y={props.y} textAnchor="middle" dominantBaseline="central" fill={CHART_COLORS.label} stroke={CHART_COLORS.labelStroke} strokeWidth={3} paintOrder="stroke" fontSize={10} fontWeight={900}>{chartLabel(value)}</text>;
}

function PieDurationLabel(props: any) {
  const value = Number(props.value ?? 0);
  if (!Number.isFinite(value) || value <= 0) return null;
  return <text x={props.x} y={props.y} textAnchor="middle" dominantBaseline="central" fill={CHART_COLORS.label} stroke={CHART_COLORS.labelStroke} strokeWidth={3} paintOrder="stroke" fontSize={10} fontWeight={900}>{secondsToClock(value)}</text>;
}

function PieDecimalLabel(props: any) {
  const value = Number(props.value ?? 0);
  if (!Number.isFinite(value) || value <= 0) return null;
  return <text x={props.x} y={props.y} textAnchor="middle" dominantBaseline="central" fill={CHART_COLORS.label} stroke={CHART_COLORS.labelStroke} strokeWidth={3} paintOrder="stroke" fontSize={10} fontWeight={900}>{formatDecimal(value, 2)}</text>;
}

function ChartLegend({ items, className = "" }: { items: { name: string; color: string }[]; className?: string }) {
  return (
    <div className={`chart-legend ${className}`.trim()}>
      {items.map((item) => (
        <span key={`${item.name}-${item.color}`}>
          <i style={{ background: item.color }} />
          {item.name}
        </span>
      ))}
    </div>
  );
}

function TalkgroupTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="custom-tooltip">
      <strong>{row.name}</strong>
      <span>Total talkgroups: {formatNumber(row.total ?? 0)}</span>
      <span>Used talkgroups: {formatNumber(row.used ?? 0)}</span>
    </div>
  );
}

function RadioTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="custom-tooltip">
      <strong>{row.name}</strong>
      <span>Total radios: {formatNumber(row.total ?? 0)}</span>
      <span>Radios made calls: {formatNumber(row.used ?? 0)}</span>
    </div>
  );
}

function MobileTypeTooltip({ active, payload, label, mobileTypes = [] }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  const items = mobileTypes
    .map((type: string) => ({ name: type, value: Number(row[mobileTypeKey(type)] ?? 0), color: mobileTypeColor(type) }))
    .filter((item: any) => item.value > 0);
  return (
    <div className="custom-tooltip">
      <strong>{row.name ?? label}</strong>
      <span>Total radios: {formatNumber(row.total ?? 0)}</span>
      {items.map((item: any) => (
        <span key={item.name} style={{ color: item.color }}>{item.name}: {formatNumber(item.value)}</span>
      ))}
    </div>
  );
}

function CompanyPerformanceTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  const calls = Number(row.calls ?? 0);
  const durationSeconds = Number(row.durationSeconds ?? 0);
  return (
    <div className="custom-tooltip">
      <strong>{row.name ?? label}</strong>
      <span>Total calls: {formatNumber(calls)}</span>
      <span>Total duration: {secondsToClock(durationSeconds)}</span>
      <span>Avg duration/call: {secondsToClock(calls ? durationSeconds / calls : 0)}</span>
    </div>
  );
}

function CallsDurationPerformanceChart({ title, data, height = 360, xTickFormatter = (value: unknown) => truncateLabel(value, 18), gradientId }: { title: string; data: Ranking[]; height?: number; xTickFormatter?: (value: unknown) => string; gradientId: string }) {
  return (
    <>
      <h3>{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ left: 0, right: 8, top: 18, bottom: 0 }}>
          <defs>
            <linearGradient id={`${gradientId}Calls`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.callsLight} stopOpacity={0.98} />
              <stop offset="55%" stopColor={CHART_COLORS.calls} stopOpacity={0.9} />
              <stop offset="100%" stopColor={CHART_COLORS.callsDeep} stopOpacity={0.76} />
            </linearGradient>
            <filter id={`${gradientId}Glow`} x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" vertical={false} opacity={0.32} />
          <XAxis dataKey="name" tick={{ fill: CHART_COLORS.axis, fontSize: 10 }} interval={0} angle={-35} textAnchor="end" tickMargin={10} height={72} tickFormatter={xTickFormatter} />
          <YAxis yAxisId="calls" tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} tickFormatter={chartLabel} />
          <YAxis yAxisId="duration" orientation="right" tick={{ fill: CHART_COLORS.durationDeep, fontSize: 11 }} tickFormatter={chartLabel} />
          <Tooltip content={<CompanyPerformanceTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
          <Bar yAxisId="calls" dataKey="calls" name="Calls" fill={`url(#${gradientId}Calls)`} radius={[8, 8, 0, 0]} maxBarSize={42}>
            <LabelList dataKey="calls" content={TopValueLabel} />
          </Bar>
          <Line yAxisId="duration" type="monotone" dataKey="durationSeconds" name="Duration seconds" stroke={CHART_COLORS.duration} strokeWidth={4} dot={{ r: 5, fill: CHART_COLORS.duration, stroke: CHART_COLORS.durationLight, strokeWidth: 2 }} activeDot={{ r: 8 }} style={{ filter: `url(#${gradientId}Glow)` }}>
            <LabelList dataKey="durationSeconds" content={(props) => <PointValueLabel {...props} fill={CHART_COLORS.duration} />} />
          </Line>
        </ComposedChart>
      </ResponsiveContainer>
      <ChartLegend items={[{ name: "Total calls", color: CHART_COLORS.calls }, { name: "Total duration", color: CHART_COLORS.duration }]} />
    </>
  );
}

function MobileTypeOverlayBarShape(props: any) {
  const { x, y, width, height, value, payload, mobileTypes = [] } = props;
  const total = Number(value ?? 0);
  if (!height || height <= 0 || total <= 0) return <g />;
  const safeY = Math.max(y, 6);
  const safeHeight = Math.max(0, height - (safeY - y));
  const wideW = Math.min(Math.max(width * 0.78, 34), 64);
  const cx = x + width / 2;
  const activeTypes = mobileTypes.filter((type: string) => Number(payload[mobileTypeKey(type)] ?? 0) > 0);
  const narrowW = Math.max(5, Math.min(13, (wideW - 8) / Math.max(1, activeTypes.length)));
  const groupW = activeTypes.length ? activeTypes.length * narrowW + (activeTypes.length - 1) * 3 : 0;
  const startX = cx - groupW / 2;
  return (
    <g>
      <rect x={cx - wideW / 2} y={safeY} width={wideW} height={safeHeight} fill={CHART_COLORS.total} opacity={0.9} rx={5} />
      <text x={cx} y={Math.max(12, safeY - 7)} textAnchor="middle" fill={CHART_COLORS.label} stroke={CHART_COLORS.labelStroke} strokeWidth={3} paintOrder="stroke" fontSize={9} fontWeight={900}>{chartLabel(total)}</text>
      {activeTypes.map((type: string, index: number) => {
        const typeValue = Number(payload[mobileTypeKey(type)] ?? 0);
        const barHeight = Math.min(safeHeight, (typeValue / total) * safeHeight);
        const barX = startX + index * (narrowW + 3);
        const barY = y + height - barHeight;
        const labelX = barX + narrowW / 2;
        const labelY = barY + barHeight / 2;
        return (
          <g key={type}>
            <rect x={barX} y={barY} width={narrowW} height={barHeight} fill={mobileTypeColor(type)} rx={3} />
            {typeValue > 0 && barHeight > 18 && (
              <text x={labelX} y={labelY} textAnchor="middle" dominantBaseline="central" transform={`rotate(-90 ${labelX} ${labelY})`} fill={CHART_COLORS.label} stroke={CHART_COLORS.labelStroke} strokeWidth={3} paintOrder="stroke" fontSize={8} fontWeight={900}>{chartLabel(typeValue)}</text>
            )}
          </g>
        );
      })}
    </g>
  );
}

function OverlayBarShape(props: any) {
  const { x, y, width, height, value, payload, totalColor, usedColor } = props;
  if (!height || height <= 0) return <g />;
  const wideW = Math.min(width * 0.85, 48);
  const narrowW = Math.min(width * 0.42, 22);
  const cx = x + width / 2;
  const usedVal = payload.used ?? 0;
  const safeY = Math.max(y, 4);
  const safeHeight = Math.max(0, height - (safeY - y));
  const usedH = safeHeight > 0 && value > 0 ? Math.min(safeHeight, (usedVal / value) * safeHeight) : 0;
  const usedY = y + height - usedH;
  const totalLabelY = Math.max(12, safeY - 6);
  const usedLabelX = cx + narrowW / 2 + 10;
  const usedLabelY = usedY + usedH / 2;
  return (
    <g>
      <rect x={cx - wideW / 2} y={safeY} width={wideW} height={safeHeight} fill={totalColor} rx={4} />
      <rect x={cx - narrowW / 2} y={usedY} width={narrowW} height={usedH} fill={usedColor} rx={3} />
      <text x={cx} y={totalLabelY} textAnchor="middle" fill={CHART_COLORS.label} stroke={CHART_COLORS.labelStroke} strokeWidth={3} paintOrder="stroke" fontSize={9} fontWeight={900}>{chartLabel(value)}</text>
      {usedVal > 0 && (
        <text x={usedLabelX} y={usedLabelY} textAnchor="middle" dominantBaseline="central" transform={`rotate(-90 ${usedLabelX} ${usedLabelY})`} fill={CHART_COLORS.label} stroke={CHART_COLORS.labelStroke} strokeWidth={3} paintOrder="stroke" fontSize={9} fontWeight={900}>{chartLabel(usedVal)}</text>
      )}
    </g>
  );
}

function truncateLabel(value: unknown, max = 24) {
  const text = `${value ?? "Unknown"}`;
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function shortMonthLabel(value: unknown) {
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

function companyColor(company: string) {
  let hash = 0;
  for (const char of company) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return COMPANY_COLORS[hash % COMPANY_COLORS.length];
}

function companyMetricColor(company: string, metric: "duration" | "calls") {
  return colorMix(companyColor(company), metric === "duration" ? "light" : "dark");
}

function dataKey(value: string) {
  return `m_${value.replace(/[^a-zA-Z0-9]/g, "_")}`;
}

function mobileTypeKey(value: string) {
  return `type_${value.replace(/[^a-zA-Z0-9]/g, "_")}`;
}

function mobileTypeColor(type: string) {
  const knownIndex = MOBILE_TYPE_LABELS.indexOf(type);
  if (knownIndex >= 0) return MOBILE_TYPE_COLORS[knownIndex % MOBILE_TYPE_COLORS.length];
  let hash = 0;
  for (const char of type) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return COLORS[hash % COLORS.length];
}

function monthSortValue(label: string) {
  const text = `${label ?? ""}`.toLowerCase();
  if (!text || text === "unknown") return Number.MAX_SAFE_INTEGER;
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const monthIndex = months.findIndex((month) => text.includes(month));
  const numericMonth = /(?:^|\D)(1[0-2]|0?[1-9])(?:\D|$)/.exec(text)?.[1];
  const index = monthIndex >= 0 ? monthIndex : numericMonth ? Number(numericMonth) - 1 : 99;
  const year = /(19|20)\d{2}/.exec(text)?.[0];
  return (year ? Number(year) * 12 : 0) + index;
}

function weekSortValue(label: string) {
  const text = `${label ?? ""}`.trim();
  const lower = text.toLowerCase();
  if (!lower || lower === "unknown") return Number.MAX_SAFE_INTEGER;

  // Preferred format: Week 2 of Jan 2026 / Week 2 of January 2026
  const formatted = /week\s*(\d+)\s*of\s*([a-z]+)\s*((?:19|20)\d{2})/i.exec(text);
  if (formatted) {
    const week = Number(formatted[1]);
    const monthText = formatted[2].slice(0, 3).toLowerCase();
    const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const monthIndex = months.indexOf(monthText);
    const year = Number(formatted[3]);
    if (monthIndex >= 0 && Number.isFinite(week) && Number.isFinite(year)) {
      return year * 100 + monthIndex * 6 + week;
    }
  }

  const numeric = /\d+/.exec(text)?.[0];
  return numeric ? Number(numeric) : Number.MAX_SAFE_INTEGER - 1;
}

function weekLabelFromDate(value: unknown) {
  const date = parseDate(value);
  if (!date) return "Unknown";
  const weekOfMonth = Math.ceil(date.getDate() / 7);
  const monthYear = date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  return `Week ${weekOfMonth} of ${monthYear}`;
}

function groupBy(records: CallRecord[], getName: (record: CallRecord) => string): Ranking[] {
  const map = new Map<string, { calls: number; durationSeconds: number; trafficHours: number; radios: Set<string> }>();
  records.forEach((record) => {
    const name = getName(record) || "Unknown";
    const current = map.get(name) ?? { calls: 0, durationSeconds: 0, trafficHours: 0, radios: new Set<string>() };
    current.calls += 1;
    current.durationSeconds += record.durationSeconds;
    current.trafficHours += record.trafficHours;
    current.radios.add(record.radioId);
    map.set(name, current);
  });
  return [...map.entries()]
    .map(([name, value]) => ({ name, calls: value.calls, durationSeconds: value.durationSeconds, trafficHours: value.trafficHours, radios: value.radios.size }))
    .sort((a, b) => b.calls - a.calls || b.durationSeconds - a.durationSeconds);
}

function uniqueOptions(records: CallRecord[], getValue: (record: CallRecord) => string, sortAsMonth = false) {
  const values = Array.from(new Set(records.map(getValue).filter(Boolean)));
  return values.sort((a, b) => sortAsMonth ? monthSortValue(a) - monthSortValue(b) || a.localeCompare(b) : a.localeCompare(b));
}

function csvEscape(value: unknown) {
  const text = `${value ?? ""}`.replace(/\r?\n/g, " ");
  return /[",]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadText(fileName: string, text: string) {
  const blob = new Blob(["\ufeff", text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = fileName;
  document.body.appendChild(link); link.click(); link.remove();
  URL.revokeObjectURL(url);
}

function downloadBlob(fileName: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = fileName;
  document.body.appendChild(link); link.click(); link.remove();
  URL.revokeObjectURL(url);
}

function downloadDataUrl(fileName: string, dataUrl: string) {
  const link = document.createElement("a");
  link.href = dataUrl; link.download = fileName;
  document.body.appendChild(link); link.click(); link.remove();
}

function downloadWorkbookData(fileName: string, sheetName: string, title: string, dataset: ChartExportDataset) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([[title], [], dataset.headers, ...dataset.rows]);
  worksheet["!cols"] = dataset.headers.map((header, index) => {
    const maxLength = Math.max(`${header}`.length, ...dataset.rows.slice(0, 200).map((row) => `${row[index] ?? ""}`.length));
    return { wch: Math.min(Math.max(maxLength + 2, 12), 34) };
  });
  worksheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(0, dataset.headers.length - 1) } }];
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31) || "Chart Data");
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  downloadBlob(fileName, new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
}

function fileSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90) || "dashboard-card";
}

function exportIconSvg(kind: "png" | "xlsx" | "ppt" | "pdf" | "view" | "csv") {
  if (kind === "view") return `<svg class="file-export-svg file-export-svg-view" viewBox="0 0 64 64" aria-hidden="true"><path d="M6 32s9-16 26-16 26 16 26 16-9 16-26 16S6 32 6 32Z"/><circle cx="32" cy="32" r="8"/></svg>`;
  if (kind === "png") return `<svg class="file-export-svg file-export-svg-png" viewBox="0 0 64 64" aria-hidden="true"><path class="file-page" d="M14 5h25l11 11v43H14Z"/><path class="file-fold" d="M39 5v12h11"/><circle class="file-mark" cx="25" cy="24" r="5"/><path class="file-mark" d="m18 49 11-13 7 8 5-6 8 11Z"/></svg>`;
  const meta = {
    pdf: { label: "PDF", color: "#ef1b2d", grid: false, chart: false },
    xlsx: { label: "XLSX", color: "#21a366", grid: false, chart: false },
    csv: { label: "CSV", color: "#45c957", grid: true, chart: false },
    ppt: { label: "PPTX", color: "#d6421f", grid: false, chart: true },
  }[kind];
  const grid = meta.grid ? `<path class="file-grid" d="M22 36h20M22 44h20M22 52h20M29 30v27M37 30v27"/>` : "";
  const chart = meta.chart ? `<path class="file-chart" d="M28 48a10 10 0 1 0 10-10v10Z"/><path class="file-chart" d="M39 37a10 10 0 0 1 9 9h-9Z"/>` : "";
  const lines = !meta.grid && !meta.chart ? `<path class="file-lines" d="M21 23h22M21 30h22M21 37h18"/>` : "";
  return `<svg class="file-export-svg file-export-svg-${kind}" viewBox="0 0 64 64" aria-hidden="true" style="--file-color:${meta.color}"><path class="file-page" d="M14 5h25l11 11v43H14Z"/><path class="file-fold" d="M39 5v12h11"/>${lines}${grid}${chart}<rect class="file-ribbon" x="6" y="34" width="52" height="20" rx="3"/><text class="file-label" x="32" y="49" text-anchor="middle">${meta.label}</text></svg>`;
}
function escapeXml(value: unknown) {
  return `${value ?? ""}`.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function htmlEscape(value: unknown) {
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

async function ensurePdfArabicFont(pdf: jsPDF) {
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

function applyWorkbookArabicSupport(workbook: ExcelJS.Workbook) {
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

function pdfText(pdf: jsPDF, value: unknown, x: number, y: number, options?: Parameters<jsPDF["text"]>[3]) {
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

function pptTextOptions<T extends Record<string, unknown>>(value: unknown, options: T): T & { fontFace: string; lang: string; rtlMode?: boolean } {
  return {
    ...options,
    fontFace: "Arial",
    lang: hasArabicText(value) ? "ar-SA" : "en-US",
    ...(hasArabicText(value) ? { rtlMode: true } : {}),
  };
}

function excelColumnName(index: number) {
  let value = index; let name = "";
  while (value > 0) { const r = (value - 1) % 26; name = String.fromCharCode(65 + r) + name; value = Math.floor((value - 1) / 26); }
  return name;
}

function excelRange(sheetName: string, col: number, startRow: number, endRow: number) {
  const safeName = sheetName.replace(/'/g, "''");
  return `'${safeName}'!$${excelColumnName(col)}$${startRow}:$${excelColumnName(col)}$${endRow}`;
}

type NativeChartSeries = { name: string; valuesRef: string; color: string };
type NativeChartConfig = { sheetIndex: number; chartIndex: number; title: string; type: "bar" | "line" | "doughnut"; categoriesRef: string; series: NativeChartSeries[]; from?: { col: number; row: number }; to?: { col: number; row: number } };

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

async function patchWorkbookWithNativeCharts(buffer: ExcelJS.Buffer, configs: NativeChartConfig[]) {
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

async function captureElementPng(element: HTMLElement, backgroundColor = "#ffffff") {
  const canvas = await html2canvas(element, { backgroundColor, scale: 2, useCORS: true });
  return canvas.toDataURL("image/png");
}

type ThemeName = "dark" | "light";

function themeClass(theme: ThemeName) { return theme === "light" ? "light-background-theme" : "dark-background-theme"; }

function useTheme() {
  const [theme, setTheme] = useState<ThemeName>("light");
  const isDark = theme === "dark";
  const toggleTheme = useCallback(() => setTheme((current) => (current === "light" ? "dark" : "light")), []);

  return { theme, isDark, toggleTheme };
}

function workbookMeta(data: DashboardData): SavedWorkbookMeta {
  return { fileName: data.fileName, sourceSheet: data.sourceSheet, loadedAt: data.loadedAt, rawRows: data.rawRows };
}

function getSavedWorkbookMeta(): SavedWorkbookMeta | null {
  try { const raw = window.localStorage.getItem(SAVED_WORKBOOK_META_KEY); return raw ? JSON.parse(raw) as SavedWorkbookMeta : null; } catch { return null; }
}

function setSavedWorkbookMeta(meta: SavedWorkbookMeta | null) {
  try { if (meta) window.localStorage.setItem(SAVED_WORKBOOK_META_KEY, JSON.stringify(meta)); else window.localStorage.removeItem(SAVED_WORKBOOK_META_KEY); } catch { /* ignore */ }
}

function openSavedWorkbookDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(SAVED_WORKBOOK_DB, 1);
    request.onupgradeneeded = () => { request.result.createObjectStore(SAVED_WORKBOOK_STORE); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveWorkbookToBrowser(data: DashboardData) {
  const db = await openSavedWorkbookDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(SAVED_WORKBOOK_STORE, "readwrite");
    tx.objectStore(SAVED_WORKBOOK_STORE).put(data, SAVED_WORKBOOK_KEY);
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
  });
  db.close();
  setSavedWorkbookMeta(workbookMeta(data));
}

async function loadWorkbookFromBrowser(): Promise<DashboardData | null> {
  const db = await openSavedWorkbookDb();
  const data = await new Promise<DashboardData | null>((resolve, reject) => {
    const tx = db.transaction(SAVED_WORKBOOK_STORE, "readonly");
    const req = tx.objectStore(SAVED_WORKBOOK_STORE).get(SAVED_WORKBOOK_KEY);
    req.onsuccess = () => resolve((req.result as DashboardData | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return data;
}

async function saveFleetmapToBrowser(key: string, records: FleetmapRecord[], meta: FleetmapMeta) {
  const db = await openSavedWorkbookDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(SAVED_WORKBOOK_STORE, "readwrite");
    tx.objectStore(SAVED_WORKBOOK_STORE).put({ records, meta }, key);
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function loadFleetmapFromBrowser(key: string): Promise<{ records: FleetmapRecord[]; meta: FleetmapMeta } | null> {
  const db = await openSavedWorkbookDb();
  const data = await new Promise<any>((resolve, reject) => {
    const tx = db.transaction(SAVED_WORKBOOK_STORE, "readonly");
    const req = tx.objectStore(SAVED_WORKBOOK_STORE).get(key);
    req.onsuccess = () => resolve(req.result ?? null); req.onerror = () => reject(req.error);
  });
  db.close();
  return data;
}

// Upload view

function UploadView({
  onUploadCdr, onUploadRawSystem, onUploadMasterFleetmap, onUploadFixedFleetmap,
  onLoadSaved, savedWorkbook, masterFleetmap, fixedFleetmap,
  isParsing, isLoadingSaved, error, theme, onToggleTheme,
}: {
  onUploadCdr: (event: ChangeEvent<HTMLInputElement>) => void;
  onUploadRawSystem: (event: ChangeEvent<HTMLInputElement>) => void;
  onUploadMasterFleetmap: (event: ChangeEvent<HTMLInputElement>) => void;
  onUploadFixedFleetmap: (event: ChangeEvent<HTMLInputElement>) => void;
  onLoadSaved: () => void;
  savedWorkbook: SavedWorkbookMeta | null;
  masterFleetmap: FleetmapState;
  fixedFleetmap: FleetmapState;
  isParsing: boolean;
  isLoadingSaved: boolean;
  error: string;
  theme: ThemeName;
  onToggleTheme: () => void;
}) {
  return (
    <main className={`upload-shell ${themeClass(theme)}`}>
      <section className="followup-upload-shell">
        <div className="followup-upload-card">
          <button className="followup-theme-button" type="button" onClick={onToggleTheme}>
            <Palette size={16} />
            {theme === "light" ? "Dark Theme" : "Light Theme"}
          </button>

          <div className="followup-upload-left">
            <p className="followup-eyebrow"><UploadCloud size={14} /> CDR WORKBOOKS UPLOAD</p>
            <h1><span>Load the CDR traffic</span><span>workbook</span></h1>
            <p className="followup-lead">
              Start with Master and Fixed Fleetmap, then upload processed CDR files or raw system call logs.
            </p>

            <div className="followup-primary-actions">
              <label className="followup-action-button followup-primary-upload">
                <input type="file" accept=".xlsx,.xls,.xlsm,.xlsb" multiple onChange={onUploadCdr} />
                <FileSpreadsheet size={18} />
                <span>{isParsing ? "Reading CDR..." : "Select CDR workbook"}</span>
              </label>

              <label className="followup-action-button">
                <input type="file" accept=".csv,.xlsx,.xls,.xlsm,.xlsb" multiple onChange={onUploadRawSystem} />
                <FileText size={18} />
                <span>{isParsing ? "Reading raw..." : "Select raw call log"}</span>
              </label>

              <button
                className="followup-action-button"
                type="button"
                onClick={onLoadSaved}
                disabled={!savedWorkbook || isLoadingSaved || isParsing}
              >
                <HardDrive size={18} />
                <span>{isLoadingSaved ? "Opening..." : "Continue previous workbook"}</span>
              </button>
            </div>

            <p className="followup-drop-note">REFERENCE FILES & DATA SOURCES</p>

            <div className="followup-mini-grid">
              <label className={`followup-mini-card ${masterFleetmap.meta ? "loaded" : ""}`}>
                <input type="file" accept=".xlsx,.xls,.xlsm,.xlsb" onChange={onUploadMasterFleetmap} />
                <Users size={18} />
                <div>
                  <strong>{masterFleetmap.isParsing ? "Reading..." : masterFleetmap.meta?.fileName ?? "Master Fleetmap"}</strong>
                  <span>{masterFleetmap.meta ? `${formatNumber(masterFleetmap.records.length)} radios saved` : "Company, region and users"}</span>
                </div>
              </label>

              <label className={`followup-mini-card ${fixedFleetmap.meta ? "loaded" : ""}`}>
                <input type="file" accept=".xlsx,.xls,.xlsm,.xlsb" onChange={onUploadFixedFleetmap} />
                <Radio size={18} />
                <div>
                  <strong>{fixedFleetmap.isParsing ? "Reading..." : fixedFleetmap.meta?.fileName ?? "Fixed Fleetmap"}</strong>
                  <span>{fixedFleetmap.meta ? `${formatNumber(fixedFleetmap.records.length)} radios saved` : "Fixed radio reference"}</span>
                </div>
              </label>

            </div>
          </div>

          <div className="followup-upload-visual">
            <img src="/assets/h.png" alt="Saudi Energy theme" />
            <div className="followup-ready-card">
              <span>READY FOR</span>
              <strong>CDR - Fleetmap - Raw Logs</strong>
              <p>Traffic, utilization, regions, users, talkgroups, and export reports.</p>
            </div>
          </div>
        </div>
      </section>

      {(isParsing || isLoadingSaved || masterFleetmap.isParsing || fixedFleetmap.isParsing) && (
        <div className="loading-overlay" role="status" aria-live="polite">
          <div className="loading-card">
            <Activity size={28} />
            <strong>{isLoadingSaved ? "Opening previous workbook..." : "Processing workbook..."}</strong>
            <span>Preparing the dashboard data and saved references.</span>
          </div>
        </div>
      )}
      {error && <div className="toast error">{error}</div>}
    </main>
  );
}


// Shared sub-components

function MetricCard({ label, value, detail, icon: Icon, tone = "blue" }: { label: string; value: string; detail: string; icon: typeof Activity; tone?: "blue" | "amber" | "green" | "red" }) {
  return (
    <article className={`metric-card ${tone}`}>
      <div><span>{label}</span><strong>{value}</strong></div>
      <Icon size={22} />
      <p>{detail}</p>
    </article>
  );
}

function FileTypeIcon({ kind }: { kind: "xlsx" | "ppt" | "pdf" | "view" | "csv" | "png" }) {
  if (kind === "view") return <svg className="file-export-svg file-export-svg-view" viewBox="0 0 64 64" aria-hidden="true"><path d="M6 32s9-16 26-16 26 16 26 16-9 16-26 16S6 32 6 32Z" /><circle cx="32" cy="32" r="8" /></svg>;
  if (kind === "png") return <svg className="file-export-svg file-export-svg-png" viewBox="0 0 64 64" aria-hidden="true"><path className="file-page" d="M14 5h25l11 11v43H14Z" /><path className="file-fold" d="M39 5v12h11" /><circle className="file-mark" cx="25" cy="24" r="5" /><path className="file-mark" d="m18 49 11-13 7 8 5-6 8 11Z" /></svg>;
  const meta = {
    pdf: { label: "PDF", color: "#ef1b2d", grid: false, chart: false },
    xlsx: { label: "XLSX", color: "#21a366", grid: false, chart: false },
    csv: { label: "CSV", color: "#45c957", grid: true, chart: false },
    ppt: { label: "PPTX", color: "#d6421f", grid: false, chart: true },
  }[kind];
  return (
    <svg className={`file-export-svg file-export-svg-${kind}`} viewBox="0 0 64 64" aria-hidden="true" style={{ "--file-color": meta.color } as CSSProperties}>
      <path className="file-page" d="M14 5h25l11 11v43H14Z" />
      <path className="file-fold" d="M39 5v12h11" />
      {!meta.grid && !meta.chart && <path className="file-lines" d="M21 23h22M21 30h22M21 37h18" />}
      {meta.grid && <path className="file-grid" d="M22 36h20M22 44h20M22 52h20M29 30v27M37 30v27" />}
      {meta.chart && <><path className="file-chart" d="M28 48a10 10 0 1 0 10-10v10Z" /><path className="file-chart" d="M39 37a10 10 0 0 1 9 9h-9Z" /></>}
      <rect className="file-ribbon" x="6" y="34" width="52" height="20" rx="3" />
      <text className="file-label" x="32" y="49" textAnchor="middle">{meta.label}</text>
    </svg>
  );
}

function ExportButton({ kind, label, onClick, title }: { kind: "xlsx" | "ppt" | "pdf" | "view" | "csv" | "png"; label: string; onClick: () => void; title?: string }) {
  return <button className={`button small export-button export-button-${kind}`} type="button" onClick={onClick} title={title ?? label}><FileTypeIcon kind={kind} /><span>{label}</span></button>;
}
function SectionTitle({ id, eyebrow, title, text, actions, collapsed = false, onToggle }: { id?: string; eyebrow: string; title: string; text?: string; actions?: ReactNode; collapsed?: boolean; onToggle?: () => void }) {
  return (
    <div id={id} className={`section-title ${collapsed ? "section-title-collapsed" : ""}`}>
      <div className="section-title-heading">
        {onToggle && (
          <button className="section-title-arrow" type="button" onClick={onToggle} aria-expanded={!collapsed} aria-label={collapsed ? "Expand section" : "Collapse section"}>
            <ChevronDown size={16} />
          </button>
        )}
        <div className="section-title-copy">
          <p>{eyebrow}</p><h2>{title}</h2>
          {text && <span>{text}</span>}
        </div>
      </div>
      <div className="section-title-actions">
        {actions}
        {id && <button className="button small section-top-button" type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}><ArrowUp size={15} /><span>Top</span></button>}
      </div>
    </div>
  );
}

function MultiSelectFilter({ label, value, options, optionLabels, onChange, showAllOption = true, className = "" }: { label: string; value: string[]; options: string[]; optionLabels?: Record<string, string>; onChange: (value: string[]) => void; showAllOption?: boolean; className?: string }) {
  const active = value.length > 0;
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<CSSProperties>({});
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (!wrapRef.current?.contains(target) && !dropdownRef.current?.contains(target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function computePosition() {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const longest = Math.max(...options.map((o) => (optionLabels?.[o] ?? o).length), label.length, 10);
    const dropWidth = Math.min(Math.max(rect.width, longest * 8 + 58, 220), 520);
    const dropHeight = Math.min(280, options.length * 36 + 48);
    const spaceBelow = window.innerHeight - rect.bottom;
    const left = Math.min(rect.left, window.innerWidth - dropWidth - 8);
    if (spaceBelow >= dropHeight || spaceBelow >= 160) setDropdownStyle({ position: "fixed", top: rect.bottom + 4, left, width: dropWidth, zIndex: 99999 });
    else setDropdownStyle({ position: "fixed", bottom: window.innerHeight - rect.top + 4, left, width: dropWidth, zIndex: 99999 });
  }

  function handleOpen() { if (!open) computePosition(); setOpen((c) => !c); }

  useEffect(() => {
    if (!open) return;
    const update = () => computePosition();
    window.addEventListener("scroll", update, true); window.addEventListener("resize", update);
    return () => { window.removeEventListener("scroll", update, true); window.removeEventListener("resize", update); };
  }, [open, options.length]);

  const toggleOption = (option: string) => {
    if (!active) { onChange([option]); return; }
    onChange(value.includes(option) ? value.filter((i) => i !== option) : [...value, option]);
  };
  const displayValue = active ? value.length === 1 ? (optionLabels?.[value[0]] ?? value[0]) : `${value.length} selected` : "All";
  const dropdown = open ? createPortal(
    <div className="multi-select-dropdown" style={dropdownStyle} ref={dropdownRef}>
      {showAllOption && (
        <label className="multi-select-option multi-select-option-all" onClick={() => onChange([])}>
          <input type="checkbox" readOnly checked={!active} />
          <span style={{ fontWeight: !active ? 700 : undefined, color: !active ? "#22d3ee" : undefined }}>All</span>
        </label>
      )}
      {!showAllOption && active && <button type="button" className="multi-select-clear" onClick={() => onChange([])}>Clear</button>}
      {options.map((option) => (
        <label key={option} className="multi-select-option">
          <input type="checkbox" checked={value.includes(option)} onChange={() => toggleOption(option)} />
          <span>{optionLabels?.[option] ?? option}</span>
        </label>
      ))}
    </div>,
    document.body
  ) : null;

  return (
    <div className={`filter-field multi-select-filter ${className}`} ref={wrapRef}>
      <span>{label}</span>
      <button type="button" className="multi-select-trigger" ref={triggerRef} onClick={handleOpen}>
        <span className="multi-select-value">{displayValue}</span>
        <ChevronDown size={14} style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform .15s" }} />
      </button>
      {dropdown}
    </div>
  );
}

// Main App

export default function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [error, setError] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [isAddingMoreCdr, setIsAddingMoreCdr] = useState(false);
  const [savedWorkbook, setSavedWorkbook] = useState<SavedWorkbookMeta | null>(() => getSavedWorkbookMeta());
  const [masterFleetmap, setMasterFleetmap] = useState<FleetmapState>({ records: [], meta: null, isParsing: false });
  const [fixedFleetmap, setFixedFleetmap]   = useState<FleetmapState>({ records: [], meta: null, isParsing: false });
  const [page, setPage] = useState(1);
  const { theme, isDark, toggleTheme } = useTheme();
  const [activeSection, setActiveSection] = useState(SECTION_NAV_ITEMS[0]?.id ?? "kpi");
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    () => new Set()
  );

  const scrollToSection = useCallback((id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);
  const toggleSection = useCallback((id: string) => {
    setCollapsedSections((c) => { const n = new Set(c); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }, []);
  const isSectionCollapsed = useCallback((id: string) => collapsedSections.has(id), [collapsedSections]);

  useEffect(() => {
    const targets = SECTION_NAV_ITEMS
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!targets.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActiveSection(visible.target.id);
      },
      { root: null, rootMargin: "-22% 0px -64% 0px", threshold: [0.1, 0.25, 0.5, 0.75] }
    );
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [data]);

  const kpiTableRef = useRef<HTMLDivElement | null>(null);
  const kpiAverageChartRef = useRef<HTMLElement | null>(null);
  const kpiCallsDurationChartRef = useRef<HTMLElement | null>(null);
  const monthlyKpiChartRef = useRef<HTMLElement | null>(null);
  const kpiTotalAvgChartRef = useRef<HTMLElement | null>(null);
  const monthlyCompanyChartRef = useRef<HTMLElement | null>(null);

  // Load saved fleetmaps on mount
  useEffect(() => {
    void (async () => {
      try {
        const m = await loadFleetmapFromBrowser(SAVED_MASTER_FLEETMAP_KEY);
        if (m) setMasterFleetmap({ records: m.records, meta: m.meta, isParsing: false });
      } catch { /* ignore */ }
      try {
        const f = await loadFleetmapFromBrowser(SAVED_FIXED_FLEETMAP_KEY);
        if (f) setFixedFleetmap({ records: f.records, meta: f.meta, isParsing: false });
      } catch { /* ignore */ }
    })();
  }, []);

  const handleUploadMasterFleetmap = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    setMasterFleetmap((s) => ({ ...s, isParsing: true }));
    try {
      const workbook = await readWorkbookFromUploadedFile(file);
      const records = parseFleetmap(workbook, "master");
      const meta: FleetmapMeta = { fileName: file.name, loadedAt: new Date().toLocaleString("en-GB") };
      setMasterFleetmap({ records, meta, isParsing: false });
      try { await saveFleetmapToBrowser(SAVED_MASTER_FLEETMAP_KEY, records, meta); } catch { /* ignore */ }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Master Fleetmap could not be parsed.");
      setMasterFleetmap((s) => ({ ...s, isParsing: false }));
    } finally { event.target.value = ""; }
  }, []);

  const handleUploadFixedFleetmap = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    setFixedFleetmap((s) => ({ ...s, isParsing: true }));
    try {
      const workbook = await readWorkbookFromUploadedFile(file);
      const records = parseFleetmap(workbook, "fixed");
      const meta: FleetmapMeta = { fileName: file.name, loadedAt: new Date().toLocaleString("en-GB") };
      setFixedFleetmap({ records, meta, isParsing: false });
      try { await saveFleetmapToBrowser(SAVED_FIXED_FLEETMAP_KEY, records, meta); } catch { /* ignore */ }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fixed Fleetmap could not be parsed.");
      setFixedFleetmap((s) => ({ ...s, isParsing: false }));
    } finally { event.target.value = ""; }
  }, []);

  const handleUpload = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    setError(""); setIsParsing(true);
    try {
      const combinedFleetmap = unionFleetmaps(masterFleetmap.records, fixedFleetmap.records);
      let merged: DashboardData | null = null;
      for (const file of files) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const workbook = await readWorkbookFromUploadedFile(file);
        const parsed = parseUploadedTrafficWorkbook(workbook, file.name, combinedFleetmap);
        merged = merged ? mergeCdrIntoData(merged, parsed) : parsed;
      }
      if (!merged) return;
      if (files.length > 1) merged.fileName = `${files.length} CDR files merged`;
      setData(merged);
      try { await saveWorkbookToBrowser(merged); setSavedWorkbook(workbookMeta(merged)); }
      catch { setSavedWorkbookMeta(null); setSavedWorkbook(null); }
      setFilters(EMPTY_FILTERS); setPage(1);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Workbook could not be parsed.");
    } finally { setIsParsing(false); event.target.value = ""; }
  }, [masterFleetmap.records, fixedFleetmap.records]);

  const handleRawSystemUpload = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    setError(""); setIsParsing(true);
    try {
      const combinedFleetmap = unionFleetmaps(masterFleetmap.records, fixedFleetmap.records);
      let merged: DashboardData | null = null;
      for (const file of files) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const workbook = await readWorkbookFromUploadedFile(file);
        const parsed = parseRawSystemWorkbook(workbook, file.name, combinedFleetmap);
        merged = merged ? mergeCdrIntoData(merged, parsed) : parsed;
      }
      if (!merged) return;
      merged.fileName = files.length > 1 ? `${files.length} raw system call logs merged` : `Raw system call log: ${files[0].name}`;
      setData(merged);
      try { await saveWorkbookToBrowser(merged); setSavedWorkbook(workbookMeta(merged)); }
      catch { setSavedWorkbookMeta(null); setSavedWorkbook(null); }
      setFilters(EMPTY_FILTERS); setPage(1);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Raw system call log could not be parsed.");
    } finally { setIsParsing(false); event.target.value = ""; }
  }, [masterFleetmap.records, fixedFleetmap.records]);

  const handleAddMoreCdr = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0 || !data) return;
    setError(""); setIsAddingMoreCdr(true);
    try {
      const combinedFleetmap = unionFleetmaps(masterFleetmap.records, fixedFleetmap.records);
      let merged: DashboardData = data;
      for (const file of files) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const workbook = await readWorkbookFromUploadedFile(file);
        const parsed = parseUploadedTrafficWorkbook(workbook, file.name, combinedFleetmap);
        merged = mergeCdrIntoData(merged, parsed);
      }
      merged.fileName = `${merged.cdrSources.length} CDR files merged`;
      setData(merged);
      try { await saveWorkbookToBrowser(merged); setSavedWorkbook(workbookMeta(merged)); } catch { /* ignore */ }
      setPage(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Additional workbook could not be parsed.");
    } finally { setIsAddingMoreCdr(false); event.target.value = ""; }
  }, [data, masterFleetmap.records, fixedFleetmap.records]);

  const handleLoadSavedWorkbook = useCallback(async () => {
    setError(""); setIsLoadingSaved(true);
    try {
      const saved = await loadWorkbookFromBrowser();
      if (!saved) { setSavedWorkbook(null); setSavedWorkbookMeta(null); setError("No previous workbook was found. Please upload the workbook again."); return; }
      setData(saved); setSavedWorkbook(workbookMeta(saved)); setFilters(EMPTY_FILTERS); setPage(1);
    } catch { setError("Previous workbook could not be opened. Please upload the workbook again."); }
    finally { setIsLoadingSaved(false); }
  }, []);

  const records = data?.records ?? [];
  const talkgroupLabels = useMemo(() => ({ [NUMERIC_TALKGROUP_FILTER]: "Numeric group" }), []);
  const options = useMemo(() => ({
    region: uniqueOptions(records, (r) => r.region),
    year: uniqueOptions(records, (r) => r.year).sort((a, b) => Number(a) - Number(b) || a.localeCompare(b)),
    company: uniqueOptions(records, (r) => r.company),
    month: uniqueOptions(filters.year.length ? records.filter((r) => filters.year.includes(r.year)) : records, (r) => r.month, true),
    baseStation: uniqueOptions(records, (r) => r.baseStation),
    talkgroup: [
      ...uniqueOptions(records, (r) => r.talkgroup).filter((t) => !/^\d+$/.test(t)),
      ...(records.some((r) => /^\d+$/.test(r.talkgroup)) ? [NUMERIC_TALKGROUP_FILTER] : []),
    ],
  }), [filters.year, records]);

  const filtered = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    const validMonths = new Set(options.month);
    return records.filter((record) => {
      if (filters.region.length && !filters.region.includes(record.region)) return false;
      if (filters.year.length && !filters.year.includes(record.year)) return false;
      if (filters.company.length && !filters.company.includes(record.company)) return false;
      if (filters.month.length && (!validMonths.has(record.month) || !filters.month.includes(record.month))) return false;
      if (filters.baseStation.length && !filters.baseStation.includes(record.baseStation)) return false;
      if (filters.talkgroup.length) {
        const numericMatch = filters.talkgroup.includes(NUMERIC_TALKGROUP_FILTER) && /^\d+$/.test(record.talkgroup);
        if (!numericMatch && !filters.talkgroup.includes(record.talkgroup)) return false;
      }
      if (!search) return true;
      return [record.radioId, record.radioAlias, record.employeeName, record.employeeId].join(" ").toLowerCase().includes(search);
    });
  }, [filters, options.month, records]);

  const pagedRecords = useMemo(() => filtered.slice((page - 1) * 50, page * 50), [filtered, page]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / 50));

  const metrics = useMemo(() => {
    const totalCalls = filtered.length;
    const totalDuration = filtered.reduce((sum, r) => sum + r.durationSeconds, 0);
    const trafficHours = filtered.reduce((sum, r) => sum + r.trafficHours, 0);
    const radios = new Set(filtered.map((r) => r.radioId).filter(isKnownLabel)).size;
    const companies = new Set(filtered.map((r) => r.company)).size;
    const regions = new Set(filtered.map((r) => r.region)).size;
    const talkgroups = new Set(filtered.map((r) => r.talkgroup).filter(isKnownLabel)).size;
    const stations = new Set(filtered.map((r) => r.baseStation)).size;
    const averageDuration = totalCalls ? totalDuration / totalCalls : 0;
    return { totalCalls, totalDuration, trafficHours, radios, companies, regions, talkgroups, stations, averageDuration };
  }, [filtered]);

  const rankings = useMemo(() => ({
    company:    groupBy(filtered, (r) => r.company),
    station:    groupBy(filtered, (r) => r.baseStation),
    talkgroup:  groupBy(filtered, (r) => r.talkgroup),
    region:     groupBy(filtered, (r) => r.region),
    mobileType: groupBy(filtered, (r) => r.mobileType),
    radio:      groupBy(filtered, (r) => `${r.radioId} - ${r.radioAlias}`),
    user:       groupBy(filtered, (r) => `${r.employeeName} - ${r.employeeId}`),
    hour:       groupBy(filtered, (r) => r.hour).sort((a, b) => a.name.localeCompare(b.name)),
    month:      groupBy(filtered, (r) => r.month).sort((a, b) => monthSortValue(a.name) - monthSortValue(b.name) || a.name.localeCompare(b.name)),
  }), [filtered]);

  const regionPerformanceRows = useMemo(() => {
    const map = new Map<string, { name: string; calls: number; durationSeconds: number; trafficHours: number; radios: Set<string>; talkgroups: Set<string>; companies: Set<string>; stations: Set<string>; hours: Map<string, number>; companyCalls: Map<string, number> }>();
    filtered.forEach((record) => {
      const name = record.region || "Unknown";
      const current = map.get(name) ?? { name, calls: 0, durationSeconds: 0, trafficHours: 0, radios: new Set<string>(), talkgroups: new Set<string>(), companies: new Set<string>(), stations: new Set<string>(), hours: new Map<string, number>(), companyCalls: new Map<string, number>() };
      current.calls += 1;
      current.durationSeconds += record.durationSeconds;
      current.trafficHours += record.trafficHours;
      if (isKnownLabel(record.radioId)) current.radios.add(record.radioId);
      if (isKnownLabel(record.talkgroup)) current.talkgroups.add(record.talkgroup);
      if (isKnownLabel(record.company)) current.companies.add(record.company);
      if (isKnownLabel(record.baseStation)) current.stations.add(record.baseStation);
      current.hours.set(record.hour, (current.hours.get(record.hour) ?? 0) + 1);
      current.companyCalls.set(record.company, (current.companyCalls.get(record.company) ?? 0) + 1);
      map.set(name, current);
    });
    return [...map.values()].map((row) => ({
      name: row.name,
      calls: row.calls,
      durationSeconds: row.durationSeconds,
      trafficHours: row.trafficHours,
      radios: row.radios.size,
      talkgroups: row.talkgroups.size,
      companies: row.companies.size,
      stations: row.stations.size,
      averageDuration: row.calls ? row.durationSeconds / row.calls : 0,
      peakHour: [...row.hours.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? "--",
      topCompany: [...row.companyCalls.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? "--",
    })).sort((a, b) => b.calls - a.calls || b.durationSeconds - a.durationSeconds);
  }, [filtered]);

  const fleetActivation = useMemo(() => {
    /*
      Build registered fleet from every possible source, in this priority:
      1) live Master + Fixed Fleetmap states,
      2) DashboardData.fleetmapRecords saved with the parsed workbook,
      3) DashboardData.lookupRecords fallback,
      4) filtered CDR company/region values only for non-empty display rows.

      This prevents Inactive Radios by Company/Region from rendering empty when
      raw-system data is uploaded or restored and the fleetmap is not attached
      to the current DashboardData object.
    */
    const liveFleetmap = unionFleetmaps(masterFleetmap.records, fixedFleetmap.records);
    const savedFleetmap = data?.fleetmapRecords ?? [];
    const lookupFleetmapFallback: FleetmapRecord[] = (data?.lookupRecords ?? []).map((record) => ({
      radioId: record.radioId,
      radioAlias: "",
      employeeName: "",
      employeeId: "",
      company: record.company,
      region: record.region,
      talkgroup: record.talkgroup,
      mobileType: "Unknown",
      source: "master",
    }));

    const fleetmapCandidates = [
      ...liveFleetmap,
      ...savedFleetmap,
      ...lookupFleetmapFallback,
    ];

    const activeRadioIds = new Set(
      filtered
        .map((record) => normalizeRadioKey(record.radioId))
        .filter((radioId) => isKnownLabel(radioId))
    );

    const registeredMap = new Map<string, FleetmapRecord>();
    fleetmapCandidates.forEach((record) => {
      const radioKey = normalizeRadioKey(record.radioId);
      if (isKnownLabel(radioKey) && !registeredMap.has(radioKey)) registeredMap.set(radioKey, record);
    });

    const registered = [...registeredMap.entries()].map(([radioKey, record]) => ({ radioKey, record }));
    const activeRegistered = registered.filter((item) => activeRadioIds.has(item.radioKey));
    const inactive = registered.filter((item) => !activeRadioIds.has(item.radioKey)).map((item) => item.record);
    const activeRegisteredRecords = activeRegistered.map((item) => item.record);
    const registeredRecords = registered.map((item) => item.record);

    const buildAllDimensionRows = (
      getRegisteredName: (record: FleetmapRecord) => string,
      getFilteredName: (record: CallRecord) => string
    ) => {
      const map = new Map<string, number>();

      registeredRecords.forEach((record) => {
        const name = cleanText(getRegisteredName(record), "Unknown");
        if (isKnownLabel(name) && !map.has(name)) map.set(name, 0);
      });

      filtered.forEach((record) => {
        const name = cleanText(getFilteredName(record), "Unknown");
        if (isKnownLabel(name) && !map.has(name)) map.set(name, 0);
      });

      const activeMap = new Map<string, number>();

      activeRegisteredRecords.forEach((record) => {
        const name = cleanText(getRegisteredName(record), "Unknown");
        if (isKnownLabel(name)) activeMap.set(name, (activeMap.get(name) ?? 0) + 1);
      });

      /*
        If no registered fleetmap rows are available, still show Active Radios
        from the filtered CDR rows so the table remains useful.
      */
      if (registeredRecords.length === 0) {
        const activeFilteredKeys = new Map<string, Set<string>>();
        filtered.forEach((record) => {
          const name = cleanText(getFilteredName(record), "Unknown");
          const radioKey = normalizeRadioKey(record.radioId);
          if (!isKnownLabel(name) || !isKnownLabel(radioKey)) return;
          const set = activeFilteredKeys.get(name) ?? new Set<string>();
          set.add(radioKey);
          activeFilteredKeys.set(name, set);
        });
        activeFilteredKeys.forEach((set, name) => activeMap.set(name, set.size));
      }

      inactive.forEach((record) => {
        const name = cleanText(getRegisteredName(record), "Unknown");
        if (isKnownLabel(name)) map.set(name, (map.get(name) ?? 0) + 1);
      });

      activeMap.forEach((_count, name) => {
        if (isKnownLabel(name) && !map.has(name)) map.set(name, 0);
      });

      return [...map.entries()]
        .map(([name, count]) => ({ name, count, activeCount: activeMap.get(name) ?? 0 }))
        .sort((a, b) => b.count - a.count || b.activeCount - a.activeCount || a.name.localeCompare(b.name));
    };

    return {
      registeredCount: registered.length,
      activeRegisteredCount: activeRegistered.length,
      inactiveCount: inactive.length,
      activationRate: registered.length ? (activeRegistered.length / registered.length) * 100 : 0,
      inactiveByCompany: buildAllDimensionRows((record) => record.company, (record) => record.company),
      inactiveByRegion: buildAllDimensionRows((record) => record.region, (record) => record.region),
      inactiveByMobileType: buildAllDimensionRows((record) => record.mobileType, (record) => record.mobileType),
    };
  }, [data?.fleetmapRecords, data?.lookupRecords, filtered, masterFleetmap.records, fixedFleetmap.records]);

  const unmatchedFleetmapReportRows = useMemo(() => {
    const map = new Map<string, {
      callerNumber: string;
      callerAlias: string;
      talkgroup: string;
      firstSeen: string;
      lastSeen: string;
      calls: number;
      totalDuration: number;
      baseStations: Set<string>;
      reason: string;
    }>();

    filtered.forEach((record) => {
      const isUnmatchedFleetmap = record.region === "Unmatched Fleetmap";
      const isUnknownCompany = record.company === "Unknown";
      if (!isUnmatchedFleetmap && !isUnknownCompany) return;

      const callerNumber = normalizeRadioKey(record.radioId) || cleanText(record.radioId, "Unknown");
      const reason = isUnmatchedFleetmap
        ? "Caller Number not found in Master/Fixed Fleetmap Radio ID"
        : "Fleetmap match incomplete or Company missing";
      const current = map.get(callerNumber) ?? {
        callerNumber,
        callerAlias: cleanText(record.radioAlias, "Not labelled"),
        talkgroup: cleanText(record.talkgroup, "Unknown"),
        firstSeen: record.startTime,
        lastSeen: record.endTime || record.startTime,
        calls: 0,
        totalDuration: 0,
        baseStations: new Set<string>(),
        reason,
      };

      current.calls += 1;
      current.totalDuration += record.durationSeconds;
      if (isKnownLabel(record.baseStation)) current.baseStations.add(record.baseStation);
      if (record.startTime && (!current.firstSeen || record.startTime < current.firstSeen)) current.firstSeen = record.startTime;
      if (record.endTime && (!current.lastSeen || record.endTime > current.lastSeen)) current.lastSeen = record.endTime;
      if (!isKnownLabel(current.callerAlias) && isKnownLabel(record.radioAlias)) current.callerAlias = record.radioAlias;
      if (!isKnownLabel(current.talkgroup) && isKnownLabel(record.talkgroup)) current.talkgroup = record.talkgroup;
      map.set(callerNumber, current);
    });

    return [...map.values()]
      .map((row) => ({
        ...row,
        baseStationsText: [...row.baseStations].sort().join(", ") || "Unknown",
      }))
      .sort((a, b) => b.calls - a.calls || a.callerNumber.localeCompare(b.callerNumber));
  }, [filtered]);

  const trafficIntensity = useMemo(() => {
    const busyTrafficHour = [...rankings.hour].sort((a, b) => b.trafficHours - a.trafficHours || b.calls - a.calls)[0];
    return {
      trafficPerRadio: metrics.radios ? metrics.trafficHours / metrics.radios : 0,
      trafficPerTalkgroup: metrics.talkgroups ? metrics.trafficHours / metrics.talkgroups : 0,
      trafficPerCompany: metrics.companies ? metrics.trafficHours / metrics.companies : 0,
      trafficPerRegion: metrics.regions ? metrics.trafficHours / metrics.regions : 0,
      busyTrafficHour,
    };
  }, [metrics, rankings.hour]);

  const heatmapHours = useMemo(() => uniqueOptions(filtered, (record) => record.hour).sort((a, b) => a.localeCompare(b)), [filtered]);

  const regionHourHeatmap = useMemo(() => {
    const topRegions = regionPerformanceRows.slice(0, 8).map((row) => row.name);
    const topRegionSet = new Set(topRegions);
    const hourIndex = new Map(heatmapHours.map((hour, index) => [hour, index]));
    const counts = new Map<string, number[]>();
    topRegions.forEach((region) => counts.set(region, Array(heatmapHours.length).fill(0)));
    filtered.forEach((record) => {
      if (!topRegionSet.has(record.region)) return;
      const index = hourIndex.get(record.hour);
      if (index == null) return;
      const cells = counts.get(record.region);
      if (cells) cells[index] += 1;
    });
    return topRegions.map((region) => {
      const cells = counts.get(region) ?? [];
      return { region, cells, total: cells.reduce((sum, value) => sum + value, 0) };
    });
  }, [filtered, heatmapHours, regionPerformanceRows]);

  const heatmapMax = useMemo(() => Math.max(1, ...regionHourHeatmap.flatMap((row) => row.cells)), [regionHourHeatmap]);

  const talkgroupEfficiencyRows = useMemo(() => {
    const map = new Map<string, { name: string; calls: number; durationSeconds: number; trafficHours: number; radios: Set<string>; users: Set<string>; regions: Map<string, number>; companies: Map<string, number>; hours: Map<string, number> }>();
    filtered.forEach((record) => {
      const name = record.talkgroup || "Unknown";
      const current = map.get(name) ?? { name, calls: 0, durationSeconds: 0, trafficHours: 0, radios: new Set<string>(), users: new Set<string>(), regions: new Map<string, number>(), companies: new Map<string, number>(), hours: new Map<string, number>() };
      current.calls += 1;
      current.durationSeconds += record.durationSeconds;
      current.trafficHours += record.trafficHours;
      if (isKnownLabel(record.radioId)) current.radios.add(record.radioId);
      if (isKnownLabel(record.employeeName) || isKnownLabel(record.employeeId)) current.users.add(`${record.employeeName} - ${record.employeeId}`);
      current.regions.set(record.region, (current.regions.get(record.region) ?? 0) + 1);
      current.companies.set(record.company, (current.companies.get(record.company) ?? 0) + 1);
      current.hours.set(record.hour, (current.hours.get(record.hour) ?? 0) + 1);
      map.set(name, current);
    });
    const topEntry = (input: Map<string, number>) => [...input.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? "--";
    return [...map.values()].map((row) => ({
      name: row.name,
      calls: row.calls,
      durationSeconds: row.durationSeconds,
      trafficHours: row.trafficHours,
      radios: row.radios.size,
      users: row.users.size,
      averageDuration: row.calls ? row.durationSeconds / row.calls : 0,
      peakHour: topEntry(row.hours),
      peakRegion: topEntry(row.regions),
      peakCompany: topEntry(row.companies),
    })).sort((a, b) => b.trafficHours - a.trafficHours || b.calls - a.calls).slice(0, 20);
  }, [filtered]);

  const userBehaviorRows = useMemo(() => {
    const map = new Map<string, { name: string; calls: number; durationSeconds: number; radios: Set<string>; talkgroups: Set<string>; stations: Set<string> }>();
    filtered.forEach((record) => {
      const name = `${record.employeeName} - ${record.employeeId}`;
      const current = map.get(name) ?? { name, calls: 0, durationSeconds: 0, radios: new Set<string>(), talkgroups: new Set<string>(), stations: new Set<string>() };
      current.calls += 1;
      current.durationSeconds += record.durationSeconds;
      if (isKnownLabel(record.radioId)) current.radios.add(record.radioId);
      if (isKnownLabel(record.talkgroup)) current.talkgroups.add(record.talkgroup);
      if (isKnownLabel(record.baseStation)) current.stations.add(record.baseStation);
      map.set(name, current);
    });
    return [...map.values()].map((row) => ({ ...row, radios: row.radios.size, talkgroups: row.talkgroups.size, stations: row.stations.size, averageDuration: row.calls ? row.durationSeconds / row.calls : 0 })).sort((a, b) => b.calls - a.calls || b.durationSeconds - a.durationSeconds).slice(0, 15);
  }, [filtered]);

  const radioBehaviorRows = useMemo(() => {
    const map = new Map<string, { radioId: string; alias: string; company: string; calls: number; durationSeconds: number; talkgroups: Set<string>; stations: Set<string>; users: Set<string>; regions: Set<string> }>();
    filtered.forEach((record) => {
      const key = record.radioId;
      const current = map.get(key) ?? { radioId: record.radioId, alias: record.radioAlias, company: record.company, calls: 0, durationSeconds: 0, talkgroups: new Set<string>(), stations: new Set<string>(), users: new Set<string>(), regions: new Set<string>() };
      current.calls += 1;
      current.durationSeconds += record.durationSeconds;
      if (isKnownLabel(record.talkgroup)) current.talkgroups.add(record.talkgroup);
      if (isKnownLabel(record.baseStation)) current.stations.add(record.baseStation);
      if (isKnownLabel(record.employeeName) || isKnownLabel(record.employeeId)) current.users.add(`${record.employeeName} - ${record.employeeId}`);
      if (isKnownLabel(record.region)) current.regions.add(record.region);
      map.set(key, current);
    });
    return [...map.values()].map((row) => ({ ...row, talkgroups: row.talkgroups.size, stations: row.stations.size, users: row.users.size, regions: row.regions.size, averageDuration: row.calls ? row.durationSeconds / row.calls : 0 })).sort((a, b) => b.calls - a.calls || b.durationSeconds - a.durationSeconds).slice(0, 15);
  }, [filtered]);

  const topRadioUsers = useMemo(() => {
    const map = new Map<string, { radioId: string; radioAlias: string; employeeName: string; company: string; calls: number; durationSeconds: number }>();
    filtered.forEach((r) => {
      const key = `${r.radioId}||${r.radioAlias}||${r.employeeName}||${r.company}`;
      const cur = map.get(key) ?? { radioId: r.radioId, radioAlias: r.radioAlias, employeeName: r.employeeName, company: r.company, calls: 0, durationSeconds: 0 };
      cur.calls += 1; cur.durationSeconds += r.durationSeconds;
      map.set(key, cur);
    });
    return [...map.values()].sort((a, b) => b.calls - a.calls || b.durationSeconds - a.durationSeconds || a.radioId.localeCompare(b.radioId)).slice(0, 10);
  }, [filtered]);

  const radioMonths = useMemo(() => {
    const rows = [...rankings.month].sort((a, b) => monthSortValue(a.name) - monthSortValue(b.name) || a.name.localeCompare(b.name));
    const total = rows.reduce((sum, r) => sum + r.radios, 0);
    return rows.map((r) => ({ ...r, share: total ? (r.radios / total) * 100 : 0 }));
  }, [rankings.month]);

  const mobileTypes = useMemo(() => {
    return uniqueOptions(filtered, (r) => r.mobileType)
      .filter((t) => t !== "Unknown" && t !== "Not Found")
      .sort((a, b) => { const ai = MOBILE_TYPE_LABELS.indexOf(a); const bi = MOBILE_TYPE_LABELS.indexOf(b); return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi) || a.localeCompare(b); });
  }, [filtered]);

  const mobileTypeByCompany = useMemo(() => {
    const map = new Map<string, { name: string; total: Set<string>; byType: Map<string, Set<string>> }>();
    filtered.forEach((r) => {
      if (r.company === "Unknown" || r.company === "Not Found" || r.radioId === "Unknown") return;
      const cur = map.get(r.company) ?? { name: r.company, total: new Set<string>(), byType: new Map<string, Set<string>>() };
      cur.total.add(r.radioId);
      if (r.mobileType !== "Unknown" && r.mobileType !== "Not Found") {
        const ts = cur.byType.get(r.mobileType) ?? new Set<string>();
        ts.add(r.radioId); cur.byType.set(r.mobileType, ts);
      }
      map.set(r.company, cur);
    });
    return [...map.values()].map((row) => {
      const next: Record<string, string | number> = { name: row.name, total: row.total.size };
      mobileTypes.forEach((type) => { next[mobileTypeKey(type)] = row.byType.get(type)?.size ?? 0; });
      return next;
    }).filter((r) => Number(r.total) > 0).sort((a, b) => `${a.name}`.localeCompare(`${b.name}`));
  }, [filtered, mobileTypes]);

  const mobileTypeByMonth = useMemo(() => {
    const map = new Map<string, { name: string; total: Set<string>; byType: Map<string, Set<string>> }>();
    filtered.forEach((r) => {
      if (r.month === "Unknown" || r.radioId === "Unknown") return;
      const cur = map.get(r.month) ?? { name: r.month, total: new Set<string>(), byType: new Map<string, Set<string>>() };
      cur.total.add(r.radioId);
      if (r.mobileType !== "Unknown" && r.mobileType !== "Not Found") {
        const ts = cur.byType.get(r.mobileType) ?? new Set<string>();
        ts.add(r.radioId); cur.byType.set(r.mobileType, ts);
      }
      map.set(r.month, cur);
    });
    return [...map.values()].map((row) => {
      const next: Record<string, string | number> = { name: row.name, total: row.total.size };
      mobileTypes.forEach((type) => { next[mobileTypeKey(type)] = row.byType.get(type)?.size ?? 0; });
      return next;
    }).filter((r) => Number(r.total) > 0).sort((a, b) => monthSortValue(`${a.name}`) - monthSortValue(`${b.name}`) || `${a.name}`.localeCompare(`${b.name}`));
  }, [filtered, mobileTypes]);

  const kpiRows = useMemo(() => {
    const map = new Map<string, { calls: number; durationSeconds: number; talkgroups: Set<string>; radios: Set<string> }>();
    const lookupCompanies = new Set((data?.lookupRecords ?? []).map((r) => r.company));
    const lookupCompanyCounts = new Map<string, number>();
    (data?.lookupRecords ?? [])
      .filter((r) => filters.region.length === 0 || filters.region.includes(r.region))
      .forEach((r) => lookupCompanyCounts.set(r.company, (lookupCompanyCounts.get(r.company) ?? 0) + 1));
    const unlistedCount = filtered.filter((r) => !lookupCompanies.has(r.company)).length;
    filtered.forEach((r) => {
      const cur = map.get(r.company) ?? { calls: 0, durationSeconds: 0, talkgroups: new Set<string>(), radios: new Set<string>() };
      cur.calls += 1; cur.durationSeconds += r.durationSeconds;
      if (r.talkgroup !== "Unknown") cur.talkgroups.add(r.talkgroup);
      if (r.radioId !== "Unknown") cur.radios.add(r.radioId);
      map.set(r.company, cur);
    });
    return Array.from(map.entries())
      .filter(([company]) => company !== "Unknown" && company !== "Not Found")
      .map(([company, value]) => {
        const lookupActivated = lookupCompanyCounts.get(company) ?? (lookupCompanies.has(company) ? 0 : unlistedCount);
        return { company, talkgroupsInUse: value.talkgroups.size, calls: value.calls, durationSeconds: value.durationSeconds, usersActivated: lookupActivated || value.radios.size, callingUsers: value.radios.size, kpiAvgDurationPerUser: 0 };
      })
      .map((row) => ({ ...row, kpiAvgDurationPerUser: row.usersActivated ? row.durationSeconds / row.usersActivated : 0 }))
      .sort((a, b) => a.company.localeCompare(b.company));
  }, [data?.lookupRecords, filtered, filters.region]);

  const kpiAverage = useMemo(() => {
    const values = kpiRows.map((r) => r.kpiAvgDurationPerUser).filter((v) => v > 0);
    return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
  }, [kpiRows]);

  const monthlyKpi = useMemo(() => {
    const companies = uniqueOptions(filtered, (r) => r.company).filter((c) => c !== "Unknown" && c !== "Not Found").sort((a, b) => a.localeCompare(b));
    const months = uniqueOptions(filtered, (r) => r.month, true).sort((a, b) => monthSortValue(a) - monthSortValue(b) || a.localeCompare(b));
    const stats = new Map<string, { calls: number; durationSeconds: number }>();
    filtered.forEach((r) => {
      if (r.company === "Unknown" || r.company === "Not Found") return;
      const key = `${r.company}||${r.month}`;
      const cur = stats.get(key) ?? { calls: 0, durationSeconds: 0 };
      cur.calls += 1; cur.durationSeconds += r.durationSeconds; stats.set(key, cur);
    });
    const rows = companies.map((company) => {
      const row: Record<string, string | number | null> = { company };
      months.forEach((month) => { const cur = stats.get(`${company}||${month}`); row[dataKey(month)] = cur?.calls ? cur.durationSeconds / cur.calls : null; });
      return row;
    });
    return { rows, months: months.map((month, i) => ({ name: month, key: dataKey(month), color: COLORS[i % COLORS.length] })) };
  }, [filtered]);

  const monthlyKpiPieData = useMemo(() => {
    return [...rankings.month]
      .sort((a, b) => monthSortValue(a.name) - monthSortValue(b.name) || a.name.localeCompare(b.name))
      .filter((r) => r.calls > 0 && r.durationSeconds > 0)
      .map((r) => ({ name: shortMonthLabel(r.name), value: r.durationSeconds / r.calls }));
  }, [rankings.month]);

  const CompanyPeriodLabel = useMemo(() => {
    const years = [...filters.year].sort((a, b) => Number(a) - Number(b) || a.localeCompare(b));
    const months = [...filters.month].sort((a, b) => monthSortValue(a) - monthSortValue(b) || a.localeCompare(b)).map(shortMonthLabel);
    if (months.length) { const t = months.join(", "); const hasYear = months.some((m) => /(19|20)\d{2}/.test(m)); return !hasYear && years.length ? `${t} ${years.join(", ")}` : t; }
    if (years.length) return years.join(", ");
    return "selected period";
  }, [filters.month, filters.year]);

  const exportTitle = useCallback((title: string) => `${title} - ${CompanyPeriodLabel}`, [CompanyPeriodLabel]);

  const kpiExportItems = useMemo(() => [
    { title: "KPI Average Duration per Company", ref: kpiAverageChartRef },
    { title: "KPI Calls and Duration per Company", ref: kpiCallsDurationChartRef },
    { title: "Monthly KPI", ref: monthlyKpiChartRef },
    { title: "KPI Total Avg. Duration", ref: kpiTotalAvgChartRef },
  ], []);

  const kpiTableHeaders = ["Call Source","Talk groups in use","No. of Calls","Duration (Sec)","Duration (hh:mm:ss)","Total No. of Users activated","Call Performed by (No. of Users)","KPI (Avg. Duration per User per Company) in sec","KPI"];

  const kpiExportTableRows = useMemo(() => [
    kpiTableHeaders,
    ...kpiRows.map((row, i) => [row.company, formatNumber(row.talkgroupsInUse), formatNumber(row.calls), formatNumber(row.durationSeconds), secondsToClock(row.durationSeconds), formatNumber(row.usersActivated), formatNumber(row.callingUsers), formatNumber(row.kpiAvgDurationPerUser), i === 0 ? formatNumber(kpiAverage) : ""]),
  ], [kpiAverage, kpiRows]);

  const captureKpiChartImages = useCallback(async () => {
    const charts = await Promise.all(kpiExportItems.map(async (item) => {
      const element = item.ref.current;
      if (!element) throw new Error(`${item.title} is not ready yet.`);
      return { title: exportTitle(item.title), image: await captureElementPng(element, "#0f1b24") };
    }));
    return charts;
  }, [exportTitle, kpiExportItems]);

  const exportKpiXlsx = useCallback(() => {
    void (async () => {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "CDR Dashboard";
      const worksheet = workbook.addWorksheet("KPI Measurements", { views: [{ showGridLines: false }] });
      const border = { top: { style: "thin" as const }, left: { style: "thin" as const }, bottom: { style: "thin" as const }, right: { style: "thin" as const } };
      const headerFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFFFFF00" } };
      worksheet.addRow([exportTitle("KPI Measurements")]);
      worksheet.mergeCells(1, 1, 1, kpiTableHeaders.length);
      worksheet.addRow(kpiTableHeaders);
      kpiRows.forEach((row, i) => worksheet.addRow([row.company, row.talkgroupsInUse, row.calls, row.durationSeconds, secondsToClock(row.durationSeconds), row.usersActivated, row.callingUsers, row.kpiAvgDurationPerUser, i === 0 ? kpiAverage : ""]));
      worksheet.eachRow((row, rn) => { row.height = rn <= 2 ? 28 : 22; row.eachCell((cell) => { cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }; cell.border = border; if (rn <= 2) { cell.font = { bold: true, color: { argb: "FF000000" } }; cell.fill = headerFill; } }); });
      worksheet.columns = kpiTableHeaders.map((h, i) => ({ width: Math.min(34, Math.max(14, h.length / 1.7, ...kpiRows.map((r) => `${[r.company, r.talkgroupsInUse, r.calls, r.durationSeconds, secondsToClock(r.durationSeconds), r.usersActivated, r.callingUsers, r.kpiAvgDurationPerUser, kpiAverage][i] ?? ""}`.length + 2))) }));
      const styleDataSheet = (sheet: ExcelJS.Worksheet) => { sheet.getRow(1).font = { bold: true }; sheet.getRow(1).fill = headerFill; sheet.eachRow((row) => row.eachCell((cell) => { cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }; cell.border = border; })); };
      const avgSheet = workbook.addWorksheet("KPI Avg Duration", { views: [{ showGridLines: false }] });
      avgSheet.addRow(["Company", "KPI Avg Duration"]); kpiRows.forEach((r) => avgSheet.addRow([r.company, r.kpiAvgDurationPerUser])); avgSheet.columns = [{ width: 28 }, { width: 18 }]; styleDataSheet(avgSheet);
      const callsSheet = workbook.addWorksheet("KPI Calls Duration", { views: [{ showGridLines: false }] });
      callsSheet.addRow(["Company", "Calls", "Duration Seconds"]); kpiRows.forEach((r) => callsSheet.addRow([r.company, r.calls, r.durationSeconds])); callsSheet.columns = [{ width: 28 }, { width: 14 }, { width: 18 }]; styleDataSheet(callsSheet);
      const monthlySheet = workbook.addWorksheet("Monthly KPI", { views: [{ showGridLines: false }] });
      monthlySheet.addRow(["Company", ...monthlyKpi.months.map((m) => shortMonthLabel(m.name))]); monthlyKpi.rows.forEach((r) => monthlySheet.addRow([r.company, ...monthlyKpi.months.map((m) => r[m.key] ?? "")])); monthlySheet.columns = [{ width: 28 }, ...monthlyKpi.months.map(() => ({ width: 14 }))]; styleDataSheet(monthlySheet);
      const totalAvgSheet = workbook.addWorksheet("KPI Total Avg", { views: [{ showGridLines: false }] });
      totalAvgSheet.addRow(["Month Year", "KPI Total Avg Duration"]); monthlyKpiPieData.forEach((r) => totalAvgSheet.addRow([r.name, r.value])); totalAvgSheet.columns = [{ width: 18 }, { width: 22 }]; styleDataSheet(totalAvgSheet);
      const chartConfigs: NativeChartConfig[] = [
        { sheetIndex: 2, chartIndex: 1, title: exportTitle("KPI Average Duration per Company"), type: "bar", categoriesRef: excelRange("KPI Avg Duration", 1, 2, Math.max(2, kpiRows.length + 1)), series: [{ name: "Average duration per activated user", valuesRef: excelRange("KPI Avg Duration", 2, 2, Math.max(2, kpiRows.length + 1)), color: "37A6D9" }] },
        { sheetIndex: 3, chartIndex: 2, title: exportTitle("KPI Calls and Duration per Company"), type: "line", categoriesRef: excelRange("KPI Calls Duration", 1, 2, Math.max(2, kpiRows.length + 1)), series: [{ name: "Calls", valuesRef: excelRange("KPI Calls Duration", 2, 2, Math.max(2, kpiRows.length + 1)), color: "65C18C" }, { name: "Duration seconds", valuesRef: excelRange("KPI Calls Duration", 3, 2, Math.max(2, kpiRows.length + 1)), color: "F0B84F" }] },
        { sheetIndex: 4, chartIndex: 3, title: exportTitle("Monthly KPI"), type: "line", categoriesRef: excelRange("Monthly KPI", 1, 2, Math.max(2, monthlyKpi.rows.length + 1)), series: monthlyKpi.months.map((m, i) => ({ name: shortMonthLabel(m.name), valuesRef: excelRange("Monthly KPI", i + 2, 2, Math.max(2, monthlyKpi.rows.length + 1)), color: m.color.replace("#", "").toUpperCase() })) },
        { sheetIndex: 5, chartIndex: 4, title: exportTitle("KPI Total Avg. Duration"), type: "doughnut", categoriesRef: excelRange("KPI Total Avg", 1, 2, Math.max(2, monthlyKpiPieData.length + 1)), series: [{ name: "KPI Total Avg. Duration", valuesRef: excelRange("KPI Total Avg", 2, 2, Math.max(2, monthlyKpiPieData.length + 1)), color: "37A6D9" }] },
      ];
      const buffer = await workbook.xlsx.writeBuffer();
      const patched = await patchWorkbookWithNativeCharts(buffer, chartConfigs);
      downloadBlob("kpi-table-and-charts.xlsx", patched);
    })();
  }, [exportTitle, kpiAverage, kpiRows, monthlyKpi.months, monthlyKpi.rows, monthlyKpiPieData]);

  const exportKpiPdf = useCallback(() => {
    void (async () => {
      const charts = await captureKpiChartImages();
      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 24;
      const drawKpiTable = () => {
        const colWeights = [1.45, 0.9, 0.8, 0.95, 1.1, 1.15, 1.15, 1.45, 0.65];
        const tableWidth = pageWidth - margin * 2;
        const totalWeight = colWeights.reduce((s, w) => s + w, 0);
        const colWidths = colWeights.map((w) => tableWidth * w / totalWeight);
        const rowHeight = Math.min(30, (pageHeight - 76) / Math.max(1, kpiExportTableRows.length));
        let y = 52;
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(16);
        pdfText(pdf, exportTitle("KPI Measurements"), pageWidth / 2, 28, { align: "center" });
        kpiExportTableRows.forEach((row, ri) => {
          let x = margin;
          row.forEach((cell, ci) => {
            const width = colWidths[ci];
            pdf.setDrawColor(20, 36, 48); pdf.setFillColor(ri === 0 ? "#fff200" : "#ffffff");
            pdf.rect(x, y, width, rowHeight, "FD");
            pdf.setFont("helvetica", ri === 0 ? "bold" : "normal"); pdf.setFontSize(ri === 0 ? 6.5 : 7); pdf.setTextColor(0, 0, 0);
            pdfText(pdf, cell, x + width / 2, y + rowHeight / 2 + 2.5, { align: "center", maxWidth: width - 4 });
            x += width;
          });
          y += rowHeight;
        });
      };
      const addImagePage = (title: string, image: string, firstPage = false) => {
        if (!firstPage) pdf.addPage("a4", "landscape");
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(16);
        pdfText(pdf, title, pageWidth / 2, 28, { align: "center" });
        const props = pdf.getImageProperties(image);
        const maxWidth = pageWidth - margin * 2; const maxHeight = pageHeight - margin * 2 - 24;
        const ratio = Math.min(maxWidth / props.width, maxHeight / props.height);
        pdf.addImage(image, "PNG", (pageWidth - props.width * ratio) / 2, 48 + (maxHeight - props.height * ratio) / 2, props.width * ratio, props.height * ratio);
      };
      drawKpiTable();
      charts.forEach((chart) => addImagePage(chart.title, chart.image));
      pdf.save("kpi-table-and-charts.pdf");
    })();
  }, [captureKpiChartImages, exportTitle, kpiExportTableRows]);

  const exportKpiPpt = useCallback(() => {
    void (async () => {
      const charts = await captureKpiChartImages();
      const pptx = new pptxgen();
      pptx.layout = "LAYOUT_WIDE"; pptx.author = "CDR Dashboard"; pptx.rtlMode = true;
      const tableSlide = pptx.addSlide();
      tableSlide.background = { color: "FFFFFF" };
      tableSlide.addText(exportTitle("KPI Measurements"), pptTextOptions(exportTitle("KPI Measurements"), { x: 0.3, y: 0.18, w: 12.7, h: 0.36, fontSize: 18, bold: true, align: "center", color: "111111" }));
      const pptTableRows = kpiExportTableRows.map((row, ri) => row.map((cell) => ({ text: String(cell), options: pptTextOptions(cell, { bold: ri === 0, fill: { color: ri === 0 ? "FFF200" : "FFFFFF" }, color: "111111" }) })));
      tableSlide.addTable(pptTableRows, { x: 0.18, y: 0.7, w: 12.98, h: 6.25, fontFace: "Arial", fontSize: 5.7, color: "111111", margin: 0.02, align: "center", valign: "mid", border: { type: "solid", color: "111111", pt: 0.5 }, fill: { color: "FFFFFF" }, autoFit: false, colW: [1.45, 0.86, 0.75, 0.86, 1.02, 1.08, 1.08, 1.45, 0.55], rowH: kpiExportTableRows.map((_, i) => i === 0 ? 0.58 : 0.38), bold: false, fit: "shrink" });
      const addImageSlide = (title: string, image: string) => {
        const slide = pptx.addSlide();
        slide.background = { color: "0F1B24" };
        slide.addText(title, pptTextOptions(title, { x: 0.3, y: 0.18, w: 12.7, h: 0.38, fontSize: 18, bold: true, align: "center", color: "EDF6FA" }));
        slide.addImage({ data: image, x: 0.35, y: 0.72, w: 12.65, h: 6.35 });
      };
      charts.forEach((chart) => addImageSlide(chart.title, chart.image));
      await pptx.writeFile({ fileName: "kpi-table-and-charts.pptx" });
    })();
  }, [captureKpiChartImages, exportTitle, kpiExportTableRows]);

  const CompanyRows = useMemo(() => {
    const map = new Map<string, { calls: number; durationSeconds: number; talkgroupsUsed: Set<string>; callingUsers: Set<string>; totalTalkgroups: Set<string>; totalUsers: Set<string> }>();
    const ensure = (company: string) => {
      const key = company || "Unknown";
      const cur = map.get(key) ?? { calls: 0, durationSeconds: 0, talkgroupsUsed: new Set<string>(), callingUsers: new Set<string>(), totalTalkgroups: new Set<string>(), totalUsers: new Set<string>() };
      map.set(key, cur); return cur;
    };
    filtered.forEach((r) => {
      const cur = ensure(r.company); cur.calls += 1; cur.durationSeconds += r.durationSeconds;
      if (r.talkgroup !== "Unknown") cur.talkgroupsUsed.add(r.talkgroup);
      if (r.radioId !== "Unknown") cur.callingUsers.add(r.radioId);
    });
    const search = filters.search.toLowerCase().trim();
    (data?.lookupRecords ?? []).filter((r) => {
      if (!r.company || r.company === "Unknown" || r.company === "Not Found") return false;
      if (filters.region.length && !filters.region.includes(r.region)) return false;
      if (filters.company.length && !filters.company.includes(r.company)) return false;
      if (filters.talkgroup.length) { const nm = filters.talkgroup.includes(NUMERIC_TALKGROUP_FILTER) && /^\d+$/.test(r.talkgroup); if (!nm && !filters.talkgroup.includes(r.talkgroup)) return false; }
      if (search && ![r.radioId, r.company, r.region, r.talkgroup].join(" ").toLowerCase().includes(search)) return false;
      return true;
    }).forEach((r) => {
      const cur = ensure(r.company);
      if (r.talkgroup) cur.totalTalkgroups.add(r.talkgroup);
      if (r.radioId) cur.totalUsers.add(r.radioId);
    });
    return [...map.entries()].map(([name, v]) => ({ name, calls: v.calls, durationSeconds: v.durationSeconds, talkgroupsTotal: Math.max(v.totalTalkgroups.size, v.talkgroupsUsed.size), usersTotal: Math.max(v.totalUsers.size, v.callingUsers.size), talkgroupsUsed: v.talkgroupsUsed.size, callingUsers: v.callingUsers.size })).filter((r) => r.calls > 0 || r.usersTotal > 0 || r.talkgroupsTotal > 0).sort((a, b) => a.name.localeCompare(b.name));
  }, [data?.lookupRecords, filtered, filters.company, filters.region, filters.search, filters.talkgroup]);

  const CompanyChartData = {
    duration: CompanyRows.filter((r) => r.durationSeconds > 0).map((r) => ({ name: r.name, value: r.durationSeconds })),
    totalTalkgroups: CompanyRows.filter((r) => r.talkgroupsTotal > 0).map((r) => ({ name: r.name, value: r.talkgroupsTotal })),
    totalUsers: CompanyRows.filter((r) => r.usersTotal > 0).map((r) => ({ name: r.name, value: r.usersTotal })),
    calls: CompanyRows.filter((r) => r.calls > 0).map((r) => ({ name: r.name, value: r.calls })),
    talkgroupsUsed: CompanyRows.filter((r) => r.talkgroupsUsed > 0).map((r) => ({ name: r.name, value: r.talkgroupsUsed })),
    callingUsers: CompanyRows.filter((r) => r.callingUsers > 0).map((r) => ({ name: r.name, value: r.callingUsers })),
  };

  const monthlyCompanyRows = useMemo(() => {
    const selectedCompanies = filters.company.length ? [...filters.company].sort((a, b) => a.localeCompare(b)) : rankings.company.map((r) => r.name).sort((a, b) => a.localeCompare(b));
    const allowedCompanies = new Set(selectedCompanies);
    const groupByWeek = filters.month.length === 1;
    const periods = groupByWeek ? uniqueOptions(filtered, (r) => r.week).sort((a, b) => weekSortValue(a) - weekSortValue(b) || a.localeCompare(b)) : rankings.month.map((r) => r.name).sort((a, b) => monthSortValue(a) - monthSortValue(b) || a.localeCompare(b));
    const map = new Map<string, { period: string; company: string; calls: number; durationSeconds: number; sort: number }>();
    filtered.forEach((r) => {
      if (!allowedCompanies.has(r.company)) return;
      const period = groupByWeek ? r.week : r.month;
      const key = `${period}||${r.company}`;
      const cur = map.get(key) ?? { period, company: r.company, calls: 0, durationSeconds: 0, sort: groupByWeek ? weekSortValue(period) : monthSortValue(period) };
      cur.calls += 1; cur.durationSeconds += r.durationSeconds; map.set(key, cur);
    });
    return periods.flatMap((period) => selectedCompanies.map((company, ci) => {
      const row = map.get(`${period}||${company}`) ?? { period, company, calls: 0, durationSeconds: 0, sort: groupByWeek ? weekSortValue(period) : monthSortValue(period) };
      const isMiddle = ci === Math.floor((selectedCompanies.length - 1) / 2);
      return { ...row, companyLabel: truncateLabel(company, 18), periodLabel: isMiddle ? (groupByWeek ? period : shortMonthLabel(period)) : "", periodType: groupByWeek ? "Week" : "Month" };
    }));
  }, [filtered, filters.company, filters.month, rankings.company, rankings.month]);

  const peakHour = [...rankings.hour].sort((a, b) => b.calls - a.calls)[0];
  const peakTrafficHour = [...rankings.hour].sort((a, b) => b.trafficHours - a.trafficHours)[0];
  const topCompany = rankings.company[0];
  const topStation = rankings.station[0];
  const topTalkgroup = rankings.talkgroup[0];
  const peakRadioEntry = modeBy(filtered, (r) => r.radioId);
  const peakUserEntry = modeBy(filtered, (r) => `${r.employeeName}||${r.employeeId}||${r.company}`);
  const peakUserParts = `${peakUserEntry?.[0] ?? "Unknown||Unknown||Unknown"}`.split("||");
  const peakMonthEntry = modeBy(filtered, (r) => r.month);
  const peakWeekEntry = modeBy(filtered, (r) => weekLabelFromDate(r.callDate) !== "Unknown" ? weekLabelFromDate(r.callDate) : r.week);
  const peakDayEntry = modeBy(filtered, (r) => r.callDate);
  const maxDuration = filtered.reduce((max, r) => Math.max(max, r.durationSeconds), 0);
  const minDuration = filtered.reduce((min, r) => { if (r.durationSeconds <= 0) return min; return min === 0 ? r.durationSeconds : Math.min(min, r.durationSeconds); }, 0);
  const peakHourAvgDuration = peakHour?.calls ? peakHour.durationSeconds / peakHour.calls : 0;
  const filteredShare = records.length ? (filtered.length / records.length) * 100 : 0;

  const qualityIssues = useMemo(() => {
    const total = records.length || 1;
    const mc = records.filter((r) => r.company === "Unknown").length;
    const ms = records.filter((r) => r.baseStation === "Unknown").length;
    const md = records.filter((r) => r.durationSeconds <= 0).length;
    const mr = records.filter((r) => r.radioId === "Unknown").length;
    return [{ name: "Missing company", count: mc, pct: (mc / total) * 100 }, { name: "Missing station", count: ms, pct: (ms / total) * 100 }, { name: "Missing duration", count: md, pct: (md / total) * 100 }, { name: "Missing radio", count: mr, pct: (mr / total) * 100 }];
  }, [records]);
  const qualityScore = Math.max(0, 100 - qualityIssues.reduce((s, i) => s + i.pct, 0));

  const cdrSummaryRows = useMemo<(string | number)[][]>(() => [
    ["Total calls", formatNumber(metrics.totalCalls)],
    ["Traffic hours", formatDecimal(metrics.trafficHours, 2)],
    ["Total duration", secondsToClock(metrics.totalDuration)],
    ["Average duration", secondsToClock(metrics.averageDuration)],
    ["Active radios", formatNumber(metrics.radios)],
    ["Companies", formatNumber(metrics.companies)],
    ["Regions", formatNumber(metrics.regions)],
    ["Base stations", formatNumber(metrics.stations)],
    ["Talkgroups", formatNumber(metrics.talkgroups)],
    ["Period", CompanyPeriodLabel],
    ["Top company", topCompany?.name ?? ""],
    ["Peak hour", peakHour?.name ?? ""],
  ], [CompanyPeriodLabel, metrics, peakHour, topCompany]);
  const recordExportHeaders = ["SN", "Radio ID", "Radio Alias", "Mobile Type", "Employee Name", "Employee ID", "Region", "Company", "Talkgroup Alias", "Start Time", "End Time", "Duration (s)", "Caller Base Station"];
  const buildFilteredRecordRows = useCallback(() => filtered.map((r, i) => [i + 1, r.radioId, r.radioAlias, r.mobileType, r.employeeName, r.employeeId, r.region, r.company, r.talkgroup, r.startTime, r.endTime, r.durationSeconds, r.baseStation]), [filtered]);

  const exportRows = useCallback(() => {
    const rows = buildFilteredRecordRows();
    downloadText("premium-cdr-filtered-records.csv", [[exportTitle("Filtered Calls Register")], [], recordExportHeaders, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n"));
  }, [buildFilteredRecordRows, exportTitle]);

  const exportRowsXlsx = useCallback(() => {
    void (async () => {
      const workbook = new ExcelJS.Workbook(); workbook.creator = "CDR Dashboard";
      const border = { top: { style: "thin" as const }, left: { style: "thin" as const }, bottom: { style: "thin" as const }, right: { style: "thin" as const } };
      const titleFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FF1F4E79" } };
      const headerFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFFFFF00" } };
      const styleSheet = (sheet: ExcelJS.Worksheet, titleRows = 1) => { sheet.eachRow((row, rn) => { row.height = rn <= titleRows + 1 ? 24 : 18; row.eachCell((cell) => { cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }; cell.border = border; if (rn <= titleRows) { cell.font = { bold: true, color: { argb: "FFFFFFFF" } }; cell.fill = titleFill; } if (rn === titleRows + 1) { cell.font = { bold: true, color: { argb: "FF000000" } }; cell.fill = headerFill; } }); }); };
      const summarySheet = workbook.addWorksheet("CDR Summary", { views: [{ showGridLines: false }] });
      summarySheet.addRow([exportTitle("CDR Summary")]); summarySheet.mergeCells(1, 1, 1, 2);
      summarySheet.addRow(["Metric", "Value"]); cdrSummaryRows.forEach((row) => summarySheet.addRow(row));
      summarySheet.columns = [{ width: 24 }, { width: 38 }]; summarySheet.autoFilter = { from: "A2", to: "B2" }; styleSheet(summarySheet);
      const worksheet = workbook.addWorksheet("Filtered Calls Register", { views: [{ showGridLines: false }] });
      worksheet.addRow([exportTitle("Filtered Calls Register")]); worksheet.mergeCells(1, 1, 1, recordExportHeaders.length);
      worksheet.addRow(recordExportHeaders); buildFilteredRecordRows().forEach((r) => worksheet.addRow(r));
      worksheet.columns = [{ width: 8 }, { width: 14 }, { width: 18 }, { width: 24 }, { width: 24 }, { width: 14 }, { width: 14 }, { width: 22 }, { width: 24 }, { width: 22 }, { width: 22 }, { width: 14 }, { width: 26 }];
      worksheet.autoFilter = { from: "A2", to: `${excelColumnName(recordExportHeaders.length)}2` }; styleSheet(worksheet);
      applyWorkbookArabicSupport(workbook);
      const buffer = await workbook.xlsx.writeBuffer();
      downloadBlob("premium-cdr-filtered-records.xlsx", new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    })();
  }, [buildFilteredRecordRows, cdrSummaryRows, exportTitle]);
  const exportUnmatchedFleetmapXlsx = useCallback(() => {
    const headers = ["Caller Number", "Caller Alias", "Talkgroup", "Call Count", "Total Duration", "First Seen", "Last Seen", "Base Stations", "Reason"];
    downloadWorkbookData(
      `unmatched-fleetmap-report-${fileSlug(CompanyPeriodLabel)}.xlsx`,
      "Unmatched Fleetmap",
      exportTitle("Unmatched Fleetmap Report"),
      {
        headers,
        rows: unmatchedFleetmapReportRows.map((row) => [
          row.callerNumber,
          row.callerAlias,
          row.talkgroup,
          row.calls,
          secondsToClock(row.totalDuration),
          row.firstSeen,
          row.lastSeen,
          row.baseStationsText,
          row.reason,
        ]),
      }
    );
  }, [CompanyPeriodLabel, exportTitle, unmatchedFleetmapReportRows]);

  const exportRowsPdfPage = useCallback(() => {
    void (async () => {
      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      await ensurePdfArabicFont(pdf);
      const pageWidth = pdf.internal.pageSize.getWidth(); const margin = 18; const tableWidth = pageWidth - margin * 2;
      const colWeights = [0.42, 0.78, 0.9, 1.18, 1.18, 0.78, 0.78, 1.05, 1.15, 0.95, 0.95, 0.65, 1.18];
      const totalWeight = colWeights.reduce((s, w) => s + w, 0); const colWidths = colWeights.map((w) => tableWidth * w / totalWeight);
      const rows = pagedRecords.map((r, i) => [(page - 1) * 50 + i + 1, r.radioId, r.radioAlias, r.mobileType, r.employeeName, r.employeeId, r.region, r.company, r.talkgroup, r.startTime, r.endTime, r.durationSeconds, r.baseStation]);
      const allRows = [recordExportHeaders, ...rows]; let y = 34;
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(14); pdfText(pdf, `${exportTitle("Filtered Calls Register")} - Page ${page}`, pageWidth / 2, 22, { align: "center" });
      const summaryCols = 4; const summaryGap = 4; const summaryCellWidth = (tableWidth - summaryGap * (summaryCols - 1)) / summaryCols; const summaryRowHeight = 18;
      cdrSummaryRows.forEach((row, index) => { const col = index % summaryCols; const rowIndex = Math.floor(index / summaryCols); const x = margin + col * (summaryCellWidth + summaryGap); const sy = y + rowIndex * summaryRowHeight; pdf.setDrawColor(20, 36, 48); pdf.setFillColor("#ffffff"); pdf.rect(x, sy, summaryCellWidth, summaryRowHeight, "FD"); pdf.setFillColor("#fff200"); pdf.rect(x, sy, summaryCellWidth * 0.45, summaryRowHeight, "FD"); pdf.setFont("helvetica", "bold"); pdf.setFontSize(6.5); pdf.setTextColor(0, 0, 0); pdfText(pdf, row[0], x + 4, sy + 11.5, { maxWidth: summaryCellWidth * 0.45 - 8 }); pdf.setFont("helvetica", "normal"); pdf.setFontSize(6.5); pdfText(pdf, row[1], x + summaryCellWidth * 0.45 + 4, sy + 11.5, { maxWidth: summaryCellWidth * 0.55 - 8 }); });
      y += Math.ceil(cdrSummaryRows.length / summaryCols) * summaryRowHeight + 10; const rowHeight = 8.5;
      allRows.forEach((row, ri) => { let x = margin; row.forEach((cell, ci) => { const width = colWidths[ci]; pdf.setDrawColor(20, 36, 48); pdf.setFillColor(ri === 0 ? "#fff200" : "#ffffff"); pdf.rect(x, y, width, rowHeight, "FD"); pdf.setFont("helvetica", ri === 0 ? "bold" : "normal"); pdf.setFontSize(ri === 0 ? 4.2 : 4.35); pdf.setTextColor(0, 0, 0); pdfText(pdf, cell, x + width / 2, y + 6, { align: "center", maxWidth: width - 2 }); x += width; }); y += rowHeight; });
      pdf.save(`premium-cdr-filtered-records-page-${page}.pdf`);
    })();
  }, [cdrSummaryRows, exportTitle, page, pagedRecords]);
  const exportUtilizationXlsx = useCallback(() => {
    void (async () => {
      const workbook = new ExcelJS.Workbook(); workbook.creator = "CDR Dashboard";
      const border = { top: { style: "thin" as const }, left: { style: "thin" as const }, bottom: { style: "thin" as const }, right: { style: "thin" as const } };
      const headerFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFFFFF00" } };
      const styleSheet = (sheet: ExcelJS.Worksheet) => { sheet.eachRow((row, rn) => row.eachCell((cell) => { cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }; cell.border = border; if (rn <= 2) { cell.font = { bold: true, color: { argb: "FF000000" } }; cell.fill = headerFill; } })); };
      const radios = workbook.addWorksheet("Top Radios", { views: [{ showGridLines: false }] });
      radios.addRow([exportTitle("Top Radios")]); radios.mergeCells(1, 1, 1, 5);
      radios.addRow(["Radio ID & Alias", "Employee Name", "Company", "Total Calls", "Total Duration"]);
      topRadioUsers.forEach((item) => radios.addRow([`${item.radioId} - ${item.radioAlias}`, item.employeeName, item.company, item.calls, secondsToClock(item.durationSeconds)]));
      radios.columns = [{ width: 28 }, { width: 26 }, { width: 22 }, { width: 14 }, { width: 16 }]; styleSheet(radios);
      const users = workbook.addWorksheet("Top Users", { views: [{ showGridLines: false }] });
      users.addRow([exportTitle("Top Users")]); users.mergeCells(1, 1, 1, 3);
      users.addRow(["User", "Total Calls", "Total Duration"]);
      rankings.user.slice(0, 10).forEach((item) => users.addRow([item.name, item.calls, secondsToClock(item.durationSeconds)]));
      users.columns = [{ width: 42 }, { width: 14 }, { width: 16 }]; styleSheet(users);
      const buffer = await workbook.xlsx.writeBuffer();
      downloadBlob("top-radios-users.xlsx", new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    })();
  }, [exportTitle, rankings.user, topRadioUsers]);

  const exportUtilizationPdf = useCallback(() => {
    const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth(); const margin = 24;
    const drawTable = (title: string, headers: string[], rows: (string | number)[][], startY: number, widths: number[]) => {
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(13);
      pdfText(pdf, title, pageWidth / 2, startY, { align: "center" });
      let y = startY + 16;
      const tableW = widths.reduce((s, w) => s + w, 0); const startX = (pageWidth - tableW) / 2; const rowHeight = 18;
      [headers, ...rows].forEach((row, ri) => {
        let x = startX;
        row.forEach((cell, ci) => {
          const width = widths[ci];
          pdf.setDrawColor(20, 36, 48); pdf.setFillColor(ri === 0 ? "#fff200" : "#ffffff");
          pdf.rect(x, y, width, rowHeight, "FD");
          pdf.setFont("helvetica", ri === 0 ? "bold" : "normal"); pdf.setFontSize(ri === 0 ? 7 : 7.5); pdf.setTextColor(0, 0, 0);
          pdfText(pdf, cell, x + width / 2, y + 12, { align: "center", maxWidth: width - 4 });
          x += width;
        });
        y += rowHeight;
      });
      return y;
    };
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(16);
    pdfText(pdf, exportTitle("Top radios and employee utilization"), pageWidth / 2, 26, { align: "center" });
    const nextY = drawTable("Top Radios", ["Radio ID & Alias", "Employee Name", "Company", "Total Calls", "Total Duration"], topRadioUsers.map((item) => [`${item.radioId} - ${item.radioAlias}`, item.employeeName, item.company, formatNumber(item.calls), secondsToClock(item.durationSeconds)]), 52, [170, 160, 130, 80, 95]);
    drawTable("Top Users", ["User", "Total Calls", "Total Duration"], rankings.user.slice(0, 10).map((item) => [item.name, formatNumber(item.calls), secondsToClock(item.durationSeconds)]), nextY + 28, [360, 95, 110]);
    pdf.save("top-radios-users.pdf");
  }, [exportTitle, rankings.user, topRadioUsers]);

  const monthlyCompanyPivot = useMemo(() => {
    const companies = [...new Set(monthlyCompanyRows.map((r) => r.company))].sort((a, b) => a.localeCompare(b));
    const periods = [...new Set(monthlyCompanyRows.map((r) => r.period))].sort((a, b) => {
      const ft = monthlyCompanyRows.find((r) => r.period === a)?.periodType;
      return ft === "Week" ? weekSortValue(a) - weekSortValue(b) || a.localeCompare(b) : monthSortValue(a) - monthSortValue(b) || a.localeCompare(b);
    });
    const periodType = monthlyCompanyRows[0]?.periodType ?? "Period";
    const byKey = new Map(monthlyCompanyRows.map((r) => [`${r.period}||${r.company}`, r]));
    const totals = new Map(companies.map((c) => [c, { calls: 0, durationSeconds: 0 }]));
    const rows = periods.map((period) => {
      const values = companies.map((company) => {
        const row = byKey.get(`${period}||${company}`);
        const total = totals.get(company);
        if (total && row) { total.calls += row.calls; total.durationSeconds += row.durationSeconds; }
        return { calls: row?.calls ?? 0, durationSeconds: row?.durationSeconds ?? 0 };
      });
      return { period, label: periodType === "Week" ? period : shortMonthLabel(period), values };
    });
    return { companies, periodType, rows, totals };
  }, [monthlyCompanyRows]);

  const monthlyCompanyChartData = useMemo(() => {
    return monthlyCompanyRows.map((r) => ({ category: `${r.periodType === "Week" ? r.period : shortMonthLabel(r.period)} - ${r.company}`, company: r.company, period: r.period, calls: r.calls, durationSeconds: r.durationSeconds })).filter((r) => r.calls > 0 || r.durationSeconds > 0);
  }, [monthlyCompanyRows]);

  const patchWorkbookWithNativeChart = useCallback(async (buffer: ExcelJS.Buffer) => {
    const zip = await JSZip.loadAsync(buffer);
    const lastRow = Math.max(2, monthlyCompanyChartData.length + 1);
    const categoriesRef = `'ChartData'!$A$2:$A$${lastRow}`;
    const callsRef = `'ChartData'!$B$2:$B$${lastRow}`;
    const durationRef = `'ChartData'!$C$2:$C$${lastRow}`;
    const chartXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><c:date1904 val="0"/><c:lang val="en-US"/><c:roundedCorners val="0"/><c:chart><c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" b="1" sz="1400"/><a:t>${escapeXml(exportTitle("Calls and Duration per Company"))}</a:t></a:r></a:p></c:rich></c:tx><c:layout/></c:title><c:plotArea><c:layout/><c:barChart><c:barDir val="col"/><c:grouping val="clustered"/><c:varyColors val="0"/><c:ser><c:idx val="0"/><c:order val="0"/><c:tx><c:v>Calls</c:v></c:tx><c:spPr><a:solidFill><a:srgbClr val="2D86B4"/></a:solidFill></c:spPr><c:cat><c:strRef><c:f>${categoriesRef}</c:f></c:strRef></c:cat><c:val><c:numRef><c:f>${callsRef}</c:f></c:numRef></c:val></c:ser><c:ser><c:idx val="1"/><c:order val="1"/><c:tx><c:v>Duration Seconds</c:v></c:tx><c:spPr><a:solidFill><a:srgbClr val="8FD0E8"/></a:solidFill></c:spPr><c:cat><c:strRef><c:f>${categoriesRef}</c:f></c:strRef></c:cat><c:val><c:numRef><c:f>${durationRef}</c:f></c:numRef></c:val></c:ser><c:axId val="12345678"/><c:axId val="12345679"/></c:barChart><c:catAx><c:axId val="12345678"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:tickLblPos val="low"/><c:crossAx val="12345679"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/></c:catAx><c:valAx><c:axId val="12345679"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:majorGridlines/><c:numFmt formatCode="#,##0" sourceLinked="0"/><c:tickLblPos val="nextTo"/><c:crossAx val="12345678"/><c:crosses val="autoZero"/><c:crossBetween val="between"/></c:valAx></c:plotArea><c:legend><c:legendPos val="b"/><c:layout/><c:overlay val="0"/></c:legend><c:plotVisOnly val="1"/></c:chart></c:chartSpace>`;
    const drawingXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><xdr:twoCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${monthlyCompanyPivot.rows.length + 5}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>12</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${monthlyCompanyPivot.rows.length + 25}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="2" name="Calls Duration Chart"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rId1"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor></xdr:wsDr>`;
    zip.file("xl/charts/chart1.xml", chartXml);
    zip.file("xl/drawings/drawing1.xml", drawingXml);
    zip.file("xl/drawings/_rels/drawing1.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart1.xml"/></Relationships>`);
    const sheetRelPath = "xl/worksheets/_rels/sheet1.xml.rels";
    const sheetRelXml = await zip.file(sheetRelPath)?.async("string");
    const nextRid = sheetRelXml ? `rId${(sheetRelXml.match(/Id="rId\d+"/g)?.length ?? 0) + 1}` : "rId1";
    const drawingRel = `<Relationship Id="${nextRid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>`;
    zip.file(sheetRelPath, sheetRelXml ? sheetRelXml.replace("</Relationships>", `${drawingRel}</Relationships>`) : `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${drawingRel}</Relationships>`);
    const sheetXml = await zip.file("xl/worksheets/sheet1.xml")?.async("string");
    if (sheetXml) {
      const withNs = sheetXml.includes("xmlns:r=") ? sheetXml : sheetXml.replace("<worksheet ", '<worksheet xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ');
      zip.file("xl/worksheets/sheet1.xml", withNs.replace("</worksheet>", `<drawing r:id="${nextRid}"/></worksheet>`));
    }
    const contentTypes = await zip.file("[Content_Types].xml")?.async("string");
    if (contentTypes) {
      let next = contentTypes;
      if (!next.includes('/xl/charts/chart1.xml')) next = next.replace("</Types>", '<Override PartName="/xl/charts/chart1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/></Types>');
      if (!next.includes('/xl/drawings/drawing1.xml')) next = next.replace("</Types>", '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>');
      zip.file("[Content_Types].xml", next);
    }
    return zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }, [exportTitle, monthlyCompanyChartData, monthlyCompanyPivot.rows.length]);

  const monthlyCompanyTableHtml = useCallback(() => {
    const { companies, periodType, rows, totals } = monthlyCompanyPivot;
    const bodyRows = rows.map((row) => `<tr><th>${htmlEscape(row.label)}</th>${row.values.map((v) => `<td>${formatNumber(v.calls)}</td><td>${formatNumber(v.durationSeconds)}</td>`).join("")}</tr>`).join("");
    const totalCells = companies.map((c) => { const t = totals.get(c) ?? { calls: 0, durationSeconds: 0 }; return `<td>${formatNumber(t.calls)}</td><td>${formatNumber(t.durationSeconds)}</td>`; }).join("");
    return `<table><thead><tr><th class="period">Period</th>${companies.map((c) => `<th colspan="2">${htmlEscape(c)}</th>`).join("")}</tr><tr><th>${htmlEscape(periodType === "Week" ? "Week" : "Month Year")}</th>${companies.map(() => "<th>Calls</th><th>Duration</th>").join("")}</tr></thead><tbody>${bodyRows}</tbody><tfoot><tr><th>Total</th>${totalCells}</tr></tfoot></table>`;
  }, [monthlyCompanyPivot]);

  const captureMonthlyCompanyChart = useCallback(async () => {
    const chart = monthlyCompanyChartRef.current?.querySelector(".recharts-wrapper") as HTMLElement | null;
    if (!chart) throw new Error("Chart is not ready yet.");
    return captureElementPng(chart, "#0f1b24");
  }, []);

  const monthlyCompanyChartHtml = useCallback(() => monthlyCompanyChartRef.current?.querySelector(".recharts-wrapper")?.outerHTML ?? "", []);

  const monthlyCompanyExportHtml = useCallback((autoPrint = false) => {
    return `<!doctype html><html><head><title>${htmlEscape(exportTitle("No. of Calls and Duration per Company"))}</title><style>body{margin:0;padding:18px;font-family:Arial,sans-serif;background:#f4f6f8;color:#050505}h1{margin:0 0 12px;text-align:center;font-size:22px}.table-wrap{overflow:auto;border:1px solid #111;background:#fff}table{width:max-content;min-width:100%;border-collapse:collapse;table-layout:auto}th,td{border:1px solid #111;padding:6px 8px;text-align:center;white-space:nowrap}thead th{background:#fff;font-weight:800}thead tr:first-child th{font-size:16px}tbody th,tfoot th{background:#f8fafc;font-weight:800}tfoot td,tfoot th{background:#fff200;font-weight:900}.period{width:120px}.chart-wrap{margin-top:22px;padding:14px;background:#0f1b24;border:1px solid #111;overflow:auto}.chart-wrap svg{max-width:100%;height:auto}</style></head><body><h1>${htmlEscape(exportTitle("No. of Calls and Duration per Company"))}</h1><div class="table-wrap">${monthlyCompanyTableHtml()}</div><div class="chart-wrap">${monthlyCompanyChartHtml()}</div>${autoPrint ? "<script>window.onload=()=>setTimeout(()=>window.print(),250);</script>" : ""}</body></html>`;
  }, [exportTitle, monthlyCompanyChartHtml, monthlyCompanyTableHtml]);

  const exportMonthlyCompanyXlsx = useCallback(async () => {
    const { companies, periodType, rows, totals } = monthlyCompanyPivot;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Calls Duration Pivot", { views: [{ showGridLines: false }] });
    const chartData = workbook.addWorksheet("ChartData", { state: "hidden" });
    const headerFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFFFFF00" } };
    const border = { top: { style: "thin" as const }, left: { style: "thin" as const }, bottom: { style: "thin" as const }, right: { style: "thin" as const } };
    worksheet.addRow([exportTitle("Calls and Duration per Company")]); worksheet.mergeCells(1, 1, 1, 1 + companies.length * 2);
    worksheet.addRow(["Period", ...companies.flatMap((c) => [c, ""])]);
    worksheet.addRow([periodType === "Week" ? "Week" : "Month Year", ...companies.flatMap(() => ["Calls", "Duration"])]);
    companies.forEach((_, i) => worksheet.mergeCells(2, 2 + i * 2, 2, 3 + i * 2));
    rows.forEach((row) => worksheet.addRow([row.label, ...row.values.flatMap((v) => [v.calls, v.durationSeconds])]));
    worksheet.addRow(["Total", ...companies.flatMap((c) => { const t = totals.get(c) ?? { calls: 0, durationSeconds: 0 }; return [t.calls, t.durationSeconds]; })]);
    worksheet.eachRow((row, rn) => { row.eachCell((cell) => { cell.alignment = { horizontal: "center", vertical: "middle" }; cell.border = border; if (rn <= 3 || rn === rows.length + 4) { cell.font = { bold: true }; cell.fill = rn === rows.length + 4 || rn === 1 ? headerFill : undefined; } }); });
    worksheet.columns = [{ width: 16 }, ...companies.flatMap((c) => [{ width: Math.max(12, c.length + 3) }, { width: 14 }])];
    chartData.addRow(["Category", "Calls", "Duration Seconds"]);
    monthlyCompanyChartData.forEach((r) => chartData.addRow([r.category, r.calls, r.durationSeconds]));
    chartData.columns = [{ width: 34 }, { width: 14 }, { width: 18 }];
    const buffer = await workbook.xlsx.writeBuffer();
    const patched = await patchWorkbookWithNativeChart(buffer);
    downloadBlob("calls-duration-per-company.xlsx", patched);
  }, [exportTitle, monthlyCompanyChartData, monthlyCompanyPivot, patchWorkbookWithNativeChart]);

  const exportMonthlyCompanyPdf = useCallback(() => {
    const { companies, periodType, rows, totals } = monthlyCompanyPivot;
    void (async () => {
      const chartPng = await captureMonthlyCompanyChart();
      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth(); const pageHeight = pdf.internal.pageSize.getHeight(); const margin = 24;
      const totalCols = 1 + companies.length * 2; const cellW = Math.min(86, (pageWidth - margin * 2) / totalCols);
      const tableW = cellW * totalCols; const startX = (pageWidth - tableW) / 2; const rowH = 28;
      let y = 58;
      const drawCell = (text: string, x: number, cy: number, w: number, h: number, fill?: string, bold = false) => {
        if (fill) { pdf.setFillColor(fill); pdf.rect(x, cy, w, h, "F"); }
        pdf.setDrawColor(0); pdf.rect(x, cy, w, h);
        pdf.setFont("helvetica", bold ? "bold" : "normal"); pdf.setFontSize(8);
        pdfText(pdf, text, x + w / 2, cy + h / 2 + 3, { align: "center", maxWidth: w - 4 });
      };
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(16);
      pdfText(pdf, exportTitle("Calls and Duration per Company"), pageWidth / 2, 30, { align: "center" });
      drawCell("Period", startX, y, cellW, rowH, "#fff200", true);
      companies.forEach((c, i) => drawCell(c, startX + cellW + i * cellW * 2, y, cellW * 2, rowH, "#fff200", true));
      y += rowH;
      drawCell(periodType === "Week" ? "Week" : "Month Year", startX, y, cellW, rowH, "#fff200", true);
      companies.forEach((_, i) => { drawCell("Calls", startX + cellW + i * cellW * 2, y, cellW, rowH, "#ffffff", true); drawCell("Duration", startX + cellW * 2 + i * cellW * 2, y, cellW, rowH, "#ffffff", true); });
      y += rowH;
      rows.forEach((row) => {
        if (y + rowH > pageHeight - margin) { pdf.addPage("a4", "landscape"); y = margin; }
        drawCell(row.label, startX, y, cellW, rowH, "#f8fafc", true);
        row.values.forEach((v, i) => { drawCell(formatNumber(v.calls), startX + cellW + i * cellW * 2, y, cellW, rowH); drawCell(formatNumber(v.durationSeconds), startX + cellW * 2 + i * cellW * 2, y, cellW, rowH); });
        y += rowH;
      });
      drawCell("Total", startX, y, cellW, rowH, "#fff200", true);
      companies.forEach((c, i) => { const t = totals.get(c) ?? { calls: 0, durationSeconds: 0 }; drawCell(formatNumber(t.calls), startX + cellW + i * cellW * 2, y, cellW, rowH, "#fff200", true); drawCell(formatNumber(t.durationSeconds), startX + cellW * 2 + i * cellW * 2, y, cellW, rowH, "#fff200", true); });
      const tableBottom = y + rowH; const gap = 18;
      const props = pdf.getImageProperties(chartPng);
      const remainingHeight = pageHeight - tableBottom - gap - margin;
      const samePage = remainingHeight >= 170;
      if (!samePage) pdf.addPage("a4", "landscape");
      const chartTop = samePage ? tableBottom + gap : margin;
      const maxW = pageWidth - margin * 2; const maxH = samePage ? remainingHeight : pageHeight - margin * 2;
      const ratio = Math.min(maxW / props.width, maxH / props.height);
      pdf.addImage(chartPng, "PNG", (pageWidth - props.width * ratio) / 2, samePage ? chartTop : (pageHeight - props.height * ratio) / 2, props.width * ratio, props.height * ratio);
      pdf.save("calls-duration-per-company.pdf");
    })();
  }, [captureMonthlyCompanyChart, exportTitle, monthlyCompanyPivot]);

  const exportMonthlyCompanyPpt = useCallback(() => {
    void (async () => {
      const { companies, periodType, rows, totals } = monthlyCompanyPivot;
      const pptx = new pptxgen(); pptx.layout = "LAYOUT_WIDE"; pptx.author = "CDR Dashboard"; pptx.rtlMode = true;
      const tableSlide = pptx.addSlide();
      tableSlide.addText(exportTitle("Calls and Duration per Company - Table"), pptTextOptions(exportTitle("Calls and Duration per Company - Table"), { x: 0.3, y: 0.18, w: 12.7, h: 0.35, fontSize: 18, bold: true, align: "center", color: "111111" }));
      const pptRows = [["Period", ...companies.flatMap((c) => [`${c} Calls`, `${c} Duration`])], ...rows.map((r) => [r.label, ...r.values.flatMap((v) => [formatNumber(v.calls), formatNumber(v.durationSeconds)])]), ["Total", ...companies.flatMap((c) => { const t = totals.get(c) ?? { calls: 0, durationSeconds: 0 }; return [formatNumber(t.calls), formatNumber(t.durationSeconds)]; })]];
      const tableX = 0.2; const tableY = 0.7; const tableW = 12.93; const colW = tableW / Math.max(1, pptRows[0].length); const rowH = Math.min(0.42, 6.45 / Math.max(1, pptRows.length));
      pptRows.forEach((row, ri) => { row.forEach((cell, ci) => { const isH = ri === 0 || ri === pptRows.length - 1; tableSlide.addShape(pptx.ShapeType.rect, { x: tableX + ci * colW, y: tableY + ri * rowH, w: colW, h: rowH, fill: { color: isH ? "FFF200" : "FFFFFF" }, line: { color: "111111", width: 0.5 } }); tableSlide.addText(cell, pptTextOptions(cell, { x: tableX + ci * colW + 0.01, y: tableY + ri * rowH + 0.02, w: colW - 0.02, h: rowH - 0.04, fontSize: ri === 0 ? 5.7 : 6.3, bold: isH, align: "center", valign: "mid", color: "111111", fit: "shrink", margin: 0 })); }); });
      const chartSlide = pptx.addSlide();
      chartSlide.addText(exportTitle("Calls and Duration per Company - Chart"), pptTextOptions(exportTitle("Calls and Duration per Company - Chart"), { x: 0.3, y: 0.18, w: 12.7, h: 0.35, fontSize: 18, bold: true, align: "center", color: "111111" }));
      chartSlide.addChart("bar", [{ name: "Calls", labels: monthlyCompanyChartData.map((r) => r.category), values: monthlyCompanyChartData.map((r) => r.calls) }, { name: "Duration Seconds", labels: monthlyCompanyChartData.map((r) => r.category), values: monthlyCompanyChartData.map((r) => r.durationSeconds) }], { x: 0.45, y: 0.75, w: 12.4, h: 6.25, showLegend: true, showTitle: false, catAxisLabelRotate: 270, valAxisLabelColor: "111111", catAxisLabelColor: "111111", chartColors: ["2D86B4", "8FD0E8"] });
      await pptx.writeFile({ fileName: "calls-duration-per-company.pptx" });
    })();
  }, [exportTitle, monthlyCompanyChartData, monthlyCompanyPivot]);

  const openMonthlyCompanyTable = useCallback(() => {
    const w = window.open("", "cdr-monthly-company-table", "width=1400,height=800,scrollbars=yes,resizable=yes");
    if (!w) return;
    w.document.open(); w.document.write(monthlyCompanyExportHtml(false)); w.document.close(); w.focus();
  }, [monthlyCompanyExportHtml]);

  const chartExportDatasets = useMemo<Record<string, ChartExportDataset>>(() => {
    const valueDataset = (headers: string[], rows: { name: string; value: number }[]): ChartExportDataset => ({ headers, rows: rows.map((r) => [r.name, r.value]) });
    const rankingDataset = (rows: Ranking[]): ChartExportDataset => ({ headers: ["Name", "Calls", "Duration Seconds", "Traffic Hours", "Radios"], rows: rows.map((r) => [r.name, r.calls, r.durationSeconds, formatDecimal(r.trafficHours, 3), r.radios]) });
    const mobileDataset = (rows: Record<string, string | number>[], firstColumn: string): ChartExportDataset => ({ headers: [firstColumn, "Total Radios", ...mobileTypes], rows: rows.map((r) => [`${r.name}`, Number(r.total ?? 0), ...mobileTypes.map((type) => Number(r[mobileTypeKey(type)] ?? 0))]) });
    return {
      "KPI Average Duration per Company": { headers: ["Company", "KPI Avg Duration per Activated User (sec)", "Users Activated", "Calling Users"], rows: kpiRows.map((r) => [r.company, formatDecimal(r.kpiAvgDurationPerUser, 2), r.usersActivated, r.callingUsers]) },
      "KPI Calls and Duration per Company": { headers: ["Company", "Calls", "Duration Seconds", "Duration"], rows: kpiRows.map((r) => [r.company, r.calls, r.durationSeconds, secondsToClock(r.durationSeconds)]) },
      "Monthly KPI": { headers: ["Company", ...monthlyKpi.months.map((m) => shortMonthLabel(m.name))], rows: monthlyKpi.rows.map((r) => [`${r.company}`, ...monthlyKpi.months.map((m) => r[m.key] == null ? "" : Number(r[m.key]))]) },
      "KPI Total Avg. Duration": valueDataset(["Month", "Avg Duration per Call (sec)"], monthlyKpiPieData),
      "Company Calls & Duration Performance": { headers: ["Company", "Calls", "Duration Seconds", "Duration", "Avg Duration per Call"], rows: CompanyRows.map((r) => [r.name, r.calls, r.durationSeconds, secondsToClock(r.durationSeconds), secondsToClock(r.calls ? r.durationSeconds / r.calls : 0)]) },
      "Total Calls per Company": valueDataset(["Company", "Calls"], CompanyChartData.calls),
      "Total Duration per Company": { headers: ["Company", "Duration Seconds", "Duration"], rows: CompanyChartData.duration.map((r) => [r.name, r.value, secondsToClock(r.value)]) },
      "Talkgroups per Company": { headers: ["Company", "Total Talkgroups", "Used Talkgroups"], rows: CompanyRows.map((r) => [r.name, r.talkgroupsTotal, r.talkgroupsUsed]) },
      "Radios per Company": { headers: ["Company", "Total Radios", "Radios Made Calls"], rows: CompanyRows.map((r) => [r.name, r.usersTotal, r.callingUsers]) },
      "Radios Type per Company": mobileDataset(mobileTypeByCompany, "Company"),
      "Calls and Duration per Company": { headers: ["Period", "Company", "Calls", "Duration Seconds", "Duration"], rows: monthlyCompanyRows.map((r) => [r.period, r.company, r.calls, r.durationSeconds, secondsToClock(r.durationSeconds)]) },
      "Monthly Performance": rankingDataset(rankings.month),
      "Radios per Month": { headers: ["Month", "Radios", "Share"], rows: radioMonths.map((r) => [r.name, r.radios, formatPercent(r.share, 2)]) },
      "Radio Type per Month": mobileDataset(mobileTypeByMonth, "Month"),
      "Region  Performance": rankingDataset(rankings.region),
      "Calls per Month": rankingDataset(rankings.month),
      "Base Station Performance": rankingDataset(rankings.station.slice(0, 12)),
      "Talkgroup Performance": rankingDataset(rankings.talkgroup.slice(0, 12)),
      "Radio Type Performance": rankingDataset(rankings.mobileType),
      "Hour Performance": rankingDataset(rankings.hour),
      "Busy-hour profile": rankingDataset(rankings.hour),
      "Top Companies by Calls": rankingDataset(rankings.company.slice(0, 10)),
      "Top Base Stations by Calls": rankingDataset(rankings.station.slice(0, 10)),
      "Top Talkgroups by Calls": rankingDataset(rankings.talkgroup.slice(0, 10)),
    };
  }, [CompanyChartData.calls, CompanyChartData.duration, CompanyRows, kpiRows, mobileTypeByCompany, mobileTypeByMonth, mobileTypes, monthlyCompanyRows, monthlyKpi.months, monthlyKpi.rows, monthlyKpiPieData, rankings.company, rankings.hour, rankings.mobileType, rankings.month, rankings.region, rankings.station, rankings.talkgroup, radioMonths]);

  useEffect(() => {
    if (!data) return;
    const cards = Array.from(document.querySelectorAll<HTMLElement>(".app-shell .chart-card"));
    const buttons: HTMLButtonElement[] = [];
    const titleRows: HTMLElement[] = [];
    cards.forEach((card) => {
      if (card.querySelector(".chart-export-actions")) return;
      const heading = card.querySelector<HTMLElement>("h3");
      const title = heading?.textContent?.trim() || "Dashboard Card";
      if (!heading) return;
      const titleRow = document.createElement("div"); titleRow.className = "chart-card-title-row";
      const actions = document.createElement("div"); actions.className = "chart-export-actions";
      card.insertBefore(titleRow, heading); titleRow.appendChild(heading); titleRow.appendChild(actions); titleRows.push(titleRow);
      const dataset = chartExportDatasets[title];
      if (dataset) { const xlsxButton = document.createElement("button"); xlsxButton.type = "button"; xlsxButton.className = "button small quick-card-export quick-card-export-xlsx"; xlsxButton.innerHTML = `${exportIconSvg("xlsx")}<span>XLSX</span>`; xlsxButton.title = `Export ${title} data`; xlsxButton.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); downloadWorkbookData(`${fileSlug(exportTitle(title))}.xlsx`, title, exportTitle(title), dataset); }); actions.appendChild(xlsxButton); buttons.push(xlsxButton); }
      const button = document.createElement("button"); button.type = "button"; button.className = "button small quick-card-export"; button.innerHTML = `${exportIconSvg("png")}<span>PNG</span>`; button.title = `Export ${title}`;
      button.addEventListener("click", async (e) => { e.preventDefault(); e.stopPropagation(); const exportButtons = Array.from(card.querySelectorAll<HTMLElement>(".quick-card-export")); exportButtons.forEach((b) => { b.style.visibility = "hidden"; }); try { await new Promise((resolve) => requestAnimationFrame(resolve)); const image = await captureElementPng(card, "#0f1b24"); downloadDataUrl(`${fileSlug(exportTitle(title))}.png`, image); } finally { exportButtons.forEach((b) => { b.style.visibility = ""; }); } });
      actions.appendChild(button); buttons.push(button);
    });
    return () => { buttons.forEach((b) => b.remove()); titleRows.forEach((row) => { const heading = row.querySelector("h3"); if (heading && row.parentElement) row.parentElement.insertBefore(heading, row); row.remove(); }); };
  }, [CompanyPeriodLabel, chartExportDatasets, data, exportTitle, filtered.length, page]);
  if (!data) return (
    <UploadView
      onUploadCdr={handleUpload}
      onUploadRawSystem={handleRawSystemUpload}
      onUploadMasterFleetmap={handleUploadMasterFleetmap}
      onUploadFixedFleetmap={handleUploadFixedFleetmap}
      onLoadSaved={handleLoadSavedWorkbook}
      savedWorkbook={savedWorkbook}
      masterFleetmap={masterFleetmap}
      fixedFleetmap={fixedFleetmap}
      isParsing={isParsing}
      isLoadingSaved={isLoadingSaved}
      error={error}
      theme={theme}
      onToggleTheme={toggleTheme}
    />
  );

  const showOverviewTab = activeTab === "overview";
  const showFleetTab = activeTab === "fleet";
  const showRegionTab = activeTab === "region";
  const showCompanyTab = activeTab === "company";
  const showKpiTab = activeTab === "kpi";
  const showReportsTab = activeTab === "reports";

  return (
    <main className={`app-shell ${themeClass(theme)} active-tab-${activeTab}`}>
      <section className="cdr-command-shell">
        <header className="topbar followup-style-topbar cdr-navy-banner">
          <div className="cdr-banner-art" aria-hidden="true">
            <svg className="cdr-banner-svg" viewBox="0 0 1440 132" preserveAspectRatio="none">
              <defs>
                <pattern id="cdr-risk-dot-grid" width="34" height="24" patternUnits="userSpaceOnUse">
                  <circle cx="3" cy="3" r="1.15" fill="rgba(118,178,255,0.38)" />
                </pattern>
                <filter id="cdr-risk-soft-glow" x="-80%" y="-80%" width="260%" height="260%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <radialGradient id="cdr-risk-left-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.54" />
                  <stop offset="42%" stopColor="#0ea5e9" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="cdr-risk-right-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#fb7185" stopOpacity="0.60" />
                  <stop offset="44%" stopColor="#ef4444" stopOpacity="0.34" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="cdr-risk-blue-wave" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.82" />
                  <stop offset="48%" stopColor="#0284c7" stopOpacity="0.58" />
                  <stop offset="100%" stopColor="#00ced1" stopOpacity="0.18" />
                </linearGradient>
                <linearGradient id="cdr-risk-teal-wave" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#00ced1" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.12" />
                </linearGradient>
                <linearGradient id="cdr-risk-red-wave" x1="1" y1="0" x2="0" y2="0">
                  <stop offset="0%" stopColor="#f87171" stopOpacity="0.78" />
                  <stop offset="48%" stopColor="#b91c1c" stopOpacity="0.54" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.16" />
                </linearGradient>
                <linearGradient id="cdr-risk-frame" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#00ced1" stopOpacity="0" />
                  <stop offset="14%" stopColor="#00ced1" stopOpacity="0.72" />
                  <stop offset="44%" stopColor="#38bdf8" stopOpacity="0.18" />
                  <stop offset="58%" stopColor="#38bdf8" stopOpacity="0.18" />
                  <stop offset="86%" stopColor="#ef4444" stopOpacity="0.64" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                </linearGradient>
              </defs>

              <rect x="0" y="0" width="1440" height="132" fill="url(#cdr-risk-dot-grid)" opacity="0.42" />
              <ellipse cx="74" cy="66" rx="170" ry="92" fill="url(#cdr-risk-left-glow)" opacity="0.92" />
              <ellipse cx="1366" cy="66" rx="170" ry="92" fill="url(#cdr-risk-right-glow)" opacity="0.96" />

              <g className="cdr-risk-frame-lines" filter="url(#cdr-risk-soft-glow)">
                <line x1="0" y1="25" x2="408" y2="25" stroke="url(#cdr-risk-frame)" strokeWidth="1.7" opacity="0.88" />
                <line x1="1032" y1="25" x2="1440" y2="25" stroke="url(#cdr-risk-frame)" strokeWidth="1.7" opacity="0.76" />
                <line x1="0" y1="118" x2="408" y2="118" stroke="rgba(0,206,209,0.24)" strokeWidth="1.3" opacity="0.80" />
                <line x1="1032" y1="118" x2="1440" y2="118" stroke="rgba(239,68,68,0.24)" strokeWidth="1.3" opacity="0.80" />
              </g>

              <g className="cdr-risk-blue-waves" fill="none" strokeLinecap="round" filter="url(#cdr-risk-soft-glow)">
                <path d="M-24 87 C94 54 144 101 246 70 S390 60 548 88" stroke="url(#cdr-risk-blue-wave)" strokeWidth="3" opacity="0.92" />
                <path d="M-34 105 C88 84 144 123 248 92 S414 84 548 106" stroke="url(#cdr-risk-teal-wave)" strokeWidth="2" opacity="0.82" />
                <path d="M88 66 C184 46 264 44 348 63 S450 78 536 61" stroke="#0ea5e9" strokeWidth="2.2" opacity="0.72" />
              </g>

              <g className="cdr-risk-red-waves" fill="none" strokeLinecap="round" filter="url(#cdr-risk-soft-glow)">
                <path d="M1464 87 C1346 54 1296 101 1194 70 S1050 60 892 88" stroke="url(#cdr-risk-red-wave)" strokeWidth="3" opacity="0.88" />
                <path d="M1474 105 C1352 84 1296 123 1192 92 S1026 84 892 106" stroke="#7f1d1d" strokeWidth="2" opacity="0.56" />
                <path d="M1352 66 C1256 46 1176 44 1092 63 S990 78 904 61" stroke="#ef4444" strokeWidth="2.2" opacity="0.68" />
              </g>

              <g className="cdr-risk-shield" transform="translate(780 8) scale(0.5)" filter="url(#cdr-risk-soft-glow)">
                <path d="M10 0 L30 8 V22 C30 38 21 48 10 55 C-1 48 -10 38 -10 22 V8 Z" fill="rgba(5,22,55,0.80)" stroke="rgba(0,206,209,0.66)" strokeWidth="1.5" />
                <path d="M3 24 l5 5 10 -14" fill="none" stroke="rgba(0,206,209,0.92)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </g>

              <g className="cdr-risk-bar-chart" transform="translate(585 104)" opacity="0.60">
                <rect x="0" y="-28" width="7" height="28" rx="2" fill="#0ea5e9" />
                <rect x="13" y="-40" width="7" height="40" rx="2" fill="#0284c7" />
                <rect x="26" y="-54" width="7" height="54" rx="2" fill="#075985" />
              </g>

              <g className="cdr-risk-donut" transform="translate(820 111)" opacity="0.48">
                <circle cx="0" cy="0" r="21" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="11" />
                <path d="M0 -21 A21 21 0 0 1 20 7" fill="none" stroke="#ef4444" strokeWidth="11" strokeLinecap="round" />
                <path d="M20 7 A21 21 0 0 1 -11 18" fill="none" stroke="#0ea5e9" strokeWidth="11" strokeLinecap="round" />
              </g>

              <g className="cdr-risk-circuit" fill="none" strokeWidth="1.4" opacity="0.70">
                <path d="M70 25 h330" stroke="rgba(0,206,209,0.42)" />
                <path d="M1040 25 h330" stroke="rgba(239,68,68,0.34)" />
                <circle cx="68" cy="25" r="5" fill="none" stroke="#00ced1" />
                <circle cx="68" cy="25" r="2" fill="#00ced1" />
                <circle cx="1372" cy="25" r="5" fill="none" stroke="#ef4444" />
                <circle cx="1372" cy="25" r="2" fill="#ef4444" />
              </g>
            </svg>
          </div>
          <div className="followup-header-badge followup-header-badge-left">
            <img src="/assets/se-logo.png" alt="Saudi Energy" />
          </div>

          <div className="followup-dashboard-title">
            <h1>CDR Traffic Dashboard</h1>
            <p>CALL DETAIL RECORD ANALYTICS</p>
          </div>

          <div className="followup-header-badge followup-header-badge-right">
            <img src="/assets/nasco-logo.png" alt="NASCO" />
          </div>
        </header>

        <div className="cdr-banner-control-bar">
          <div className="cdr-control-actions" aria-label="Dashboard quick actions">
            <button className="button small theme-toggle cdr-action-pill cdr-action-primary" type="button" onClick={toggleTheme}>
              <Palette size={18} /> {isDark ? "Light Theme" : "Dark Theme"}
            </button>
            <button className="button small cdr-action-pill" type="button" onClick={() => { setData(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
              <Home size={18} /> Home
            </button>
            <button className="button small cdr-action-pill" type="button" onClick={() => { setActiveTab("region"); window.setTimeout(() => document.getElementById("regionPerformance")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80); }}>
              <UploadCloud size={18} /> Add Region ({formatNumber(metrics.regions)})
            </button>
            <label className="button small cdr-action-pill cdr-action-file" title="Add new workbook files to the current dashboard">
              <RefreshCw size={18} /> New workbook(s)
              <input type="file" accept=".xlsx,.xls,.xlsm,.xlsb" multiple onChange={handleAddMoreCdr} />
            </label>
            <button className="button small cdr-action-pill cdr-action-primary" type="button" onClick={exportKpiPdf}>
              <FileText size={18} /> Dashboard PDF
            </button>
          </div>
        </div>

      <nav className="dashboard-tabs" aria-label="Dashboard tabs">
        {DASHBOARD_TABS.map((tab) => (
          <button
            key={tab.id}
            className={`dashboard-tab ${activeTab === tab.id ? "active" : ""}`}
            type="button"
            onClick={() => { setActiveTab(tab.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <section id="filters" className="filters-panel">
        <label className="search-box search-compact">
          <span>Search Radio / User</span>
          <Search size={16} />
          <input value={filters.search} onChange={(e) => { setFilters((c) => ({ ...c, search: e.target.value })); setPage(1); }} placeholder="Radio ID, alias, user, employee ID" />
        </label>
        <MultiSelectFilter className="filter-compact" label="Region" value={filters.region} options={options.region} onChange={(region) => { setFilters((c) => ({ ...c, region })); setPage(1); }} />
        <MultiSelectFilter className="filter-compact" label="Year" value={filters.year} options={options.year} onChange={(year) => { setFilters((c) => ({ ...c, year })); setPage(1); }} />
        <MultiSelectFilter className="filter-compact" label="Month" value={filters.month} options={options.month} onChange={(month) => { setFilters((c) => ({ ...c, month })); setPage(1); }} />
        <MultiSelectFilter className="filter-company" label="Company" value={filters.company} options={options.company} onChange={(company) => { setFilters((c) => ({ ...c, company })); setPage(1); }} />
        <MultiSelectFilter className="filter-xwide" label="Base Station" value={filters.baseStation} options={options.baseStation} onChange={(baseStation) => { setFilters((c) => ({ ...c, baseStation })); setPage(1); }} />
        <MultiSelectFilter className="filter-wide" label="Talkgroup" value={filters.talkgroup} options={options.talkgroup} optionLabels={talkgroupLabels} onChange={(talkgroup) => { setFilters((c) => ({ ...c, talkgroup })); setPage(1); }} />
        <button className="button reset-filter-button" onClick={() => { setFilters(EMPTY_FILTERS); setPage(1); }}><X size={16} /> Reset Filters</button>
        <span className="filter-count">{formatNumber(filtered.length)} from {formatNumber(records.length)} - {formatPercent(filteredShare)}</span>
      </section>

      </section>

      <section id="command" className="hero-panel">
        <div className="hero-main hero-main-with-icon">
          <img className="hero-call-icon" src="/assets/call.png" alt="Calls under analysis" />
          <div className="hero-profile-copy">
            <p className="eyebrow">Live workbook profile</p>
            <h2>{formatNumber(metrics.totalCalls)}</h2>
            <p className="hero-subtitle">calls under analysis</p>
          </div>
        </div>
        <div className="workbook-card">
          <ShieldCheck size={28} />
          <span>Workbook</span>
          <strong>{data.fileName}</strong>
          <p>{formatNumber(data.rawRows)} records - loaded {data.loadedAt}</p>
          {data.cdrSources.length > 1 && (
            <ul className="cdr-sources-list">
              {data.cdrSources.map((src, i) => (
                <li key={`${src.fileName}-${i}`}><strong>{src.fileName}</strong> - {formatNumber(src.recordCount)} rows</li>
              ))}
            </ul>
          )}
          {(masterFleetmap.meta || fixedFleetmap.meta) && (
            <p className="fleetmap-status">
              Fleetmap: {masterFleetmap.meta ? `Master (${formatNumber(masterFleetmap.records.length)})` : "-"}
              {" + "}
              {fixedFleetmap.meta ? `Fixed (${formatNumber(fixedFleetmap.records.length)})` : "-"}
            </p>
          )}
        </div>
      </section>

      {data.warnings.length > 0 && (
        <div className="warning-strip"><AlertTriangle size={18} /> {data.warnings.join(" ")}</div>
      )}

      {showReportsTab && (
      <section id="reportsTabPanel" className="reports-tab-panel">
        <article className="table-card export-center-card">
          <h3>Reports & Export Center</h3>
          <p className="table-note">Export the current filtered dashboard view, KPI data, row register, utilization analysis, and unmatched fleetmap report.</p>
          <div className="export-center-actions">
            <ExportButton kind="xlsx" label="CDR Report" onClick={exportRowsXlsx} />
            <ExportButton kind="pdf" label="CDR Report" onClick={exportRowsPdfPage} />
            <ExportButton kind="xlsx" label="KPI Report" onClick={exportKpiXlsx} />
            <ExportButton kind="pdf" label="KPI Report" onClick={exportKpiPdf} />
            <ExportButton kind="ppt" label="KPI Report" onClick={exportKpiPpt} />
            <ExportButton kind="xlsx" label="Utilization Report" onClick={exportUtilizationXlsx} />
            <ExportButton kind="pdf" label="Utilization Report" onClick={exportUtilizationPdf} />
            <ExportButton kind="xlsx" label="Unmatched Report" onClick={exportUnmatchedFleetmapXlsx} />
          </div>
        </article>
      </section>
      )}

      {showOverviewTab && (
      <>
      <section className="summary-cards summary-cards-arranged summary-cards-manual-rows summary-cards-10-layout">
        {/* Row 1: first 10 cards */}
        <div className="summary-card-row summary-card-row-10">
          <div className="summary-card yellow summary-card-primary"><span>Total Calls</span><strong>{formatNumber(metrics.totalCalls)}</strong><small>Filtered result</small></div>
          <div className="summary-card green"><span>Regions</span><strong>{formatNumber(metrics.regions)}</strong><small>Geographic coverage</small></div>
          <div className="summary-card yellow"><span>Companies</span><strong>{formatNumber(metrics.companies)}</strong><small>Business coverage</small></div>
          <div className="summary-card green"><span>Radios</span><strong>{formatNumber(metrics.radios)}</strong><small>Active radio users</small></div>
          <div className="summary-card green"><span>Talkgroups</span><strong>{formatNumber(metrics.talkgroups)}</strong><small>Used groups</small></div>
          <div className="summary-card yellow"><span>Base Stations</span><strong>{formatNumber(metrics.stations)}</strong><small>Network sites</small></div>
          <div className="summary-card green"><span>Total Duration</span><strong>{secondsToClock(metrics.totalDuration)}</strong><small>Filtered result</small></div>
          <div className="summary-card yellow"><span>Average Duration</span><strong>{secondsToClock(metrics.averageDuration)}</strong><small>Per call</small></div>
          <div className="summary-card yellow"><span>Max Duration</span><strong>{secondsToClock(maxDuration)}</strong><small>Longest call</small></div>
          <div className="summary-card green"><span>Min Duration</span><strong>{secondsToClock(minDuration)}</strong><small>Shortest call</small></div>
        </div>

        {/* Row 2: next 8 cards */}
        <div className="summary-card-row summary-card-row-8">
          <div className="summary-card yellow"><span>Peak Radio</span><strong>{peakRadioEntry?.[0] ?? "--"}</strong><small>Most active radio</small></div>
          <div className="summary-card green"><span>Peak User Name</span><strong>{peakUserParts[0] ?? "--"}</strong><small>Most active user</small></div>
          <div className="summary-card yellow"><span>Peak User ID</span><strong>{peakUserParts[1] ?? "--"}</strong><small>User identifier</small></div>
          <div className="summary-card yellow"><span>Peak User Company</span><strong>{peakUserParts[2] ?? "--"}</strong><small>User company</small></div>
          <div className="summary-card green"><span>Peak Company</span><strong>{topCompany?.name ?? "--"}</strong><small>Most calls</small></div>
          <div className="summary-card yellow"><span>Peak Talkgroup</span><strong>{topTalkgroup?.name ?? "--"}</strong><small>Most calls</small></div>
          <div className="summary-card green"><span>Peak Base Station</span><strong>{topStation?.name ?? "--"}</strong><small>Most calls</small></div>
          <div className="summary-card yellow"><span>Peak Month</span><strong>{peakMonthEntry?.[0] ?? "--"}</strong><small>Highest calls</small></div>
        </div>

        {/* Row 3: remaining 7 cards */}
        <div className="summary-card-row summary-card-row-7">
          <div className="summary-card green"><span>Peak Week</span><strong>{peakWeekEntry?.[0] ?? "--"}</strong><small>Highest calls</small></div>
          <div className="summary-card yellow"><span>Peak Day</span><strong>{peakDayEntry?.[0] ?? "--"}</strong><small>Highest calls</small></div>
          <div className="summary-card yellow"><span>Busy Hour</span><strong>{peakHour?.name ?? "--"}</strong><small>Highest calls</small></div>
          <div className="summary-card yellow"><span>Peak Hour Calls</span><strong>{formatNumber(peakHour?.calls ?? 0)}</strong><small>Busy hour volume</small></div>
          <div className="summary-card green"><span>Traffic (Erlangs)</span><strong>{formatDecimal(metrics.trafficHours, 1)}</strong><small>Total traffic</small></div>
          <div className="summary-card green"><span>Peak Traffic (Erlangs)</span><strong>{formatDecimal(peakTrafficHour?.trafficHours ?? 0, 1)}</strong><small>Highest traffic hour</small></div>
          <div className="summary-card green"><span>Peak Hour Avg Duration</span><strong>{formatDecimal(peakHourAvgDuration, 1)}</strong><small>Seconds per call</small></div>
        </div>
      </section>

      <section className="data-quality-panel" aria-label="Data quality and filter health">
        <div className="quality-score-card">
          <span>Data Quality Score</span>
          <strong>{formatDecimal(qualityScore, 1)}%</strong>
          <small>{formatNumber(records.length)} source rows checked</small>
        </div>
        <div className="quality-issue-grid">
          {qualityIssues.map((issue) => (
            <div className="quality-issue" key={issue.name}>
              <span>{issue.name}</span>
              <strong>{formatNumber(issue.count)}</strong>
              <small>{formatDecimal(issue.pct, 1)}%</small>
            </div>
          ))}
        </div>
      </section>

      {filtered.length === 0 && (
        <div className="empty-state" role="status">
          <Search size={34} />
          <strong>No records found</strong>
          <span>Try changing or resetting your filters.</span>
        </div>
      )}
      </>
      )}

      {showFleetTab && (
      <>
      <SectionTitle id="networkUtilization" eyebrow="Fleet activation" title={`Network Utilization & Fleet Activation in ${CompanyPeriodLabel}`} text="Compare registered fleetmap radios against radios that made calls in the filtered period." collapsed={isSectionCollapsed("networkUtilization")} onToggle={() => toggleSection("networkUtilization")} />
      <section id="networkUtilization-content" className={`network-utilization-section ${isSectionCollapsed("networkUtilization") ? "section-content-collapsed" : ""}`}>
        <div className="summary-cards network-utilization-cards">
          <div className="summary-card yellow"><span>Registered Radios</span><strong>{formatNumber(fleetActivation.registeredCount)}</strong><small>From fleetmap</small></div>
          <div className="summary-card green"><span>Active Registered</span><strong>{formatNumber(fleetActivation.activeRegisteredCount)}</strong><small>Made calls</small></div>
          <div className="summary-card yellow"><span>Inactive Radios</span><strong>{formatNumber(fleetActivation.inactiveCount)}</strong><small>No calls found</small></div>
          <div className="summary-card green"><span>Activation %</span><strong>{formatDecimal(fleetActivation.activationRate, 1)}%</strong><small>Active / registered</small></div>
          <div className="summary-card yellow"><span>Traffic / Active Radio</span><strong>{formatDecimal(trafficIntensity.trafficPerRadio, 2)}</strong><small>Erlangs per radio</small></div>
        </div>
        <div className="quality-grid">
          <article className="table-card inactive-radio-table-card">
            <h3>Inactive Radios by Company</h3>
            <table className="inactive-radio-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th className="inactive-count-header">Inactive Radios</th>
                  <th className="active-count-header">Active Radios</th>
                </tr>
              </thead>
              <tbody>
                {fleetActivation.inactiveByCompany.map((item) => (
                  <tr key={item.name}>
                    <td>{item.name}</td>
                    <td className="inactive-count-cell">{formatNumber(Number(item.count ?? 0))}</td>
                    <td className="active-count-cell">{formatNumber(Number(item.activeCount ?? 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
          <article className="table-card inactive-radio-table-card">
            <h3>Inactive Radios by Region</h3>
            <table className="inactive-radio-table">
              <thead>
                <tr>
                  <th>Region</th>
                  <th className="inactive-count-header">Inactive Radios</th>
                  <th className="active-count-header">Active Radios</th>
                </tr>
              </thead>
              <tbody>
                {fleetActivation.inactiveByRegion.map((item) => (
                  <tr key={item.name}>
                    <td>{item.name}</td>
                    <td className="inactive-count-cell">{formatNumber(Number(item.count ?? 0))}</td>
                    <td className="active-count-cell">{formatNumber(Number(item.activeCount ?? 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        </div>
      </section>

      <SectionTitle
        id="unmatchedFleetmap"
        eyebrow="Fleetmap audit"
        title={`Unmatched Fleetmap Report in ${CompanyPeriodLabel}`}
        text="Unique raw Caller Numbers that did not match Master/Fixed Fleetmap Radio ID, or matched with incomplete fleetmap details."
        collapsed={isSectionCollapsed("unmatchedFleetmap")}
        onToggle={() => toggleSection("unmatchedFleetmap")}
        actions={<ExportButton kind="xlsx" label="Export Report" onClick={exportUnmatchedFleetmapXlsx} />}
      />
      <section id="unmatchedFleetmap-content" className={`unmatched-fleetmap-report-section ${isSectionCollapsed("unmatchedFleetmap") ? "section-content-collapsed" : ""}`}>
        <article className="table-card wide-table-card unmatched-fleetmap-report-card">
          <h3>Unmatched Raw Caller Numbers</h3>
          <p className="table-note">
            {unmatchedFleetmapReportRows.length
              ? `${formatNumber(unmatchedFleetmapReportRows.length)} unique Caller Number(s) need fleetmap review.`
              : "No unmatched Caller Numbers found in the current selected period."}
          </p>
          <div className="table-wrap unmatched-fleetmap-table-wrap">
            <table className="unmatched-fleetmap-table">
              <thead>
                <tr>
                  <th>Caller Number</th>
                  <th>Caller Alias</th>
                  <th>Talkgroup</th>
                  <th>Calls</th>
                  <th>Total Duration</th>
                  <th>First Seen</th>
                  <th>Last Seen</th>
                  <th>Base Stations</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {unmatchedFleetmapReportRows.length ? unmatchedFleetmapReportRows.map((row) => (
                  <tr key={row.callerNumber}>
                    <td>{row.callerNumber}</td>
                    <td>{row.callerAlias}</td>
                    <td>{row.talkgroup}</td>
                    <td>{formatNumber(row.calls)}</td>
                    <td>{secondsToClock(row.totalDuration)}</td>
                    <td>{row.firstSeen}</td>
                    <td>{row.lastSeen}</td>
                    <td>{row.baseStationsText}</td>
                    <td>{row.reason}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={9}>All raw Caller Numbers are matched to the Master/Fixed Fleetmap for the current filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>
      </>
      )}

      {showRegionTab && (
      <>
      <SectionTitle id="regionPerformance" eyebrow="Regional deck" title={`Region Performance in ${CompanyPeriodLabel}`} text="Compare regional calls, duration, traffic, active radios, talkgroups, companies, and peak operating periods." collapsed={isSectionCollapsed("regionPerformance")} onToggle={() => toggleSection("regionPerformance")} />
      <section id="regionPerformance-content" className={`region-performance-section ${isSectionCollapsed("regionPerformance") ? "section-content-collapsed" : ""}`}>
        <article className="table-card wide-table-card">
          <h3>Region Performance Matrix</h3>
          <div className="records-scroll small">
            <table>
              <thead><tr><th>Region</th><th>Calls</th><th>Total Duration</th><th>Traffic</th><th>Active Radios</th><th>Talkgroups</th><th>Companies</th><th>Base Stations</th><th>Avg Duration</th><th>Peak Hour</th><th>Top Company</th></tr></thead>
              <tbody>{regionPerformanceRows.map((row) => <tr key={row.name}><td>{row.name}</td><td>{formatNumber(row.calls)}</td><td>{secondsToClock(row.durationSeconds)}</td><td>{formatDecimal(row.trafficHours, 2)}</td><td>{formatNumber(row.radios)}</td><td>{formatNumber(row.talkgroups)}</td><td>{formatNumber(row.companies)}</td><td>{formatNumber(row.stations)}</td><td>{secondsToClock(row.averageDuration)}</td><td>{row.peakHour}</td><td>{row.topCompany}</td></tr>)}</tbody>
            </table>
          </div>
        </article>
      </section>

      <SectionTitle id="trafficIntensity" eyebrow="Traffic deck" title={`Busy Hour & Traffic Intensity in ${CompanyPeriodLabel}`} text="Show when the network is busiest and how much traffic each operational dimension carries." collapsed={isSectionCollapsed("trafficIntensity")} onToggle={() => toggleSection("trafficIntensity")} />
      <section id="trafficIntensity-content" className={`traffic-intensity-section ${isSectionCollapsed("trafficIntensity") ? "section-content-collapsed" : ""}`}>
        <div className="summary-cards traffic-intensity-cards">
          <div className="summary-card yellow"><span>Busy Traffic Hour</span><strong>{trafficIntensity.busyTrafficHour?.name ?? "--"}</strong><small>Highest Erlangs</small></div>
          <div className="summary-card green"><span>Busy Hour Traffic</span><strong>{formatDecimal(trafficIntensity.busyTrafficHour?.trafficHours ?? 0, 2)}</strong><small>Erlangs</small></div>
          <div className="summary-card yellow"><span>Traffic / Talkgroup</span><strong>{formatDecimal(trafficIntensity.trafficPerTalkgroup, 2)}</strong><small>Erlangs</small></div>
          <div className="summary-card green"><span>Traffic / Company</span><strong>{formatDecimal(trafficIntensity.trafficPerCompany, 2)}</strong><small>Erlangs</small></div>
          <div className="summary-card yellow"><span>Traffic / Region</span><strong>{formatDecimal(trafficIntensity.trafficPerRegion, 2)}</strong><small>Erlangs</small></div>
        </div>
        <article className="table-card wide-table-card">
          <h3>Region x Hour Busy Map</h3>
          <div className="heatmap-scroll">
            <table className="busy-heatmap-table">
              <thead><tr><th>Region</th>{heatmapHours.map((hour) => <th key={hour}>{hour}</th>)}<th>Total</th></tr></thead>
              <tbody>{regionHourHeatmap.map((row) => <tr key={row.region}><td>{row.region}</td>{row.cells.map((value, index) => <td key={`${row.region}-${heatmapHours[index]}`}><span className="busy-heat-cell" style={{ opacity: Math.max(0.18, value / heatmapMax) }}>{formatNumber(value)}</span></td>)}<td>{formatNumber(row.total)}</td></tr>)}</tbody>
            </table>
          </div>
        </article>
      </section>
      </>
      )}

      {showCompanyTab && (
      <>
      <SectionTitle id="talkgroupEfficiency" eyebrow="Talkgroup deck" title={`Talkgroup Efficiency in ${CompanyPeriodLabel}`} text="Rank talkgroups by traffic, active radios, active users, average duration, and peak operating context." collapsed={isSectionCollapsed("talkgroupEfficiency")} onToggle={() => toggleSection("talkgroupEfficiency")} />
      <section id="talkgroupEfficiency-content" className={`talkgroup-efficiency-section ${isSectionCollapsed("talkgroupEfficiency") ? "section-content-collapsed" : ""}`}>
        <article className="table-card wide-table-card">
          <h3>Talkgroup Efficiency Matrix</h3>
          <div className="records-scroll small no-scroll-table fixed-row-table">
            <table>
              <thead><tr><th>Talkgroup</th><th>Calls</th><th>Duration</th><th>Traffic</th><th>Active Radios</th><th>Active Users</th><th>Avg Duration</th><th>Peak Hour</th><th>Peak Region</th><th>Peak Company</th></tr></thead>
              <tbody>{talkgroupEfficiencyRows.map((row) => <tr key={row.name}><td>{row.name}</td><td>{formatNumber(row.calls)}</td><td>{secondsToClock(row.durationSeconds)}</td><td>{formatDecimal(row.trafficHours, 2)}</td><td>{formatNumber(row.radios)}</td><td>{formatNumber(row.users)}</td><td>{secondsToClock(row.averageDuration)}</td><td>{row.peakHour}</td><td>{row.peakRegion}</td><td>{row.peakCompany}</td></tr>)}</tbody>
            </table>
          </div>
        </article>
      </section>
      </>
      )}

      {showKpiTab && (
      <>
      <SectionTitle id="kpi" eyebrow="KPI Metrics" title="KPI Measurements" collapsed={isSectionCollapsed("kpi")} onToggle={() => toggleSection("kpi")} />
      <section id="kpi-content" className={`kpi-grid ${isSectionCollapsed("kpi") ? "section-content-collapsed" : ""}`}>
        <article className="table-card kpi-table kpi-measurements-table-card">
          <h3>KPI Measurements</h3>
          <div className="records-scroll small" ref={kpiTableRef}>
            <table className="kpi-measurements-table">
              <colgroup>
                <col className="kpi-source-col" />
                <col className="kpi-small-col" />
                <col className="kpi-small-col" />
                <col className="kpi-medium-col" />
                <col className="kpi-medium-col" />
                <col className="kpi-medium-col" />
                <col className="kpi-medium-col" />
                <col className="kpi-wide-col" />
                <col className="kpi-tiny-col" />
              </colgroup>
              <thead><tr><th>Call Source</th><th>Talkgroups</th><th>Calls</th><th>Duration Sec</th><th>Duration</th><th>Users Activated</th><th>Calling Users</th><th>Avg Duration / User</th><th>KPI</th></tr></thead>
              <tbody>
                {kpiRows.map((row, i) => (
                  <tr key={row.company}>
                    <td>{row.company}</td><td>{formatNumber(row.talkgroupsInUse)}</td><td>{formatNumber(row.calls)}</td>
                    <td>{formatNumber(row.durationSeconds)}</td><td>{secondsToClock(row.durationSeconds)}</td>
                    <td>{formatNumber(row.usersActivated)}</td><td>{formatNumber(row.callingUsers)}</td>
                    <td>{formatNumber(row.kpiAvgDurationPerUser)}</td><td>{i === 0 ? formatNumber(kpiAverage) : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
        <article className="chart-card" ref={kpiAverageChartRef}>
          <h3>KPI Average Duration per Company</h3>
          <ResponsiveContainer width="100%" height={Math.max(340, kpiRows.length * 34)}>
            <BarChart layout="vertical" data={kpiRows} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" opacity={0.32} horizontal={false} />
              <XAxis type="number" tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} />
              <YAxis type="category" dataKey="company" width={140} tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} tickFormatter={(v) => truncateLabel(v, 18)} interval={0} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${formatDecimal(v, 1)} sec`, "KPI avg duration"]} />
              <Bar dataKey="kpiAvgDurationPerUser" fill={CHART_COLORS.calls}><LabelList dataKey="kpiAvgDurationPerUser" content={RightValueLabel} /></Bar>
            </BarChart>
          </ResponsiveContainer>
          <ChartLegend items={[{ name: "Average duration per activated user", color: CHART_COLORS.calls }]} />
        </article>
        <article className="chart-card" ref={kpiCallsDurationChartRef}>
          <h3>KPI Calls and Duration per Company</h3>
          <ResponsiveContainer width="100%" height={390}>
            <ComposedChart data={kpiRows} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" opacity={0.32} />
              <XAxis dataKey="company" tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} angle={-55} textAnchor="end" interval={0} tickMargin={12} height={128} tickFormatter={(v) => truncateLabel(v, 18)} />
              <YAxis yAxisId="calls" tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} />
              <YAxis yAxisId="duration" orientation="right" tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => formatNumber(v)} />
              <Line yAxisId="calls" dataKey="calls" stroke={CHART_COLORS.calls} strokeWidth={3} dot={{ r: 4, fill: CHART_COLORS.calls }} name="Calls"><LabelList dataKey="calls" content={KpiBarLabel} /></Line>
              <Line yAxisId="duration" dataKey="durationSeconds" stroke={CHART_COLORS.duration} strokeWidth={3} name="Duration seconds"><LabelList dataKey="durationSeconds" content={KpiLineLabel} /></Line>
            </ComposedChart>
          </ResponsiveContainer>
          <ChartLegend items={[{ name: "Calls", color: CHART_COLORS.calls }, { name: "Duration seconds", color: CHART_COLORS.duration }]} />
        </article>
        <article className="chart-card monthly-kpi-card" ref={monthlyKpiChartRef}>
          <h3>Monthly KPI</h3><p>(Avg. call duration per company) in sec</p>
          <ResponsiveContainer width="100%" height={430}>
            <LineChart data={monthlyKpi.rows} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" opacity={0.32} />
              <XAxis dataKey="company" tick={{ fill: CHART_COLORS.axis, fontSize: 11, fontWeight: 700 }} tickFormatter={(v) => truncateLabel(v, 22)} interval={0} angle={-35} textAnchor="end" tickMargin={12} height={82} />
              <YAxis tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} tickFormatter={(v) => `${formatDecimal(Number(v), 0)}s`} domain={[0, "dataMax + 20"]} label={{ value: "Average duration (sec)", angle: -90, position: "insideLeft", fill: CHART_COLORS.axis, fontSize: 12 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, name: string) => [v == null ? "" : `${formatDecimal(v, 2)} sec`, name]} />
              {monthlyKpi.months.map((month) => (
                <Line key={month.key} type="monotone" dataKey={month.key} name={shortMonthLabel(month.name)} stroke={month.color} strokeWidth={3} dot={{ r: 6 }} activeDot={{ r: 8 }} connectNulls={false}>
                  <LabelList dataKey={month.key} content={(props) => <PointValueLabel {...props} fill={month.color} />} />
                </Line>
              ))}
            </LineChart>
          </ResponsiveContainer>
          <div className="chart-legend">{monthlyKpi.months.map((m) => <span key={m.key}><i style={{ background: m.color }} />{shortMonthLabel(m.name)}</span>)}</div>
        </article>
        <article className="chart-card monthly-kpi-card" ref={kpiTotalAvgChartRef}>
          <h3>KPI Total Avg. Duration</h3><p>Average call duration by month in sec</p>
          <div className="Company-pie-layout">
            <ResponsiveContainer width="64%" height={430}>
              <PieChart margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
                <Pie data={monthlyKpiPieData} dataKey="value" nameKey="name" outerRadius={180} innerRadius={100} paddingAngle={2} label={PieDecimalLabel} labelLine={false}>
                  {monthlyKpiPieData.map((entry, i) => <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${formatDecimal(v, 2)} sec`, "Average duration"]} />
              </PieChart>
            </ResponsiveContainer>
            <ChartLegend className="pie-legend kpi-total-avg-legend" items={monthlyKpiPieData.map((item, i) => ({ name: item.name, color: COLORS[i % COLORS.length] }))} />
          </div>
        </article>
      </section>
      </>
      )}

      {showCompanyTab && (
      <>
      <SectionTitle id="Company" eyebrow="Company deck" title={`Company contribution in ${CompanyPeriodLabel}`} collapsed={isSectionCollapsed("Company")} onToggle={() => toggleSection("Company")} actions={<><ExportButton kind="view" label="View" onClick={openMonthlyCompanyTable} /><ExportButton kind="xlsx" label="XLSX" onClick={exportMonthlyCompanyXlsx} /><ExportButton kind="ppt" label="PPT" onClick={exportMonthlyCompanyPpt} /><ExportButton kind="pdf" label="PDF" onClick={exportMonthlyCompanyPdf} /></>} />
      <section id="Company-content" className={`chart-grid dashboard-chart-grid company-chart-grid ${isSectionCollapsed("Company") ? "section-content-collapsed" : ""}`}>
        <article className="chart-card Company-card company-talkgroups" style={{ minWidth: 0, overflow: "hidden" }}>
          <h3>Talkgroups per Company</h3>
          <p>Total {formatNumber(sumValues(CompanyChartData.totalTalkgroups))} &nbsp;-&nbsp; Used {formatNumber(sumValues(CompanyChartData.talkgroupsUsed))}</p>
          <ChartLegend items={[{ name: "Total talkgroups", color: CHART_COLORS.total }, { name: "Used talkgroups", color: CHART_COLORS.used }]} />
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={CompanyChartData.totalTalkgroups.map((item) => ({ name: item.name, total: item.value, used: CompanyChartData.talkgroupsUsed.find((u) => u.name === item.name)?.value ?? 0 }))} margin={{ left: 0, right: 0, top: 12, bottom: 0 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" opacity={0.32} vertical={false} />
              <XAxis dataKey="name" tick={{ fill: CHART_COLORS.axis, fontSize: 9 }} axisLine={false} tickLine={false} interval={0} angle={-45} textAnchor="end" height={40} tickMargin={0} tickFormatter={(v) => truncateLabel(v, 12)} />
              <YAxis tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatNumber(v)} domain={[0, (dm: number) => Math.ceil(dm * 1.35)]} allowDataOverflow={false} />
              <Tooltip content={<TalkgroupTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar dataKey="total" name="total" shape={(props: any) => <OverlayBarShape {...props} totalColor={CHART_COLORS.total} usedColor={CHART_COLORS.used} />}><LabelList dataKey="total" content={() => null} /></Bar>
            </BarChart>
          </ResponsiveContainer>
        </article>
        <article className="chart-card Company-card company-radios" style={{ minWidth: 0, overflow: "hidden" }}>
          <h3>Radios per Company</h3>
          <p>Total {formatNumber(sumValues(CompanyChartData.totalUsers))} &nbsp;-&nbsp; Made Calls {formatNumber(sumValues(CompanyChartData.callingUsers))}</p>
          <ChartLegend items={[{ name: "Total radios", color: CHART_COLORS.totalGreen }, { name: "Radios made calls", color: CHART_COLORS.usedGreen }]} />
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={CompanyChartData.totalUsers.map((item) => ({ name: item.name, total: item.value, used: CompanyChartData.callingUsers.find((u) => u.name === item.name)?.value ?? 0 }))} margin={{ left: 0, right: 0, top: 12, bottom: 0 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" opacity={0.32} vertical={false} />
              <XAxis dataKey="name" tick={{ fill: CHART_COLORS.axis, fontSize: 9 }} axisLine={false} tickLine={false} interval={0} angle={-45} textAnchor="end" height={40} tickMargin={0} tickFormatter={(v) => truncateLabel(v, 12)} />
              <YAxis tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatNumber(v)} domain={[0, (dm: number) => Math.ceil(dm * 1.35)]} allowDataOverflow={false} />
              <Tooltip content={<RadioTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar dataKey="total" name="total" shape={(props: any) => <OverlayBarShape {...props} totalColor={CHART_COLORS.totalGreen} usedColor={CHART_COLORS.usedGreen} />}><LabelList dataKey="total" content={() => null} /></Bar>
            </BarChart>
          </ResponsiveContainer>
        </article>
        <article className="chart-card Company-card company-radio-type" style={{ minWidth: 0, overflow: "hidden" }}>
          <h3>Radios Type per Company</h3>
          <p>Total radios {formatNumber(mobileTypeByCompany.reduce((s, r) => s + Number(r.total ?? 0), 0))}</p>
          <ChartLegend items={[{ name: "Total radios", color: CHART_COLORS.total }, ...mobileTypes.map((type) => ({ name: type, color: mobileTypeColor(type) }))]} />
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={mobileTypeByCompany} margin={{ left: 0, right: 0, top: 14, bottom: 0 }} barCategoryGap="14%" barGap={2}>
              <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" opacity={0.32} vertical={false} />
              <XAxis dataKey="name" tick={{ fill: CHART_COLORS.axis, fontSize: 9 }} axisLine={false} tickLine={false} interval={0} angle={-45} textAnchor="end" height={44} tickMargin={2} tickFormatter={(v) => truncateLabel(v, 12)} />
              <YAxis tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatNumber(v)} domain={[0, (dm: number) => Math.ceil(dm * 1.28)]} />
              <Tooltip content={(props) => <MobileTypeTooltip {...props} mobileTypes={mobileTypes} />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar dataKey="total" name="Total radios" maxBarSize={72} shape={(props: any) => <MobileTypeOverlayBarShape {...props} mobileTypes={mobileTypes} />}><LabelList dataKey="total" content={() => null} /></Bar>
            </BarChart>
          </ResponsiveContainer>
        </article>
        <article className="chart-card wide monthly-Company-card" ref={monthlyCompanyChartRef}>
          <h3>Calls and Duration per Company</h3>
          <div className="company-color-legend">
            {[...new Set(monthlyCompanyRows.map((r) => r.company))].map((company) => (
              <span key={company}><i style={{ background: companyColor(company) }} />{company}</span>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={430}>
            <BarChart data={monthlyCompanyRows} margin={{ left: 0, right: 0, top: 0, bottom: 0 }} barCategoryGap="20%">
              <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" opacity={0.32} />
              <XAxis xAxisId="company" dataKey="companyLabel" interval={0} angle={-90} textAnchor="end" height={112} tickMargin={8} tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} />
              <XAxis xAxisId="month" dataKey="periodLabel" interval={0} axisLine={false} tickLine={false} height={28} tick={{ fill: CHART_COLORS.axis, fontSize: 12, fontWeight: 700 }} />
              <YAxis yAxisId="duration" tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} tickFormatter={chartLabel} />
              <YAxis yAxisId="calls" orientation="right" tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} tickFormatter={chartLabel} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, name: string) => [formatNumber(v), name]} labelFormatter={(_, payload) => { const r = payload?.[0]?.payload; return r ? `${r.periodType} ${r.period} - ${r.company}` : ""; }} />
              <Bar xAxisId="company" yAxisId="duration" dataKey="durationSeconds" name="Duration (Sec)" maxBarSize={28}>
                {monthlyCompanyRows.map((entry) => <Cell key={`dur-${entry.period}-${entry.company}`} fill={companyMetricColor(entry.company, "duration")} />)}
                <LabelList dataKey="durationSeconds" content={TopValueLabel} />
              </Bar>
              <Bar xAxisId="company" yAxisId="calls" dataKey="calls" name="No. of Calls" maxBarSize={28}>
                {monthlyCompanyRows.map((entry) => <Cell key={`calls-${entry.period}-${entry.company}`} fill={companyMetricColor(entry.company, "calls")} />)}
                <LabelList dataKey="calls" content={(props) => <TopValueLabel {...props} />} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <ChartLegend items={[{ name: "Duration seconds", color: CHART_COLORS.duration }, { name: "No. of calls", color: CHART_COLORS.callsDeep }]} />
        </article>
      </section>
      </>
      )}

      {showKpiTab && (
      <>
      <SectionTitle id="Performance" eyebrow="Performance" title={`Calls & Duration Performance in ${CompanyPeriodLabel}`} collapsed={isSectionCollapsed("Performance")} onToggle={() => toggleSection("Performance")} />
      <section id="Performance-content" className={`chart-grid performance-chart-grid ${isSectionCollapsed("Performance") ? "section-content-collapsed" : ""}`}>
        <article className="chart-card performance-region"><CallsDurationPerformanceChart title="Regions Performance" data={rankings.region} gradientId="performanceRegion" /></article>
        <article className="chart-card performance-month"><CallsDurationPerformanceChart title="Monthly Performance" data={rankings.month} gradientId="performanceMonth" xTickFormatter={shortMonthLabel} /></article>
        <article className="chart-card performance-company"><CallsDurationPerformanceChart title="Companies Performance" data={rankings.company} gradientId="performanceCompany" /></article>
        <article className="chart-card performance-talkgroup"><CallsDurationPerformanceChart title="Talkgroups Performance" data={rankings.talkgroup.slice(0, 12)} gradientId="performanceTalkgroup" /></article>
        <article className="chart-card performance-basestation"><CallsDurationPerformanceChart title="Base Stations Performance" data={rankings.station.slice(0, 12)} gradientId="performanceStation" /></article>
        <article className="chart-card performance-hour"><CallsDurationPerformanceChart title="Hours Performance" data={rankings.hour} gradientId="performanceHour" xTickFormatter={(v) => `${v ?? ""}`} /></article>
      </section>

      <SectionTitle id="General" eyebrow="General" title={`General Charts in ${CompanyPeriodLabel}`} collapsed={isSectionCollapsed("General")} onToggle={() => toggleSection("General")} />
      <section id="General-content" className={`chart-grid dashboard-chart-grid general-chart-grid ${isSectionCollapsed("General") ? "section-content-collapsed" : ""}`}>
        <article className="chart-card general-mobile-type wide">
          <h3>Radio Type per Month</h3>
          <p>Total radios {formatNumber(mobileTypeByMonth.reduce((s, r) => s + Number(r.total ?? 0), 0))}</p>
          <ChartLegend items={[{ name: "Total radios", color: CHART_COLORS.total }, ...mobileTypes.map((type) => ({ name: type, color: mobileTypeColor(type) }))]} />
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={mobileTypeByMonth} margin={{ left: 0, right: 0, top: 14, bottom: 0 }} barCategoryGap="12%" barGap={2}>
              <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" opacity={0.32} vertical={false} />
              <XAxis dataKey="name" tick={{ fill: CHART_COLORS.axis, fontSize: 9 }} axisLine={false} tickLine={false} interval={0} angle={-35} textAnchor="end" height={52} tickMargin={8} tickFormatter={shortMonthLabel} />
              <YAxis tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatNumber(v)} domain={[0, (dm: number) => Math.ceil(dm * 1.28)]} />
              <Tooltip content={(props) => <MobileTypeTooltip {...props} mobileTypes={mobileTypes} />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar dataKey="total" name="Total radios" maxBarSize={72} shape={(props: any) => <MobileTypeOverlayBarShape {...props} mobileTypes={mobileTypes} />}><LabelList dataKey="total" content={() => null} /></Bar>
            </BarChart>
          </ResponsiveContainer>
        </article>
      </section>
      </>
      )}

      {showCompanyTab && (
      <>
      <SectionTitle id="Charts" eyebrow="Top 10" title={`Top 10 per Calls in ${CompanyPeriodLabel}`} collapsed={isSectionCollapsed("Charts")} onToggle={() => toggleSection("Charts")} />
      <section id="Charts-content" className={`chart-grid top-10-row ${isSectionCollapsed("Charts") ? "section-content-collapsed" : ""}`}>
        <article className="chart-card">
          <h3>Top Companies by Calls</h3>
          <ResponsiveContainer width="100%" height={340}>
            <BarChart layout="vertical" data={rankings.company.slice(0, 10)} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" opacity={0.32} horizontal={false} />
              <XAxis type="number" tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={130} tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} tickFormatter={(v) => truncateLabel(v, 18)} interval={0} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => formatNumber(v)} />
              <Bar dataKey="calls" fill={CHART_COLORS.usedGreen}><LabelList dataKey="calls" content={RightValueLabel} /></Bar>
            </BarChart>
          </ResponsiveContainer>
          <ChartLegend items={[{ name: "Calls", color: CHART_COLORS.usedGreen }]} />
        </article>
        <article className="chart-card">
          <h3>Top Base Stations by Calls</h3>
          <ResponsiveContainer width="100%" height={340}>
            <BarChart layout="vertical" data={rankings.station.slice(0, 10)} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" opacity={0.32} horizontal={false} />
              <XAxis type="number" tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={140} tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} tickFormatter={(v) => truncateLabel(v, 18)} interval={0} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => formatNumber(v)} />
              <Bar dataKey="calls" fill={CHART_COLORS.duration}><LabelList dataKey="calls" content={RightValueLabel} /></Bar>
            </BarChart>
          </ResponsiveContainer>
          <ChartLegend items={[{ name: "Calls", color: CHART_COLORS.duration }]} />
        </article>
        <article className="chart-card">
          <h3>Top Talkgroups by Calls</h3>
          <ResponsiveContainer width="100%" height={340}>
            <BarChart layout="vertical" data={rankings.talkgroup.slice(0, 10)} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" opacity={0.32} horizontal={false} />
              <XAxis type="number" tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={140} tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} tickFormatter={(v) => truncateLabel(v, 18)} interval={0} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => formatNumber(v)} />
              <Bar dataKey="calls" fill={CHART_COLORS.calls}><LabelList dataKey="calls" content={RightValueLabel} /></Bar>
            </BarChart>
          </ResponsiveContainer>
          <ChartLegend items={[{ name: "Calls", color: CHART_COLORS.calls }]} />
        </article>
      </section>

      <SectionTitle id="users" eyebrow="Behavior deck" title={`Radio & User Behavior in ${CompanyPeriodLabel}`} text="Identify heavy users, high-use radios, multi-talkgroup activity, and cross-region behavior." collapsed={isSectionCollapsed("users")} onToggle={() => toggleSection("users")} actions={<><ExportButton kind="xlsx" label="XLSX" onClick={exportUtilizationXlsx} /><ExportButton kind="pdf" label="PDF" onClick={exportUtilizationPdf} /></>} />
      <section id="users-content" className={`behavior-grid ${isSectionCollapsed("users") ? "section-content-collapsed" : ""}`}>
        <article className="table-card">
          <h3>Radio Behavior Insights</h3>
          <div className="records-scroll small no-scroll-table fixed-row-table">
            <table>
              <thead><tr><th>Radio ID</th><th>Alias</th><th>Company</th><th>Calls</th><th>Duration</th><th>Avg Duration</th><th>Talkgroups</th><th>Base Stations</th></tr></thead>
              <tbody>{radioBehaviorRows.map((item) => <tr key={item.radioId}><td>{item.radioId}</td><td>{item.alias}</td><td>{item.company}</td><td>{formatNumber(item.calls)}</td><td>{secondsToClock(item.durationSeconds)}</td><td>{secondsToClock(item.averageDuration)}</td><td>{formatNumber(item.talkgroups)}</td><td>{formatNumber(item.stations)}</td></tr>)}</tbody>
            </table>
          </div>
        </article>
        <article className="table-card user-behavior-table-card">
          <h3>User Behavior Insights</h3>
          <div className="records-scroll small no-scroll-table fixed-row-table">
            <table>
              <colgroup>
                <col className="user-col" />
                <col className="compact-col" />
                <col className="duration-col" />
                <col className="duration-col" />
                <col className="compact-col" />
                <col className="compact-col" />
                <col className="compact-col" />
              </colgroup>
              <thead><tr><th>User</th><th>Calls</th><th>Duration</th><th>Avg Duration</th><th>Radios</th><th>Talkgroups</th><th>Base Stations</th></tr></thead>
              <tbody>{userBehaviorRows.map((item) => <tr key={item.name}><td>{item.name}</td><td>{formatNumber(item.calls)}</td><td>{secondsToClock(item.durationSeconds)}</td><td>{secondsToClock(item.averageDuration)}</td><td>{formatNumber(item.radios)}</td><td>{formatNumber(item.talkgroups)}</td><td>{formatNumber(item.stations)}</td></tr>)}</tbody>
            </table>
          </div>
        </article>
      </section>
      </>
      )}

      {showOverviewTab && (
      <>
      <SectionTitle id="records" eyebrow="Source records" title={`Filtered Calls Register in selected period (${CompanyPeriodLabel})`} text="Fixed-height rows are shown without table scrolling. Exports include every filtered row." collapsed={isSectionCollapsed("records")} onToggle={() => toggleSection("records")} actions={<><ExportButton kind="xlsx" label="XLSX" onClick={exportRowsXlsx} /><ExportButton kind="pdf" label="PDF" onClick={exportRowsPdfPage} /></>} />
      <section id="records-content" className={`records-card ${isSectionCollapsed("records") ? "section-content-collapsed" : ""}`}>
        <div className="records-scroll records-scroll-fixed-register fixed-row-table">
          <table className="filtered-register-table">
            <colgroup>
              <col className="col-sn" />
              <col className="col-radio-id" />
              <col className="col-radio-alias" />
              <col className="col-radio-type" />
              <col className="col-employee-name" />
              <col className="col-employee-id" />
              <col className="col-region" />
              <col className="col-company" />
              <col className="col-talkgroup" />
              <col className="col-start" />
              <col className="col-end" />
              <col className="col-duration" />
              <col className="col-base-station" />
            </colgroup>
            <thead><tr><th>SN</th><th>Radio ID</th><th>Radio Alias</th><th>Radio Type</th><th>Employee Name</th><th>Employee ID</th><th>Region</th><th>Company</th><th>Talkgroup Alias</th><th>Start Time</th><th>End Time</th><th>Duration (s)</th><th>Base Station</th></tr></thead>
            <tbody>
              {pagedRecords.map((record, index) => (
                <tr key={`${record.radioId}-${index}`}>
                  <td>{(page - 1) * 50 + index + 1}</td><td>{record.radioId}</td><td>{record.radioAlias}</td><td>{record.mobileType}</td>
                  <td>{record.employeeName}</td><td>{record.employeeId}</td><td>{record.region}</td><td>{record.company}</td>
                  <td>{record.talkgroup}</td><td>{record.startTime}</td><td>{record.endTime}</td>
                  <td>{formatNumber(record.durationSeconds)}</td><td>{record.baseStation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pager">
          <button className="button" disabled={page <= 1} onClick={() => setPage((c) => Math.max(1, c - 1))}>Previous</button>
          <span>Page {formatNumber(page)} of {formatNumber(pageCount)} - showing {formatNumber(pagedRecords.length)} rows</span>
          <button className="button" disabled={page >= pageCount} onClick={() => setPage((c) => Math.min(pageCount, c + 1))}>Next</button>
        </div>
      </section>
      </>
      )}

      {isAddingMoreCdr && (
        <div className="loading-overlay" role="status" aria-live="polite">
          <div className="loading-card">
            <Activity size={28} />
            <strong>Merging additional CDR region...</strong>
            <span>The dashboard will refresh once the new records are added.</span>
          </div>
        </div>
      )}
      {error && <div className="toast error">{error}</div>}
    </main>
  );
}









