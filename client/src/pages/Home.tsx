/*
Design philosophy reminder for this page: Swiss International Typographic Style adapted for mission-control dashboards. Every layout choice should reinforce precise alignment, warm ivory/graphite surfaces, petroleum-blue telecom accents, amber peak markers, disciplined KPI hierarchy, and concise operational interactions.
*/
import { ChangeEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  FileSpreadsheet,
  Filter,
  Gauge,
  HardDrive,
  Printer,
  Radio,
  Search,
  UploadCloud,
  Users,
  Waves,
  X,
} from "lucide-react";
import * as XLSX from "xlsx";
import { NATIONAL_GRID_LOGO, NASCO_LOGO } from "@/lib/embeddedLogos";
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
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type RawRow = Record<string, unknown>;

type CallRecord = {
  sn: string;
  radioId: string;
  radioAlias: string;
  radioType: string;
  employeeName: string;
  employeeId: string;
  region: string;
  company: string;
  sector: string;
  department: string;
  talkgroupId: string;
  talkgroupAlias: string;
  callDate: string;
  year: string;
  month: string;
  week: string;
  day: string;
  hourLabel: string;
  durationSeconds: number;
  trafficHours: number;
  dateHourKey: string;
  baseStation: string;
};

type LookupUserRecord = {
  radioId: string;
  company: string;
  region: string;
};

type DashboardData = {
  fileName: string;
  sourceSheet: string;
  loadedAt: string;
  totalRows: number;
  records: CallRecord[];
  lookupUsers: LookupUserRecord[];
  sourceKpiRows: KpiSheetRow[];
  warnings: string[];
};

type Filters = {
  year: string;
  month: string;
  week: string;
  company: string;
  region: string;
  baseStation: string;
  talkgroup: string;
  search: string;
};

type FilterField = Exclude<keyof Filters, "search">;
type FilterOptions = Record<FilterField, string[]>;

type Ranking = {
  name: string;
  calls: number;
  durationSeconds: number;
  trafficHours: number;
  radios: number;
};

type TimePoint = {
  name: string;
  calls: number;
  trafficHours: number;
  durationSeconds: number;
  radios: number;
};

type KpiSheetRow = {
  company: string;
  noOfTalkGroups: string;
  talkgroupsInUse: number;
  calls: number;
  durationSeconds: number;
  durationClockValue: number;
  usersActivated: number;
  callingUsers: number;
  kpiAvgDurationPerUser: number;
};

const EMPTY_FILTERS: Filters = {
  year: "All",
  month: "All",
  week: "All",
  company: "All",
  region: "All",
  baseStation: "All",
  talkgroup: "All",
  search: "",
};

const COLORS = ["#174e70", "#2f6f8f", "#d6a348", "#7d8c73", "#a9692d", "#8ea6b4", "#b66e4d"];
const FILTER_FIELDS: FilterField[] = ["year", "month", "week", "company", "region", "baseStation", "talkgroup"];

const headerAliases: Record<keyof Omit<CallRecord, "durationSeconds" | "trafficHours"> | "durationSeconds" | "trafficHours", string[]> = {
  sn: ["sn", "serial", "no"],
  radioId: ["radioid", "radio", "radio no"],
  radioAlias: ["radioalias", "alias"],
  radioType: ["radiotype", "type"],
  employeeName: ["employeename", "employee", "username", "user name"],
  employeeId: ["employeeid", "userid", "user id"],
  region: ["region"],
  company: ["company"],
  sector: ["sector"],
  department: ["department"],
  talkgroupId: ["talkgroupid", "talkgroup id"],
  talkgroupAlias: ["talkgroupalias", "talkgroup", "talkgroup name"],
  callDate: ["calldate", "call date", "starttime", "start time", "date"],
  year: ["year"],
  month: ["month"],
  week: ["week"],
  day: ["day"],
  hourLabel: ["hourlabel", "hour label", "hour", "hournumber", "hour number"],
  durationSeconds: ["durationseconds", "duration seconds", "seconds"],
  trafficHours: ["traffichours", "traffic hours", "erlangs", "traffic"],
  dateHourKey: ["datehourkey", "date hour key", "date hour"],
  baseStation: ["callerbasestation", "caller base station", "base station", "station"],
};

function normalizeHeader(value: unknown) {
  return `${value ?? ""}`.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function cleanText(value: unknown, fallback = "Unknown") {
  const text = `${value ?? ""}`.replace(/\s+/g, " ").trim();
  return text || fallback;
}

function parseNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const cleaned = `${value ?? ""}`.replace(/,/g, "").trim();
  if (!cleaned) return fallback;
  const numeric = Number(cleaned);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function parseDuration(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value > 0 && value < 2) return Math.round(value * 24 * 60 * 60);
    return value;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const base = Date.UTC(1899, 11, 30, 0, 0, 0);
    const elapsed = Math.round((value.getTime() - base) / 1000);
    return elapsed > 0 && elapsed < 31_536_000 ? elapsed : 0;
  }
  const text = `${value ?? ""}`.trim();
  const parts = text.split(":").map((part) => Number(part));
  if (parts.length === 3 && parts.every((part) => Number.isFinite(part))) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return parseNumber(value, 0);
}

function parseDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return new Date(parsed.y, parsed.m - 1, parsed.d, parsed.H ?? 0, parsed.M ?? 0, parsed.S ?? 0);
  }
  const text = `${value ?? ""}`.trim();
  if (!text) return null;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value: unknown) {
  const date = parseDate(value);
  if (!date) return cleanText(value, "Unknown");
  return date.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "2-digit" });
}

function monthLabel(value: unknown, dateValue: unknown) {
  const explicit = cleanText(value, "");
  if (explicit) return explicit;
  const date = parseDate(dateValue);
  return date ? date.toLocaleDateString("en-GB", { month: "long", year: "numeric" }) : "Unknown";
}

function yearLabel(value: unknown, dateValue: unknown) {
  const explicit = cleanText(value, "");
  if (explicit) return explicit;
  const date = parseDate(dateValue);
  return date ? `${date.getFullYear()}` : "Unknown";
}

function dayLabel(value: unknown, dateValue: unknown) {
  const explicit = cleanText(value, "");
  if (explicit) return explicit;
  const date = parseDate(dateValue);
  return date ? date.toLocaleDateString("en-GB", { weekday: "long" }) : "Unknown";
}

function hourLabel(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return `${String(value).padStart(2, "0")}:00`;
  const text = cleanText(value, "Unknown");
  if (/^\d{1,2}$/.test(text)) return `${text.padStart(2, "0")}:00`;
  return text;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(value || 0));
}

function chartLabel(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return "";
  if (numeric >= 1_000_000) return `${formatDecimal(numeric / 1_000_000, 1)}M`;
  if (numeric >= 1_000) return `${formatDecimal(numeric / 1_000, 1)}K`;
  return formatNumber(numeric);
}

function truncateLabel(value: unknown, maxLength = 22) {
  const text = `${value ?? "Unknown"}`.trim() || "Unknown";
  return text.length > maxLength ? `${text.slice(0, Math.max(1, maxLength - 1))}…` : text;
}

function formatPercent(value: number, digits = 0) {
  return `${formatDecimal(value, digits)}%`;
}

