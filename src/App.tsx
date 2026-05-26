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
  Download,
  Eye,
  FileImage,
  FileSpreadsheet,
  FileText,
  Filter,
  Gauge,
  HardDrive,
  Palette,
  Presentation,
  Radio,
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

type DashboardData = {
  fileName: string;
  sourceSheet: string;
  loadedAt: string;
  rawRows: number;
  records: CallRecord[];
  lookupRecords: LookupRecord[];
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
  { id: "kpi", label: "KPI Table" },
  { id: "Company", label: "Company Contribution" },
  { id: "Performance", label: "Performance Charts" },
  { id: "General", label: "General Charts" },
  { id: "Charts", label: "Top 10 Charts" },
  { id: "users", label: "Top Radios & Users" },
  { id: "records", label: "Filtered Calls Register" },
];

const SAVED_WORKBOOK_DB = "cdr-dashboard-cache";
const SAVED_WORKBOOK_STORE = "workbooks";
const SAVED_WORKBOOK_KEY = "last-workbook";
const SAVED_WORKBOOK_META_KEY = "cdr-dashboard-last-workbook-meta";

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

function normalizeHeader(value: unknown) {
  return `${value ?? ""}`.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function cleanText(value: unknown, fallback = "Unknown") {
  const text = `${value ?? ""}`.replace(/\s+/g, " ").trim();
  return text || fallback;
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
  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return new Date(parsed.y, parsed.m - 1, parsed.d, parsed.H ?? 0, parsed.M ?? 0, parsed.S ?? 0);
  }
  const text = `${value ?? ""}`.trim();
  const dayFirst = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(text);
  if (dayFirst) {
    const yearRaw = Number(dayFirst[3]);
    const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
    return new Date(year, Number(dayFirst[2]) - 1, Number(dayFirst[1]), Number(dayFirst[4] ?? 0), Number(dayFirst[5] ?? 0), Number(dayFirst[6] ?? 0));
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
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatTimeValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const hours = Math.floor(parsed.H ?? 0);
      const minutes = Math.floor(parsed.M ?? 0);
      const seconds = Math.floor(parsed.S ?? 0);
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }
    const secondsOfDay = Math.round((value % 1) * 86400);
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
  const text = cleanText(value, "");
  const time = formatTimeValue(value);
  const parsed = parseDate(value);
  const textHasDate = /\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(text) || value instanceof Date || (typeof value === "number" && value >= 1);
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
    "1": "HSSE",
    "2": "GENERATION",
    "3": "NATIONAL GRID",
    "4": "DISTRIBUTION & CUSTOMER SERVICES",
  };
  return firstDigit ? fallback[firstDigit] ?? currentCompany : currentCompany;
}

function mobileTypeFromRadioId(radioId: string, mobileType: string) {
  const currentType = cleanText(mobileType, "Unknown");
  if (!["", "unknown", "not found"].includes(currentType.toLowerCase())) return currentType;
  const thirdDigit = `${radioId ?? ""}`.trim().charAt(2);
  const fallback: Record<string, string> = {
    "1": "PORTABLE - جهاز محمول",
    "2": "ATEX - محمول خاص",
    "3": "MOBILE - سيار",
    "4": "FIXED - مكتبي",
    "5": "Dispatcher",
  };
  fallback["1"] = MOBILE_TYPE_LABELS[0];
  fallback["2"] = MOBILE_TYPE_LABELS[1];
  fallback["3"] = MOBILE_TYPE_LABELS[2];
  fallback["4"] = MOBILE_TYPE_LABELS[3];
  fallback["5"] = MOBILE_TYPE_LABELS[4];
  return thirdDigit ? fallback[thirdDigit] ?? currentType : currentType;
}

function parseWorkbook(workbook: XLSX.WorkBook, fileName: string): DashboardData {
  const sourceSheet = workbook.SheetNames.includes("Raw_Data") ? "Raw_Data" : workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sourceSheet];
  const rows = XLSX.utils.sheet_to_json<RawRow>(worksheet, { defval: "", raw: true });
  const lookupRows = workbook.SheetNames.includes("lookup")
    ? XLSX.utils.sheet_to_json<RawRow>(workbook.Sheets.lookup, { defval: "", raw: true })
    : [];

  const records = rows
    .map((row): CallRecord => {
      const dateRaw = findValue(row, HEADER_ALIASES.callDate);
      const startRaw = findValue(row, HEADER_ALIASES.startTime);
      const endRaw = findValue(row, HEADER_ALIASES.endTime);
      const durationSeconds = parseDurationSeconds(row);
      const radioId = cleanText(findValue(row, HEADER_ALIASES.radioId));
      const company = cleanText(findValue(row, HEADER_ALIASES.company), "Unknown");
      const mobileType = cleanText(findValue(row, HEADER_ALIASES.mobileType), "Unknown");
      return {
        radioId,
        radioAlias: cleanText(findValue(row, HEADER_ALIASES.radioAlias), "Not labelled"),
        mobileType: mobileTypeFromRadioId(radioId, mobileType),
        employeeName: cleanText(findValue(row, HEADER_ALIASES.employeeName), "Unknown"),
        employeeId: cleanText(findValue(row, HEADER_ALIASES.employeeId), "Unknown"),
        region: cleanText(findValue(row, HEADER_ALIASES.region), "Unknown"),
        company: companyFromRadioId(radioId, company),
        talkgroup: cleanText(findValue(row, HEADER_ALIASES.talkgroup), "Unknown"),
        callDate: formatDate(dateRaw),
        startTime: combineDateAndTime(dateRaw, startRaw),
        endTime: combineDateAndTime(dateRaw, endRaw),
        year: yearLabel(findValue(row, HEADER_ALIASES.year), dateRaw),
        month: monthLabel(findValue(row, HEADER_ALIASES.month), dateRaw),
        week: cleanText(findValue(row, HEADER_ALIASES.week), "Unknown"),
        hour: hourLabel(findValue(row, HEADER_ALIASES.hour)),
        durationSeconds,
        trafficHours: parseNumber(findValue(row, HEADER_ALIASES.trafficHours), durationSeconds / 3600),
        baseStation: cleanText(findValue(row, HEADER_ALIASES.baseStation), "Unknown"),
      };
    })
    .filter((record) => record.radioId !== "Unknown" || record.company !== "Unknown" || record.durationSeconds > 0);

  const lookupRecords = lookupRows
    .map((row): LookupRecord => {
      const radioId = cleanText(findValue(row, HEADER_ALIASES.radioId), "");
      const company = cleanText(findValue(row, HEADER_ALIASES.company), "");
      return {
        radioId,
        company: companyFromRadioId(radioId, company),
        region: cleanText(findValue(row, HEADER_ALIASES.region), ""),
        talkgroup: cleanText(findValue(row, HEADER_ALIASES.talkgroup), ""),
      };
    })
    .filter((record) => record.radioId && record.company);

  const warnings: string[] = [];
  if (!workbook.SheetNames.includes("Raw_Data")) warnings.push("Raw_Data sheet was not found. The first sheet was used.");
  if (!workbook.SheetNames.includes("lookup")) warnings.push("lookup sheet was not found. KPI activated users fall back to calling radio users.");
  if (records.length === 0) warnings.push("No CDR rows could be parsed. Check the header row.");
  if (records.some((record) => record.durationSeconds <= 0)) warnings.push("Some rows have zero or missing duration.");

  return {
    fileName,
    sourceSheet,
    loadedAt: new Date().toLocaleString("en-GB"),
    rawRows: rows.length,
    records,
    lookupRecords,
    warnings,
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

function CallsDurationPerformanceChart({
  title,
  data,
  height = 360,
  xTickFormatter = (value: unknown) => truncateLabel(value, 18),
  gradientId,
}: {
  title: string;
  data: Ranking[];
  height?: number;
  xTickFormatter?: (value: unknown) => string;
  gradientId: string;
}) {
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
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
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

// type CompanyPieCardProps = {
//   title: string;
//   totalLabel: string;
//   data: { name: string; value: number }[];
//   valueFormatter?: (value: number) => string;
//   tone?: "blue" | "red" | "neutral";
// };

// function CompanyPieCard({ title, totalLabel, data, valueFormatter = chartLabel, tone = "neutral" }: CompanyPieCardProps) {
//   return (
//     <article className={`chart-card Company-card ${tone}`}>
//       <h3>{title}</h3>
//       <p>{totalLabel}</p>
//       <div className="Company-pie-layout">
//         <ResponsiveContainer width="58%" height={240}>
//           <PieChart>
//             <Pie data={data} dataKey="value" nameKey="name" outerRadius={92} paddingAngle={2} label={({ value }) => valueFormatter(Number(value ?? 0))}>
//               {data.map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}
//             </Pie>
//             <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number) => valueFormatter(value)} />
//           </PieChart>
//         </ResponsiveContainer>
//         <div className="Company-legend">
//           {data.map((item, index) => (
//             <span key={item.name}><i style={{ background: COLORS[index % COLORS.length] }} />{item.name}</span>
//           ))}
//         </div>
//       </div>
//     </article>
//   );
// }

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
  const text = `${label ?? ""}`.toLowerCase();
  if (!text || text === "unknown") return Number.MAX_SAFE_INTEGER;
  const numeric = /\d+/.exec(text)?.[0];
  return numeric ? Number(numeric) : Number.MAX_SAFE_INTEGER - 1;
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
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadBlob(fileName: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadDataUrl(fileName: string, dataUrl: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function downloadWorkbookData(fileName: string, sheetName: string, title: string, dataset: ChartExportDataset) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([[title], [], dataset.headers, ...dataset.rows]);
  worksheet["!cols"] = dataset.headers.map((header, index) => {
    const maxLength = Math.max(
      `${header}`.length,
      ...dataset.rows.slice(0, 200).map((row) => `${row[index] ?? ""}`.length)
    );
    return { wch: Math.min(Math.max(maxLength + 2, 12), 34) };
  });
  worksheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(0, dataset.headers.length - 1) } }];
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31) || "Chart Data");
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  downloadBlob(fileName, new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
}

function fileSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || "dashboard-card";
}

function exportIconSvg(kind: "png" | "xlsx" | "ppt" | "pdf" | "view" | "csv") {
  const paths = {
    png: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
    xlsx: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="m9 15 4-4"/><path d="m9 11 4 4"/>',
    ppt: '<path d="M3 4h18"/><path d="M4 4v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4"/><path d="M12 16v4"/><path d="M8 20h8"/><path d="M9 12V8h3a2 2 0 0 1 0 4Z"/>',
    pdf: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 17v-4h1.5a1.5 1.5 0 0 1 0 3H8"/><path d="M13 13v4"/><path d="M13 13h1.5a2 2 0 0 1 0 4H13"/><path d="M18 13h-2v4"/><path d="M16 15h1.5"/>',
    view: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    csv: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 16h8"/><path d="M8 12h8"/>',
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths[kind]}</svg>`;
}

function escapeXml(value: unknown) {
  return `${value ?? ""}`
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function excelColumnName(index: number) {
  let value = index;
  let name = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}

function excelRange(sheetName: string, col: number, startRow: number, endRow: number) {
  const safeName = sheetName.replace(/'/g, "''");
  const column = excelColumnName(col);
  return `'${safeName}'!$${column}$${startRow}:$${column}$${endRow}`;
}

type NativeChartSeries = { name: string; valuesRef: string; color: string };
type NativeChartConfig = {
  sheetIndex: number;
  chartIndex: number;
  title: string;
  type: "bar" | "line" | "doughnut";
  categoriesRef: string;
  series: NativeChartSeries[];
  from?: { col: number; row: number };
  to?: { col: number; row: number };
};

function nativeSeriesXml(series: NativeChartSeries, index: number, categoriesRef: string, chartType: "bar" | "line" | "doughnut") {
  const shape = `<c:spPr><a:solidFill><a:srgbClr val="${series.color}"/></a:solidFill><a:ln><a:solidFill><a:srgbClr val="${series.color}"/></a:solidFill></a:ln></c:spPr>`;
  const marker = chartType === "line" ? `<c:marker><c:symbol val="circle"/><c:size val="6"/><c:spPr><a:solidFill><a:srgbClr val="${series.color}"/></a:solidFill><a:ln><a:solidFill><a:srgbClr val="${series.color}"/></a:solidFill></a:ln></c:spPr></c:marker>` : "";
  const dPts = chartType === "doughnut" ? COLORS.map((color, pointIndex) => `<c:dPt><c:idx val="${pointIndex}"/><c:spPr><a:solidFill><a:srgbClr val="${color.replace("#", "")}"/></a:solidFill></c:spPr></c:dPt>`).join("") : "";
  return `<c:ser><c:idx val="${index}"/><c:order val="${index}"/><c:tx><c:v>${escapeXml(series.name)}</c:v></c:tx>${shape}${marker}${dPts}<c:cat><c:strRef><c:f>${escapeXml(categoriesRef)}</c:f></c:strRef></c:cat><c:val><c:numRef><c:f>${escapeXml(series.valuesRef)}</c:f></c:numRef></c:val></c:ser>`;
}

