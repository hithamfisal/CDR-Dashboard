import type { Filters } from "../types/dashboard";

export const SECTION_NAV_ITEMS = [
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

export const DASHBOARD_TABS = [
  { id: "overview", label: "Global View" },
  { id: "company", label: "Ticket Portal" },
  { id: "charts", label: "Advanced Analytics" },
  { id: "fleet", label: "Executive Summary" },
  { id: "kpi", label: "Deep Trends" },
  { id: "reports", label: "Report Portal" },
] as const;


export const SAVED_WORKBOOK_DB = "cdr-dashboard-cache";
export const SAVED_WORKBOOK_STORE = "workbooks";
export const SAVED_WORKBOOK_KEY = "last-workbook";
export const SAVED_WORKBOOK_META_KEY = "cdr-dashboard-last-workbook-meta";
export const SAVED_MASTER_FLEETMAP_KEY = "master-fleetmap";
export const SAVED_FIXED_FLEETMAP_KEY = "fixed-fleetmap";

export const EMPTY_FILTERS: Filters = {
  region: [],
  year: [],
  company: [],
  month: [],
  baseStation: [],
  talkgroup: [],
  callType: [],
  radioType: [],
  encryption: [],
  duplexMode: [],
  search: "",
};

export const COLORS = [
  "var(--chart-series-1)",
  "var(--chart-series-2)",
  "var(--chart-series-3)",
  "var(--chart-series-4)",
  "var(--chart-series-5)",
  "var(--chart-series-6)",
  "var(--chart-series-7)",
  "var(--chart-series-8)",
];
export const COMPANY_COLORS = [
  "var(--chart-series-1)",
  "var(--chart-series-2)",
  "var(--chart-series-3)",
  "var(--chart-series-4)",
  "var(--chart-series-5)",
  "var(--chart-series-6)",
  "var(--chart-series-7)",
  "var(--chart-series-8)",
  "var(--chart-series-9)",
  "var(--chart-series-10)",
];
export const CHART_COLORS = {
  calls: "var(--chart-calls)",
  callsLight: "var(--chart-calls-light)",
  callsDeep: "var(--chart-calls-deep)",
  duration: "var(--chart-duration)",
  durationLight: "var(--chart-duration-light)",
  durationDeep: "var(--chart-duration-deep)",
  total: "var(--chart-total)",
  used: "var(--chart-used)",
  totalGreen: "var(--chart-total-green)",
  usedGreen: "var(--chart-used-green)",
  grid: "var(--chart-grid)",
  axis: "var(--chart-axis)",
  label: "var(--chart-label)",
  labelStroke: "var(--chart-label-stroke)",
  tooltipBg: "var(--chart-tooltip-bg)",
  tooltipBorder: "var(--chart-tooltip-border)",
  tooltipText: "var(--chart-tooltip-text)",
};
export const TOOLTIP_STYLE = { background: CHART_COLORS.tooltipBg, border: `1px solid ${CHART_COLORS.tooltipBorder}`, color: CHART_COLORS.tooltipText };
export const MOBILE_TYPE_LABELS = [
  "PORTABLE - \u062c\u0647\u0627\u0632 \u0645\u062d\u0645\u0648\u0644",
  "ATEX - \u0645\u062d\u0645\u0648\u0644 \u062e\u0627\u0635",
  "MOBILE - \u0633\u064a\u0627\u0631",
  "FIXED - \u0645\u0643\u062a\u0628\u064a",
  "Dispatcher",
];
export const MOBILE_TYPE_COLORS = ["var(--chart-series-1)", "var(--chart-series-3)", "var(--chart-series-2)", "var(--chart-series-4)", "var(--chart-series-5)"];
export const NUMERIC_TALKGROUP_FILTER = "__NUMERIC_TALKGROUPS__";

export const HEADER_ALIASES = {
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
  callType: ["calltype", "call type", "type of call", "call category"],
  duplexType: ["duplextype", "duplex type", "duplex", "call duplex"],
  callPriority: ["callpriority", "call priority", "priority"],
  encrypted: ["encrypted", "encryption", "encrypted status", "encrypt"],
};

export const FLEETMAP_HEADER_ALIASES = {
  radioId:      ["radioid", "radio id", "radio", "id", "subscriberid", "subscriber id"],
  radioAlias:   ["radioalias", "radio alias", "alias", "name"],
  employeeName: ["employeename", "employee name", "user name", "username", "user", "employee"],
  employeeId:   ["employeeid", "employee id", "user id", "userid"],
  company:      ["company", "company / bl", "department", "bl", "business line"],
  region:       ["region", "area", "site", "location"],
  talkgroup:    ["talkgroupalias", "talkgroup alias", "talkgroup", "talk group", "group"],
  mobileType:   ["mobiletype", "mobile type", "radio type", "radiotype", "terminal type", "device type", "type"],
};

export const RAW_SYSTEM_HEADER_ALIASES = {
  callerNumber: ["caller number", "callernumber", "caller radio", "caller radio id", "radio id", "radioid"],
  callerAlias: ["caller alias", "calleralias", "radio alias", "alias"],
  calleeNumber: ["callee number", "calleenumber", "called number", "callednumber", "talkgroup id", "talkgroup number"],
  calleeAlias: ["callee alias", "calleealias", "called alias", "calledalias", "talkgroup alias", "talkgroup"],
  startTime: ["start time", "starttime", "call start", "callstart"],
  endTime: ["end time", "endtime", "call end", "callend", "stop time", "stoptime"],
  durationSeconds: ["duration (s)", "duration s", "duration seconds", "durationseconds", "duration sec", "seconds"],
  baseStation: ["caller base station", "callerbasestation", "base station", "station"],
  callType: ["call type", "calltype", "type of call", "call category"],
  duplexType: ["duplex type", "duplextype", "duplex", "call duplex"],
  callPriority: ["call priority", "callpriority", "priority"],
  encrypted: ["encrypted", "encryption", "encrypted status", "encrypt"],
};