function pieDataLabel({ name, percent, value }: { name?: string; percent?: number; value?: number }) {
  if (!value || percent === undefined || percent < 0.03) return "";
  return `${truncateLabel(name, 18)}: ${formatPercent(percent * 100, percent >= 0.1 ? 0 : 1)}`;
}

function monthSortValue(label: string) {
  const text = `${label ?? ""}`.trim();
  if (!text || text.toLowerCase() === "unknown") return Number.MAX_SAFE_INTEGER;
  const monthNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  const lower = text.toLowerCase();
  const numericMonth = /(?:^|\D)(1[0-2]|0?[1-9])(?:\D|$)/.exec(lower)?.[1];
  const namedMonthIndex = monthNames.findIndex((month) => lower.includes(month) || lower.includes(month.slice(0, 3)));
  const monthIndex = namedMonthIndex >= 0 ? namedMonthIndex : numericMonth ? Number(numericMonth) - 1 : Number.MAX_SAFE_INTEGER;
  const year = /(19|20)\d{2}/.exec(lower)?.[0];
  return (year ? Number(year) * 12 : 0) + monthIndex;
}

function sortByMonthOrder(items: TimePoint[]) {
  return [...items].sort((a, b) => monthSortValue(a.name) - monthSortValue(b.name) || a.name.localeCompare(b.name));
}

function formatDecimal(value: number, digits = 2) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value || 0);
}

function secondsToClock(totalSeconds: number) {
  const safe = Math.max(0, Math.round(totalSeconds || 0));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function findValue(row: RawRow, aliases: string[]) {
  const keys = Object.keys(row);
  const normalized = keys.map((key) => ({ key, normalized: normalizeHeader(key) }));
  for (const alias of aliases) {
    const target = normalizeHeader(alias);
    const match = normalized.find((item) => item.normalized === target);
    if (match) return row[match.key];
  }
  for (const alias of aliases) {
    const target = normalizeHeader(alias);
    const match = normalized.find((item) => item.normalized.includes(target));
    if (match) return row[match.key];
  }
  return undefined;
}

function parseLookupUsers(workbook: XLSX.WorkBook): LookupUserRecord[] {
  const lookupSheetName = workbook.SheetNames.find((name) => name.toLowerCase() === "lookup") ?? workbook.SheetNames.find((name) => name.toLowerCase().includes("lookup"));
  if (!lookupSheetName) return [];
  const worksheet = workbook.Sheets[lookupSheetName];
  const rows = XLSX.utils.sheet_to_json<RawRow>(worksheet, { defval: "", raw: true });
  return rows
    .map((row) => ({
      radioId: cleanText(findValue(row, ["radio id", "radioid", "radio", "id"]), ""),
      company: cleanText(findValue(row, ["COMPANY / BL", "company / bl", "company bl", "company", "bl"]), ""),
      region: cleanText(findValue(row, ["region", "area", "system"]), ""),
    }))
    .filter((row) => row.company && row.company !== "Unknown");
}

function parseSourceKpiRows(workbook: XLSX.WorkBook): KpiSheetRow[] {
  const kpiSheetName = workbook.SheetNames.find((name) => name.toLowerCase() === "kpi") ?? workbook.SheetNames.find((name) => name.toLowerCase().includes("kpi"));
  if (!kpiSheetName) return [];
  const worksheet = workbook.Sheets[kpiSheetName];
  const rows = XLSX.utils.sheet_to_json<RawRow>(worksheet, { defval: "", raw: true });
  return rows
    .map((row) => {
      const company = cleanText(findValue(row, ["Call Source", "call source", "company"]), "");
      const durationSeconds = parseNumber(findValue(row, ["Duration (Sec)", "duration sec", "duration seconds"]), 0);
      const usersActivated = parseNumber(findValue(row, ["Total No. of Users activated", "users activated", "activated"]), 0);
      return {
        company,
        noOfTalkGroups: cleanText(findValue(row, ["No of Talk groups", "No. of Talkgroups", "no of talk groups"]), ""),
        talkgroupsInUse: parseNumber(findValue(row, ["Talk groups in use", "talkgroups in use"]), 0),
        calls: parseNumber(findValue(row, ["No. of Calls", "No of Calls", "calls"]), 0),
        durationSeconds,
        durationClockValue: durationSeconds / 86400,
        usersActivated,
        callingUsers: parseNumber(findValue(row, ["Call Performed by (No. of Users)", "calling users", "performed by"]), 0),
        kpiAvgDurationPerUser: parseNumber(findValue(row, ["KPI (Avg. Duration per User per Company) in sec", "avg duration", "kpi avg"]), usersActivated > 0 ? durationSeconds / usersActivated : 0),
      } satisfies KpiSheetRow;
    })
    .filter((row) => {
      const normalizedCompany = row.company.trim().toLowerCase();
      return normalizedCompany && normalizedCompany !== "call source" && normalizedCompany !== "unknown" && normalizedCompany !== "not found";
    });
}

function parseRows(rows: RawRow[]) {
  return rows
    .map((row, index) => {
      const dateRaw = findValue(row, headerAliases.callDate);
      const durationSecondsRaw = findValue(row, ["Duration Seconds", "durationseconds"]);
      const hasExplicitDurationSeconds = durationSecondsRaw !== undefined && durationSecondsRaw !== null && `${durationSecondsRaw}`.trim() !== "";
      const durationRaw = hasExplicitDurationSeconds ? durationSecondsRaw : findValue(row, ["Duration (Sec)", "duration sec", "duration seconds"]) ?? findValue(row, ["duration"]);
      const durationSeconds = hasExplicitDurationSeconds ? parseNumber(durationSecondsRaw, 0) : parseDuration(durationRaw);
      const trafficRaw = findValue(row, headerAliases.trafficHours);
      const trafficHours = parseNumber(trafficRaw, durationSeconds / 3600);
      return {
        sn: cleanText(findValue(row, headerAliases.sn), `${index + 1}`),
        radioId: cleanText(findValue(row, headerAliases.radioId)),
        radioAlias: cleanText(findValue(row, headerAliases.radioAlias), "Not labelled"),
        radioType: cleanText(findValue(row, headerAliases.radioType), "Unknown"),
        employeeName: cleanText(findValue(row, headerAliases.employeeName), "Unknown"),
        employeeId: cleanText(findValue(row, headerAliases.employeeId), "Unknown"),
        region: cleanText(findValue(row, headerAliases.region), "Unknown"),
        company: cleanText(findValue(row, headerAliases.company), "Unknown"),
        sector: cleanText(findValue(row, headerAliases.sector), "Unknown"),
        department: cleanText(findValue(row, headerAliases.department), "Unknown"),
        talkgroupId: cleanText(findValue(row, headerAliases.talkgroupId), "Unknown"),
        talkgroupAlias: cleanText(findValue(row, headerAliases.talkgroupAlias), "Unknown"),
        callDate: formatDate(dateRaw),
        year: yearLabel(findValue(row, headerAliases.year), dateRaw),
        month: monthLabel(findValue(row, headerAliases.month), dateRaw),
        week: cleanText(findValue(row, headerAliases.week), "Unknown"),
        day: dayLabel(findValue(row, headerAliases.day), dateRaw),
        hourLabel: hourLabel(findValue(row, headerAliases.hourLabel)),
        durationSeconds,
        trafficHours,
        dateHourKey: cleanText(findValue(row, headerAliases.dateHourKey), `${formatDate(dateRaw)} ${hourLabel(findValue(row, headerAliases.hourLabel))}`),
        baseStation: cleanText(findValue(row, headerAliases.baseStation), "Unknown"),
      } satisfies CallRecord;
    })
    .filter((row) => row.radioId !== "Unknown" || row.company !== "Unknown" || row.durationSeconds > 0);
}

function parseWorkbook(workbook: XLSX.WorkBook, fileName: string): DashboardData {
  const sourceSheet = workbook.SheetNames.includes("Raw_Data") ? "Raw_Data" : workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sourceSheet];
  const rawRows = XLSX.utils.sheet_to_json<RawRow>(worksheet, { defval: "", raw: true });
  const records = parseRows(rawRows);
  const lookupUsers = parseLookupUsers(workbook);
  const sourceKpiRows = parseSourceKpiRows(workbook);
  const warnings: string[] = [];
  if (!workbook.SheetNames.includes("Raw_Data")) warnings.push("Raw_Data sheet was not found; the first sheet was parsed instead.");
  if (records.length === 0) warnings.push("No call records could be parsed. Check that row 1 contains column headers.");
  if (records.some((record) => record.company === "Unknown")) warnings.push("Some records do not have a company value.");
  if (records.some((record) => record.durationSeconds === 0)) warnings.push("Some records have zero or missing duration seconds.");
  if (lookupUsers.length === 0) warnings.push("Lookup sheet user list was not found; KPI activated-user counts will fall back to unique calling radios in the filtered call records.");
  return {
    fileName,
    sourceSheet,
    loadedAt: new Date().toLocaleString("en-GB"),
    totalRows: rawRows.length,
    records,
    lookupUsers,
    sourceKpiRows,
    warnings,
  };
}

