export type RawRow = Record<string, unknown>;

export type CallRecord = {
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
  callType: string;
  duplexType: string;
  callPriority: string;
  encrypted: string;
};

export type LookupRecord = {
  radioId: string;
  company: string;
  region: string;
  talkgroup: string;
};

export type FleetmapRecord = {
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

export type FleetmapMeta = { fileName: string; loadedAt: string };

export type FleetmapState = {
  records: FleetmapRecord[];
  meta: FleetmapMeta | null;
  isParsing: boolean;
};

export type CdrSource = {
  fileName: string;
  rawRows: number;
  loadedAt: string;
  recordCount: number;
};

export type DashboardData = {
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

export type SavedWorkbookMeta = {
  fileName: string;
  sourceSheet?: string;
  loadedAt: string;
  rawRows?: number;
  rows?: number;
};

export type Filters = {
  region: string[];
  year: string[];
  company: string[];
  month: string[];
  baseStation: string[];
  talkgroup: string[];
  callType: string[];
  radioType: string[];
  encryption: string[];
  duplexMode: string[];
  search: string;
};

export type StagedTrafficUpload = {
  mode: "cdr" | "raw";
  files: File[];
} | null;

export type Ranking = {
  name: string;
  calls: number;
  durationSeconds: number;
  trafficHours: number;
  radios: number;
};

export type Metrics = {
  totalCalls: number;
  totalDuration: number;
  trafficHours: number;
  radios: number;
  companies: number;
  regions: number;
  talkgroups: number;
  stations: number;
  averageDuration: number;
};

export type QualityIssue = {
  name: string;
  count: number;
  pct: number;
};

export type TrafficIntensity = {
  busyTrafficHour?: Ranking;
  trafficPerTalkgroup: number;
  trafficPerCompany: number;
  trafficPerRegion: number;
};

export type ExportCell = string | number | boolean | null;
export type ChartExportDataset = {
  headers: string[];
  rows: ExportCell[][];
};

export type DashboardTab = "overview" | "charts" | "fleet" | "company" | "kpi" | "reports";
export type DesignProposalName = "proposal1" | "proposal2" | "proposal3";
export type ThemeName = DesignProposalName;

export type NativeChartSeries = { name: string; valuesRef: string; color: string };
export type NativeChartConfig = {
  sheetIndex: number;
  chartIndex: number;
  title: string;
  type: "bar" | "line" | "doughnut";
  categoriesRef: string;
  series: NativeChartSeries[];
  from?: { col: number; row: number };
  to?: { col: number; row: number };
};