function nativeChartXml(config: NativeChartConfig) {
  const series = config.series.map((item, index) => nativeSeriesXml(item, index, config.categoriesRef, config.type)).join("");
  const chartBody = config.type === "bar"
    ? `<c:barChart><c:barDir val="bar"/><c:grouping val="clustered"/><c:varyColors val="0"/>${series}<c:dLbls><c:showVal val="1"/><c:showLegendKey val="0"/><c:showCatName val="0"/><c:showSerName val="0"/></c:dLbls><c:axId val="10"/><c:axId val="20"/></c:barChart>`
    : config.type === "line"
      ? `<c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/>${series}<c:dLbls><c:showVal val="1"/><c:showLegendKey val="0"/><c:showCatName val="0"/><c:showSerName val="0"/></c:dLbls><c:axId val="10"/><c:axId val="20"/></c:lineChart>`
      : `<c:doughnutChart><c:varyColors val="1"/>${series}<c:dLbls><c:showVal val="1"/><c:showLeaderLines val="1"/><c:showLegendKey val="0"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="0"/></c:dLbls><c:holeSize val="55"/></c:doughnutChart>`;
  const axes = config.type === "doughnut" ? "" : `
      <c:catAx><c:axId val="10"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:tickLblPos val="nextTo"/><c:crossAx val="20"/><c:crosses val="autoZero"/></c:catAx>
      <c:valAx><c:axId val="20"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:majorGridlines/><c:numFmt formatCode="#,##0" sourceLinked="0"/><c:tickLblPos val="nextTo"/><c:crossAx val="10"/><c:crosses val="autoZero"/></c:valAx>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <c:date1904 val="0"/><c:lang val="en-US"/><c:roundedCorners val="0"/>
  <c:chart>
    <c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" b="1" sz="1400"/><a:t>${escapeXml(config.title)}</a:t></a:r></a:p></c:rich></c:tx><c:layout/></c:title>
    <c:plotArea><c:layout/>${chartBody}${axes}</c:plotArea>
    <c:legend><c:legendPos val="r"/><c:layout/></c:legend>
    <c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/>
  </c:chart>
</c:chartSpace>`;
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
    zip.file(drawingPath, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <xdr:twoCellAnchor>
    <xdr:from><xdr:col>${from.col}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${from.row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
    <xdr:to><xdr:col>${to.col}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${to.row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
    <xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="2" name="${escapeXml(config.title)}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rId1"/></a:graphicData></a:graphic></xdr:graphicFrame>
    <xdr:clientData/>
  </xdr:twoCellAnchor>
</xdr:wsDr>`);
    zip.file(drawingRelPath, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart${config.chartIndex}.xml"/></Relationships>`);

    const sheetRelXml = await zip.file(sheetRelPath)?.async("string");
    const existingRids = [...(sheetRelXml ?? "").matchAll(/Id="rId(\d+)"/g)].map((match) => Number(match[1]));
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
  const canvas = await html2canvas(element, {
    backgroundColor,
    scale: 2,
    useCORS: true,
  });
  return canvas.toDataURL("image/png");
}

function htmlEscape(value: unknown) {
  return `${value ?? ""}`
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type ThemeName = "dark" | "se";

function themeClass(theme: ThemeName) {
  return theme === "se" ? "se-theme" : "";
}

function workbookMeta(data: DashboardData): SavedWorkbookMeta {
  return {
    fileName: data.fileName,
    sourceSheet: data.sourceSheet,
    loadedAt: data.loadedAt,
    rawRows: data.rawRows,
  };
}

function getSavedWorkbookMeta(): SavedWorkbookMeta | null {
  try {
    const raw = window.localStorage.getItem(SAVED_WORKBOOK_META_KEY);
    return raw ? JSON.parse(raw) as SavedWorkbookMeta : null;
  } catch {
    return null;
  }
}

function setSavedWorkbookMeta(meta: SavedWorkbookMeta | null) {
  try {
    if (meta) window.localStorage.setItem(SAVED_WORKBOOK_META_KEY, JSON.stringify(meta));
    else window.localStorage.removeItem(SAVED_WORKBOOK_META_KEY);
  } catch {
    // Metadata is only used to show the previous workbook option on the upload screen.
  }
}

function openSavedWorkbookDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(SAVED_WORKBOOK_DB, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(SAVED_WORKBOOK_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveWorkbookToBrowser(data: DashboardData) {
  const db = await openSavedWorkbookDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(SAVED_WORKBOOK_STORE, "readwrite");
    transaction.objectStore(SAVED_WORKBOOK_STORE).put(data, SAVED_WORKBOOK_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
  setSavedWorkbookMeta(workbookMeta(data));
}

async function loadWorkbookFromBrowser(): Promise<DashboardData | null> {
  const db = await openSavedWorkbookDb();
  const data = await new Promise<DashboardData | null>((resolve, reject) => {
    const transaction = db.transaction(SAVED_WORKBOOK_STORE, "readonly");
    const request = transaction.objectStore(SAVED_WORKBOOK_STORE).get(SAVED_WORKBOOK_KEY);
    request.onsuccess = () => resolve((request.result as DashboardData | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return data;
}

function UploadView({
  onUpload,
  onLoadSaved,
  savedWorkbook,
  isParsing,
  isLoadingSaved,
  error,
  theme,
  onToggleTheme,
}: {
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onLoadSaved: () => void;
  savedWorkbook: SavedWorkbookMeta | null;
  isParsing: boolean;
  isLoadingSaved: boolean;
  error: string;
  theme: ThemeName;
  onToggleTheme: () => void;
}) {
  return (
    <main className={`upload-shell ${themeClass(theme)}`}>
      <button className="button small theme-toggle upload-theme-toggle" type="button" onClick={onToggleTheme}>
        <Palette size={14} />
        {theme === "se" ? "Dark Theme" : "Light Theme"}
      </button>
      <section className="upload-grid">
        <div className="upload-copy">
          <p className="eyebrow">Premium CDR Concept</p>
          <h1>Traffic command center for massive CDR workbooks.</h1>
          <p className="lead"></p>
        </div>
        <label className="drop-zone">
          <input type="file" accept=".xlsx,.xls,.xlsm,.xlsb" onChange={onUpload} />
          <UploadCloud size={150} />
          <strong>{isParsing ? "Reading workbook..." : "Upload CDR workbook"}</strong>
          <span>Supported: .xlsx, .xlsm, .xls, .xlsb</span>
        </label>
        {savedWorkbook && (
          <article className="saved-workbook-card">
            <HardDrive size={34} />
            <div>
              <span>Previous workbook</span>
              <strong>{savedWorkbook.fileName}</strong>
              <p>{formatNumber(savedWorkbook.rawRows)} records - loaded {savedWorkbook.loadedAt}</p>
            </div>
            <button className="button primary" type="button" onClick={onLoadSaved} disabled={isLoadingSaved || isParsing}>
              {isLoadingSaved ? "Opening..." : "Work with uploaded file"}
            </button>
          </article>
        )}
      </section>
      {error && <div className="toast error">{error}</div>}
    </main>
  );
}

function MetricCard({ label, value, detail, icon: Icon, tone = "blue" }: { label: string; value: string; detail: string; icon: typeof Activity; tone?: "blue" | "amber" | "green" | "red" }) {
  return (
    <article className={`metric-card ${tone}`}>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <Icon size={22} />
      <p>{detail}</p>
    </article>
  );
}

function ExportButton({ kind, label, onClick, title }: { kind: "xlsx" | "ppt" | "pdf" | "view" | "csv" | "png"; label: string; onClick: () => void; title?: string }) {
  const icons = {
    xlsx: FileSpreadsheet,
    ppt: Presentation,
    pdf: FileText,
    view: Eye,
    csv: Download,
    png: FileImage,
  };
  const Icon = icons[kind];
  return (
    <button className={`button small export-button export-button-${kind}`} type="button" onClick={onClick} title={title ?? label}>
      <Icon size={14} />
      <span>{label}</span>
    </button>
  );
}

function SectionTitle({
  id,
  eyebrow,
  title,
  text,
  actions,
  collapsed = false,
  onToggle,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  text?: string;
  actions?: ReactNode;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div id={id} className={`section-title ${collapsed ? "section-title-collapsed" : ""}`}>
      <div className="section-title-copy">
        <p>{eyebrow}</p>
        <h2>{title}</h2>
        {text && <span>{text}</span>}
      </div>
      <div className="section-title-actions">
        {actions}
        {id && (
          <button className="button small section-top-button" type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <ArrowUp size={15} />
            <span>Top</span>
          </button>
        )}
        {onToggle && (
          <button className="button small section-toggle" type="button" onClick={onToggle} aria-expanded={!collapsed} aria-controls={id ? `${id}-content` : undefined}>
            <ChevronDown size={15} />
            <span>{collapsed ? "Expand" : "Collapse"}</span>
          </button>
        )}
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
    const longest = Math.max(...options.map((option) => (optionLabels?.[option] ?? option).length), label.length, 10);
    const dropWidth = Math.min(Math.max(rect.width, longest * 8 + 58, 220), 520);
    const dropHeight = Math.min(280, options.length * 36 + 48);
    const spaceBelow = window.innerHeight - rect.bottom;
    const left = Math.min(rect.left, window.innerWidth - dropWidth - 8);
    if (spaceBelow >= dropHeight || spaceBelow >= 160) {
      setDropdownStyle({ position: "fixed", top: rect.bottom + 4, left, width: dropWidth, zIndex: 99999 });
    } else {
      setDropdownStyle({ position: "fixed", bottom: window.innerHeight - rect.top + 4, left, width: dropWidth, zIndex: 99999 });
    }
  }

  function handleOpen() {
    if (!open) computePosition();
    setOpen((current) => !current);
  }

  useEffect(() => {
    if (!open) return;
    const update = () => computePosition();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, options.length]);

  const toggleOption = (option: string) => {
    if (!active) {
      onChange([option]);
      return;
    }
    onChange(value.includes(option) ? value.filter((item) => item !== option) : [...value, option]);
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

export default function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [error, setError] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [savedWorkbook, setSavedWorkbook] = useState<SavedWorkbookMeta | null>(() => getSavedWorkbookMeta());
  const [page, setPage] = useState(1);
  const [theme, setTheme] = useState<ThemeName>("se");
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    () => new Set(["kpi", "Company", "Performance", "General", "Charts", "users", "records"])
  );
  const toggleTheme = useCallback(() => setTheme((current) => (current === "se" ? "dark" : "se")), []);
  const scrollToSection = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);
  const toggleSection = useCallback((id: string) => {
    setCollapsedSections((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const isSectionCollapsed = useCallback((id: string) => collapsedSections.has(id), [collapsedSections]);
  const kpiTableRef = useRef<HTMLDivElement | null>(null);
  const kpiAverageChartRef = useRef<HTMLElement | null>(null);
  const kpiCallsDurationChartRef = useRef<HTMLElement | null>(null);
  const monthlyKpiChartRef = useRef<HTMLElement | null>(null);
  const kpiTotalAvgChartRef = useRef<HTMLElement | null>(null);
  const monthlyCompanyChartRef = useRef<HTMLElement | null>(null);

  const handleUpload = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    setIsParsing(true);
    try {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: false });
      const parsedData = parseWorkbook(workbook, file.name);
      setData(parsedData);
      try {
        await saveWorkbookToBrowser(parsedData);
        setSavedWorkbook(workbookMeta(parsedData));
      } catch {
        setSavedWorkbookMeta(null);
        setSavedWorkbook(null);
      }
      setFilters(EMPTY_FILTERS);
      setPage(1);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Workbook could not be parsed.");
    } finally {
      setIsParsing(false);
      event.target.value = "";
    }
  }, []);

  const handleLoadSavedWorkbook = useCallback(async () => {
    setError("");
    setIsLoadingSaved(true);
    try {
      const saved = await loadWorkbookFromBrowser();
      if (!saved) {
        setSavedWorkbook(null);
        setSavedWorkbookMeta(null);
        setError("No previous workbook was found. Please upload the workbook again.");
        return;
      }
      setData(saved);
      setSavedWorkbook(workbookMeta(saved));
      setFilters(EMPTY_FILTERS);
      setPage(1);
    } catch {
      setError("Previous workbook could not be opened. Please upload the workbook again.");
    } finally {
      setIsLoadingSaved(false);
    }
  }, []);

  const records = data?.records ?? [];
  const talkgroupLabels = useMemo(() => ({ [NUMERIC_TALKGROUP_FILTER]: "Numeric group" }), []);
  const options = useMemo(() => ({
    region: uniqueOptions(records, (record) => record.region),
    year: uniqueOptions(records, (record) => record.year).sort((a, b) => Number(a) - Number(b) || a.localeCompare(b)),
    company: uniqueOptions(records, (record) => record.company),
    month: uniqueOptions(
      filters.year.length ? records.filter((record) => filters.year.includes(record.year)) : records,
      (record) => record.month,
      true
    ),
    baseStation: uniqueOptions(records, (record) => record.baseStation),
    talkgroup: [
      ...uniqueOptions(records, (record) => record.talkgroup).filter((talkgroup) => !/^\d+$/.test(talkgroup)),
      ...(records.some((record) => /^\d+$/.test(record.talkgroup)) ? [NUMERIC_TALKGROUP_FILTER] : []),
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
    const totalDuration = filtered.reduce((sum, record) => sum + record.durationSeconds, 0);
    const trafficHours = filtered.reduce((sum, record) => sum + record.trafficHours, 0);
    const radios = new Set(filtered.map((record) => record.radioId).filter(isKnownLabel)).size;
    const companies = new Set(filtered.map((record) => record.company)).size;
    const regions = new Set(filtered.map((record) => record.region)).size;
    const talkgroups = new Set(filtered.map((record) => record.talkgroup).filter(isKnownLabel)).size;
    const stations = new Set(filtered.map((record) => record.baseStation)).size;
    const averageDuration = totalCalls ? totalDuration / totalCalls : 0;
    return { totalCalls, totalDuration, trafficHours, radios, companies, regions, talkgroups, stations, averageDuration };
  }, [filtered]);

  const rankings = useMemo(() => ({
    company: groupBy(filtered, (record) => record.company),
    station: groupBy(filtered, (record) => record.baseStation),
    talkgroup: groupBy(filtered, (record) => record.talkgroup),
    region: groupBy(filtered, (record) => record.region),
    mobileType: groupBy(filtered, (record) => record.mobileType),
    radio: groupBy(filtered, (record) => `${record.radioId} - ${record.radioAlias}`),
    user: groupBy(filtered, (record) => `${record.employeeName} - ${record.employeeId}`),
    hour: groupBy(filtered, (record) => record.hour).sort((a, b) => a.name.localeCompare(b.name)),
    month: groupBy(filtered, (record) => record.month).sort((a, b) => monthSortValue(a.name) - monthSortValue(b.name) || a.name.localeCompare(b.name)),
  }), [filtered]);

  const topRadioUsers = useMemo(() => {
    const map = new Map<string, { radioId: string; radioAlias: string; employeeName: string; company: string; calls: number; durationSeconds: number }>();
    filtered.forEach((record) => {
      const key = `${record.radioId}||${record.radioAlias}||${record.employeeName}||${record.company}`;
      const current = map.get(key) ?? {
        radioId: record.radioId,
        radioAlias: record.radioAlias,
        employeeName: record.employeeName,
        company: record.company,
        calls: 0,
        durationSeconds: 0,
      };
      current.calls += 1;
      current.durationSeconds += record.durationSeconds;
      map.set(key, current);
    });
    return [...map.values()]
      .sort((a, b) => b.calls - a.calls || b.durationSeconds - a.durationSeconds || a.radioId.localeCompare(b.radioId))
      .slice(0, 10);
  }, [filtered]);

  const radioMonths = useMemo(() => {
    const rows = [...rankings.month].sort((a, b) => monthSortValue(a.name) - monthSortValue(b.name) || a.name.localeCompare(b.name));
    const total = rows.reduce((sum, row) => sum + row.radios, 0);
    return rows.map((row) => ({ ...row, share: total ? (row.radios / total) * 100 : 0 }));
  }, [rankings.month]);

  const mobileTypes = useMemo(() => {
    return uniqueOptions(filtered, (record) => record.mobileType)
      .filter((type) => type !== "Unknown" && type !== "Not Found")
      .sort((a, b) => {
        const ai = MOBILE_TYPE_LABELS.indexOf(a);
        const bi = MOBILE_TYPE_LABELS.indexOf(b);
        return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi) || a.localeCompare(b);
      });
  }, [filtered]);

  const mobileTypeByCompany = useMemo(() => {
    const map = new Map<string, { name: string; total: Set<string>; byType: Map<string, Set<string>> }>();
    filtered.forEach((record) => {
      if (record.company === "Unknown" || record.company === "Not Found" || record.radioId === "Unknown") return;
      const current = map.get(record.company) ?? { name: record.company, total: new Set<string>(), byType: new Map<string, Set<string>>() };
      current.total.add(record.radioId);
      if (record.mobileType !== "Unknown" && record.mobileType !== "Not Found") {
        const typeSet = current.byType.get(record.mobileType) ?? new Set<string>();
        typeSet.add(record.radioId);
        current.byType.set(record.mobileType, typeSet);
      }
      map.set(record.company, current);
    });
    return [...map.values()]
      .map((row) => {
        const next: Record<string, string | number> = { name: row.name, total: row.total.size };
        mobileTypes.forEach((type) => {
          next[mobileTypeKey(type)] = row.byType.get(type)?.size ?? 0;
        });
        return next;
      })
      .filter((row) => Number(row.total) > 0)
      .sort((a, b) => `${a.name}`.localeCompare(`${b.name}`));
  }, [filtered, mobileTypes]);

  const mobileTypeByMonth = useMemo(() => {
    const map = new Map<string, { name: string; total: Set<string>; byType: Map<string, Set<string>> }>();
    filtered.forEach((record) => {
      if (record.month === "Unknown" || record.radioId === "Unknown") return;
      const current = map.get(record.month) ?? { name: record.month, total: new Set<string>(), byType: new Map<string, Set<string>>() };
      current.total.add(record.radioId);
      if (record.mobileType !== "Unknown" && record.mobileType !== "Not Found") {
        const typeSet = current.byType.get(record.mobileType) ?? new Set<string>();
        typeSet.add(record.radioId);
        current.byType.set(record.mobileType, typeSet);
      }
      map.set(record.month, current);
    });
    return [...map.values()]
      .map((row) => {
        const next: Record<string, string | number> = { name: row.name, total: row.total.size };
        mobileTypes.forEach((type) => {
          next[mobileTypeKey(type)] = row.byType.get(type)?.size ?? 0;
        });
        return next;
      })
      .filter((row) => Number(row.total) > 0)
      .sort((a, b) => monthSortValue(`${a.name}`) - monthSortValue(`${b.name}`) || `${a.name}`.localeCompare(`${b.name}`));
  }, [filtered, mobileTypes]);

  const kpiRows = useMemo(() => {
    const map = new Map<string, { calls: number; durationSeconds: number; talkgroups: Set<string>; radios: Set<string> }>();
    const lookupCompanies = new Set((data?.lookupRecords ?? []).map((record) => record.company));
    const lookupCompanyCounts = new Map<string, number>();
    (data?.lookupRecords ?? [])
      .filter((record) => filters.region.length === 0 || filters.region.includes(record.region))
      .forEach((record) => lookupCompanyCounts.set(record.company, (lookupCompanyCounts.get(record.company) ?? 0) + 1));
    const unlistedCompanyUserCount = filtered.filter((record) => !lookupCompanies.has(record.company)).length;

    filtered.forEach((record) => {
      const current = map.get(record.company) ?? { calls: 0, durationSeconds: 0, talkgroups: new Set<string>(), radios: new Set<string>() };
      current.calls += 1;
      current.durationSeconds += record.durationSeconds;
      if (record.talkgroup !== "Unknown") current.talkgroups.add(record.talkgroup);
      if (record.radioId !== "Unknown") current.radios.add(record.radioId);
      map.set(record.company, current);
    });
    return Array.from(map.entries())
      .filter(([company]) => company !== "Unknown" && company !== "Not Found")
      .map(([company, value]) => {
        const lookupActivated = lookupCompanyCounts.get(company) ?? (lookupCompanies.has(company) ? 0 : unlistedCompanyUserCount);
        return {
          company,
          talkgroupsInUse: value.talkgroups.size,
          calls: value.calls,
          durationSeconds: value.durationSeconds,
          usersActivated: lookupActivated || value.radios.size,
          callingUsers: value.radios.size,
          kpiAvgDurationPerUser: 0,
        };
      })
      .map((row) => ({
        ...row,
        kpiAvgDurationPerUser: row.usersActivated ? row.durationSeconds / row.usersActivated : 0,
      }))
      .sort((a, b) => a.company.localeCompare(b.company));
  }, [data?.lookupRecords, filtered, filters.region]);

  const kpiAverage = useMemo(() => {
    const values = kpiRows.map((row) => row.kpiAvgDurationPerUser).filter((value) => value > 0);
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  }, [kpiRows]);

  const monthlyKpi = useMemo(() => {
    const companies = uniqueOptions(filtered, (record) => record.company)
      .filter((company) => company !== "Unknown" && company !== "Not Found")
      .sort((a, b) => a.localeCompare(b));
    const months = uniqueOptions(filtered, (record) => record.month, true)
      .sort((a, b) => monthSortValue(a) - monthSortValue(b) || a.localeCompare(b));
    const stats = new Map<string, { calls: number; durationSeconds: number }>();

    filtered.forEach((record) => {
      if (record.company === "Unknown" || record.company === "Not Found") return;
      const key = `${record.company}||${record.month}`;
      const current = stats.get(key) ?? { calls: 0, durationSeconds: 0 };
      current.calls += 1;
      current.durationSeconds += record.durationSeconds;
      stats.set(key, current);
    });

    const rows = companies.map((company) => {
      const row: Record<string, string | number | null> = { company };
      months.forEach((month) => {
        const current = stats.get(`${company}||${month}`);
        row[dataKey(month)] = current?.calls ? current.durationSeconds / current.calls : null;
      });
      return row;
    });

    return {
      rows,
      months: months.map((month, index) => ({ name: month, key: dataKey(month), color: COLORS[index % COLORS.length] })),
    };
  }, [filtered]);

  const monthlyKpiPieData = useMemo(() => {
    return [...rankings.month]
      .sort((a, b) => monthSortValue(a.name) - monthSortValue(b.name) || a.name.localeCompare(b.name))
      .filter((row) => row.calls > 0 && row.durationSeconds > 0)
      .map((row) => ({
        name: shortMonthLabel(row.name),
        value: row.durationSeconds / row.calls,
      }));
  }, [rankings.month]);

  const CompanyPeriodLabel = useMemo(() => {
    const years = [...filters.year].sort((a, b) => Number(a) - Number(b) || a.localeCompare(b));
    const months = [...filters.month]
      .sort((a, b) => monthSortValue(a) - monthSortValue(b) || a.localeCompare(b))
      .map(shortMonthLabel);
    if (months.length) {
      const monthText = months.join(", ");
      const monthTextHasYear = months.some((month) => /(19|20)\d{2}/.test(month));
      return !monthTextHasYear && years.length ? `${monthText} ${years.join(", ")}` : monthText;
    }
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

  const kpiTableHeaders = [
    "Call Source",
    "Talk groups in use",
    "No. of Calls",
    "Duration (Sec)",
    "Duration (hh:mm:ss)",
    "Total No. of Users activated",
    "Call Performed by (No. of Users)",
    "KPI (Avg. Duration per User per Company) in sec",
    "KPI",
  ];

  const kpiExportTableRows = useMemo(() => [
    kpiTableHeaders,
    ...kpiRows.map((row, index) => [
      row.company,
      formatNumber(row.talkgroupsInUse),
      formatNumber(row.calls),
      formatNumber(row.durationSeconds),
      secondsToClock(row.durationSeconds),
      formatNumber(row.usersActivated),
      formatNumber(row.callingUsers),
      formatNumber(row.kpiAvgDurationPerUser),
      index === 0 ? formatNumber(kpiAverage) : "",
    ]),
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
      const worksheet = workbook.addWorksheet("KPI Table", { views: [{ showGridLines: false }] });
      const border = { top: { style: "thin" as const }, left: { style: "thin" as const }, bottom: { style: "thin" as const }, right: { style: "thin" as const } };
      const headerFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFFFFF00" } };

      worksheet.addRow([exportTitle("KPI Table")]);
      worksheet.mergeCells(1, 1, 1, kpiTableHeaders.length);
      worksheet.addRow(kpiTableHeaders);
      kpiRows.forEach((row, index) => worksheet.addRow([
        row.company,
        row.talkgroupsInUse,
        row.calls,
        row.durationSeconds,
        secondsToClock(row.durationSeconds),
        row.usersActivated,
        row.callingUsers,
        row.kpiAvgDurationPerUser,
        index === 0 ? kpiAverage : "",
      ]));
      worksheet.eachRow((row, rowNumber) => {
        row.height = rowNumber <= 2 ? 28 : 22;
        row.eachCell((cell) => {
          cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
          cell.border = border;
          if (rowNumber <= 2) {
            cell.font = { bold: true, color: { argb: "FF000000" } };
            cell.fill = headerFill;
          }
        });
      });
      worksheet.columns = kpiTableHeaders.map((header, index) => ({
        width: Math.min(34, Math.max(14, header.length / 1.7, ...kpiRows.map((row) => {
          const values = [
            row.company,
            row.talkgroupsInUse,
            row.calls,
            row.durationSeconds,
            secondsToClock(row.durationSeconds),
            row.usersActivated,
            row.callingUsers,
            row.kpiAvgDurationPerUser,
            kpiAverage,
          ];
          return `${values[index] ?? ""}`.length + 2;
        }))),
      }));

      const styleDataSheet = (sheet: ExcelJS.Worksheet) => {
        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).fill = headerFill;
        sheet.eachRow((row) => row.eachCell((cell) => {
          cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
          cell.border = border;
        }));
      };

      const avgSheet = workbook.addWorksheet("KPI Avg Duration", { views: [{ showGridLines: false }] });
      avgSheet.addRow(["Company", "KPI Avg Duration"]);
      kpiRows.forEach((row) => avgSheet.addRow([row.company, row.kpiAvgDurationPerUser]));
      avgSheet.columns = [{ width: 28 }, { width: 18 }];
      styleDataSheet(avgSheet);

      const callsSheet = workbook.addWorksheet("KPI Calls Duration", { views: [{ showGridLines: false }] });
      callsSheet.addRow(["Company", "Calls", "Duration Seconds"]);
      kpiRows.forEach((row) => callsSheet.addRow([row.company, row.calls, row.durationSeconds]));
      callsSheet.columns = [{ width: 28 }, { width: 14 }, { width: 18 }];
      styleDataSheet(callsSheet);

      const monthlySheet = workbook.addWorksheet("Monthly KPI", { views: [{ showGridLines: false }] });
      monthlySheet.addRow(["Company", ...monthlyKpi.months.map((month) => shortMonthLabel(month.name))]);
      monthlyKpi.rows.forEach((row) => monthlySheet.addRow([row.company, ...monthlyKpi.months.map((month) => row[month.key] ?? "")]));
      monthlySheet.columns = [{ width: 28 }, ...monthlyKpi.months.map(() => ({ width: 14 }))];
      styleDataSheet(monthlySheet);

      const totalAvgSheet = workbook.addWorksheet("KPI Total Avg", { views: [{ showGridLines: false }] });
      totalAvgSheet.addRow(["Month Year", "KPI Total Avg Duration"]);
      monthlyKpiPieData.forEach((row) => totalAvgSheet.addRow([row.name, row.value]));
      totalAvgSheet.columns = [{ width: 18 }, { width: 22 }];
      styleDataSheet(totalAvgSheet);

      const chartConfigs: NativeChartConfig[] = [
        {
          sheetIndex: 2,
          chartIndex: 1,
          title: exportTitle("KPI Average Duration per Company"),
          type: "bar",
          categoriesRef: excelRange("KPI Avg Duration", 1, 2, Math.max(2, kpiRows.length + 1)),
          series: [{ name: "Average duration per activated user", valuesRef: excelRange("KPI Avg Duration", 2, 2, Math.max(2, kpiRows.length + 1)), color: "37A6D9" }],
        },
        {
          sheetIndex: 3,
          chartIndex: 2,
          title: exportTitle("KPI Calls and Duration per Company"),
          type: "line",
          categoriesRef: excelRange("KPI Calls Duration", 1, 2, Math.max(2, kpiRows.length + 1)),
          series: [
            { name: "Calls", valuesRef: excelRange("KPI Calls Duration", 2, 2, Math.max(2, kpiRows.length + 1)), color: "65C18C" },
            { name: "Duration seconds", valuesRef: excelRange("KPI Calls Duration", 3, 2, Math.max(2, kpiRows.length + 1)), color: "F0B84F" },
          ],
        },
        {
          sheetIndex: 4,
          chartIndex: 3,
          title: exportTitle("Monthly KPI"),
          type: "line",
          categoriesRef: excelRange("Monthly KPI", 1, 2, Math.max(2, monthlyKpi.rows.length + 1)),
          series: monthlyKpi.months.map((month, index) => ({
            name: shortMonthLabel(month.name),
            valuesRef: excelRange("Monthly KPI", index + 2, 2, Math.max(2, monthlyKpi.rows.length + 1)),
            color: month.color.replace("#", "").toUpperCase(),
          })),
        },
        {
          sheetIndex: 5,
          chartIndex: 4,
          title: exportTitle("KPI Total Avg. Duration"),
          type: "doughnut",
          categoriesRef: excelRange("KPI Total Avg", 1, 2, Math.max(2, monthlyKpiPieData.length + 1)),
          series: [{ name: "KPI Total Avg. Duration", valuesRef: excelRange("KPI Total Avg", 2, 2, Math.max(2, monthlyKpiPieData.length + 1)), color: "37A6D9" }],
        },
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
        const totalWeight = colWeights.reduce((sum, item) => sum + item, 0);
        const colWidths = colWeights.map((weight) => tableWidth * weight / totalWeight);
        const rowHeight = Math.min(30, (pageHeight - 76) / Math.max(1, kpiExportTableRows.length));
        let y = 52;
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(16);
        pdf.text(exportTitle("KPI Table"), pageWidth / 2, 28, { align: "center" });
        kpiExportTableRows.forEach((row, rowIndex) => {
          let x = margin;
          row.forEach((cell, colIndex) => {
            const width = colWidths[colIndex];
            pdf.setDrawColor(20, 36, 48);
            pdf.setFillColor(rowIndex === 0 ? "#fff200" : "#ffffff");
            pdf.rect(x, y, width, rowHeight, "FD");
            pdf.setFont("helvetica", rowIndex === 0 ? "bold" : "normal");
            pdf.setFontSize(rowIndex === 0 ? 6.5 : 7);
            pdf.setTextColor(0, 0, 0);
            pdf.text(String(cell), x + width / 2, y + rowHeight / 2 + 2.5, { align: "center", maxWidth: width - 4 });
            x += width;
          });
          y += rowHeight;
        });
      };
      const addImagePage = (title: string, image: string, firstPage = false) => {
        if (!firstPage) pdf.addPage("a4", "landscape");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(16);
        pdf.text(title, pageWidth / 2, 28, { align: "center" });
        const props = pdf.getImageProperties(image);
        const maxWidth = pageWidth - margin * 2;
        const maxHeight = pageHeight - margin * 2 - 24;
        const ratio = Math.min(maxWidth / props.width, maxHeight / props.height);
        const width = props.width * ratio;
        const height = props.height * ratio;
        pdf.addImage(image, "PNG", (pageWidth - width) / 2, 48 + (maxHeight - height) / 2, width, height);
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
      pptx.layout = "LAYOUT_WIDE";
      pptx.author = "CDR Dashboard";
      const tableSlide = pptx.addSlide();
      tableSlide.background = { color: "FFFFFF" };
      tableSlide.addText(exportTitle("KPI Table"), { x: 0.3, y: 0.18, w: 12.7, h: 0.36, fontSize: 18, bold: true, align: "center", color: "111111" });
      const pptTableRows = kpiExportTableRows.map((row, rowIndex) => row.map((cell) => ({
        text: String(cell),
        options: {
          bold: rowIndex === 0,
          fill: { color: rowIndex === 0 ? "FFF200" : "FFFFFF" },
          color: "111111",
        },
      })));
      tableSlide.addTable(pptTableRows, {
        x: 0.18,
        y: 0.7,
        w: 12.98,
        h: 6.25,
        fontFace: "Arial",
        fontSize: 5.7,
        color: "111111",
        margin: 0.02,
        align: "center",
        valign: "mid",
        border: { type: "solid", color: "111111", pt: 0.5 },
        fill: { color: "FFFFFF" },
        autoFit: false,
        colW: [1.45, 0.86, 0.75, 0.86, 1.02, 1.08, 1.08, 1.45, 0.55],
        rowH: kpiExportTableRows.map((_, index) => index === 0 ? 0.58 : 0.38),
        bold: false,
        fit: "shrink",
      });
      const addImageSlide = (title: string, image: string) => {
        const slide = pptx.addSlide();
        slide.background = { color: "0F1B24" };
        slide.addText(title, { x: 0.3, y: 0.18, w: 12.7, h: 0.38, fontSize: 18, bold: true, align: "center", color: "EDF6FA" });
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
      const current = map.get(key) ?? { calls: 0, durationSeconds: 0, talkgroupsUsed: new Set<string>(), callingUsers: new Set<string>(), totalTalkgroups: new Set<string>(), totalUsers: new Set<string>() };
      map.set(key, current);
      return current;
    };

    filtered.forEach((record) => {
      const current = ensure(record.company);
      current.calls += 1;
      current.durationSeconds += record.durationSeconds;
      if (record.talkgroup !== "Unknown") current.talkgroupsUsed.add(record.talkgroup);
      if (record.radioId !== "Unknown") current.callingUsers.add(record.radioId);
    });

    const search = filters.search.toLowerCase().trim();
    (data?.lookupRecords ?? [])
      .filter((record) => {
        if (!record.company || record.company === "Unknown" || record.company === "Not Found") return false;
        if (filters.region.length && !filters.region.includes(record.region)) return false;
        if (filters.company.length && !filters.company.includes(record.company)) return false;
        if (filters.talkgroup.length) {
          const numericMatch = filters.talkgroup.includes(NUMERIC_TALKGROUP_FILTER) && /^\d+$/.test(record.talkgroup);
          if (!numericMatch && !filters.talkgroup.includes(record.talkgroup)) return false;
        }
        if (search && ![record.radioId, record.company, record.region, record.talkgroup].join(" ").toLowerCase().includes(search)) return false;
        return true;
      })
      .forEach((record) => {
        const current = ensure(record.company);
        if (record.talkgroup) current.totalTalkgroups.add(record.talkgroup);
        if (record.radioId) current.totalUsers.add(record.radioId);
      });

    return [...map.entries()]
      .map(([name, value]) => ({
        name,
        calls: value.calls,
        durationSeconds: value.durationSeconds,
        talkgroupsTotal: Math.max(value.totalTalkgroups.size, value.talkgroupsUsed.size),
        usersTotal: Math.max(value.totalUsers.size, value.callingUsers.size),
        talkgroupsUsed: value.talkgroupsUsed.size,
        callingUsers: value.callingUsers.size,
      }))
      .filter((row) => row.calls > 0 || row.usersTotal > 0 || row.talkgroupsTotal > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data?.lookupRecords, filtered, filters.company, filters.region, filters.search, filters.talkgroup]);

  const CompanyChartData = {
    duration: CompanyRows.filter((row) => row.durationSeconds > 0).map((row) => ({ name: row.name, value: row.durationSeconds })),
    totalTalkgroups: CompanyRows.filter((row) => row.talkgroupsTotal > 0).map((row) => ({ name: row.name, value: row.talkgroupsTotal })),
    totalUsers: CompanyRows.filter((row) => row.usersTotal > 0).map((row) => ({ name: row.name, value: row.usersTotal })),
    calls: CompanyRows.filter((row) => row.calls > 0).map((row) => ({ name: row.name, value: row.calls })),
    talkgroupsUsed: CompanyRows.filter((row) => row.talkgroupsUsed > 0).map((row) => ({ name: row.name, value: row.talkgroupsUsed })),
    callingUsers: CompanyRows.filter((row) => row.callingUsers > 0).map((row) => ({ name: row.name, value: row.callingUsers })),
  };

  const monthlyCompanyRows = useMemo(() => {
    const selectedCompanies = filters.company.length
      ? [...filters.company].sort((a, b) => a.localeCompare(b))
      : rankings.company.map((row) => row.name).sort((a, b) => a.localeCompare(b));
    const allowedCompanies = new Set(selectedCompanies);
    const groupByWeek = filters.month.length === 1;
    const periods = groupByWeek
      ? uniqueOptions(filtered, (record) => record.week).sort((a, b) => weekSortValue(a) - weekSortValue(b) || a.localeCompare(b))
      : rankings.month.map((row) => row.name).sort((a, b) => monthSortValue(a) - monthSortValue(b) || a.localeCompare(b));
    const map = new Map<string, { period: string; company: string; calls: number; durationSeconds: number; sort: number }>();

    filtered.forEach((record) => {
      if (!allowedCompanies.has(record.company)) return;
      const period = groupByWeek ? record.week : record.month;
      const key = `${period}||${record.company}`;
      const current = map.get(key) ?? { period, company: record.company, calls: 0, durationSeconds: 0, sort: groupByWeek ? weekSortValue(period) : monthSortValue(period) };
      current.calls += 1;
      current.durationSeconds += record.durationSeconds;
      map.set(key, current);
    });

    return periods.flatMap((period) => selectedCompanies.map((company, companyIndex) => {
      const row = map.get(`${period}||${company}`) ?? { period, company, calls: 0, durationSeconds: 0, sort: groupByWeek ? weekSortValue(period) : monthSortValue(period) };
      const isMiddleCompany = companyIndex === Math.floor((selectedCompanies.length - 1) / 2);
      return {
        ...row,
        companyLabel: truncateLabel(company, 18),
        periodLabel: isMiddleCompany ? (groupByWeek ? period : shortMonthLabel(period)) : "",
        periodType: groupByWeek ? "Week" : "Month",
      };
    }));
  }, [filtered, filters.company, filters.month, rankings.company, rankings.month]);

  const peakHour = [...rankings.hour].sort((a, b) => b.calls - a.calls)[0];
  const peakTrafficHour = [...rankings.hour].sort((a, b) => b.trafficHours - a.trafficHours)[0];
  const topCompany = rankings.company[0];
  const topStation = rankings.station[0];
  const topTalkgroup = rankings.talkgroup[0];
  const peakRadioEntry = modeBy(filtered, (record) => record.radioId);
  const peakUserEntry = modeBy(filtered, (record) => `${record.employeeName}||${record.employeeId}||${record.company}`);
  const peakUserParts = `${peakUserEntry?.[0] ?? "Unknown||Unknown||Unknown"}`.split("||");
  const peakMonthEntry = modeBy(filtered, (record) => record.month);
  const peakWeekEntry = modeBy(filtered, (record) => record.week);
  const peakDayEntry = modeBy(filtered, (record) => record.callDate);
  const maxDuration = filtered.reduce((max, record) => Math.max(max, record.durationSeconds), 0);
  const minDuration = filtered.reduce((min, record) => {
    if (record.durationSeconds <= 0) return min;
    return min === 0 ? record.durationSeconds : Math.min(min, record.durationSeconds);
  }, 0);
  const peakHourAvgDuration = peakHour?.calls ? peakHour.durationSeconds / peakHour.calls : 0;
  const filteredShare = records.length ? (filtered.length / records.length) * 100 : 0;
  const qualityIssues = useMemo(() => {
    const total = records.length || 1;
    const missingCompany = records.filter((record) => record.company === "Unknown").length;
    const missingStation = records.filter((record) => record.baseStation === "Unknown").length;
    const missingDuration = records.filter((record) => record.durationSeconds <= 0).length;
    const missingRadio = records.filter((record) => record.radioId === "Unknown").length;
    return [
      { name: "Missing company", count: missingCompany, pct: (missingCompany / total) * 100 },
      { name: "Missing station", count: missingStation, pct: (missingStation / total) * 100 },
      { name: "Missing duration", count: missingDuration, pct: (missingDuration / total) * 100 },
      { name: "Missing radio", count: missingRadio, pct: (missingRadio / total) * 100 },
    ];
  }, [records]);
  const qualityScore = Math.max(0, 100 - qualityIssues.reduce((sum, item) => sum + item.pct, 0));

  const exportSummary = useCallback(() => {
    const rows = [
      ["Metric", "Value"],
      ["Total calls", metrics.totalCalls],
      ["Traffic hours", formatDecimal(metrics.trafficHours, 2)],
      ["Average duration", secondsToClock(metrics.averageDuration)],
      ["Active radios", metrics.radios],
      ["Companies", metrics.companies],
      ["Regions", metrics.regions],
      ["Period", CompanyPeriodLabel],
      ["Top company", topCompany?.name ?? ""],
      ["Peak hour", peakHour?.name ?? ""],
    ];
    downloadText("premium-cdr-summary.csv", rows.map((row) => row.map(csvEscape).join(",")).join("\n"));
  }, [CompanyPeriodLabel, metrics, peakHour, topCompany]);

  const recordExportHeaders = ["SN", "Radio ID", "Radio Alias", "Mobile Type", "Employee Name", "Employee ID", "Region", "Company", "Talkgroup Alias", "Start Time", "End Time", "Duration (s)", "Caller Base Station"];
  const filteredRecordRows = useMemo(() => filtered.map((record, index) => [index + 1, record.radioId, record.radioAlias, record.mobileType, record.employeeName, record.employeeId, record.region, record.company, record.talkgroup, record.startTime, record.endTime, record.durationSeconds, record.baseStation]), [filtered]);

  const exportRows = useCallback(() => {
    downloadText("premium-cdr-filtered-records.csv", [[exportTitle("Filtered Calls Register")], [], recordExportHeaders, ...filteredRecordRows].map((row) => row.map(csvEscape).join(",")).join("\n"));
  }, [exportTitle, filteredRecordRows]);

  const exportRowsXlsx = useCallback(() => {
    void (async () => {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "CDR Dashboard";
      const worksheet = workbook.addWorksheet("Filtered Calls Register", { views: [{ showGridLines: false }] });
      const border = { top: { style: "thin" as const }, left: { style: "thin" as const }, bottom: { style: "thin" as const }, right: { style: "thin" as const } };
      const headerFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFFFFF00" } };
      worksheet.addRow([exportTitle("Filtered Calls Register")]);
      worksheet.mergeCells(1, 1, 1, recordExportHeaders.length);
      worksheet.addRow(recordExportHeaders);
      filteredRecordRows.forEach((row) => worksheet.addRow(row));
      worksheet.eachRow((row, rowNumber) => {
        row.height = rowNumber <= 2 ? 24 : 18;
        row.eachCell((cell) => {
          cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
          cell.border = border;
          if (rowNumber <= 2) {
            cell.font = { bold: true, color: { argb: "FF000000" } };
            cell.fill = headerFill;
          }
        });
      });
      worksheet.columns = [
        { width: 8 },
        { width: 14 },
        { width: 18 },
        { width: 24 },
        { width: 24 },
        { width: 14 },
        { width: 14 },
        { width: 22 },
        { width: 24 },
        { width: 22 },
        { width: 22 },
        { width: 14 },
        { width: 26 },
      ];
      worksheet.autoFilter = { from: "A2", to: `${excelColumnName(recordExportHeaders.length)}2` };
      const buffer = await workbook.xlsx.writeBuffer();
      downloadBlob("premium-cdr-filtered-records.xlsx", new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    })();
  }, [exportTitle, filteredRecordRows]);

  const exportRowsPdfPage = useCallback(() => {
    const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 18;
    const tableWidth = pageWidth - margin * 2;
    const colWeights = [0.42, 0.78, 0.9, 1.18, 1.18, 0.78, 0.78, 1.05, 1.15, 0.95, 0.95, 0.65, 1.18];
    const totalWeight = colWeights.reduce((sum, item) => sum + item, 0);
    const colWidths = colWeights.map((weight) => tableWidth * weight / totalWeight);
    const rows = pagedRecords.map((record, index) => [(page - 1) * 50 + index + 1, record.radioId, record.radioAlias, record.mobileType, record.employeeName, record.employeeId, record.region, record.company, record.talkgroup, record.startTime, record.endTime, record.durationSeconds, record.baseStation]);
    const allRows = [recordExportHeaders, ...rows];
    let y = 44;
    const rowHeight = 10;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text(`${exportTitle("Filtered Calls Register")} - Page ${page}`, pageWidth / 2, 24, { align: "center" });
    allRows.forEach((row, rowIndex) => {
      let x = margin;
      row.forEach((cell, colIndex) => {
        const width = colWidths[colIndex];
        pdf.setDrawColor(20, 36, 48);
        pdf.setFillColor(rowIndex === 0 ? "#fff200" : "#ffffff");
        pdf.rect(x, y, width, rowHeight, "FD");
        pdf.setFont("helvetica", rowIndex === 0 ? "bold" : "normal");
        pdf.setFontSize(rowIndex === 0 ? 4.5 : 4.7);
        pdf.setTextColor(0, 0, 0);
        pdf.text(String(cell), x + width / 2, y + 7, { align: "center", maxWidth: width - 2 });
        x += width;
      });
      y += rowHeight;
    });
    pdf.save(`premium-cdr-filtered-records-page-${page}.pdf`);
  }, [exportTitle, page, pagedRecords]);

  const exportUtilizationXlsx = useCallback(() => {
    void (async () => {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "CDR Dashboard";
      const border = { top: { style: "thin" as const }, left: { style: "thin" as const }, bottom: { style: "thin" as const }, right: { style: "thin" as const } };
      const headerFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFFFFF00" } };
      const styleSheet = (sheet: ExcelJS.Worksheet) => {
        sheet.eachRow((row, rowNumber) => row.eachCell((cell) => {
          cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
          cell.border = border;
          if (rowNumber <= 2) {
            cell.font = { bold: true, color: { argb: "FF000000" } };
            cell.fill = headerFill;
          }
        }));
      };

      const radios = workbook.addWorksheet("Top Radios", { views: [{ showGridLines: false }] });
      radios.addRow([exportTitle("Top Radios")]);
      radios.mergeCells(1, 1, 1, 5);
      radios.addRow(["Radio ID & Alias", "Employee Name", "Company", "Total Calls", "Total Duration"]);
      topRadioUsers.forEach((item) => radios.addRow([`${item.radioId} - ${item.radioAlias}`, item.employeeName, item.company, item.calls, secondsToClock(item.durationSeconds)]));
      radios.columns = [{ width: 28 }, { width: 26 }, { width: 22 }, { width: 14 }, { width: 16 }];
      styleSheet(radios);

      const users = workbook.addWorksheet("Top Users", { views: [{ showGridLines: false }] });
      users.addRow([exportTitle("Top Users")]);
      users.mergeCells(1, 1, 1, 3);
      users.addRow(["User", "Total Calls", "Total Duration"]);
      rankings.user.slice(0, 10).forEach((item) => users.addRow([item.name, item.calls, secondsToClock(item.durationSeconds)]));
      users.columns = [{ width: 42 }, { width: 14 }, { width: 16 }];
      styleSheet(users);

      const buffer = await workbook.xlsx.writeBuffer();
      downloadBlob("top-radios-users.xlsx", new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    })();
  }, [exportTitle, rankings.user, topRadioUsers]);

  const exportUtilizationPdf = useCallback(() => {
    const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 24;
    const drawTable = (title: string, headers: string[], rows: (string | number)[][], startY: number, widths: number[]) => {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.text(title, pageWidth / 2, startY, { align: "center" });
      let y = startY + 16;
      const tableWidth = widths.reduce((sum, item) => sum + item, 0);
      const startX = (pageWidth - tableWidth) / 2;
      const rowHeight = 18;
      [headers, ...rows].forEach((row, rowIndex) => {
        let x = startX;
        row.forEach((cell, colIndex) => {
          const width = widths[colIndex];
          pdf.setDrawColor(20, 36, 48);
          pdf.setFillColor(rowIndex === 0 ? "#fff200" : "#ffffff");
          pdf.rect(x, y, width, rowHeight, "FD");
          pdf.setFont("helvetica", rowIndex === 0 ? "bold" : "normal");
          pdf.setFontSize(rowIndex === 0 ? 7 : 7.5);
          pdf.setTextColor(0, 0, 0);
          pdf.text(String(cell), x + width / 2, y + 12, { align: "center", maxWidth: width - 4 });
          x += width;
        });
        y += rowHeight;
      });
      return y;
    };
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text(exportTitle("Top radios and employee utilization"), pageWidth / 2, 26, { align: "center" });
    const nextY = drawTable(
      "Top Radios",
      ["Radio ID & Alias", "Employee Name", "Company", "Total Calls", "Total Duration"],
      topRadioUsers.map((item) => [`${item.radioId} - ${item.radioAlias}`, item.employeeName, item.company, formatNumber(item.calls), secondsToClock(item.durationSeconds)]),
      52,
      [170, 160, 130, 80, 95],
    );
    drawTable(
      "Top Users",
      ["User", "Total Calls", "Total Duration"],
      rankings.user.slice(0, 10).map((item) => [item.name, formatNumber(item.calls), secondsToClock(item.durationSeconds)]),
      nextY + 28,
      [360, 95, 110],
    );
    pdf.save("top-radios-users.pdf");
  }, [exportTitle, rankings.user, topRadioUsers]);

  const monthlyCompanyPivot = useMemo(() => {
    const companies = [...new Set(monthlyCompanyRows.map((row) => row.company))].sort((a, b) => a.localeCompare(b));
    const periods = [...new Set(monthlyCompanyRows.map((row) => row.period))].sort((a, b) => {
      const firstType = monthlyCompanyRows.find((row) => row.period === a)?.periodType;
      return firstType === "Week" ? weekSortValue(a) - weekSortValue(b) || a.localeCompare(b) : monthSortValue(a) - monthSortValue(b) || a.localeCompare(b);
    });
    const periodType = monthlyCompanyRows[0]?.periodType ?? "Period";
    const byKey = new Map(monthlyCompanyRows.map((row) => [`${row.period}||${row.company}`, row]));
    const totals = new Map(companies.map((company) => [company, { calls: 0, durationSeconds: 0 }]));
    const rows = periods.map((period) => {
      const values = companies.map((company) => {
        const row = byKey.get(`${period}||${company}`);
        const total = totals.get(company);
        if (total && row) {
          total.calls += row.calls;
          total.durationSeconds += row.durationSeconds;
        }
        return { calls: row?.calls ?? 0, durationSeconds: row?.durationSeconds ?? 0 };
      });
      return { period, label: periodType === "Week" ? period : shortMonthLabel(period), values };
    });
    return { companies, periodType, rows, totals };
  }, [monthlyCompanyRows]);

  const monthlyCompanyChartData = useMemo(() => {
    return monthlyCompanyRows.map((row) => ({
      category: `${row.periodType === "Week" ? row.period : shortMonthLabel(row.period)} - ${row.company}`,
      company: row.company,
      period: row.period,
      calls: row.calls,
      durationSeconds: row.durationSeconds,
    })).filter((row) => row.calls > 0 || row.durationSeconds > 0);
  }, [monthlyCompanyRows]);

  const patchWorkbookWithNativeChart = useCallback(async (buffer: ExcelJS.Buffer) => {
    const zip = await JSZip.loadAsync(buffer);
    const lastRow = Math.max(2, monthlyCompanyChartData.length + 1);
    const categoriesRef = `'ChartData'!$A$2:$A$${lastRow}`;
    const callsRef = `'ChartData'!$B$2:$B$${lastRow}`;
    const durationRef = `'ChartData'!$C$2:$C$${lastRow}`;
    const chartXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <c:date1904 val="0"/><c:lang val="en-US"/><c:roundedCorners val="0"/>
  <c:chart>
    <c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" b="1" sz="1400"/><a:t>${escapeXml(exportTitle("Calls and Duration per Company"))}</a:t></a:r></a:p></c:rich></c:tx><c:layout/></c:title>
    <c:plotArea><c:layout/>
      <c:barChart><c:barDir val="col"/><c:grouping val="clustered"/><c:varyColors val="0"/>
        <c:ser><c:idx val="0"/><c:order val="0"/><c:tx><c:v>Calls</c:v></c:tx><c:spPr><a:solidFill><a:srgbClr val="2D86B4"/></a:solidFill></c:spPr><c:cat><c:strRef><c:f>${categoriesRef}</c:f></c:strRef></c:cat><c:val><c:numRef><c:f>${callsRef}</c:f></c:numRef></c:val></c:ser>
        <c:ser><c:idx val="1"/><c:order val="1"/><c:tx><c:v>Duration Seconds</c:v></c:tx><c:spPr><a:solidFill><a:srgbClr val="8FD0E8"/></a:solidFill></c:spPr><c:cat><c:strRef><c:f>${categoriesRef}</c:f></c:strRef></c:cat><c:val><c:numRef><c:f>${durationRef}</c:f></c:numRef></c:val></c:ser>
        <c:axId val="12345678"/><c:axId val="12345679"/>
      </c:barChart>
      <c:catAx><c:axId val="12345678"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:tickLblPos val="low"/><c:crossAx val="12345679"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/></c:catAx>
      <c:valAx><c:axId val="12345679"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:majorGridlines/><c:numFmt formatCode="#,##0" sourceLinked="0"/><c:tickLblPos val="nextTo"/><c:crossAx val="12345678"/><c:crosses val="autoZero"/><c:crossBetween val="between"/></c:valAx>
    </c:plotArea>
    <c:legend><c:legendPos val="b"/><c:layout/><c:overlay val="0"/></c:legend>
    <c:plotVisOnly val="1"/>
  </c:chart>
  <c:printSettings><c:headerFooter/><c:pageMargins b="0.75" l="0.7" r="0.7" t="0.75" header="0.3" footer="0.3"/><c:pageSetup/></c:printSettings>
</c:chartSpace>`;
    const drawingXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <xdr:twoCellAnchor>
    <xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${monthlyCompanyPivot.rows.length + 5}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
    <xdr:to><xdr:col>12</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${monthlyCompanyPivot.rows.length + 25}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
    <xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="2" name="Calls Duration Chart"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rId1"/></a:graphicData></a:graphic></xdr:graphicFrame>
    <xdr:clientData/>
  </xdr:twoCellAnchor>
</xdr:wsDr>`;
    zip.file("xl/charts/chart1.xml", chartXml);
    zip.file("xl/drawings/drawing1.xml", drawingXml);
    zip.file("xl/drawings/_rels/drawing1.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart1.xml"/></Relationships>`);
    const sheetRelPath = "xl/worksheets/_rels/sheet1.xml.rels";
    const sheetRelXml = await zip.file(sheetRelPath)?.async("string");
    const nextRid = sheetRelXml ? `rId${(sheetRelXml.match(/Id="rId\d+"/g)?.length ?? 0) + 1}` : "rId1";
    const drawingRel = `<Relationship Id="${nextRid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>`;
    zip.file(sheetRelPath, sheetRelXml ? sheetRelXml.replace("</Relationships>", `${drawingRel}</Relationships>`) : `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${drawingRel}</Relationships>`);
    const sheetPath = "xl/worksheets/sheet1.xml";
    const sheetXml = await zip.file(sheetPath)?.async("string");
    if (sheetXml) {
      const withNs = sheetXml.includes("xmlns:r=") ? sheetXml : sheetXml.replace("<worksheet ", '<worksheet xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ');
      zip.file(sheetPath, withNs.replace("</worksheet>", `<drawing r:id="${nextRid}"/></worksheet>`));
    }
    const contentTypes = await zip.file("[Content_Types].xml")?.async("string");
    if (contentTypes) {
      const chartOverride = '<Override PartName="/xl/charts/chart1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>';
      const drawingOverride = '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>';
      let next = contentTypes;
      if (!next.includes('/xl/charts/chart1.xml')) next = next.replace("</Types>", `${chartOverride}</Types>`);
      if (!next.includes('/xl/drawings/drawing1.xml')) next = next.replace("</Types>", `${drawingOverride}</Types>`);
      zip.file("[Content_Types].xml", next);
    }
    return zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }, [exportTitle, monthlyCompanyChartData, monthlyCompanyPivot.rows.length]);

  const monthlyCompanyTableHtml = useCallback(() => {
    const { companies, periodType, rows, totals } = monthlyCompanyPivot;
    const bodyRows = rows.map((row) => {
      const cells = row.values.map((value) => {
        return `<td>${formatNumber(value.calls)}</td><td>${formatNumber(value.durationSeconds)}</td>`;
      }).join("");
      return `<tr><th>${htmlEscape(row.label)}</th>${cells}</tr>`;
    }).join("");
    const totalCells = companies.map((company) => {
      const total = totals.get(company) ?? { calls: 0, durationSeconds: 0 };
      return `<td>${formatNumber(total.calls)}</td><td>${formatNumber(total.durationSeconds)}</td>`;
    }).join("");
    return `
      <table>
        <thead>
          <tr><th class="period">Period</th>${companies.map((company) => `<th colspan="2">${htmlEscape(company)}</th>`).join("")}</tr>
          <tr><th>${htmlEscape(periodType === "Week" ? "Week" : "Month Year")}</th>${companies.map(() => "<th>Calls</th><th>Duration</th>").join("")}</tr>
        </thead>
        <tbody>${bodyRows}</tbody>
        <tfoot><tr><th>Total</th>${totalCells}</tr></tfoot>
      </table>
    `;
  }, [monthlyCompanyPivot]);

  const captureMonthlyCompanyTable = useCallback(async () => {
    const wrapper = document.createElement("div");
    wrapper.className = "export-capture-table";
    wrapper.innerHTML = `<h1>${htmlEscape(exportTitle("Calls and Duration per Company"))}</h1>${monthlyCompanyTableHtml()}`;
    document.body.appendChild(wrapper);
    try {
      return await captureElementPng(wrapper, "#ffffff");
    } finally {
      wrapper.remove();
    }
  }, [exportTitle, monthlyCompanyTableHtml]);

  const captureMonthlyCompanyChart = useCallback(async () => {
    const chart = monthlyCompanyChartRef.current?.querySelector(".recharts-wrapper") as HTMLElement | null;
    if (!chart) throw new Error("Chart is not ready yet.");
    return captureElementPng(chart, "#0f1b24");
  }, []);

  const monthlyCompanyChartHtml = useCallback(() => {
    return monthlyCompanyChartRef.current?.querySelector(".recharts-wrapper")?.outerHTML ?? "";
  }, []);

  const monthlyCompanyExportHtml = useCallback((autoPrint = false) => {
    const chartHtml = monthlyCompanyChartHtml();
    const tableHtml = monthlyCompanyTableHtml();
    return `
      <!doctype html>
      <html>
        <head>
          <title>${htmlEscape(exportTitle("No. of Calls and Duration per Company"))}</title>
          <style>
            body { margin: 0; padding: 18px; font-family: Arial, sans-serif; background: #f4f6f8; color: #050505; }
            h1 { margin: 0 0 12px; text-align: center; font-size: 22px; }
            .table-wrap { overflow: auto; border: 1px solid #111; background: #fff; }
            table { width: max-content; min-width: 100%; border-collapse: collapse; table-layout: auto; }
            th, td { border: 1px solid #111; padding: 6px 8px; text-align: center; white-space: nowrap; }
            thead th { background: #fff; font-weight: 800; }
            thead tr:first-child th { font-size: 16px; }
            tbody th, tfoot th { background: #f8fafc; font-weight: 800; }
            tfoot td, tfoot th { background: #fff200; font-weight: 900; }
            .period { width: 120px; }
            .chart-wrap { margin-top: 22px; padding: 14px; background: #0f1b24; border: 1px solid #111; overflow: auto; }
            .chart-wrap svg { max-width: 100%; height: auto; }
            @media print { body { background: #fff; padding: 0; } .table-wrap { border: 0; } }
          </style>
        </head>
        <body>
          <h1>${htmlEscape(exportTitle("No. of Calls and Duration per Company"))}</h1>
          <div class="table-wrap">${tableHtml}</div>
          <div class="chart-wrap">${chartHtml}</div>
          ${autoPrint ? "<script>window.onload = () => setTimeout(() => window.print(), 250);</script>" : ""}
        </body>
      </html>
    `;
  }, [exportTitle, monthlyCompanyChartHtml, monthlyCompanyTableHtml]);

  const exportMonthlyCompanyXlsx = useCallback(async () => {
    const { companies, periodType, rows, totals } = monthlyCompanyPivot;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Calls Duration Pivot", { views: [{ showGridLines: false }] });
    const chartData = workbook.addWorksheet("ChartData", { state: "hidden" });
    const headerFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFFFFF00" } };
    const border = { top: { style: "thin" as const }, left: { style: "thin" as const }, bottom: { style: "thin" as const }, right: { style: "thin" as const } };

    worksheet.addRow([exportTitle("Calls and Duration per Company")]);
    worksheet.mergeCells(1, 1, 1, 1 + companies.length * 2);
    worksheet.addRow(["Period", ...companies.flatMap((company) => [company, ""])]);
    worksheet.addRow([periodType === "Week" ? "Week" : "Month Year", ...companies.flatMap(() => ["Calls", "Duration"])]);
    companies.forEach((_, index) => worksheet.mergeCells(2, 2 + index * 2, 2, 3 + index * 2));
    rows.forEach((row) => worksheet.addRow([row.label, ...row.values.flatMap((value) => [value.calls, value.durationSeconds])]));
    worksheet.addRow(["Total", ...companies.flatMap((company) => {
      const total = totals.get(company) ?? { calls: 0, durationSeconds: 0 };
      return [total.calls, total.durationSeconds];
    })]);

    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = border;
        if (rowNumber <= 3 || rowNumber === rows.length + 4) {
          cell.font = { bold: true };
          cell.fill = rowNumber === rows.length + 4 || rowNumber === 1 ? headerFill : undefined;
        }
      });
    });
    worksheet.columns = [{ width: 16 }, ...companies.flatMap((company) => [{ width: Math.max(12, company.length + 3) }, { width: 14 }])];
    chartData.addRow(["Category", "Calls", "Duration Seconds"]);
    monthlyCompanyChartData.forEach((row) => chartData.addRow([row.category, row.calls, row.durationSeconds]));
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
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 24;
      const totalCols = 1 + companies.length * 2;
      const cellW = Math.min(86, (pageWidth - margin * 2) / totalCols);
      const tableW = cellW * totalCols;
      const startX = (pageWidth - tableW) / 2;
      const rowH = 28;
      let y = 58;
      const drawCell = (text: string, x: number, cy: number, w: number, h: number, fill?: string, bold = false) => {
        if (fill) {
          pdf.setFillColor(fill);
          pdf.rect(x, cy, w, h, "F");
        }
        pdf.setDrawColor(0);
        pdf.rect(x, cy, w, h);
        pdf.setFont("helvetica", bold ? "bold" : "normal");
        pdf.setFontSize(8);
        pdf.text(String(text), x + w / 2, cy + h / 2 + 3, { align: "center", maxWidth: w - 4 });
      };
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.text(exportTitle("Calls and Duration per Company"), pageWidth / 2, 30, { align: "center" });
      drawCell("Period", startX, y, cellW, rowH, "#fff200", true);
      companies.forEach((company, index) => drawCell(company, startX + cellW + index * cellW * 2, y, cellW * 2, rowH, "#fff200", true));
      y += rowH;
      drawCell(periodType === "Week" ? "Week" : "Month Year", startX, y, cellW, rowH, "#fff200", true);
      companies.forEach((_, index) => {
        drawCell("Calls", startX + cellW + index * cellW * 2, y, cellW, rowH, "#ffffff", true);
        drawCell("Duration", startX + cellW * 2 + index * cellW * 2, y, cellW, rowH, "#ffffff", true);
      });
      y += rowH;
      rows.forEach((row) => {
        if (y + rowH > pageHeight - margin) {
          pdf.addPage("a4", "landscape");
          y = margin;
        }
        drawCell(row.label, startX, y, cellW, rowH, "#f8fafc", true);
        row.values.forEach((value, index) => {
          drawCell(formatNumber(value.calls), startX + cellW + index * cellW * 2, y, cellW, rowH);
          drawCell(formatNumber(value.durationSeconds), startX + cellW * 2 + index * cellW * 2, y, cellW, rowH);
        });
        y += rowH;
      });
      drawCell("Total", startX, y, cellW, rowH, "#fff200", true);
      companies.forEach((company, index) => {
        const total = totals.get(company) ?? { calls: 0, durationSeconds: 0 };
        drawCell(formatNumber(total.calls), startX + cellW + index * cellW * 2, y, cellW, rowH, "#fff200", true);
        drawCell(formatNumber(total.durationSeconds), startX + cellW * 2 + index * cellW * 2, y, cellW, rowH, "#fff200", true);
      });
      const tableBottom = y + rowH;
      const chartMargin = 10;
      const props = pdf.getImageProperties(chartPng);
      const gap = 18;
      const remainingHeight = pageHeight - tableBottom - gap - chartMargin;
      const samePage = remainingHeight >= 170;
      if (!samePage) pdf.addPage("a4", "landscape");
      const chartTop = samePage ? tableBottom + gap : chartMargin;
      const maxChartWidth = pageWidth - chartMargin * 2;
      const maxChartHeight = samePage ? remainingHeight : pageHeight - chartMargin * 2;
      const chartRatio = Math.min(maxChartWidth / props.width, maxChartHeight / props.height);
      const chartWidth = props.width * chartRatio;
      const chartHeight = props.height * chartRatio;
      pdf.addImage(chartPng, "PNG", (pageWidth - chartWidth) / 2, samePage ? chartTop : (pageHeight - chartHeight) / 2, chartWidth, chartHeight);
      pdf.save("calls-duration-per-company.pdf");
    })();
  }, [captureMonthlyCompanyChart, exportTitle, monthlyCompanyPivot]);

  const exportMonthlyCompanyPpt = useCallback(() => {
    void (async () => {
      const { companies, periodType, rows, totals } = monthlyCompanyPivot;
      const pptx = new pptxgen();
      pptx.layout = "LAYOUT_WIDE";
      pptx.author = "CDR Dashboard";
      const tableSlide = pptx.addSlide();
      tableSlide.addText(exportTitle("Calls and Duration per Company - Table"), { x: 0.3, y: 0.18, w: 12.7, h: 0.35, fontSize: 18, bold: true, align: "center", color: "111111" });
      const pptRows = [
        ["Period", ...companies.flatMap((company) => [`${company} Calls`, `${company} Duration`])],
        ...rows.map((row) => [row.label, ...row.values.flatMap((value) => [formatNumber(value.calls), formatNumber(value.durationSeconds)])]),
        ["Total", ...companies.flatMap((company) => {
          const total = totals.get(company) ?? { calls: 0, durationSeconds: 0 };
          return [formatNumber(total.calls), formatNumber(total.durationSeconds)];
        })],
      ];
      const tableX = 0.2;
      const tableY = 0.7;
      const tableW = 12.93;
      const colW = tableW / Math.max(1, pptRows[0].length);
      const rowH = Math.min(0.42, 6.45 / Math.max(1, pptRows.length));
      pptRows.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
          const isHeader = rowIndex === 0 || rowIndex === pptRows.length - 1;
          tableSlide.addShape(pptx.ShapeType.rect, {
            x: tableX + colIndex * colW,
            y: tableY + rowIndex * rowH,
            w: colW,
            h: rowH,
            fill: { color: isHeader ? "FFF200" : "FFFFFF" },
            line: { color: "111111", width: 0.5 },
          });
          tableSlide.addText(cell, {
            x: tableX + colIndex * colW + 0.01,
            y: tableY + rowIndex * rowH + 0.02,
            w: colW - 0.02,
            h: rowH - 0.04,
            fontSize: rowIndex === 0 ? 5.7 : 6.3,
            bold: isHeader,
            align: "center",
            valign: "mid",
            color: "111111",
            fit: "shrink",
            margin: 0,
          });
        });
      });
      const chartSlide = pptx.addSlide();
      chartSlide.addText(exportTitle("Calls and Duration per Company - Chart"), { x: 0.3, y: 0.18, w: 12.7, h: 0.35, fontSize: 18, bold: true, align: "center", color: "111111" });
      chartSlide.addChart("bar", [
        { name: "Calls", labels: monthlyCompanyChartData.map((row) => row.category), values: monthlyCompanyChartData.map((row) => row.calls) },
        { name: "Duration Seconds", labels: monthlyCompanyChartData.map((row) => row.category), values: monthlyCompanyChartData.map((row) => row.durationSeconds) },
      ], {
        x: 0.45,
        y: 0.75,
        w: 12.4,
        h: 6.25,
        showLegend: true,
        showTitle: false,
        catAxisLabelRotate: 270,
        valAxisLabelColor: "111111",
        catAxisLabelColor: "111111",
        chartColors: ["2D86B4", "8FD0E8"],
      });
      await pptx.writeFile({ fileName: "calls-duration-per-company.pptx" });
    })();
  }, [exportTitle, monthlyCompanyChartData, monthlyCompanyPivot]);

  const openMonthlyCompanyTable = useCallback(() => {
    const tableWindow = window.open("", "cdr-monthly-company-table", "width=1400,height=800,scrollbars=yes,resizable=yes");
    if (!tableWindow) return;
    tableWindow.document.open();
    tableWindow.document.write(monthlyCompanyExportHtml(false));
    tableWindow.document.close();
    tableWindow.focus();
  }, [monthlyCompanyExportHtml]);

  const chartExportDatasets = useMemo<Record<string, ChartExportDataset>>(() => {
    const valueDataset = (headers: string[], rows: { name: string; value: number }[]): ChartExportDataset => ({
      headers,
      rows: rows.map((row) => [row.name, row.value]),
    });
    const rankingDataset = (rows: Ranking[]): ChartExportDataset => ({
      headers: ["Name", "Calls", "Duration Seconds", "Traffic Hours", "Radios"],
      rows: rows.map((row) => [row.name, row.calls, row.durationSeconds, formatDecimal(row.trafficHours, 3), row.radios]),
    });
    const mobileDataset = (rows: Record<string, string | number>[], firstColumn: string): ChartExportDataset => ({
      headers: [firstColumn, "Total Radios", ...mobileTypes],
      rows: rows.map((row) => [`${row.name}`, Number(row.total ?? 0), ...mobileTypes.map((type) => Number(row[mobileTypeKey(type)] ?? 0))]),
    });
    return {
      "KPI Average Duration per Company": {
        headers: ["Company", "KPI Avg Duration per Activated User (sec)", "Users Activated", "Calling Users"],
        rows: kpiRows.map((row) => [row.company, formatDecimal(row.kpiAvgDurationPerUser, 2), row.usersActivated, row.callingUsers]),
      },
      "KPI Calls and Duration per Company": {
        headers: ["Company", "Calls", "Duration Seconds", "Duration"],
        rows: kpiRows.map((row) => [row.company, row.calls, row.durationSeconds, secondsToClock(row.durationSeconds)]),
      },
      "Monthly KPI": {
        headers: ["Company", ...monthlyKpi.months.map((month) => shortMonthLabel(month.name))],
        rows: monthlyKpi.rows.map((row) => [`${row.company}`, ...monthlyKpi.months.map((month) => row[month.key] == null ? "" : Number(row[month.key]))]),
      },
      "KPI Total Avg. Duration": valueDataset(["Month", "Avg Duration per Call (sec)"], monthlyKpiPieData),
      "Company Calls & Duration Performance": {
        headers: ["Company", "Calls", "Duration Seconds", "Duration", "Avg Duration per Call"],
        rows: CompanyRows.map((row) => [row.name, row.calls, row.durationSeconds, secondsToClock(row.durationSeconds), secondsToClock(row.calls ? row.durationSeconds / row.calls : 0)]),
      },
      "Total Calls per Company": valueDataset(["Company", "Calls"], CompanyChartData.calls),
      "Total Duration per Company": {
        headers: ["Company", "Duration Seconds", "Duration"],
        rows: CompanyChartData.duration.map((row) => [row.name, row.value, secondsToClock(row.value)]),
      },
      "Talkgroups per Company": {
        headers: ["Company", "Total Talkgroups", "Used Talkgroups"],
        rows: CompanyRows.map((row) => [row.name, row.talkgroupsTotal, row.talkgroupsUsed]),
      },
      "Radios per Company": {
        headers: ["Company", "Total Radios", "Radios Made Calls"],
        rows: CompanyRows.map((row) => [row.name, row.usersTotal, row.callingUsers]),
      },
      "Radios Type per Company": mobileDataset(mobileTypeByCompany, "Company"),
      "Calls and Duration per Company": {
        headers: ["Period", "Company", "Calls", "Duration Seconds", "Duration"],
        rows: monthlyCompanyRows.map((row) => [row.period, row.company, row.calls, row.durationSeconds, secondsToClock(row.durationSeconds)]),
      },
      "Monthly Performance": rankingDataset(rankings.month),
      "Radios per Month": {
        headers: ["Month", "Radios", "Share"],
        rows: radioMonths.map((row) => [row.name, row.radios, formatPercent(row.share, 2)]),
      },
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
    cards.forEach((card) => {
      if (card.querySelector(".chart-export-actions")) return;
      const title = card.querySelector("h3")?.textContent?.trim() || "Dashboard Card";
      const dataset = chartExportDatasets[title];
      if (dataset) {
        const xlsxButton = document.createElement("button");
        xlsxButton.type = "button";
        xlsxButton.className = "button small quick-card-export quick-card-export-xlsx";
        xlsxButton.innerHTML = `${exportIconSvg("xlsx")}<span>XLSX</span>`;
        xlsxButton.title = `Export ${title} data`;
        xlsxButton.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          downloadWorkbookData(`${fileSlug(exportTitle(title))}.xlsx`, title, exportTitle(title), dataset);
        });
        card.appendChild(xlsxButton);
        buttons.push(xlsxButton);
      }
      const button = document.createElement("button");
      button.type = "button";
      button.className = "button small quick-card-export";
      button.innerHTML = `${exportIconSvg("png")}<span>PNG</span>`;
      button.title = `Export ${title}`;
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const exportButtons = Array.from(card.querySelectorAll<HTMLElement>(".quick-card-export"));
        exportButtons.forEach((item) => { item.style.visibility = "hidden"; });
        try {
          await new Promise((resolve) => requestAnimationFrame(resolve));
          const image = await captureElementPng(card, "#0f1b24");
          downloadDataUrl(`${fileSlug(exportTitle(title))}.png`, image);
        } finally {
          exportButtons.forEach((item) => { item.style.visibility = ""; });
        }
      });
      card.appendChild(button);
      buttons.push(button);
    });
    return () => buttons.forEach((button) => button.remove());
  }, [CompanyPeriodLabel, chartExportDatasets, data, exportTitle, filtered.length, page]);

  if (!data) return <UploadView onUpload={handleUpload} onLoadSaved={handleLoadSavedWorkbook} savedWorkbook={savedWorkbook} isParsing={isParsing} isLoadingSaved={isLoadingSaved} error={error} theme={theme} onToggleTheme={toggleTheme} />;

  return (
    <main className={`app-shell ${themeClass(theme)}`}>
      <header className="topbar">
        <div className="brand-block">
          <img src="/assets/nascologo.png" alt="NASCO" />
          <p>CDR Command Center</p>
          <h1>DMR Call Data Records Analasys</h1>
        </div>
        <div className="topbar-actions">
          <img className="brand-logo" src="/assets/se.png" alt="Saudi Energy" />
          <img className="brand-logo" src="/assets/nglogo.png" alt="National Grid" />
          <button className="button small theme-toggle" type="button" onClick={toggleTheme}>
            <Palette size={14} />
            {theme === "se" ? "Dark Theme" : "Light Theme"}
          </button>
          <label className="button primary">
            <UploadCloud size={16} />
            Upload
            <input type="file" accept=".xlsx,.xls,.xlsm,.xlsb" onChange={handleUpload} />
          </label>
          <button className="button" onClick={exportSummary}><Download size={16} /> Summary</button>
          <button className="button" onClick={exportRows}><Download size={16} /> Rows</button>
        </div>
      </header>

      <nav className="section-nav">
        {SECTION_NAV_ITEMS.map((item) => (
          <button key={item.id} type="button" onClick={() => scrollToSection(item.id)}>
            {item.label}
          </button>
        ))}
      </nav>

      <section id="command" className="hero-panel">
        <div className="hero-main">
          <p className="eyebrow">Live workbook profile</p>
          <h2>{formatNumber(metrics.totalCalls)} calls under analysis</h2>
          {/* <p>{formatPercent(filteredShare, 1)} of the uploaded register is in the current view. Peak demand is {peakHour?.name ?? "--"} and {topCompany?.name ?? "no company"} leads the selected activity.</p> */}
          {/* <div className="hero-insights">
            <span><strong>{topCompany?.name ?? "--"}</strong> top company</span>
            <span><strong>{topStation?.name ?? "--"}</strong> top station</span>
            <span><strong>{topTalkgroup?.name ?? "--"}</strong> top talkgroup</span>
            <span><strong>{formatNumber(metrics.radios)}</strong> active radios</span>
          </div> */}
        </div>
        <div className="workbook-card">
          <ShieldCheck size={28} />
          <span>Workbook</span>
          <strong>{data.fileName}</strong>
          <p>{formatNumber(data.rawRows)} records - loaded {data.loadedAt}</p>
        </div>
      </section>

      {data.warnings.length > 0 && (
        <div className="warning-strip"><AlertTriangle size={18} /> {data.warnings.join(" ")}</div>
      )}

      <section id="filters" className="filters-panel">
        <label className="search-box search-compact">
          <span>Search Radio / User</span>
          <Search size={16} />
          <input value={filters.search} onChange={(event) => { setFilters((current) => ({ ...current, search: event.target.value })); setPage(1); }} placeholder="Radio ID, alias, user, employee ID" />
        </label>
        <MultiSelectFilter className="filter-compact" label="Region" value={filters.region} options={options.region} onChange={(region) => { setFilters((current) => ({ ...current, region })); setPage(1); }} />
        <MultiSelectFilter className="filter-compact" label="Year" value={filters.year} options={options.year} onChange={(year) => { setFilters((current) => ({ ...current, year })); setPage(1); }} />
        <MultiSelectFilter className="filter-compact" label="Month" value={filters.month} options={options.month} onChange={(month) => { setFilters((current) => ({ ...current, month })); setPage(1); }} />
        <MultiSelectFilter className="filter-company" label="Company" value={filters.company} options={options.company} onChange={(company) => { setFilters((current) => ({ ...current, company })); setPage(1); }} />
        <MultiSelectFilter className="filter-xwide" label="Base Station" value={filters.baseStation} options={options.baseStation} onChange={(baseStation) => { setFilters((current) => ({ ...current, baseStation })); setPage(1); }} />
        <MultiSelectFilter className="filter-wide" label="Talkgroup" value={filters.talkgroup} options={options.talkgroup} optionLabels={talkgroupLabels} onChange={(talkgroup) => { setFilters((current) => ({ ...current, talkgroup })); setPage(1); }} />
        <button className="button" onClick={() => { setFilters(EMPTY_FILTERS); setPage(1); }}><X size={16} /> Clear</button>
        <span className="filter-count">{formatNumber(filtered.length)} from {formatNumber(records.length)}</span>
      </section>

      <section className="summary-cards">
        <div className="summary-card yellow"><span>Total Calls</span><strong>{formatNumber(metrics.totalCalls)}</strong></div>
        <div className="summary-card green"><span>Total Duration</span><strong>{secondsToClock(metrics.totalDuration)}</strong></div>
        <div className="summary-card yellow"><span>Max Duration</span><strong>{secondsToClock(maxDuration)}</strong></div>
        <div className="summary-card green"><span>Min Duration</span><strong>{secondsToClock(minDuration)}</strong></div>
        <div className="summary-card yellow"><span>Average Duration</span><strong>{secondsToClock(metrics.averageDuration)}</strong></div>
        <div className="summary-card yellow"><span>Companies</span><strong>{formatNumber(metrics.companies)}</strong></div>
        <div className="summary-card yellow"><span>Base Stations</span><strong>{formatNumber(metrics.stations)}</strong></div>
        <div className="summary-card green"><span>Talkgroups</span><strong>{formatNumber(metrics.talkgroups)}</strong></div>
        <div className="summary-card green"><span>Radios</span><strong>{formatNumber(metrics.radios)}</strong></div>
        <div className="summary-card yellow"><span>Peak Radio</span><strong>{peakRadioEntry?.[0] ?? "--"}</strong></div>
        <div className="summary-card green"><span>Peak User Name</span><strong>{peakUserParts[0] ?? "--"}</strong></div>
        <div className="summary-card yellow"><span>Peak User ID</span><strong>{peakUserParts[1] ?? "--"}</strong></div>
        <div className="summary-card yellow"><span>Peak User Company</span><strong>{peakUserParts[2] ?? "--"}</strong></div>
        <div className="summary-card yellow"><span>Peak Month</span><strong>{peakMonthEntry?.[0] ?? "--"}</strong></div>
        <div className="summary-card green"><span>Peak Week</span><strong>{peakWeekEntry?.[0] ?? "--"}</strong></div>
        <div className="summary-card yellow"><span>Peak Day</span><strong>{peakDayEntry?.[0] ?? "--"}</strong></div>
        <div className="summary-card green"><span>Peak Company</span><strong>{topCompany?.name ?? "--"}</strong></div>
        <div className="summary-card yellow"><span>Peak Talkgroup</span><strong>{topTalkgroup?.name ?? "--"}</strong></div>
        <div className="summary-card green"><span>Peak Base Station</span><strong>{topStation?.name ?? "--"}</strong></div>        
        <div className="summary-card green"><span>Traffic (Erlangs)</span><strong>{formatDecimal(metrics.trafficHours, 1)}</strong></div>
        <div className="summary-card yellow"><span>Busy Hour</span><strong>{peakHour?.name ?? "--"}</strong></div>
        <div className="summary-card green"><span>Peak Traffic (Erlangs)</span><strong>{formatDecimal(peakTrafficHour?.trafficHours ?? 0, 1)}</strong></div>
        <div className="summary-card yellow"><span>Peak Hour Calls</span><strong>{formatNumber(peakHour?.calls ?? 0)}</strong></div>
        <div className="summary-card green"><span>Peak Hour Avg Duration</span><strong>{formatDecimal(peakHourAvgDuration, 1)}</strong></div>
      </section>

      <SectionTitle
        id="kpi"
        eyebrow="KPI recreation"
        title="KPI Table"
        collapsed={isSectionCollapsed("kpi")}
        onToggle={() => toggleSection("kpi")}
        actions={(
          <>
            <ExportButton kind="xlsx" label="XLSX" onClick={exportKpiXlsx} />
            <ExportButton kind="ppt" label="PPT" onClick={exportKpiPpt} />
            <ExportButton kind="pdf" label="PDF" onClick={exportKpiPdf} />
          </>
        )}
      />
      <section id="kpi-content" className={`kpi-grid ${isSectionCollapsed("kpi") ? "section-content-collapsed" : ""}`}>
        <article className="table-card kpi-table">
          <h3>KPI sheet table</h3>
          <div className="records-scroll small" ref={kpiTableRef}>
            <table>
              <thead>
                <tr>
                  <th>Call Source</th>
                  <th>Talk groups in use</th>
                  <th>No. of Calls</th>
                  <th>Duration (Sec)</th>
                  <th>Duration (hh:mm:ss)</th>
                  <th>Total No. of Users activated</th>
                  <th>Call Performed by (No. of Users)</th>
                  <th>KPI (Avg. Duration per User per Company) in sec</th>
                  <th>KPI</th>
                </tr>
              </thead>
              <tbody>
                {kpiRows.map((row, index) => (
                  <tr key={row.company}>
                    <td>{row.company}</td>
                    <td>{formatNumber(row.talkgroupsInUse)}</td>
                    <td>{formatNumber(row.calls)}</td>
                    <td>{formatNumber(row.durationSeconds)}</td>
                    <td>{secondsToClock(row.durationSeconds)}</td>
                    <td>{formatNumber(row.usersActivated)}</td>
                    <td>{formatNumber(row.callingUsers)}</td>
                    <td>{formatNumber(row.kpiAvgDurationPerUser)}</td>
                    <td>{index === 0 ? formatNumber(kpiAverage) : ""}</td>
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
              <YAxis type="category" dataKey="company" width={140} tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} tickFormatter={(value) => truncateLabel(value, 18)} interval={0} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number) => [`${formatDecimal(value, 1)} sec`, "KPI avg duration"]} />
              <Bar dataKey="kpiAvgDurationPerUser" fill={CHART_COLORS.calls}>
                <LabelList dataKey="kpiAvgDurationPerUser" content={RightValueLabel} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <ChartLegend items={[{ name: "Average duration per activated user", color: CHART_COLORS.calls }]} />
        </article>
        
        <article className="chart-card" ref={kpiCallsDurationChartRef}>
          <h3>KPI Calls and Duration per Company</h3>
          <ResponsiveContainer width="100%" height={390}>
            <ComposedChart data={kpiRows} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" opacity={0.32} />
              <XAxis dataKey="company" tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} angle={-55} textAnchor="end" interval={0} tickMargin={12} height={128} tickFormatter={(value) => truncateLabel(value, 18)} />
              <YAxis yAxisId="calls" tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} />
              <YAxis yAxisId="duration" orientation="right" tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number) => formatNumber(value)} />
              <Line yAxisId="calls" dataKey="calls" stroke={CHART_COLORS.calls} strokeWidth={3} dot={{ r: 4, fill: CHART_COLORS.calls }} name="Calls">
                <LabelList dataKey="calls" content={KpiBarLabel} />
              </Line>
              <Line yAxisId="duration" dataKey="durationSeconds" stroke={CHART_COLORS.duration} strokeWidth={3} name="Duration seconds">
                <LabelList dataKey="durationSeconds" content={KpiLineLabel} />
              </Line>
            </ComposedChart>
          </ResponsiveContainer>
          <ChartLegend items={[{ name: "Calls", color: CHART_COLORS.calls }, { name: "Duration seconds", color: CHART_COLORS.duration }]} />
        </article>
        
        <article className="chart-card monthly-kpi-card" ref={monthlyKpiChartRef}>
          <h3>Monthly KPI</h3>
          <p>(Avg. call duration per company) in sec</p>
          <ResponsiveContainer width="100%" height={430}>
            <LineChart data={monthlyKpi.rows} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" opacity={0.32} />
              <XAxis dataKey="company" tick={{ fill: CHART_COLORS.axis, fontSize: 11, fontWeight: 700 }} tickFormatter={(value) => truncateLabel(value, 22)} interval={0} angle={-35} textAnchor="end" tickMargin={12} height={82} />
              <YAxis
                tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
                tickFormatter={(value) => `${formatDecimal(Number(value), 0)}s`}
                domain={[0, "dataMax + 20"]}
                label={{ value: "Average duration (sec)", angle: -90, position: "insideLeft", fill: CHART_COLORS.axis, fontSize: 12 }}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(value: number, name: string) => [value == null ? "" : `${formatDecimal(value, 2)} sec`, name]}
              />
              {monthlyKpi.months.map((month) => (
                <Line key={month.key} type="monotone" dataKey={month.key} name={shortMonthLabel(month.name)} stroke={month.color} strokeWidth={3} dot={{ r: 6 }} activeDot={{ r: 8 }} connectNulls={false}>
                  <LabelList dataKey={month.key} content={(props) => <PointValueLabel {...props} fill={month.color} />} />
                </Line>
              ))}
            </LineChart>
          </ResponsiveContainer>
          <div className="chart-legend">
            {monthlyKpi.months.map((month) => <span key={month.key}><i style={{ background: month.color }} />{shortMonthLabel(month.name)}</span>)}
          </div>
        </article>
        
        <article className="chart-card monthly-kpi-card" ref={kpiTotalAvgChartRef}>
          <h3>KPI Total Avg. Duration</h3>
          <p>Average call duration by month in sec</p>
          <div className="Company-pie-layout">
            <ResponsiveContainer width="64%" height={430}>
              <PieChart margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
                <Pie data={monthlyKpiPieData} dataKey="value" nameKey="name" outerRadius={180} innerRadius={100} paddingAngle={2} label={PieDecimalLabel} labelLine={false}>
                  {monthlyKpiPieData.map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number) => [`${formatDecimal(value, 2)} sec`, "Average duration"]} />
              </PieChart>
            </ResponsiveContainer>
            <ChartLegend className="pie-legend kpi-total-avg-legend" items={monthlyKpiPieData.map((item, index) => ({ name: item.name, color: COLORS[index % COLORS.length] }))} />
          </div>
        </article>
      </section>

      <SectionTitle
        id="Company"
        eyebrow="Company deck"
        title={`Company contribution in ${CompanyPeriodLabel}`}
        collapsed={isSectionCollapsed("Company")}
        onToggle={() => toggleSection("Company")}
        actions={(
          <>
            <ExportButton kind="view" label="View" onClick={openMonthlyCompanyTable} />
            <ExportButton kind="xlsx" label="XLSX" onClick={exportMonthlyCompanyXlsx} />
            <ExportButton kind="ppt" label="PPT" onClick={exportMonthlyCompanyPpt} />
            <ExportButton kind="pdf" label="PDF" onClick={exportMonthlyCompanyPdf} />
          </>
        )}
      />

      <section id="Company-content" className={`chart-grid dashboard-chart-grid company-chart-grid ${isSectionCollapsed("Company") ? "section-content-collapsed" : ""}`}>
        {/* Company contribution charts */}

        <article className="chart-card Company-card company-talkgroups" style={{ minWidth: 0, overflow: "hidden" }}>
          <h3>Talkgroups per Company</h3>
          <p>Total {formatNumber(sumValues(CompanyChartData.totalTalkgroups))} &nbsp;·&nbsp; Used {formatNumber(sumValues(CompanyChartData.talkgroupsUsed))}</p>
          <ChartLegend items={[{ name: "Total talkgroups", color: CHART_COLORS.total }, { name: "Used talkgroups", color: CHART_COLORS.used }]} />
          <ResponsiveContainer width="100%" height={340}>
            <BarChart
              data={CompanyChartData.totalTalkgroups.map((item) => ({
                name: item.name,
                total: item.value,
                used: CompanyChartData.talkgroupsUsed.find((u) => u.name === item.name)?.value ?? 0,
              }))}
              margin={{ left: 0, right: 0, top: 12, bottom: 0 }}
            >
              <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" opacity={0.32} vertical={false} />
              <XAxis dataKey="name" tick={{ fill: CHART_COLORS.axis, fontSize: 9 }} axisLine={false} tickLine={false} interval={0} angle={-45} textAnchor="end" height={40} tickMargin={0} tickFormatter={(v) => truncateLabel(v, 12)} />
              <YAxis tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatNumber(v)} domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.35)]} allowDataOverflow={false} />
              <Tooltip content={<TalkgroupTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar
                dataKey="total"
                name="total"
                shape={(props: any) => <OverlayBarShape {...props} totalColor={CHART_COLORS.total} usedColor={CHART_COLORS.used} />}
              >
                <LabelList dataKey="total" content={() => null} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </article>
        <article className="chart-card Company-card company-radios" style={{ minWidth: 0, overflow: "hidden" }}>
          <h3>Radios per Company</h3>
          <p>Total {formatNumber(sumValues(CompanyChartData.totalUsers))} &nbsp;·&nbsp; Made Calls {formatNumber(sumValues(CompanyChartData.callingUsers))}</p>
          <ChartLegend items={[{ name: "Total radios", color: CHART_COLORS.totalGreen }, { name: "Radios made calls", color: CHART_COLORS.usedGreen }]} />
          <ResponsiveContainer width="100%" height={340}>
            <BarChart
              data={CompanyChartData.totalUsers.map((item) => ({
                name: item.name,
                total: item.value,
                used: CompanyChartData.callingUsers.find((u) => u.name === item.name)?.value ?? 0,
              }))}
              margin={{ left: 0, right: 0, top: 12, bottom: 0 }}
            >
              <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" opacity={0.32} vertical={false} />
              <XAxis dataKey="name" tick={{ fill: CHART_COLORS.axis, fontSize: 9 }} axisLine={false} tickLine={false} interval={0} angle={-45} textAnchor="end" height={40} tickMargin={0} tickFormatter={(v) => truncateLabel(v, 12)} />
              <YAxis tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatNumber(v)} domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.35)]} allowDataOverflow={false} />
              <Tooltip content={<RadioTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar
                dataKey="total"
                name="total"
                shape={(props: any) => <OverlayBarShape {...props} totalColor={CHART_COLORS.totalGreen} usedColor={CHART_COLORS.usedGreen} />}
              >
                <LabelList dataKey="total" content={() => null} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </article>
        <article className="chart-card Company-card company-radio-type" style={{ minWidth: 0, overflow: "hidden" }}>
          <h3>Radios Type per Company</h3>
          <p>Total radios {formatNumber(mobileTypeByCompany.reduce((sum, row) => sum + Number(row.total ?? 0), 0))}</p>
          <ChartLegend items={[{ name: "Total radios", color: CHART_COLORS.total }, ...mobileTypes.map((type) => ({ name: type, color: mobileTypeColor(type) }))]} />
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={mobileTypeByCompany} margin={{ left: 0, right: 0, top: 14, bottom: 0 }} barCategoryGap="14%" barGap={2}>
              <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" opacity={0.32} vertical={false} />
              <XAxis dataKey="name" tick={{ fill: CHART_COLORS.axis, fontSize: 9 }} axisLine={false} tickLine={false} interval={0} angle={-45} textAnchor="end" height={44} tickMargin={2} tickFormatter={(v) => truncateLabel(v, 12)} />
              <YAxis tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatNumber(v)} domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.28)]} />
              <Tooltip content={(props) => <MobileTypeTooltip {...props} mobileTypes={mobileTypes} />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar
                dataKey="total"
                name="Total radios"
                maxBarSize={72}
                shape={(props: any) => <MobileTypeOverlayBarShape {...props} mobileTypes={mobileTypes} />}
              >
                <LabelList dataKey="total" content={() => null} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </article>
        <article className="chart-card wide monthly-Company-card" ref={monthlyCompanyChartRef}>
          <h3>Calls and Duration per Company</h3>
          <div className="company-color-legend">
            {[...new Set(monthlyCompanyRows.map((row) => row.company))].map((company) => (
              <span key={company}>
                <i style={{ background: companyColor(company) }} />
                {company}
              </span>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={430}>
            <BarChart data={monthlyCompanyRows} margin={{ left: 0, right: 0, top: 0, bottom: 0 }} barCategoryGap="20%">
              <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" opacity={0.32} />
              <XAxis
                xAxisId="company"
                dataKey="companyLabel"
                interval={0}
                angle={-90}
                textAnchor="end"
                height={112}
                tickMargin={8}
                tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
              />
              <XAxis
                xAxisId="month"
                dataKey="periodLabel"
                interval={0}
                axisLine={false}
                tickLine={false}
                height={28}
                tick={{ fill: CHART_COLORS.axis, fontSize: 12, fontWeight: 700 }}
              />
              <YAxis yAxisId="duration" tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} tickFormatter={chartLabel} />
              <YAxis yAxisId="calls" orientation="right" tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} tickFormatter={chartLabel} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(value: number, name: string) => [formatNumber(value), name]}
                labelFormatter={(_, payload) => {
                  const row = payload?.[0]?.payload;
                  return row ? `${row.periodType} ${row.period} - ${row.company}` : "";
                }}
              />
              <Bar xAxisId="company" yAxisId="duration" dataKey="durationSeconds" name="Duration (Sec)" maxBarSize={28}>
                {monthlyCompanyRows.map((entry) => <Cell key={`duration-${entry.period}-${entry.company}`} fill={companyMetricColor(entry.company, "duration")} />)}
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

      <SectionTitle id="Performance" eyebrow="Performance" title={`Calls & Duration Performance in ${CompanyPeriodLabel}`} collapsed={isSectionCollapsed("Performance")} onToggle={() => toggleSection("Performance")} />
      <section id="Performance-content" className={`chart-grid performance-chart-grid ${isSectionCollapsed("Performance") ? "section-content-collapsed" : ""}`}>
        <article className="chart-card performance-region">
          <CallsDurationPerformanceChart title="Regions Performance" data={rankings.region} gradientId="performanceRegion" />
        </article>
        <article className="chart-card performance-month">
          <CallsDurationPerformanceChart title="Monthly Performance" data={rankings.month} gradientId="performanceMonth" xTickFormatter={shortMonthLabel} />
        </article>
        <article className="chart-card performance-company">
          <CallsDurationPerformanceChart title="Companies Performance" data={rankings.company} gradientId="performanceCompany" />
        </article>
        <article className="chart-card performance-talkgroup">
          <CallsDurationPerformanceChart title="Talkgroups Performance" data={rankings.talkgroup.slice(0, 12)} gradientId="performanceTalkgroup" />
        </article>
        <article className="chart-card performance-basestation">
          <CallsDurationPerformanceChart title="Base Stations Performance" data={rankings.station.slice(0, 12)} gradientId="performanceStation" />
        </article>
        <article className="chart-card performance-hour">
          <CallsDurationPerformanceChart title="Hours Performance" data={rankings.hour} gradientId="performanceHour" xTickFormatter={(value) => `${value ?? ""}`} />
        </article>
      </section>

      <SectionTitle id="General" eyebrow="General" title={`General Charts in ${CompanyPeriodLabel}` } collapsed={isSectionCollapsed("General")} onToggle={() => toggleSection("General")} />
      <section id="General-content" className={`chart-grid dashboard-chart-grid general-chart-grid ${isSectionCollapsed("General") ? "section-content-collapsed" : ""}`}>
        <article className="chart-card general-mobile-type wide">
          <h3>Radio Type per Month</h3>
          <p>Total radios {formatNumber(mobileTypeByMonth.reduce((sum, row) => sum + Number(row.total ?? 0), 0))}</p>
          <ChartLegend items={[{ name: "Total radios", color: CHART_COLORS.total }, ...mobileTypes.map((type) => ({ name: type, color: mobileTypeColor(type) }))]} />
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={mobileTypeByMonth} margin={{ left: 0, right: 0, top: 14, bottom: 0 }} barCategoryGap="12%" barGap={2}>
              <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" opacity={0.32} vertical={false} />
              <XAxis dataKey="name" tick={{ fill: CHART_COLORS.axis, fontSize: 9 }} axisLine={false} tickLine={false} interval={0} angle={-35} textAnchor="end" height={52} tickMargin={8} tickFormatter={shortMonthLabel} />
              <YAxis tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatNumber(v)} domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.28)]} />
              <Tooltip content={(props) => <MobileTypeTooltip {...props} mobileTypes={mobileTypes} />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar
                dataKey="total"
                name="Total radios"
                maxBarSize={72}
                shape={(props: any) => <MobileTypeOverlayBarShape {...props} mobileTypes={mobileTypes} />}
              >
                <LabelList dataKey="total" content={() => null} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </article>
      </section>

      <SectionTitle id="Charts" eyebrow="Top 10" title={`Top 10 per Calls in ${CompanyPeriodLabel}`} collapsed={isSectionCollapsed("Charts")} onToggle={() => toggleSection("Charts")} />

      <section id="Charts-content" className={`chart-grid top-10-row ${isSectionCollapsed("Charts") ? "section-content-collapsed" : ""}`}>
          <article className="chart-card">
            <h3>Top Companies by Calls</h3>
            <ResponsiveContainer width="100%" height={340}>
              <BarChart layout="vertical" data={rankings.company.slice(0, 10)} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
                <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" opacity={0.32} horizontal={false} />
                <XAxis type="number" tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} tickFormatter={(value) => truncateLabel(value, 18)} interval={0} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number) => formatNumber(value)} />
                <Bar dataKey="calls" fill={CHART_COLORS.usedGreen}>
                  <LabelList dataKey="calls" content={RightValueLabel} />
                </Bar>
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
                <YAxis type="category" dataKey="name" width={140} tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} tickFormatter={(value) => truncateLabel(value, 18)} interval={0} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number) => formatNumber(value)} />
                <Bar dataKey="calls" fill={CHART_COLORS.duration}>
                  <LabelList dataKey="calls" content={RightValueLabel} />
                </Bar>
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
                <YAxis type="category" dataKey="name" width={140} tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} tickFormatter={(value) => truncateLabel(value, 18)} interval={0} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number) => formatNumber(value)} />
                <Bar dataKey="calls" fill={CHART_COLORS.calls}>
                  <LabelList dataKey="calls" content={RightValueLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <ChartLegend items={[{ name: "Calls", color: CHART_COLORS.calls }]} />
          </article>
      </section>


      <SectionTitle
        id="users"
        eyebrow="Utilization deck"
        title={`Top radios and employee utilization in ${CompanyPeriodLabel}`}
        text="Rank the busiest radios and users by calls and duration for operations review."
        collapsed={isSectionCollapsed("users")}
        onToggle={() => toggleSection("users")}
        actions={(
          <>
            <ExportButton kind="xlsx" label="XLSX" onClick={exportUtilizationXlsx} />
            <ExportButton kind="pdf" label="PDF" onClick={exportUtilizationPdf} />
          </>
        )}
      />
      <section id="users-content" className={`quality-grid ${isSectionCollapsed("users") ? "section-content-collapsed" : ""}`}>
        <article className="table-card">
          <h3>Top Radios</h3>
          <table>
            <thead>
              <tr>
                <th>Radio ID &amp; Alias</th>
                <th>Employee Name</th>
                <th>Company</th>
                <th>Total Calls</th>
                <th>Total Duration</th>
              </tr>
            </thead>
            <tbody>
              {topRadioUsers.map((item) => (
                <tr key={`${item.radioId}-${item.radioAlias}-${item.employeeName}-${item.company}`}>
                  <td>{item.radioId} - {item.radioAlias}</td>
                  <td>{item.employeeName}</td>
                  <td>{item.company}</td>
                  <td>{formatNumber(item.calls)}</td>
                  <td>{secondsToClock(item.durationSeconds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
        <article className="table-card">
          <h3>Top Users</h3>
          <table><tbody>{rankings.user.slice(0, 10).map((item) => <tr key={item.name}><td>{item.name}</td><td>{formatNumber(item.calls)}</td><td>{secondsToClock(item.durationSeconds)}</td></tr>)}</tbody></table>
        </article>
      </section>

      <SectionTitle
        id="records"
        eyebrow="Source records"
        title={`Filtered Calls Register in ${CompanyPeriodLabel}`}
        text="Paged at 50 rows per page for browser performance. Exports include every filtered row."
        collapsed={isSectionCollapsed("records")}
        onToggle={() => toggleSection("records")}
        actions={(
          <>
            {/* <ExportButton kind="csv" label="CSV" onClick={exportRows} /> */}
            <ExportButton kind="xlsx" label="XLSX" onClick={exportRowsXlsx} />
            <ExportButton kind="pdf" label="PDF" onClick={exportRowsPdfPage} />
          </>
        )}
      />
      <section id="records-content" className={`records-card ${isSectionCollapsed("records") ? "section-content-collapsed" : ""}`}>
        <div className="records-scroll">
          <table>
            <thead><tr><th>SN</th><th>Radio ID</th><th>Radio Alias</th><th>Radio Type</th><th>Employee Name</th><th>Employee ID</th><th>Region</th><th>Company</th><th>Talkgroup Alias</th><th>Start Time</th><th>End Time</th><th>Duration (s)</th><th>Base Station</th></tr></thead>
            <tbody>
              {pagedRecords.map((record, index) => (
                <tr key={`${record.radioId}-${index}`}>
                  <td>{(page - 1) * 50 + index + 1}</td>
                  <td>{record.radioId}</td>
                  <td>{record.radioAlias}</td>
                  <td>{record.mobileType}</td>
                  <td>{record.employeeName}</td>
                  <td>{record.employeeId}</td>
                  <td>{record.region}</td>
                  <td>{record.company}</td>
                  <td>{record.talkgroup}</td>
                  <td>{record.startTime}</td>
                  <td>{record.endTime}</td>
                  <td>{formatNumber(record.durationSeconds)}</td>
                  <td>{record.baseStation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pager">
          <button className="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
          <span>Page {formatNumber(page)} of {formatNumber(pageCount)} - showing {formatNumber(pagedRecords.length)} rows</span>
          <button className="button" disabled={page >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Next</button>
        </div>
      </section>
    </main>
  );
}