function getFilterValue(record: CallRecord, field: FilterField) {
  if (field === "talkgroup") return record.talkgroupAlias;
  return `${record[field]}`;
}

function uniqueSorted(records: CallRecord[], field: FilterField) {
  const values = Array.from(new Set(records.map((record) => getFilterValue(record, field)).filter(Boolean)));
  const sorted = field === "month" ? values.sort((a, b) => monthSortValue(a) - monthSortValue(b) || a.localeCompare(b)) : values.sort((a, b) => a.localeCompare(b));
  return ["All", ...sorted];
}

function normalizeRegion(value: string) {
  return value.trim().toUpperCase();
}

function isDirectRegionListField(field: FilterField) {
  return field === "baseStation" || field === "talkgroup";
}

function recordsForDirectRegionList(records: CallRecord[], filters: Filters) {
  const selectedRegion = normalizeRegion(filters.region);
  if (!selectedRegion || selectedRegion === "ALL") return null;
  return records.filter((record) => normalizeRegion(record.region) === selectedRegion);
}

function recordMatchesSearch(record: CallRecord, search: string) {
  if (!search) return true;
  return [record.radioId, record.radioAlias, record.employeeName, record.employeeId, record.company, record.region, record.talkgroupAlias, record.baseStation]
    .join(" ")
    .toLowerCase()
    .includes(search);
}

function recordsMatchingFilters(records: CallRecord[], filters: Filters, ignoredFields: FilterField[] = []) {
  const search = filters.search.trim().toLowerCase();
  const ignored = new Set<FilterField>(ignoredFields);
  return records.filter((record) => {
    for (const field of FILTER_FIELDS) {
      if (ignored.has(field)) continue;
      const selected = filters[field];
      if (selected !== "All" && getFilterValue(record, field) !== selected) return false;
    }
    return recordMatchesSearch(record, search);
  });
}

function applyFilters(records: CallRecord[], filters: Filters) {
  return recordsMatchingFilters(records, filters);
}

function matchingRowsForOption(records: CallRecord[], filters: Filters, optionField: FilterField) {
  return recordsMatchingFilters(records, filters, [optionField]);
}

function optionsForField(records: CallRecord[], filters: Filters, optionField: FilterField) {
  if (isDirectRegionListField(optionField)) {
    const regionRows = recordsForDirectRegionList(records, filters);
    if (regionRows) return uniqueSorted(regionRows, optionField);
  }
  return uniqueSorted(matchingRowsForOption(records, filters, optionField), optionField);
}

function buildCascadingOptions(records: CallRecord[], filters: Filters): FilterOptions {
  const currentOptions = {} as FilterOptions;
  for (const field of FILTER_FIELDS) {
    currentOptions[field] = optionsForField(records, filters, field);
  }
  return currentOptions;
}

function sanitizeCascadingFilters(records: CallRecord[], filters: Filters, protectedField?: FilterField) {
  let next = { ...filters };
  let changed = false;

  for (const field of FILTER_FIELDS) {
    if (field === protectedField || next[field] === "All") continue;

    const fieldOptions = optionsForField(records, next, field);
    if (!fieldOptions.includes(next[field])) {
      next = { ...next, [field]: "All" };
      changed = true;
    }
  }

  return changed ? next : filters;
}

function groupByDimension(records: CallRecord[], getName: (record: CallRecord) => string): Ranking[] {
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
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, calls: value.calls, durationSeconds: value.durationSeconds, trafficHours: value.trafficHours, radios: value.radios.size }))
    .sort((a, b) => b.calls - a.calls || b.durationSeconds - a.durationSeconds);
}

function groupByTime(records: CallRecord[], getName: (record: CallRecord) => string): TimePoint[] {
  return groupByDimension(records, getName).map((item) => ({
    name: item.name,
    calls: item.calls,
    trafficHours: item.trafficHours,
    durationSeconds: item.durationSeconds,
    radios: item.radios,
  }));
}

function buildKpiSheetRows(records: CallRecord[], lookupUsers: LookupUserRecord[]): KpiSheetRow[] {
  const map = new Map<string, { calls: number; durationSeconds: number; talkgroups: Set<string>; radios: Set<string>; regions: Set<string> }>();
  records.forEach((record) => {
    const company = record.company || "Unknown";
    const current = map.get(company) ?? { calls: 0, durationSeconds: 0, talkgroups: new Set<string>(), radios: new Set<string>(), regions: new Set<string>() };
    current.calls += 1;
    current.durationSeconds += record.durationSeconds;
    if (record.talkgroupAlias && record.talkgroupAlias !== "Unknown") current.talkgroups.add(record.talkgroupAlias);
    if (record.radioId && record.radioId !== "Unknown") current.radios.add(record.radioId);
    if (record.region && record.region !== "Unknown") current.regions.add(record.region.toUpperCase());
    map.set(company, current);
  });

  return Array.from(map.entries())
    .filter(([company]) => {
      const normalizedCompany = company.trim().toLowerCase();
      return normalizedCompany !== "not found" && normalizedCompany !== "unknown" && normalizedCompany !== "";
    })
    .map(([company, value]) => {
      const lookupMatches = lookupUsers.filter((user) => user.company === company);
      const activatedFromLookup = lookupMatches.length;
      const talkgroupsInUse = value.talkgroups.size;
      const calls = value.calls;
      const durationSeconds = value.durationSeconds;
      const durationClockValue = durationSeconds / 86400;
      const usersActivated = activatedFromLookup || value.radios.size;
      const callingUsers = value.radios.size;
      const kpiAvgDurationPerUser = usersActivated > 0 ? durationSeconds / usersActivated : 0;
      return { company, noOfTalkGroups: "", talkgroupsInUse, calls, durationSeconds, durationClockValue, usersActivated, callingUsers, kpiAvgDurationPerUser };
    })
    .sort((a, b) => a.company.localeCompare(b.company));
}

function getTop<T extends { calls: number }>(items: T[], count = 8) {
  return items.slice(0, count);
}

function KpiCard({ label, value, context, icon: Icon, accent = "blue" }: { label: string; value: string; context: string; icon: typeof Activity; accent?: "blue" | "amber" | "green" | "red" }) {
  const accentClass = accent === "amber" ? "bg-[#d6a348]" : accent === "green" ? "bg-[#7d8c73]" : accent === "red" ? "bg-[#b66e4d]" : "bg-[#174e70]";
  return (
    <article className="group relative overflow-hidden border border-[#d9d2c2] bg-[#fffaf0]/95 p-5 shadow-[0_18px_45px_rgba(35,49,58,0.07)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_24px_55px_rgba(35,49,58,0.10)]">
      <div className={`absolute left-0 top-0 h-full w-1 ${accentClass}`} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-condensed text-xs uppercase tracking-[0.22em] text-[#6f7d82]">{label}</p>
          <p className="mt-2 font-condensed text-3xl font-semibold tabular-nums text-[#23313a]">{value}</p>
        </div>
        <div className="border border-[#d9d2c2] bg-white/80 p-2 text-[#174e70]">
          <Icon size={20} strokeWidth={1.8} />
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-[#6c6356]">{context}</p>
    </article>
  );
}

function Panel({ title, eyebrow, children, className = "" }: { title: string; eyebrow: string; children: ReactNode; className?: string }) {
  return (
    <section className={`relative overflow-hidden border border-[#d9d2c2] bg-[#fffaf0]/95 p-5 shadow-[0_18px_45px_rgba(35,49,58,0.06)] ${className}`}>
      <div className="pointer-events-none absolute inset-0 opacity-[0.045]" style={{ backgroundImage: "linear-gradient(90deg,#174e70 1px,transparent 1px),linear-gradient(#174e70 1px,transparent 1px)", backgroundSize: "18px 18px" }} />
      <div className="relative z-10 mb-5 flex items-start justify-between gap-4 border-b border-[#d9d2c2] pb-4">
        <div>
          <p className="font-condensed text-xs uppercase tracking-[0.24em] text-[#9a6d22]">{eyebrow}</p>
          <h2 className="mt-1 font-condensed text-2xl font-semibold text-[#23313a]">{title}</h2>
        </div>
      </div>
      <div className="relative z-10">{children}</div>
    </section>
  );
}

function NativeSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  const availableValues = Math.max(options.length - 1, 0);
  return (
    <label className="block">
      <span className="flex items-center justify-between gap-2 font-condensed text-[11px] uppercase tracking-[0.2em] text-[#6f7d82]">
        <span>{label}</span>
        <span className="tracking-[0.08em] text-[#9a6d22]">{availableValues} values</span>
      </span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full border border-[#d9d2c2] bg-white/80 px-3 py-2 text-sm text-[#23313a] outline-none transition focus:border-[#174e70]">
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function EmptyState({ onUpload }: { onUpload: (event: ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <main className="min-h-screen bg-[#f3ecdd] text-[#23313a]">
      <section className="container flex min-h-screen items-center py-12">
        <div className="grid w-full gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="relative overflow-hidden border border-[#d9d2c2] bg-[#fffaf0] p-8 shadow-[0_28px_70px_rgba(35,49,58,0.12)] md:p-12">
            <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle at 15% 20%, #174e70 0 2px, transparent 2px), linear-gradient(135deg, #174e70 1px, transparent 1px)", backgroundSize: "28px 28px, 22px 22px" }} />
            <div className="relative z-10">
              <p className="font-condensed text-sm uppercase tracking-[0.28em] text-[#9a6d22]">SOA Operational Dashboard</p>
              <h1 className="mt-4 font-condensed text-5xl font-semibold leading-[0.95] tracking-tight text-[#23313a] md:text-7xl">Local Excel upload dashboard.</h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-[#5f6c70]">Upload your source workbook and the dashboard will calculate the KPIs, rankings, busy-hour pattern, and quality checks in your browser. The Excel file is not modified.</p>
              <div className="mt-8 flex flex-wrap gap-3 text-sm text-[#5f6c70]">
                <span className="border border-[#d9d2c2] bg-white/70 px-3 py-2">Runs locally</span>
                <span className="border border-[#d9d2c2] bg-white/70 px-3 py-2">No workbook rewriting</span>
                <span className="border border-[#d9d2c2] bg-white/70 px-3 py-2">Print-ready presentation</span>
              </div>
            </div>
          </div>
          <label className="group flex min-h-[420px] cursor-pointer flex-col items-center justify-center border border-dashed border-[#8ea6b4] bg-[#23313a] p-8 text-center text-[#fffaf0] shadow-[0_28px_70px_rgba(35,49,58,0.18)] transition hover:-translate-y-1 hover:bg-[#1c2a32]">
            <input type="file" accept=".xlsx,.xls,.xlsm" className="sr-only" onChange={onUpload} />
            <div className="mb-6 border border-[#d6a348]/70 p-5 text-[#d6a348] transition group-hover:scale-105">
              <UploadCloud size={58} strokeWidth={1.4} />
            </div>
            <p className="font-condensed text-3xl font-semibold">Upload SOA source workbook</p>
            <p className="mt-3 max-w-md text-sm leading-6 text-[#cbd5d8]">Recommended source sheet: Raw_Data with call records, company, talkgroup, radio, time, duration seconds, traffic hours, and caller base station columns.</p>
          </label>
        </div>
      </section>
    </main>
  );
}

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [error, setError] = useState("");

  const handleUpload = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
      const parsed = parseWorkbook(workbook, file.name);
      setData(parsed);
      setFilters(EMPTY_FILTERS);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "The workbook could not be parsed.");
    } finally {
      event.target.value = "";
    }
  }, []);

  const allRecords = data?.records ?? [];
  const lookupUsers = data?.lookupUsers ?? [];
  const filteredRecords = useMemo(() => applyFilters(allRecords, filters), [allRecords, filters]);
  const options = useMemo(() => buildCascadingOptions(allRecords, filters), [allRecords, filters]);

  const updateFilter = useCallback((field: FilterField, value: string) => {
    setFilters((current) => sanitizeCascadingFilters(allRecords, { ...current, [field]: value }, field));
  }, [allRecords]);

  useEffect(() => {
    setFilters((current) => sanitizeCascadingFilters(allRecords, current));
  }, [allRecords]);

  const metrics = useMemo(() => {
    const totalCalls = filteredRecords.length;
    const totalDuration = filteredRecords.reduce((sum, record) => sum + record.durationSeconds, 0);
    const trafficHours = filteredRecords.reduce((sum, record) => sum + record.trafficHours, 0);
    const radios = new Set(filteredRecords.map((record) => record.radioId)).size;
    const companies = new Set(filteredRecords.map((record) => record.company)).size;
    const regions = new Set(filteredRecords.map((record) => record.region)).size;
    const talkgroups = new Set(filteredRecords.map((record) => record.talkgroupAlias)).size;
    const baseStations = new Set(filteredRecords.map((record) => record.baseStation)).size;
    const averageDuration = totalCalls ? totalDuration / totalCalls : 0;
    const maxDuration = filteredRecords.reduce((max, record) => Math.max(max, record.durationSeconds), 0);
    return { totalCalls, totalDuration, trafficHours, radios, companies, regions, talkgroups, baseStations, averageDuration, maxDuration };
  }, [filteredRecords]);

  const rankings = useMemo(() => ({
    company: groupByDimension(filteredRecords, (record) => record.company),
    region: groupByDimension(filteredRecords, (record) => record.region),
    talkgroup: groupByDimension(filteredRecords, (record) => record.talkgroupAlias),
    baseStation: groupByDimension(filteredRecords, (record) => record.baseStation),
    radio: groupByDimension(filteredRecords, (record) => `${record.radioId} · ${record.radioAlias}`),
    user: groupByDimension(filteredRecords, (record) => `${record.employeeName} · ${record.employeeId}`),
    hour: groupByTime(filteredRecords, (record) => record.hourLabel).sort((a, b) => a.name.localeCompare(b.name)),
    month: sortByMonthOrder(groupByTime(filteredRecords, (record) => record.month)),
    week: groupByTime(filteredRecords, (record) => record.week),
    day: groupByTime(filteredRecords, (record) => record.day),
    dateHour: groupByDimension(filteredRecords, (record) => record.dateHourKey),
  }), [filteredRecords]);

  const isWorkbookBaselineView = FILTER_FIELDS.every((field) => filters[field] === "All") && filters.search.trim() === "";
  const kpiSheetRows = useMemo(() => (isWorkbookBaselineView && data?.sourceKpiRows.length ? data.sourceKpiRows : buildKpiSheetRows(filteredRecords, lookupUsers)), [data?.sourceKpiRows, filteredRecords, isWorkbookBaselineView, lookupUsers]);
  const kpiOverallAverage = useMemo(() => {
    const validRows = kpiSheetRows.filter((row) => row.usersActivated > 0);
    return validRows.length ? validRows.reduce((sum, row) => sum + row.kpiAvgDurationPerUser, 0) / validRows.length : 0;
  }, [kpiSheetRows]);
  const kpiChartRows = useMemo(() => kpiSheetRows.slice(0, 16), [kpiSheetRows]);

  const peakCompany = rankings.company[0];
  const peakHour = [...rankings.hour].sort((a, b) => b.calls - a.calls)[0];
  const peakTalkgroup = rankings.talkgroup[0];
  const peakBase = rankings.baseStation[0];
  const peakWindow = rankings.dateHour[0];

  const quality = useMemo(() => {
    const total = allRecords.length || 1;
    const missingCompany = allRecords.filter((record) => record.company === "Unknown").length;
    const missingStation = allRecords.filter((record) => record.baseStation === "Unknown").length;
    const missingDuration = allRecords.filter((record) => record.durationSeconds <= 0).length;
    const missingDate = allRecords.filter((record) => record.callDate === "Unknown").length;
    return [
      { name: "Company missing", value: missingCompany, pct: (missingCompany / total) * 100 },
      { name: "Station missing", value: missingStation, pct: (missingStation / total) * 100 },
      { name: "Duration zero/missing", value: missingDuration, pct: (missingDuration / total) * 100 },
      { name: "Date missing", value: missingDate, pct: (missingDate / total) * 100 },
    ];
  }, [allRecords]);

  const handlePrint = useCallback(() => {
    const tableWrapper = document.getElementById("records-table-wrapper");
    const previous = tableWrapper?.style.maxHeight ?? "";
    if (tableWrapper) tableWrapper.style.maxHeight = "none";
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        if (tableWrapper) tableWrapper.style.maxHeight = previous;
      }, 500);
    }, 100);
  }, []);

  if (!data) {
    return (
      <>
        <EmptyState onUpload={handleUpload} />
        {error && <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 border border-[#b66e4d] bg-[#fffaf0] px-5 py-3 text-sm text-[#8a2f1d] shadow-xl">{error}</div>}
      </>
    );
  }

  return (
    <main className="min-h-screen bg-[#f3ecdd] text-[#23313a]">
      <header className="no-print sticky top-0 z-40 border-b border-[#d9d2c2] bg-[#fffaf0]/96 shadow-[0_12px_30px_rgba(35,49,58,0.08)] backdrop-blur">
        <div className="container py-2.5">
          <div className="grid gap-3 xl:grid-cols-[250px_minmax(360px,1fr)_auto] xl:items-stretch">
            <div className="flex min-h-[76px] items-center border border-[#d9d2c2] bg-white px-4 py-2 shadow-sm">
              <img src={NATIONAL_GRID_LOGO} alt="National Grid SA" className="h-16 w-full object-contain object-left" />
            </div>

            <div className="flex min-h-[76px] items-center justify-center bg-[#050505] px-5 py-3 text-center text-[#fffaf0] shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
              <div className="min-w-0">
                <p className="font-condensed text-[12px] uppercase tracking-[0.22em] text-[#d6a348] md:text-sm">DMR Operational Dashboard</p>
                <h1 className="font-condensed text-3xl font-semibold leading-tight text-white md:text-4xl">CDR Analysis</h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 xl:justify-end">
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex items-center gap-2 border border-[#174e70] bg-[#174e70] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#123e59]">
                  <UploadCloud size={16} /> Upload another
                  <input type="file" accept=".xlsx,.xls,.xlsm" className="sr-only" onChange={handleUpload} />
                </label>
                <button onClick={handlePrint} className="inline-flex items-center gap-2 border border-[#d9d2c2] bg-white/90 px-4 py-2 text-sm font-semibold text-[#23313a] transition hover:border-[#174e70]">
                  <Printer size={16} /> Print / save PDF
                </button>
                <button onClick={() => setFilters(EMPTY_FILTERS)} className="inline-flex items-center gap-2 border border-[#d9d2c2] bg-white/90 px-4 py-2 text-sm font-semibold text-[#23313a] transition hover:border-[#174e70]">
                  <X size={16} /> Reset filters
                </button>
              </div>
              <div className="flex h-[76px] w-[92px] items-center justify-center border border-[#d9d2c2] bg-white p-1 shadow-sm">
                <img src={NASCO_LOGO} alt="NASCO" className="h-full w-full object-contain" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container py-8">
        {data.warnings.length > 0 && (
          <div className="no-print mb-6 border border-[#d6a348] bg-[#fff7db] p-4 text-sm text-[#6d4c12]">
            <div className="flex gap-3">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <p>{data.warnings.join(" ")}</p>
            </div>
          </div>
        )}

        <section className="no-print mb-6 border border-[#d9d2c2] bg-[#fffaf0] p-5 shadow-[0_18px_45px_rgba(35,49,58,0.06)]">
          <div className="mb-4 flex items-center gap-2 text-[#174e70]"><Filter size={18} /><h2 className="font-condensed text-xl font-semibold text-[#23313a]">Slicer controls</h2></div>
          <p className="mb-4 text-xs leading-5 text-[#6f7d82]">Base Station and Talkgroup lists are rebuilt internally from unique <strong>Raw_Data</strong> values for the selected Region. Select <strong>SOA</strong> or <strong>EOA</strong> and check the value counts beside each dropdown.</p>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
            <NativeSelect label="Year" value={filters.year} options={options.year} onChange={(year) => updateFilter("year", year)} />
            <NativeSelect label="Month" value={filters.month} options={options.month} onChange={(month) => updateFilter("month", month)} />
            <NativeSelect label="Week" value={filters.week} options={options.week} onChange={(week) => updateFilter("week", week)} />
            <NativeSelect label="Company" value={filters.company} options={options.company} onChange={(company) => updateFilter("company", company)} />
            <NativeSelect label="Region" value={filters.region} options={options.region} onChange={(region) => updateFilter("region", region)} />
            <NativeSelect label="Base station" value={filters.baseStation} options={options.baseStation} onChange={(baseStation) => updateFilter("baseStation", baseStation)} />
            <NativeSelect label="Talkgroup" value={filters.talkgroup} options={options.talkgroup} onChange={(talkgroup) => updateFilter("talkgroup", talkgroup)} />
            <label className="block">
              <span className="font-condensed text-[11px] uppercase tracking-[0.2em] text-[#6f7d82]">Search</span>
              <div className="mt-2 flex items-center border border-[#d9d2c2] bg-white/80 px-3 py-2 text-sm text-[#23313a] focus-within:border-[#174e70]">
                <Search size={15} className="mr-2 text-[#6f7d82]" />
                <input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} className="w-full bg-transparent outline-none" placeholder="Radio, user, region, station" />
              </div>
            </label>
          </div>
          <p className="mt-4 text-sm text-[#6f7d82]">Showing <strong>{formatNumber(filteredRecords.length)}</strong> records from <strong>{formatNumber(allRecords.length)}</strong> parsed records. Each dropdown is now cascading: it lists only values that have matching records under the other active selections.</p>
        </section>

        <section className="kpi-row grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <KpiCard label="Total calls" value={formatNumber(metrics.totalCalls)} context="Filtered call events in the current view." icon={Activity} accent="blue" />
          <KpiCard label="Total duration" value={secondsToClock(metrics.totalDuration)} context="Aggregated push-to-talk call duration." icon={Clock3} accent="amber" />
          <KpiCard label="Traffic hours" value={formatDecimal(metrics.trafficHours, 2)} context="Sum of traffic-hours field or duration-derived fallback." icon={Gauge} accent="green" />
          <KpiCard label="Radios" value={formatNumber(metrics.radios)} context="Distinct radio IDs active in the filtered set." icon={Radio} accent="blue" />
          <KpiCard label="Companies" value={formatNumber(metrics.companies)} context="Distinct companies represented by calls." icon={Building2} accent="amber" />
          <KpiCard label="Regions" value={formatNumber(metrics.regions)} context="Distinct regions represented in the filtered view." icon={Building2} accent="green" />
        </section>

        <section className="mt-6 grid gap-6">
          <Panel title="KPI sheet table" eyebrow="Excel KPI recreation">
            <div className="mb-5 grid gap-3 md:grid-cols-3">
              <div className="border border-[#e4dccb] bg-white/70 p-4">
                <p className="font-condensed text-xs uppercase tracking-[0.2em] text-[#6f7d82]">Companies</p>
                <p className="mt-1 font-condensed text-2xl font-semibold tabular-nums text-[#23313a]">{formatNumber(kpiSheetRows.length)}</p>
              </div>
              <div className="border border-[#e4dccb] bg-white/70 p-4">
                <p className="font-condensed text-xs uppercase tracking-[0.2em] text-[#6f7d82]">Average KPI</p>
                <p className="mt-1 font-condensed text-2xl font-semibold tabular-nums text-[#23313a]">{formatDecimal(kpiOverallAverage, 1)} sec</p>
              </div>
              <div className="border border-[#e4dccb] bg-white/70 p-4">
                <p className="font-condensed text-xs uppercase tracking-[0.2em] text-[#6f7d82]">Filtered source</p>
                <p className="mt-1 font-condensed text-2xl font-semibold tabular-nums text-[#23313a]">{formatNumber(metrics.totalCalls)} calls</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] text-left text-xs">
                <thead className="border-b border-[#d9d2c2] uppercase tracking-[0.13em] text-[#6f7d82]">
                  <tr><th className="py-3 pr-3">Call Source</th><th className="py-3 pr-3 text-right">No of Talk groups</th><th className="py-3 pr-3 text-right">Talk groups in use</th><th className="py-3 pr-3 text-right">No. of Calls</th><th className="py-3 pr-3 text-right">Duration (Sec)</th><th className="py-3 pr-3 text-right">Duration (hh:mm:ss)</th><th className="py-3 pr-3 text-right">Total No. of Users activated</th><th className="py-3 pr-3 text-right">Call Performed by No. of Users</th><th className="py-3 text-right">KPI Avg Duration / User / Company (sec)</th></tr>
                </thead>
                <tbody>
                  {kpiSheetRows.map((row) => <tr key={row.company} className="border-b border-[#eee7d9]"><td className="py-2 pr-3 font-semibold text-[#23313a]">{row.company}</td><td className="py-2 pr-3 text-right tabular-nums">{row.noOfTalkGroups}</td><td className="py-2 pr-3 text-right tabular-nums">{formatNumber(row.talkgroupsInUse)}</td><td className="py-2 pr-3 text-right tabular-nums">{formatNumber(row.calls)}</td><td className="py-2 pr-3 text-right tabular-nums">{formatNumber(row.durationSeconds)}</td><td className="py-2 pr-3 text-right tabular-nums">{secondsToClock(row.durationSeconds)}</td><td className="py-2 pr-3 text-right tabular-nums">{formatNumber(row.usersActivated)}</td><td className="py-2 pr-3 text-right tabular-nums">{formatNumber(row.callingUsers)}</td><td className="py-2 text-right tabular-nums">{formatNumber(row.kpiAvgDurationPerUser)}</td></tr>)}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm leading-6 text-[#6f7d82]">This section follows the corrected KPI sheet formulas: unique Talkgroup Alias, Count of Company calls, Sum of Duration Seconds, duration rendered as hh:mm:ss, Lookup-based activated users, unique calling Radio ID users, and average duration per activated user. Changing Region, Company, Base Station, Talkgroup, Week, Month, Year, or Search updates the table and both KPI charts immediately.</p>
          </Panel>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-2">
          <Panel title="KPI average duration by company" eyebrow="KPI chart 1">
            <div className="h-[430px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={kpiChartRows} margin={{ left: 18, right: 34, top: 14, bottom: 14 }}>
                  <CartesianGrid stroke="#ded6c5" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "#5f6c70", fontSize: 10 }} />
                  <YAxis dataKey="company" type="category" width={150} tick={{ fill: "#5f6c70", fontSize: 10 }} />
                  <Tooltip formatter={(value: number) => [`${formatDecimal(value, 1)} sec`, "KPI avg duration"]} />
                  <Bar dataKey="kpiAvgDurationPerUser" fill="#174e70" name="KPI avg duration">
                    <LabelList dataKey="kpiAvgDurationPerUser" position="right" formatter={(value: number) => chartLabel(value)} fill="#23313a" fontSize={10} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
          <Panel title="KPI calls and duration by company" eyebrow="KPI chart 2">
            <div className="h-[430px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={kpiChartRows} margin={{ left: 8, right: 24, top: 20, bottom: 88 }}>
                  <CartesianGrid stroke="#ded6c5" strokeDasharray="3 3" />
                  <XAxis dataKey="company" tick={{ fill: "#5f6c70", fontSize: 10 }} interval={0} angle={-34} textAnchor="end" height={96} />
                  <YAxis yAxisId="calls" tick={{ fill: "#174e70", fontSize: 10 }} />
                  <YAxis yAxisId="duration" orientation="right" tick={{ fill: "#9a6d22", fontSize: 10 }} />
                  <Tooltip formatter={(value: number, name: string) => [name === "Duration (Sec)" ? formatNumber(value) : formatNumber(value), name]} />
                  <Line yAxisId="calls" type="monotone" dataKey="calls" stroke="#174e70" strokeWidth={3} dot={{ r: 3 }} name="No. of Calls">
                    <LabelList dataKey="calls" position="top" formatter={chartLabel} fill="#174e70" fontSize={10} />
                  </Line>
                  <Line yAxisId="duration" type="monotone" dataKey="durationSeconds" stroke="#d6a348" strokeWidth={3} dot={{ r: 3 }} name="Duration (Sec)">
                    <LabelList dataKey="durationSeconds" position="top" formatter={chartLabel} fill="#9a6d22" fontSize={10} />
                  </Line>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </section>

        <section className="mt-6 grid gap-6">
          <Panel title="Call load by month" eyebrow="Time distribution">
            <div className="h-[330px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={rankings.month} margin={{ left: 0, right: 18, top: 22, bottom: 20 }}>
                  <CartesianGrid stroke="#ded6c5" strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fill: "#5f6c70", fontSize: 11 }} interval={0} angle={-24} textAnchor="end" height={70} />
                  <YAxis tick={{ fill: "#5f6c70", fontSize: 11 }} />
                  <Tooltip formatter={(value: number, name: string) => [formatNumber(value), name]} />
                  <Bar dataKey="calls" fill="#174e70" radius={[2, 2, 0, 0]} name="Calls">
                    <LabelList dataKey="calls" position="top" formatter={chartLabel} fill="#23313a" fontSize={11} />
                  </Bar>
                  <Line type="monotone" dataKey="trafficHours" stroke="#d6a348" strokeWidth={3} dot={{ r: 3 }} name="Traffic hours" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-2">
          <Panel title="Company call share" eyebrow="Demand ownership">
            <div className="h-[370px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 18, right: 72, bottom: 18, left: 72 }}>
                  <Pie data={getTop(rankings.company, 7)} dataKey="calls" nameKey="name" innerRadius={64} outerRadius={98} paddingAngle={2} label={pieDataLabel} labelLine={{ stroke: "#8a8172", strokeWidth: 1 }}>
                    {getTop(rankings.company, 7).map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatNumber(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid gap-2 text-sm lg:grid-cols-2">
              {getTop(rankings.company, 7).map((item, index) => <div key={item.name} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-[#e4dccb] py-1"><span className="min-w-0 truncate"><span className="mr-2 inline-block h-2 w-2" style={{ background: COLORS[index % COLORS.length] }} />{item.name}</span><strong className="tabular-nums">{formatNumber(item.calls)}</strong><span className="text-xs tabular-nums text-[#6f7d82]">{formatPercent((item.calls / Math.max(1, metrics.totalCalls)) * 100, 1)}</span></div>)}
            </div>
          </Panel>
          <Panel title="Busy-hour pattern" eyebrow="Hour of day">
            <div className="h-[370px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={rankings.hour} margin={{ left: 10, right: 34, top: 28, bottom: 22 }}>
                  <defs><linearGradient id="hourGradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#174e70" stopOpacity={0.42} /><stop offset="100%" stopColor="#174e70" stopOpacity={0.03} /></linearGradient></defs>
                  <CartesianGrid stroke="#ded6c5" strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fill: "#5f6c70", fontSize: 11 }} interval={0} />
                  <YAxis tick={{ fill: "#5f6c70", fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => formatNumber(value)} />
                  <Area type="monotone" dataKey="calls" stroke="#174e70" strokeWidth={2} fill="url(#hourGradient)" name="Calls">
                    <LabelList dataKey="calls" position="top" formatter={chartLabel} fill="#23313a" fontSize={11} />
                  </Area>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-2">
          <Panel title="Top talkgroups" eyebrow="Operational channels">
            <div className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={getTop(rankings.talkgroup, 9)} margin={{ left: 18, right: 28, top: 8, bottom: 8 }}>
                  <CartesianGrid stroke="#ded6c5" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "#5f6c70", fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" width={140} tick={{ fill: "#5f6c70", fontSize: 10 }} />
                  <Tooltip formatter={(value: number) => formatNumber(value)} />
                  <Bar dataKey="calls" fill="#2f6f8f" name="Calls">
                    <LabelList dataKey="calls" position="right" formatter={chartLabel} fill="#23313a" fontSize={10} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
          <Panel title="Top base stations" eyebrow="Caller location">
            <div className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={getTop(rankings.baseStation, 9)} margin={{ left: 18, right: 28, top: 8, bottom: 8 }}>
                  <CartesianGrid stroke="#ded6c5" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "#5f6c70", fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" width={140} tick={{ fill: "#5f6c70", fontSize: 10 }} />
                  <Tooltip formatter={(value: number) => formatNumber(value)} />
                  <Bar dataKey="calls" fill="#d6a348" name="Calls">
                    <LabelList dataKey="calls" position="right" formatter={chartLabel} fill="#23313a" fontSize={10} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-2">
          <Panel title="Region call share" eyebrow="Regional distribution">
            <div className="h-[330px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 16, right: 42, bottom: 16, left: 42 }}>
                  <Pie data={getTop(rankings.region, 8)} dataKey="calls" nameKey="name" innerRadius={66} outerRadius={102} paddingAngle={2} label={pieDataLabel} labelLine={{ stroke: "#8a8172", strokeWidth: 1 }}>
                    {getTop(rankings.region, 8).map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatNumber(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              {getTop(rankings.region, 8).map((item, index) => <div key={item.name} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-[#e4dccb] py-1"><span className="min-w-0 truncate"><span className="mr-2 inline-block h-2 w-2" style={{ background: COLORS[index % COLORS.length] }} />{item.name}</span><strong className="tabular-nums">{formatNumber(item.calls)}</strong><span className="text-xs tabular-nums text-[#6f7d82]">{formatPercent((item.calls / Math.max(1, metrics.totalCalls)) * 100, 1)}</span></div>)}
            </div>
          </Panel>
          <Panel title="Region traffic comparison" eyebrow="Calls and traffic hours">
            <div className="h-[330px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={getTop(rankings.region, 10)} margin={{ left: 6, right: 18, top: 16, bottom: 64 }}>
                  <CartesianGrid stroke="#ded6c5" strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fill: "#5f6c70", fontSize: 10 }} interval={0} angle={-32} textAnchor="end" height={82} />
                  <YAxis yAxisId="left" tick={{ fill: "#5f6c70", fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: "#9a6d22", fontSize: 10 }} />
                  <Tooltip formatter={(value: number, name: string) => [name === "Traffic hours" ? formatDecimal(value, 2) : formatNumber(value), name]} />
                  <Bar yAxisId="left" dataKey="calls" fill="#174e70" radius={[2, 2, 0, 0]} name="Calls">
                    <LabelList dataKey="calls" position="top" formatter={chartLabel} fill="#23313a" fontSize={10} />
                  </Bar>
                  <Line yAxisId="right" type="monotone" dataKey="trafficHours" stroke="#d6a348" strokeWidth={3} dot={{ r: 3 }} name="Traffic hours">
                    <LabelList dataKey="trafficHours" position="top" formatter={chartLabel} fill="#9a6d22" fontSize={10} />
                  </Line>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
          <Panel title="Peak records" eyebrow="Current filtered view">
            <div className="grid gap-3 md:grid-cols-2">
              {[
                { label: "Peak company", value: peakCompany?.name ?? "—", detail: `${formatNumber(peakCompany?.calls ?? 0)} calls`, icon: Building2 },
                { label: "Peak hour", value: peakHour?.name ?? "—", detail: `${formatNumber(peakHour?.calls ?? 0)} calls`, icon: Clock3 },
                { label: "Peak talkgroup", value: peakTalkgroup?.name ?? "—", detail: `${formatNumber(peakTalkgroup?.calls ?? 0)} calls`, icon: Radio },
                { label: "Peak base station", value: peakBase?.name ?? "—", detail: `${formatNumber(peakBase?.calls ?? 0)} calls`, icon: HardDrive },
                { label: "Peak date-hour window", value: peakWindow?.name ?? "—", detail: `${formatNumber(peakWindow?.calls ?? 0)} calls`, icon: CalendarDays },
                { label: "Max call duration", value: secondsToClock(metrics.maxDuration), detail: `Average ${secondsToClock(metrics.averageDuration)}`, icon: Gauge },
              ].map((item) => {
                const Icon = item.icon;
                return <div key={item.label} className="border border-[#e4dccb] bg-white/65 p-4"><div className="mb-3 text-[#174e70]"><Icon size={18} /></div><p className="font-condensed text-xs uppercase tracking-[0.2em] text-[#6f7d82]">{item.label}</p><p className="mt-1 font-condensed text-xl font-semibold text-[#23313a]">{item.value}</p><p className="mt-1 text-sm text-[#6f7d82]">{item.detail}</p></div>;
              })}
            </div>
          </Panel>
          <Panel title="Data quality checks" eyebrow="Input confidence">
            <div className="space-y-4">
              {quality.map((item) => <div key={item.name}><div className="flex justify-between text-sm"><span>{item.name}</span><strong>{formatNumber(item.value)} · {formatDecimal(item.pct, 1)}%</strong></div><div className="mt-2 h-2 bg-[#e4dccb]"><div className="h-full bg-[#b66e4d]" style={{ width: `${Math.min(100, item.pct)}%` }} /></div></div>)}
              <div className="mt-5 flex items-start gap-3 border border-[#cdd9cc] bg-[#f4faef] p-4 text-sm text-[#51634d]"><CheckCircle2 size={18} className="mt-0.5 shrink-0" />The web app reads the workbook in memory and does not rewrite or repair the Excel file, avoiding the workbook-damage issue seen with generated Excel sheets.</div>
            </div>
          </Panel>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-2">
          <Panel title="Top radios" eyebrow="User equipment">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#d9d2c2] text-xs uppercase tracking-[0.16em] text-[#6f7d82]"><tr><th className="py-2 pr-3">Radio</th><th className="py-2 pr-3 text-right">Calls</th><th className="py-2 pr-3 text-right">Duration</th><th className="py-2 text-right">Traffic</th></tr></thead>
                <tbody>{getTop(rankings.radio, 10).map((item) => <tr key={item.name} className="border-b border-[#eee7d9]"><td className="py-2 pr-3 font-medium">{item.name}</td><td className="py-2 pr-3 text-right tabular-nums">{formatNumber(item.calls)}</td><td className="py-2 pr-3 text-right tabular-nums">{secondsToClock(item.durationSeconds)}</td><td className="py-2 text-right tabular-nums">{formatDecimal(item.trafficHours, 2)}</td></tr>)}</tbody>
              </table>
            </div>
          </Panel>
          <Panel title="Top users" eyebrow="Employee utilization">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#d9d2c2] text-xs uppercase tracking-[0.16em] text-[#6f7d82]"><tr><th className="py-2 pr-3">User</th><th className="py-2 pr-3 text-right">Calls</th><th className="py-2 pr-3 text-right">Duration</th><th className="py-2 text-right">Radios</th></tr></thead>
                <tbody>{getTop(rankings.user, 10).map((item) => <tr key={item.name} className="border-b border-[#eee7d9]"><td className="py-2 pr-3 font-medium">{item.name}</td><td className="py-2 pr-3 text-right tabular-nums">{formatNumber(item.calls)}</td><td className="py-2 pr-3 text-right tabular-nums">{secondsToClock(item.durationSeconds)}</td><td className="py-2 text-right tabular-nums">{formatNumber(item.radios)}</td></tr>)}</tbody>
              </table>
            </div>
          </Panel>
        </section>

        <Panel title="Filtered call register" eyebrow="Source-level records" className="mt-6">
          <div id="records-table-wrapper" className="max-h-[520px] overflow-auto">
            <table className="risk-table w-full min-w-[1080px] text-left text-xs">
              <thead className="sticky top-0 z-10 border-b border-[#d9d2c2] bg-[#fffaf0] uppercase tracking-[0.14em] text-[#6f7d82]">
                <tr><th className="py-3 pr-3">Date</th><th className="py-3 pr-3">Hour</th><th className="py-3 pr-3">Company</th><th className="py-3 pr-3">Region</th><th className="py-3 pr-3">Base station</th><th className="py-3 pr-3">Talkgroup</th><th className="py-3 pr-3">Radio</th><th className="py-3 pr-3">User</th><th className="py-3 pr-3 text-right">Duration</th><th className="py-3 text-right">Traffic</th></tr>
              </thead>
              <tbody>
                {filteredRecords.slice(0, 500).map((record, index) => <tr key={`${record.sn}-${index}`} className="border-b border-[#eee7d9]"><td className="py-2 pr-3">{record.callDate}</td><td className="py-2 pr-3">{record.hourLabel}</td><td className="py-2 pr-3">{record.company}</td><td className="py-2 pr-3">{record.region}</td><td className="py-2 pr-3">{record.baseStation}</td><td className="py-2 pr-3">{record.talkgroupAlias}</td><td className="py-2 pr-3">{record.radioId}<br /><span className="text-[#7b878a]">{record.radioAlias}</span></td><td className="py-2 pr-3">{record.employeeName}<br /><span className="text-[#7b878a]">{record.employeeId}</span></td><td className="py-2 pr-3 text-right tabular-nums">{secondsToClock(record.durationSeconds)}</td><td className="py-2 text-right tabular-nums">{formatDecimal(record.trafficHours, 3)}</td></tr>)}
              </tbody>
            </table>
          </div>
          {filteredRecords.length > 500 && <p className="mt-3 text-sm text-[#6f7d82]">Showing first 500 rows for browser performance. KPIs and charts still use all {formatNumber(filteredRecords.length)} filtered records.</p>}
        </Panel>
      </div>

      <style>{`@media print { @page { size: A3 landscape; margin: 8mm; } .no-print, .no-print * { display: none !important; } header { position: static !important; } main { background: #fffaf0 !important; } .container { max-width: 100% !important; padding: 0 !important; } .kpi-row { grid-template-columns: repeat(6, minmax(0, 1fr)) !important; } section { break-inside: avoid; } #records-table-wrapper { max-height: none !important; overflow: visible !important; } .risk-table th, .risk-table td { font-size: 8px !important; padding: 3px 5px !important; } }`}</style>
    </main>
  );
}
