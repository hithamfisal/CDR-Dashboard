import {
  CSSProperties,
  ChangeEvent,
  FormEvent,
  ReactNode,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ChartLegend,
  ExportButton,
  SectionTitle,
} from "./components/DashboardUi";
import { DashboardFilters } from "./components/DashboardFilters";
import { DashboardTabs } from "./components/DashboardTabs";
import {
  chartLabel,
  formatDecimal,
  formatNumber,
  formatPercent,
  secondsToClock,
  sumValues,
} from "./lib/formatters";
import { captureElementPng } from "./lib/capture";
import {
  getSavedWorkbookMeta,
  loadFleetmapFromBrowser,
  loadWorkbookFromBrowser,
  saveFleetmapToBrowser,
  saveWorkbookToBrowser,
  setSavedWorkbookMeta,
  themeClass,
  useTheme,
  workbookMeta,
} from "./lib/browserCache";
import {
  CHART_COLORS,
  COLORS,
  DASHBOARD_TABS,
  EMPTY_FILTERS,
  MOBILE_TYPE_LABELS,
  NUMERIC_TALKGROUP_FILTER,
  SAVED_FIXED_FLEETMAP_KEY,
  SAVED_MASTER_FLEETMAP_KEY,
  SAVED_WORKBOOK_DB,
  SAVED_WORKBOOK_KEY,
  SAVED_WORKBOOK_META_KEY,
  SAVED_WORKBOOK_STORE,
  SECTION_NAV_ITEMS,
  TOOLTIP_STYLE,
} from "./lib/dashboardConstants";
import type {
  CallRecord,
  ChartExportDataset,
  DashboardData,
  DashboardTab,
  Filters,
  FleetmapMeta,
  FleetmapRecord,
  FleetmapState,
  NativeChartConfig,
  Ranking,
  SavedWorkbookMeta,
  StagedTrafficUpload,
  ThemeName,
} from "./types/dashboard";
import { ReportsPanel } from "./components/ReportsPanel";
import {
  DEFAULT_LOCAL_SETTINGS,
  ensureLocalAppDatabase,
  saveLocalAppSettings,
  updateLocalCredential,
  clearMysqlSessionToken,
  verifyLocalCredentialByUsername,
  listMysqlUsers,
  createMysqlUser,
  updateMysqlUser,
  listMysqlAuditLogs,
  type LocalAppSettings,
  type PortalRole,
  type AppUserRecord,
  type AuditLogRecord,
} from "./lib/localAppDatabase";
import { UploadView } from "./components/UploadView";
import { ThemeSelector } from "./components/ThemeSelector";
import { WorkbookHero } from "./components/WorkbookHero";
import { ModernOverview } from "./components/ModernOverview";
import { ChartsTab } from "./components/ChartsTab";
import { FilteredCallsRegister } from "./components/FilteredCallsRegister";
import {
  CallsDurationPerformanceChart,
  CompanyPerformanceTooltip,
  KpiBarLabel,
  KpiLineLabel,
  MobileTypeOverlayBarShape,
  MobileTypeTooltip,
  OverlayBarShape,
  PieOuterDecimalLabel,
  PointValueLabel,
  RadioTooltip,
  RightValueLabel,
  TalkgroupTooltip,
  TopValueLabel,
} from "./components/ChartParts";
import { filterCallRecords } from "./lib/filterRecords";
import { calculateMetrics, calculateRankings, modeBy } from "./lib/analytics";
import { monthSortValue, weekSortValue } from "./lib/dateSort";
import { buildFilterOptions, uniqueOptions } from "./lib/filterOptions";
import {
  companyColor,
  companyMetricColor,
  dataKey,
  mobileTypeColor,
  mobileTypeKey,
  shortMonthLabel,
  truncateLabel,
} from "./lib/chartHelpers";
import {
  cleanText,
  isKnownLabel,
  normalizeRadioKey,
  parseDate,
  parseNumber,
  weekLabelFromDate,
} from "./lib/recordUtils";
import {
  applyWorkbookArabicSupport,
  csvEscape,
  downloadBlob,
  downloadDataUrl,
  downloadPdf,
  downloadPptx,
  downloadText,
  downloadWorkbookData,
  ensurePdfArabicFont,
  escapeXml,
  excelColumnName,
  excelRange,
  exportIconSvg,
  fileSlug,
  htmlEscape,
  patchWorkbookWithNativeCharts,
  pdfText,
  pptTextOptions,
} from "./lib/exportUtils";
import { usePagedItems } from "./hooks/usePagination";
import type ExcelJS from "exceljs";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  Clock3,
  FileImage,
  LogOut,
  Filter,
  Home,
  Palette,
  Presentation,
  RefreshCw,
  Search,
  ShieldCheck,
  UploadCloud,
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
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Treemap,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Shared sub-components

async function loadExcelJS() {
  return (await import("exceljs")).default;
}

async function loadJsPdf() {
  return (await import("jspdf")).jsPDF;
}

async function loadPptxgen() {
  return (await import("pptxgenjs")).default;
}

async function loadWorkbookParser() {
  return import("./lib/workbookParser");
}

function unionFleetmapRecords(
  master: FleetmapRecord[],
  fixed: FleetmapRecord[],
): FleetmapRecord[] {
  const map = new Map<string, FleetmapRecord>();
  [...master, ...fixed].forEach((record) => {
    const radioKey = normalizeRadioKey(record.radioId);
    if (isKnownLabel(radioKey) && !map.has(radioKey)) map.set(radioKey, record);
  });
  return [...map.values()];
}

const COMPANY_TREEMAP_COLORS = [
  "var(--chart-series-1)",
  "var(--chart-series-2)",
  "var(--chart-series-3)",
  "var(--chart-series-4)",
  "var(--chart-series-5)",
  "var(--chart-series-6)",
  "var(--chart-series-7)",
  "var(--chart-series-8)",
];
const REGION_RADAR_COLORS = ["var(--chart-series-1)", "var(--chart-series-2)", "var(--chart-series-3)", "var(--chart-series-4)"];
const REGION_RADAR_ORDER = ["South", "West", "East", "North"];
const CALL_TYPE_SERIES = [
  { key: "phoneCall", name: "Phone Call", color: "var(--chart-series-1)" },
  { key: "groupCall", name: "Group Call", color: "var(--chart-series-2)" },
  {
    key: "environmentalListening",
    name: "Environmental Listening",
    color: "var(--chart-series-3)",
  },
  { key: "individualCall", name: "Individual Call", color: "var(--chart-series-4)" },
  { key: "networkWide", name: "Network-wide", color: "var(--chart-series-5)" },
  { key: "broadcast", name: "Broadcast", color: "var(--chart-series-6)" },
];
const MONTH_BUCKETS = [
  { label: "Jan", match: "jan" },
  { label: "Feb", match: "feb" },
  { label: "Mar", match: "mar" },
  { label: "Apr", match: "apr" },
  { label: "May", match: "may" },
  { label: "Jun", match: "jun" },
  { label: "Jul", match: "jul" },
  { label: "Aug", match: "aug" },
  { label: "Sep", match: "sep" },
  { label: "Oct", match: "oct" },
  { label: "Nov", match: "nov" },
  { label: "Dec", match: "dec" },
];

function callTypeMonthIndex(record: CallRecord) {
  const text = `${record.month || record.callDate || ""}`.trim().toLowerCase();
  const explicit = MONTH_BUCKETS.findIndex(
    (month) => text.startsWith(month.match) || text.includes(` ${month.match}`),
  );
  if (explicit >= 0) return explicit;
  const parsed = new Date(record.callDate);
  return Number.isNaN(parsed.getTime()) ? -1 : parsed.getMonth();
}

function callTypeMixKey(value: string) {
  const text = `${value || ""}`.toLowerCase();
  if (text.includes("broadcast")) return "broadcast";
  if (text.includes("network")) return "networkWide";
  if (text.includes("environment") || text.includes("listen"))
    return "environmentalListening";
  if (text.includes("individual") || text.includes("private"))
    return "individualCall";
  if (text.includes("group")) return "groupCall";
  return "phoneCall";
}

function StackedPercentLabel(props: any) {
  const { x = 0, y = 0, width = 0, height = 0, value = 0 } = props;
  const numeric = Number(value);
  if (numeric < 9 || width < 18 || height < 18) return null;
  return (
    <text
      x={x + width / 2}
      y={y + height / 2 + 4}
      textAnchor="middle"
      fill="var(--design-bg)"
      fontSize={9}
      fontWeight={900}
    >
      {formatDecimal(numeric, 0)}%
    </text>
  );
}

function CallTypeMixTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const visible = payload.filter((item: any) => Number(item.value) > 0);
  return (
    <div className="custom-tooltip">
      <strong>{label}</strong>
      {visible.map((item: any) => (
        <span key={item.dataKey} style={{ color: item.color }}>
          {item.name}: {formatDecimal(Number(item.value), 1)}% (
          {formatNumber(Number(item.payload?.[`${item.dataKey}Count`] ?? 0))})
        </span>
      ))}
    </div>
  );
}

function CompanyTreemapTile(props: any) {
  const {
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    name = "",
    calls = 0,
    payload,
    index = 0,
  } = props;
  const fill = payload?.fill ?? props.fill ?? COMPANY_TREEMAP_COLORS[0];
  const tileName = payload?.name ?? name;
  const tileCalls = Number(payload?.calls ?? calls ?? props.value ?? 0);
  if (width < 8 || height < 8) return null;
  const innerWidth = Math.max(0, width - 6);
  const innerHeight = Math.max(0, height - 6);
  const fontSize =
    width > 128 && height > 58 ? 12 : width > 82 && height > 34 ? 10 : 8;
  const maxChars = Math.max(
    3,
    Math.floor((innerWidth - 14) / (fontSize * 0.56)),
  );
  const showName = innerWidth > 26 && innerHeight > 18;
  const showValue = innerWidth > 42 && innerHeight > 28;
  const clipId =
    `company-treemap-clip-${index}-${Math.round(x)}-${Math.round(y)}`.replace(
      /[^a-zA-Z0-9_-]/g,
      "",
    );
  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <rect
            x={x + 3}
            y={y + 3}
            width={innerWidth}
            height={innerHeight}
            rx={9}
            ry={9}
          />
        </clipPath>
      </defs>
      <title>{`${tileName}: ${formatNumber(tileCalls)} calls`}</title>
      <rect
        x={x + 3}
        y={y + 3}
        width={innerWidth}
        height={innerHeight}
        rx={9}
        ry={9}
        fill={fill}
        fillOpacity={0.94}
        stroke="rgba(237,246,250,0.34)"
        strokeWidth={1.2}
      />
      <rect
        x={x + 3}
        y={y + 3}
        width={innerWidth}
        height={innerHeight}
        rx={9}
        ry={9}
        fill="var(--design-bg)"
        fillOpacity={0.08}
      />
      <g clipPath={`url(#${clipId})`}>
        {showName && (
          <text
            x={x + 10}
            y={y + fontSize + 10}
            fill="var(--design-bg)"
            fontSize={fontSize}
            fontWeight={900}
          >
            {truncateLabel(String(tileName), maxChars)}
          </text>
        )}
        {showValue && (
          <text
            x={x + 10}
            y={y + fontSize * 2 + 16}
            fill="var(--design-bg)"
            fontSize={Math.max(8, fontSize - 1)}
            fontWeight={850}
          >
            {formatNumber(tileCalls)} calls
          </text>
        )}
      </g>
    </g>
  );
}

function RegionRadarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="radar-tooltip">
      <strong>{label}</strong>
      {payload.map((item: any) => (
        <span key={item.dataKey} style={{ color: item.color }}>
          {item.name}:{" "}
          {item.payload?.[`${item.dataKey}RawText`] ??
            formatDecimal(Number(item.value), 1)}
        </span>
      ))}
    </div>
  );
}


type PortalMode = PortalRole;

function getInitialPortalMode(): PortalMode {
  if (typeof window === "undefined") return "customer";
  const hash = window.location.hash.toLowerCase();
  if (hash.includes("customer-admin") || hash.includes("customeradmin") || hash.includes("client-admin")) return "customerAdmin";
  if (hash.includes("admin")) return "admin";
  if (hash.includes("customer") || hash.includes("client")) return "customer";
  return "customer";
}

function getRequestedPortalMode(): PortalMode | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.toLowerCase();
  if (hash.includes("customer-admin") || hash.includes("customeradmin") || hash.includes("client-admin")) return "customerAdmin";
  if (hash.includes("admin")) return "admin";
  if (hash.includes("customer") || hash.includes("client")) return "customer";
  return null;
}

function portalRoleLabel(role: PortalRole) {
  if (role === "admin") return "Admin";
  if (role === "customerAdmin") return "Customer Admin";
  return "Customer";
}


type PortalSession = { role: PortalRole; username: string; token?: string };

function LoginScreen({
  settings,
  theme,
  isDark,
  onLogin,
  onToggleTheme,
  onThemeChange,
}: {
  settings: LocalAppSettings;
  theme: ThemeName;
  isDark: boolean;
  onLogin: (username: string, password: string) => Promise<boolean>;
  onToggleTheme: () => void;
  onThemeChange: (theme: ThemeName) => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setLoginError("");
    try {
      const ok = await onLogin(username, password);
      if (!ok) setLoginError("Invalid username or password in MySQL.");
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Cannot connect to the MySQL API.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className={`local-login-shell ${themeClass(theme)}`}>
      <section className="local-login-card">
        <div className="local-login-toolbar">
          <div className="portal-switcher single-role-badge" aria-label="Single portal">
            <button type="button" className="active"><ShieldCheck size={16} /> One Portal</button>
          </div>
          <ThemeSelector theme={theme} onThemeChange={onThemeChange} compact label="Design" />
        </div>
        <div className="local-login-brand">
          <ShieldCheck size={38} />
          <span>{settings.companyName}</span>
          <h1>CDR Dashboard Login</h1>
          <p>One interface with multiple permissions stored in MySQL.</p>
        </div>

        <form className="local-login-form" onSubmit={submit}>
          <label>
            Username
            <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" placeholder="Username" />
          </label>
          <label>
            Password
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" placeholder="Password" />
          </label>
          {loginError && <div className="local-login-error">{loginError}</div>}
          <button className="button cdr-action-pill cdr-action-primary" type="submit" disabled={isSubmitting}>
            <ShieldCheck size={18} /> {isSubmitting ? "Checking MySQL..." : "Login"}
          </button>
        </form>

        <div className="local-login-note">
          <strong>MySQL credentials</strong>
          <span>The portal privilege is detected automatically from the saved username. No role selection is required.</span>
        </div>
      </section>
    </main>
  );
}

function LocalSettingsPanel({
  settings,
  isOpen,
  onClose,
  onSaveSettings,
  onSaveCredential,
  canManageCredentials,
  theme,
  onThemeChange,
}: {
  settings: LocalAppSettings;
  isOpen: boolean;
  onClose: () => void;
  onSaveSettings: (settings: LocalAppSettings) => Promise<void>;
  onSaveCredential: (role: PortalRole, username: string, password: string) => Promise<void>;
  canManageCredentials: boolean;
  theme: ThemeName;
  onThemeChange: (theme: ThemeName) => void;
}) {
  const [draft, setDraft] = useState(settings);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [customerAdminUsername, setCustomerAdminUsername] = useState("");
  const [customerAdminPassword, setCustomerAdminPassword] = useState("");
  const [customerUsername, setCustomerUsername] = useState("");
  const [customerPassword, setCustomerPassword] = useState("");
  const [status, setStatus] = useState("");
  const [users, setUsers] = useState<AppUserRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [newUserRole, setNewUserRole] = useState<PortalRole>("customer");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [userPasswordDrafts, setUserPasswordDrafts] = useState<Record<number, string>>({});
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const readImageFile = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const updateImageSetting = async (
    event: ChangeEvent<HTMLInputElement>,
    nameKey: "leftLogoName" | "rightLogoName" | "uploadHeroImageName" | "radioShowcaseImageName",
    dataKey: "leftLogoDataUrl" | "rightLogoDataUrl" | "uploadHeroImageDataUrl" | "radioShowcaseImageDataUrl",
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") && !file.name.toLowerCase().endsWith(".svg")) {
      setStatus("Please select a valid image file for logos or page pictures.");
      return;
    }
    const dataUrl = await readImageFile(file);
    setDraft((current) => ({ ...current, [nameKey]: file.name, [dataKey]: dataUrl }));
    event.target.value = "";
  };

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  useEffect(() => {
    if (!isOpen || !canManageCredentials) return;
    let mounted = true;
    setIsLoadingUsers(true);
    Promise.all([listMysqlUsers(), listMysqlAuditLogs(60)])
      .then(([nextUsers, nextLogs]) => {
        if (!mounted) return;
        setUsers(nextUsers);
        setAuditLogs(nextLogs);
      })
      .catch((error) => setStatus(error instanceof Error ? error.message : "Could not load MySQL users."))
      .finally(() => mounted && setIsLoadingUsers(false));
    return () => {
      mounted = false;
    };
  }, [isOpen, canManageCredentials]);

  if (!isOpen) return null;

  const saveSettings = async () => {
    await onSaveSettings(draft);
    setStatus("Admin settings saved in MySQL database.");
  };

  const saveCredential = async (role: PortalRole) => {
    const username = role === "admin" ? adminUsername : role === "customerAdmin" ? customerAdminUsername : customerUsername;
    const password = role === "admin" ? adminPassword : role === "customerAdmin" ? customerAdminPassword : customerPassword;
    if (!username.trim() || password.length < 6) {
      setStatus("Username is required and password must be at least 6 characters.");
      return;
    }
    await onSaveCredential(role, username, password);
    if (role === "admin") {
      setAdminUsername("");
      setAdminPassword("");
    } else if (role === "customerAdmin") {
      setCustomerAdminUsername("");
      setCustomerAdminPassword("");
    } else {
      setCustomerUsername("");
      setCustomerPassword("");
    }
    setUsers(await listMysqlUsers());
    setAuditLogs(await listMysqlAuditLogs(60));
    setStatus(`${portalRoleLabel(role)} credential saved in MySQL database.`);
  };

  const addMysqlUser = async () => {
    if (!newUserName.trim() || newUserPassword.length < 6) {
      setStatus("New user requires a username and a password of at least 6 characters.");
      return;
    }
    const nextUsers = await createMysqlUser({ username: newUserName, password: newUserPassword, role: newUserRole, isActive: true });
    setUsers(nextUsers);
    setAuditLogs(await listMysqlAuditLogs(60));
    setNewUserName("");
    setNewUserPassword("");
    setStatus("New MySQL user created.");
  };

  const updateUserRole = async (user: AppUserRecord, role: PortalRole) => {
    setUsers(await updateMysqlUser({ id: user.id, role }));
    setAuditLogs(await listMysqlAuditLogs(60));
    setStatus(`Role updated for ${user.username}.`);
  };

  const toggleUserActive = async (user: AppUserRecord) => {
    setUsers(await updateMysqlUser({ id: user.id, isActive: !user.isActive }));
    setAuditLogs(await listMysqlAuditLogs(60));
    setStatus(`${user.username} ${user.isActive ? "disabled" : "enabled"}.`);
  };

  const resetUserPassword = async (user: AppUserRecord) => {
    const password = userPasswordDrafts[user.id] || "";
    if (password.length < 6) {
      setStatus("Reset password must be at least 6 characters.");
      return;
    }
    setUsers(await updateMysqlUser({ id: user.id, password }));
    setAuditLogs(await listMysqlAuditLogs(60));
    setUserPasswordDrafts((current) => ({ ...current, [user.id]: "" }));
    setStatus(`Password reset for ${user.username}.`);
  };

  const formatAuditTime = (value: string) => {
    if (!value) return "-";
    try { return new Date(value).toLocaleString(); } catch { return value; }
  };

  const exportSettingsBackup = () => {
    const backup = {
      exportedAt: new Date().toISOString(),
      settings: draft,
      users: canManageCredentials ? users : [],
      auditLogs: canManageCredentials ? auditLogs : [],
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cdr-settings-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus("Settings backup exported.");
  };

  const resetBrandingDefaults = () => {
    setDraft((current) => ({
      ...current,
      companyName: DEFAULT_LOCAL_SETTINGS.companyName,
      adminPortalTitle: DEFAULT_LOCAL_SETTINGS.adminPortalTitle,
      adminPortalDescription: DEFAULT_LOCAL_SETTINGS.adminPortalDescription,
      customerPortalTitle: DEFAULT_LOCAL_SETTINGS.customerPortalTitle,
      customerPortalDescription: DEFAULT_LOCAL_SETTINGS.customerPortalDescription,
      dashboardHeaderTitle: DEFAULT_LOCAL_SETTINGS.dashboardHeaderTitle,
      dashboardHeaderDescription: DEFAULT_LOCAL_SETTINGS.dashboardHeaderDescription,
      leftLogoName: DEFAULT_LOCAL_SETTINGS.leftLogoName,
      leftLogoDataUrl: DEFAULT_LOCAL_SETTINGS.leftLogoDataUrl,
      rightLogoName: DEFAULT_LOCAL_SETTINGS.rightLogoName,
      rightLogoDataUrl: DEFAULT_LOCAL_SETTINGS.rightLogoDataUrl,
      uploadHeroImageName: DEFAULT_LOCAL_SETTINGS.uploadHeroImageName,
      uploadHeroImageDataUrl: DEFAULT_LOCAL_SETTINGS.uploadHeroImageDataUrl,
      radioShowcaseImageName: DEFAULT_LOCAL_SETTINGS.radioShowcaseImageName,
      radioShowcaseImageDataUrl: DEFAULT_LOCAL_SETTINGS.radioShowcaseImageDataUrl,
    }));
    setStatus("Branding fields reset in the form. Press Save Interface Settings to apply.");
  };

  return (
    <div className="local-settings-overlay" role="dialog" aria-modal="true">
      <section className="local-settings-panel">
        <div className="local-settings-head">
          <div>
            <span>Admin Settings</span>
            <h2>{canManageCredentials ? "Credentials, Users & Interface Settings" : "Interface Settings"}</h2>
          </div>
          <button className="button small cdr-action-pill" type="button" onClick={onClose}>Close</button>
        </div>

        <div className="local-design-preview-grid" aria-label="Design proposal previews">
          <button type="button" className={`local-design-preview-card ${theme === "proposal1" ? "active" : ""}`} onClick={() => onThemeChange("proposal1")}>
            <span>Dark Blue</span><strong>Operations command center</strong><small>Navy panels, blue/cyan analytics, high contrast.</small>
          </button>
          <button type="button" className={`local-design-preview-card ${theme === "proposal2" ? "active" : ""}`} onClick={() => onThemeChange("proposal2")}>
            <span>Light Executive</span><strong>Management report view</strong><small>White cards, readable dark text, clean blue accents.</small>
          </button>
          <button type="button" className={`local-design-preview-card ${theme === "proposal3" ? "active" : ""}`} onClick={() => onThemeChange("proposal3")}>
            <span>Dark Emerald</span><strong>Network operations view</strong><small>Emerald panels, service-health accents, NOC style.</small>
          </button>
        </div>

        <div className="local-settings-grid">
          <label>Company Name<input value={draft.companyName} onChange={(event) => setDraft({ ...draft, companyName: event.target.value })} /></label>
          <label>Dashboard Header Title<input value={draft.dashboardHeaderTitle} onChange={(event) => setDraft({ ...draft, dashboardHeaderTitle: event.target.value })} /></label>
          <label>Dashboard Header Description<input value={draft.dashboardHeaderDescription} onChange={(event) => setDraft({ ...draft, dashboardHeaderDescription: event.target.value })} /></label>
          <label>Admin Portal Title<input value={draft.adminPortalTitle} onChange={(event) => setDraft({ ...draft, adminPortalTitle: event.target.value })} /></label>
          <label>Customer Portal Title<input value={draft.customerPortalTitle} onChange={(event) => setDraft({ ...draft, customerPortalTitle: event.target.value })} /></label>
          <label>Support Email<input value={draft.supportEmail} onChange={(event) => setDraft({ ...draft, supportEmail: event.target.value })} /></label>
          <label>Support Phone<input value={draft.supportPhone} onChange={(event) => setDraft({ ...draft, supportPhone: event.target.value })} /></label>
          <label>Primary Color<input value={draft.primaryColor} onChange={(event) => setDraft({ ...draft, primaryColor: event.target.value })} /></label>
          <label className="local-settings-wide">Admin Portal Description<textarea value={draft.adminPortalDescription} onChange={(event) => setDraft({ ...draft, adminPortalDescription: event.target.value })} /></label>
          <label className="local-settings-wide">Customer Portal Description<textarea value={draft.customerPortalDescription} onChange={(event) => setDraft({ ...draft, customerPortalDescription: event.target.value })} /></label>
        </div>

        <div className="local-branding-grid">
          <div className="local-branding-card">
            <span>Admin Portal Left Logo</span>
            <div className="local-branding-preview">
              <img src={draft.leftLogoDataUrl || "/assets/se-logo.png"} alt={draft.leftLogoName || "Left logo"} />
            </div>
            <strong>{draft.leftLogoName || "Default left logo"}</strong>
            <label className="local-file-picker">Choose Left Logo<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => updateImageSetting(event, "leftLogoName", "leftLogoDataUrl")} /></label>
            {draft.leftLogoDataUrl && <button className="button small cdr-action-pill" type="button" onClick={() => setDraft({ ...draft, leftLogoName: "Left Logo", leftLogoDataUrl: "" })}>Use Default</button>}
          </div>

          <div className="local-branding-card">
            <span>Admin Portal Right Logo</span>
            <div className="local-branding-preview">
              <img src={draft.rightLogoDataUrl || "/assets/nasco-logo.png"} alt={draft.rightLogoName || "Right logo"} />
            </div>
            <strong>{draft.rightLogoName || "Default right logo"}</strong>
            <label className="local-file-picker">Choose Right Logo<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => updateImageSetting(event, "rightLogoName", "rightLogoDataUrl")} /></label>
            {draft.rightLogoDataUrl && <button className="button small cdr-action-pill" type="button" onClick={() => setDraft({ ...draft, rightLogoName: "Right Logo", rightLogoDataUrl: "" })}>Use Default</button>}
          </div>

          <div className="local-branding-card">
            <span>Upload Page Picture</span>
            <div className="local-branding-preview hero-preview">
              <img src={draft.uploadHeroImageDataUrl || "/assets/h.png"} alt={draft.uploadHeroImageName || "Upload page picture"} />
            </div>
            <strong>{draft.uploadHeroImageName || "Default upload picture"}</strong>
            <label className="local-file-picker">Choose Upload Picture<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => updateImageSetting(event, "uploadHeroImageName", "uploadHeroImageDataUrl")} /></label>
            {draft.uploadHeroImageDataUrl && <button className="button small cdr-action-pill" type="button" onClick={() => setDraft({ ...draft, uploadHeroImageName: "Upload Page Picture", uploadHeroImageDataUrl: "" })}>Use Default</button>}
          </div>

          <div className="local-branding-card">
            <span>Radio Showcase Picture</span>
            <div className="local-branding-preview radio-preview">
              <img src={draft.radioShowcaseImageDataUrl || "/assets/radio.png"} alt={draft.radioShowcaseImageName || "Radio showcase picture"} />
            </div>
            <strong>{draft.radioShowcaseImageName || "Default radio picture"}</strong>
            <label className="local-file-picker">Choose Radio Picture<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => updateImageSetting(event, "radioShowcaseImageName", "radioShowcaseImageDataUrl")} /></label>
            {draft.radioShowcaseImageDataUrl && <button className="button small cdr-action-pill" type="button" onClick={() => setDraft({ ...draft, radioShowcaseImageName: "Radio Showcase Picture", radioShowcaseImageDataUrl: "" })}>Use Default</button>}
          </div>
        </div>

        <div className="local-settings-status local-settings-guidance">Recommended image sizes: header logos 320×96 px transparent PNG/SVG, upload page picture 1600×1000 px JPG/PNG/WebP, radio showcase picture 1200×1280 px transparent PNG/WebP (or keep original ratio near 1275×1359).</div>
        <div className="local-settings-actions-row">
          <button className="button cdr-action-pill cdr-action-primary" type="button" onClick={saveSettings}>Save Interface Settings</button>
          <button className="button cdr-action-pill" type="button" onClick={resetBrandingDefaults}>Reset Branding Defaults</button>
          <button className="button cdr-action-pill" type="button" onClick={exportSettingsBackup}>Export Settings Backup</button>
        </div>

        {canManageCredentials && (
        <div className="local-credential-grid">
          <div className="local-credential-card">
            <h3>Admin Credential</h3>
            <input placeholder="New admin username" value={adminUsername} onChange={(event) => setAdminUsername(event.target.value)} />
            <input placeholder="New admin password" type="password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} />
            <button className="button small cdr-action-pill" type="button" onClick={() => saveCredential("admin")}>Save Admin Login</button>
          </div>
          <div className="local-credential-card">
            <h3>Customer Admin Credential</h3>
            <input placeholder="New customer admin username" value={customerAdminUsername} onChange={(event) => setCustomerAdminUsername(event.target.value)} />
            <input placeholder="New customer admin password" type="password" value={customerAdminPassword} onChange={(event) => setCustomerAdminPassword(event.target.value)} />
            <button className="button small cdr-action-pill" type="button" onClick={() => saveCredential("customerAdmin")}>Save Customer Admin Login</button>
          </div>
          <div className="local-credential-card">
            <h3>Customer Credential</h3>
            <input placeholder="New customer username" value={customerUsername} onChange={(event) => setCustomerUsername(event.target.value)} />
            <input placeholder="New customer password" type="password" value={customerPassword} onChange={(event) => setCustomerPassword(event.target.value)} />
            <button className="button small cdr-action-pill" type="button" onClick={() => saveCredential("customer")}>Save Customer Login</button>
          </div>
        </div>
        )}
        {canManageCredentials && (
          <div className="local-admin-management">
            <div className="local-admin-section-head">
              <div><span>System Admin</span><h3>User Management</h3></div>
              <small>{isLoadingUsers ? "Loading users..." : `${users.length} users in MySQL`}</small>
            </div>
            <div className="local-user-create-row">
              <select value={newUserRole} onChange={(event) => setNewUserRole(event.target.value as PortalRole)}>
                <option value="admin">System Admin</option>
                <option value="customerAdmin">Customer Admin</option>
                <option value="customer">Customer</option>
              </select>
              <input placeholder="New username" value={newUserName} onChange={(event) => setNewUserName(event.target.value)} />
              <input placeholder="New password" type="password" value={newUserPassword} onChange={(event) => setNewUserPassword(event.target.value)} />
              <button className="button small cdr-action-pill cdr-action-primary" type="button" onClick={addMysqlUser}>Add User</button>
            </div>
            <div className="local-users-table-wrap">
              <table className="local-users-table">
                <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Last Login</th><th>Password Reset</th><th>Actions</th></tr></thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td><strong>{user.username}</strong><small>ID {user.id}</small></td>
                      <td>
                        <select value={user.role} onChange={(event) => updateUserRole(user, event.target.value as PortalRole)}>
                          <option value="admin">System Admin</option>
                          <option value="customerAdmin">Customer Admin</option>
                          <option value="customer">Customer</option>
                        </select>
                      </td>
                      <td><span className={`status-pill ${user.isActive ? "good" : "bad"}`}>{user.isActive ? "Active" : "Disabled"}</span>{user.failedAttempts > 0 && <small>{user.failedAttempts} failed</small>}</td>
                      <td>{formatAuditTime(user.lastLoginAt || "")}</td>
                      <td><input type="password" placeholder="New password" value={userPasswordDrafts[user.id] || ""} onChange={(event) => setUserPasswordDrafts((current) => ({ ...current, [user.id]: event.target.value }))} /></td>
                      <td className="local-users-actions">
                        <button className="button tiny cdr-action-pill" type="button" onClick={() => resetUserPassword(user)}>Reset</button>
                        <button className="button tiny cdr-action-pill" type="button" onClick={() => toggleUserActive(user)}>{user.isActive ? "Disable" : "Enable"}</button>
                      </td>
                    </tr>
                  ))}
                  {!users.length && <tr><td colSpan={6}>No users loaded yet.</td></tr>}
                </tbody>
              </table>
            </div>

            <div className="local-admin-section-head audit-head">
              <div><span>Security</span><h3>Audit Log</h3></div>
              <small>Last {auditLogs.length} actions</small>
            </div>
            <div className="local-audit-list">
              {auditLogs.map((log) => (
                <div className="local-audit-row" key={log.id}>
                  <strong>{log.action}</strong>
                  <span>{log.username} · {log.role}</span>
                  <small>{formatAuditTime(log.createdAt)}</small>
                  <p>{log.details}</p>
                </div>
              ))}
              {!auditLogs.length && <div className="local-settings-status">No audit log entries yet.</div>}
            </div>
          </div>
        )}

        {status && <div className="local-settings-status">{status}</div>}
      </section>
    </div>
  );
}

// Main App

export default function App() {
  const [portalSession, setPortalSession] = useState<PortalSession | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const requestedMode = getRequestedPortalMode();
      const raw = window.sessionStorage.getItem("cdr_portal_session");
      if (!raw) return null;
      const session = JSON.parse(raw) as PortalSession;
      if (requestedMode && session.role !== requestedMode) {
        window.sessionStorage.removeItem("cdr_portal_session");
        return null;
      }
      return session;
    } catch {
      return null;
    }
  });
  const [appSettings, setAppSettings] = useState<LocalAppSettings>(DEFAULT_LOCAL_SETTINGS);
  const [isLocalDbReady, setIsLocalDbReady] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const portalMode: PortalMode = portalSession?.role ?? "customer";
  const isSystemAdmin = portalSession?.role === "admin";
  const isCustomerAdmin = portalSession?.role === "customerAdmin";
  const isCustomer = portalSession?.role === "customer";
  const canOpenLocalSettings = isSystemAdmin || isCustomerAdmin;
  const canManageCustomerWorkbook = true;
  const canAddRegion = isSystemAdmin;
  const [data, setData] = useState<DashboardData | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [error, setError] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [stagedTrafficUpload, setStagedTrafficUpload] =
    useState<StagedTrafficUpload>(null);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [isAddingMoreCdr, setIsAddingMoreCdr] = useState(false);
  const [savedWorkbook, setSavedWorkbook] = useState<SavedWorkbookMeta | null>(
    () => getSavedWorkbookMeta(),
  );
  const [masterFleetmap, setMasterFleetmap] = useState<FleetmapState>({
    records: [],
    meta: null,
    isParsing: false,
  });
  const [fixedFleetmap, setFixedFleetmap] = useState<FleetmapState>({
    records: [],
    meta: null,
    isParsing: false,
  });
  const [page, setPage] = useState(1);
  const { theme, isDark, toggleTheme, setTheme } = useTheme();
  const [activeSection, setActiveSection] = useState(
    SECTION_NAV_ITEMS[0]?.id ?? "kpi",
  );
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [showReportsCdrRegister, setShowReportsCdrRegister] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    () => new Set(),
  );
  useEffect(() => {
    let mounted = true;
    ensureLocalAppDatabase()
      .then(({ settings }) => {
        if (!mounted) return;
        setAppSettings(settings);
        setIsLocalDbReady(true);
      })
      .catch(() => setIsLocalDbReady(true));
    return () => {
      mounted = false;
    };
  }, []);

  const handlePortalLogin = useCallback(async (username: string, password: string) => {
    const verified = await verifyLocalCredentialByUsername(username, password);
    if (verified) {
      const session = { role: verified.role, username: verified.username.trim(), token: verified.token };
      setPortalSession(session);
      try {
        window.sessionStorage.setItem("cdr_portal_session", JSON.stringify(session));
      } catch { /* ignore */ }
      return true;
    }
    return false;
  }, []);

  const handleLogout = useCallback(() => {
    setPortalSession(null);
    setData(null);
    clearMysqlSessionToken();
    try { window.sessionStorage.removeItem("cdr_portal_session"); } catch { /* ignore */ }
  }, []);

  const handleSaveLocalSettings = useCallback(async (settings: LocalAppSettings) => {
    const next = await saveLocalAppSettings(settings);
    setAppSettings(next);
  }, []);

  const handleSaveLocalCredential = useCallback(async (role: PortalRole, username: string, password: string) => {
    await updateLocalCredential(role, username, password);
  }, []);

  const handleTabChange = useCallback((tab: DashboardTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const scrollToSection = useCallback((id: string) => {
    setActiveSection(id);
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);
  const toggleSection = useCallback((id: string) => {
    setCollapsedSections((c) => {
      const n = new Set(c);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);
  const isSectionCollapsed = useCallback(
    (id: string) => collapsedSections.has(id),
    [collapsedSections],
  );

  useEffect(() => {
    const targets = SECTION_NAV_ITEMS.map((item) =>
      document.getElementById(item.id),
    ).filter((el): el is HTMLElement => Boolean(el));
    if (!targets.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActiveSection(visible.target.id);
      },
      {
        root: null,
        rootMargin: "-22% 0px -64% 0px",
        threshold: [0.1, 0.25, 0.5, 0.75],
      },
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
        if (m)
          setMasterFleetmap({
            records: m.records,
            meta: m.meta,
            isParsing: false,
          });
      } catch {
        /* ignore */
      }
      try {
        const f = await loadFleetmapFromBrowser(SAVED_FIXED_FLEETMAP_KEY);
        if (f)
          setFixedFleetmap({
            records: f.records,
            meta: f.meta,
            isParsing: false,
          });
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const handleUploadMasterFleetmap = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      setError("");
      setMasterFleetmap((s) => ({ ...s, isParsing: true }));
      try {
        const { parseFleetmap, readWorkbookFromUploadedFile } =
          await loadWorkbookParser();
        const workbook = await readWorkbookFromUploadedFile(file);
        const records = await parseFleetmap(workbook, "master");
        const meta: FleetmapMeta = {
          fileName: file.name,
          loadedAt: new Date().toLocaleString("en-GB"),
        };
        setMasterFleetmap({ records, meta, isParsing: false });
        try {
          await saveFleetmapToBrowser(SAVED_MASTER_FLEETMAP_KEY, records, meta);
        } catch {
          /* ignore */
        }
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Master Fleetmap could not be parsed.",
        );
        setMasterFleetmap((s) => ({ ...s, isParsing: false }));
      } finally {
        event.target.value = "";
      }
    },
    [],
  );

  const handleUploadFixedFleetmap = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      setError("");
      setFixedFleetmap((s) => ({ ...s, isParsing: true }));
      try {
        const { parseFleetmap, readWorkbookFromUploadedFile } =
          await loadWorkbookParser();
        const workbook = await readWorkbookFromUploadedFile(file);
        const records = await parseFleetmap(workbook, "fixed");
        const meta: FleetmapMeta = {
          fileName: file.name,
          loadedAt: new Date().toLocaleString("en-GB"),
        };
        setFixedFleetmap({ records, meta, isParsing: false });
        try {
          await saveFleetmapToBrowser(SAVED_FIXED_FLEETMAP_KEY, records, meta);
        } catch {
          /* ignore */
        }
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Fixed Fleetmap could not be parsed.",
        );
        setFixedFleetmap((s) => ({ ...s, isParsing: false }));
      } finally {
        event.target.value = "";
      }
    },
    [],
  );

  const handleUpload = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    setError("");
    setStagedTrafficUpload({ mode: "cdr", files });
    event.target.value = "";
  }, []);

  const handleRawSystemUpload = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      if (files.length === 0) return;
      setError("");
      setStagedTrafficUpload({ mode: "raw", files });
      event.target.value = "";
    },
    [],
  );

  const handleClearStagedUpload = useCallback(() => {
    setStagedTrafficUpload(null);
    setError("");
  }, []);

  const handleConfirmStagedUpload = useCallback(async () => {
    if (!stagedTrafficUpload || stagedTrafficUpload.files.length === 0) return;
    const files = stagedTrafficUpload.files;
    setError("");
    setIsParsing(true);
    try {
      const {
        mergeCdrIntoData,
        parseRawSystemWorkbook,
        parseUploadedTrafficWorkbook,
        readWorkbookFromUploadedFile,
      } = await loadWorkbookParser();
      const combinedFleetmap = unionFleetmapRecords(
        masterFleetmap.records,
        fixedFleetmap.records,
      );
      let merged: DashboardData | null = null;
      for (const file of files) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const workbook = await readWorkbookFromUploadedFile(file);
        const parsed =
          stagedTrafficUpload.mode === "raw"
            ? await parseRawSystemWorkbook(
                workbook,
                file.name,
                combinedFleetmap,
              )
            : await parseUploadedTrafficWorkbook(
                workbook,
                file.name,
                combinedFleetmap,
              );
        merged = merged ? mergeCdrIntoData(merged, parsed) : parsed;
      }
      if (!merged) return;
      if (stagedTrafficUpload.mode === "raw") {
        merged.fileName =
          files.length > 1
            ? `${files.length} raw system call logs merged`
            : `Raw system call log: ${files[0].name}`;
      } else if (files.length > 1) {
        merged.fileName = `${files.length} CDR files merged`;
      }
      setData(merged);
      setStagedTrafficUpload(null);
      try {
        await saveWorkbookToBrowser(merged);
        setSavedWorkbook(workbookMeta(merged));
      } catch {
        setSavedWorkbookMeta(null);
        setSavedWorkbook(null);
      }
      setFilters(EMPTY_FILTERS);
      setPage(1);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Selected file could not be parsed.",
      );
    } finally {
      setIsParsing(false);
    }
  }, [fixedFleetmap.records, masterFleetmap.records, stagedTrafficUpload]);

  const handleAddMoreCdr = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      if (files.length === 0 || !data) return;
      setError("");
      setIsAddingMoreCdr(true);
      try {
        const {
          mergeCdrIntoData,
          parseUploadedTrafficWorkbook,
          readWorkbookFromUploadedFile,
        } = await loadWorkbookParser();
        const combinedFleetmap = unionFleetmapRecords(
          masterFleetmap.records,
          fixedFleetmap.records,
        );
        let merged: DashboardData = data;
        for (const file of files) {
          await new Promise((resolve) => requestAnimationFrame(resolve));
          const workbook = await readWorkbookFromUploadedFile(file);
          const parsed = await parseUploadedTrafficWorkbook(
            workbook,
            file.name,
            combinedFleetmap,
          );
          merged = mergeCdrIntoData(merged, parsed);
        }
        merged.fileName = `${merged.cdrSources.length} CDR files merged`;
        setData(merged);
        try {
          await saveWorkbookToBrowser(merged);
          setSavedWorkbook(workbookMeta(merged));
        } catch {
          /* ignore */
        }
        setPage(1);
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Additional workbook could not be parsed.",
        );
      } finally {
        setIsAddingMoreCdr(false);
        event.target.value = "";
      }
    },
    [data, masterFleetmap.records, fixedFleetmap.records],
  );

  const handleLoadSavedWorkbook = useCallback(async () => {
    setError("");
    setIsLoadingSaved(true);
    try {
      const saved = await loadWorkbookFromBrowser();
      if (!saved) {
        setSavedWorkbook(null);
        setSavedWorkbookMeta(null);
        setError(
          "No previous workbook was found. Please upload the workbook again.",
        );
        return;
      }
      setData(saved);
      setSavedWorkbook(workbookMeta(saved));
      setFilters(EMPTY_FILTERS);
      setPage(1);
    } catch {
      setError(
        "Previous workbook could not be opened. Please upload the workbook again.",
      );
    } finally {
      setIsLoadingSaved(false);
    }
  }, []);

  const handleLoadSampleData = useCallback(async () => {
    const sampleFleetmaps = [
      { name: "Master Fleetmap.xlsx", source: "master" as const },
      { name: "Fixed Fleetmap.xlsx", source: "fixed" as const },
    ];
    const sampleCallLogs = [
      "calllog East.csv",
      "calllog North.csv",
      "calllog South.csv",
      "calllog West.csv",
    ];
    const fetchSampleFile = async (fileName: string) => {
      const response = await fetch(`/Samples/${encodeURIComponent(fileName)}`);
      if (!response.ok)
        throw new Error(`Sample file could not be loaded: ${fileName}`);
      const blob = await response.blob();
      return new File([blob], fileName, {
        type:
          blob.type ||
          (fileName.toLowerCase().endsWith(".csv")
            ? "text/csv"
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
      });
    };

    setError("");
    setIsParsing(true);
    setStagedTrafficUpload(null);
    setMasterFleetmap((current) => ({ ...current, isParsing: true }));
    setFixedFleetmap((current) => ({ ...current, isParsing: true }));
    try {
      const {
        mergeCdrIntoData,
        parseFleetmap,
        parseRawSystemWorkbook,
        readWorkbookFromUploadedFile,
      } = await loadWorkbookParser();
      const [masterFile, fixedFile] = await Promise.all(
        sampleFleetmaps.map((sample) => fetchSampleFile(sample.name)),
      );
      const [masterWorkbook, fixedWorkbook] = await Promise.all([
        readWorkbookFromUploadedFile(masterFile),
        readWorkbookFromUploadedFile(fixedFile),
      ]);
      const [masterRecords, fixedRecords] = await Promise.all([
        parseFleetmap(masterWorkbook, "master"),
        parseFleetmap(fixedWorkbook, "fixed"),
      ]);
      const loadedAt = new Date().toLocaleString("en-GB");
      const masterMeta: FleetmapMeta = { fileName: masterFile.name, loadedAt };
      const fixedMeta: FleetmapMeta = { fileName: fixedFile.name, loadedAt };
      setMasterFleetmap({
        records: masterRecords,
        meta: masterMeta,
        isParsing: false,
      });
      setFixedFleetmap({
        records: fixedRecords,
        meta: fixedMeta,
        isParsing: false,
      });
      try {
        await saveFleetmapToBrowser(
          SAVED_MASTER_FLEETMAP_KEY,
          masterRecords,
          masterMeta,
        );
      } catch {
        /* ignore */
      }
      try {
        await saveFleetmapToBrowser(
          SAVED_FIXED_FLEETMAP_KEY,
          fixedRecords,
          fixedMeta,
        );
      } catch {
        /* ignore */
      }

      const combinedFleetmap = unionFleetmapRecords(
        masterRecords,
        fixedRecords,
      );
      const callLogFiles = await Promise.all(
        sampleCallLogs.map(fetchSampleFile),
      );
      let merged: DashboardData | null = null;
      for (const file of callLogFiles) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const workbook = await readWorkbookFromUploadedFile(file);
        const parsed = await parseRawSystemWorkbook(
          workbook,
          file.name,
          combinedFleetmap,
        );
        merged = merged ? mergeCdrIntoData(merged, parsed) : parsed;
      }
      if (!merged) throw new Error("Sample call logs could not be parsed.");
      merged.fileName = `${callLogFiles.length} sample raw system call logs merged`;
      setData(merged);
      setFilters(EMPTY_FILTERS);
      setPage(1);
      try {
        await saveWorkbookToBrowser(merged);
        setSavedWorkbook(workbookMeta(merged));
      } catch {
        setSavedWorkbookMeta(null);
        setSavedWorkbook(null);
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Sample data could not be loaded.",
      );
    } finally {
      setIsParsing(false);
      setMasterFleetmap((current) => ({ ...current, isParsing: false }));
      setFixedFleetmap((current) => ({ ...current, isParsing: false }));
    }
  }, []);

  const records = data?.records ?? [];
  const talkgroupLabels = useMemo(
    () => ({ [NUMERIC_TALKGROUP_FILTER]: "Numeric group" }),
    [],
  );
  const options = useMemo(
    () => buildFilterOptions(records, filters.year),
    [filters.year, records],
  );
  const updateSearchFilter = useCallback((search: string) => {
    setFilters((current) => ({ ...current, search }));
    setPage(1);
  }, []);

  const updateArrayFilter = useCallback(
    (key: Exclude<keyof Filters, "search">, value: string[]) => {
      setFilters((current) => ({ ...current, [key]: value }));
      setPage(1);
    },
    [],
  );

  const resetAllFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setPage(1);
  }, []);

  const deferredFilters = useDeferredValue(filters);
  const deferredMonthOptions = useDeferredValue(options.month);
  const filtered = useMemo(
    () => filterCallRecords(records, deferredFilters, deferredMonthOptions),
    [deferredFilters, deferredMonthOptions, records],
  );
  const {
    pageCount,
    pagedItems: pagedRecords,
    previousPage: goToPreviousPage,
    nextPage: goToNextPage,
  } = usePagedItems(filtered, page, setPage, 50);
  const toggleReportsCdrRegister = useCallback(() => {
    setShowReportsCdrRegister((current) => !current);
    window.setTimeout(
      () =>
        document
          .getElementById("reports-cdr-register")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      80,
    );
  }, []);

  const metrics = useMemo(() => calculateMetrics(filtered), [filtered]);

  const rankings = useMemo(() => calculateRankings(filtered), [filtered]);

  const regionPerformanceRows = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        calls: number;
        durationSeconds: number;
        trafficHours: number;
        radios: Set<string>;
        talkgroups: Set<string>;
        companies: Set<string>;
        stations: Set<string>;
        hours: Map<string, number>;
        companyCalls: Map<string, number>;
      }
    >();
    filtered.forEach((record) => {
      const name = record.region || "Unknown";
      const current = map.get(name) ?? {
        name,
        calls: 0,
        durationSeconds: 0,
        trafficHours: 0,
        radios: new Set<string>(),
        talkgroups: new Set<string>(),
        companies: new Set<string>(),
        stations: new Set<string>(),
        hours: new Map<string, number>(),
        companyCalls: new Map<string, number>(),
      };
      current.calls += 1;
      current.durationSeconds += record.durationSeconds;
      current.trafficHours += record.trafficHours;
      if (isKnownLabel(record.radioId)) current.radios.add(record.radioId);
      if (isKnownLabel(record.talkgroup))
        current.talkgroups.add(record.talkgroup);
      if (isKnownLabel(record.company)) current.companies.add(record.company);
      if (isKnownLabel(record.baseStation))
        current.stations.add(record.baseStation);
      current.hours.set(record.hour, (current.hours.get(record.hour) ?? 0) + 1);
      current.companyCalls.set(
        record.company,
        (current.companyCalls.get(record.company) ?? 0) + 1,
      );
      map.set(name, current);
    });
    return [...map.values()]
      .map((row) => ({
        name: row.name,
        calls: row.calls,
        durationSeconds: row.durationSeconds,
        trafficHours: row.trafficHours,
        radios: row.radios.size,
        talkgroups: row.talkgroups.size,
        companies: row.companies.size,
        stations: row.stations.size,
        averageDuration: row.calls ? row.durationSeconds / row.calls : 0,
        peakHour:
          [...row.hours.entries()].sort(
            (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
          )[0]?.[0] ?? "--",
        topCompany:
          [...row.companyCalls.entries()].sort(
            (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
          )[0]?.[0] ?? "--",
      }))
      .sort(
        (a, b) => b.calls - a.calls || b.durationSeconds - a.durationSeconds,
      );
  }, [filtered]);

  const topCompanyTreemapData = useMemo(
    () =>
      rankings.company.slice(0, 10).map((row, index) => ({
        name: row.name,
        calls: row.calls,
        size: row.calls,
        fill: COMPANY_TREEMAP_COLORS[index % COMPANY_TREEMAP_COLORS.length],
      })),
    [rankings.company],
  );

  const topTalkgroupDistribution = useMemo(
    () => rankings.talkgroup.slice(0, 8),
    [rankings.talkgroup],
  );
  const topTalkgroupDistributionTotal = useMemo(
    () => topTalkgroupDistribution.reduce((sum, item) => sum + item.calls, 0),
    [topTalkgroupDistribution],
  );
  const callTypeMonthlyMix = useMemo(() => {
    const rows = MONTH_BUCKETS.map((month) => {
      const row: Record<string, string | number> = {
        month: month.label,
        total: 0,
      };
      CALL_TYPE_SERIES.forEach((series) => {
        row[series.key] = 0;
        row[`${series.key}Count`] = 0;
      });
      return row;
    });
    filtered.forEach((record) => {
      const monthIndex = callTypeMonthIndex(record);
      if (monthIndex < 0) return;
      const key = callTypeMixKey(record.callType);
      const row = rows[monthIndex];
      row[key] = Number(row[key] ?? 0) + 1;
      row[`${key}Count`] = Number(row[`${key}Count`] ?? 0) + 1;
      row.total = Number(row.total ?? 0) + 1;
    });
    return rows.map((row) => {
      const total = Number(row.total) || 0;
      CALL_TYPE_SERIES.forEach((series) => {
        const count = Number(row[`${series.key}Count`] ?? 0);
        row[series.key] = total ? (count / total) * 100 : 0;
      });
      return row;
    });
  }, [filtered]);

  const regionRadarSeries = useMemo(
    () =>
      REGION_RADAR_ORDER.map((name, index) => ({
        name,
        key: dataKey(`region_${name}`),
        color: REGION_RADAR_COLORS[index % REGION_RADAR_COLORS.length],
      })),
    [],
  );

  const regionRadarData = useMemo(() => {
    const rowByRegion = new Map(
      regionPerformanceRows.map((row) => [row.name.toLowerCase(), row]),
    );
    const regionAliases = new Map(
      REGION_RADAR_ORDER.map((name) => [name.toLowerCase(), name]),
    );
    const hourlyCalls = new Map<string, Map<string, number>>();
    filtered.forEach((record) => {
      const regionName = regionAliases.get(
        cleanText(record.region, "Unknown").toLowerCase(),
      );
      if (!regionName) return;
      const hour = cleanText(record.hour, "Unknown");
      const regionHours =
        hourlyCalls.get(regionName) ?? new Map<string, number>();
      regionHours.set(hour, (regionHours.get(hour) ?? 0) + 1);
      hourlyCalls.set(regionName, regionHours);
    });
    const peakHourCalls = new Map(
      REGION_RADAR_ORDER.map((region) => [
        region,
        Math.max(0, ...[...(hourlyCalls.get(region)?.values() ?? [])]),
      ]),
    );
    const rawByRegion = new Map(
      regionRadarSeries.map((series) => {
        const row = rowByRegion.get(series.name.toLowerCase());
        return [
          series.name,
          {
            calls: row?.calls ?? 0,
            durationSeconds: row?.durationSeconds ?? 0,
            averageDuration: row?.averageDuration ?? 0,
            peakHourCalls: peakHourCalls.get(series.name) ?? 0,
            talkgroups: row?.talkgroups ?? 0,
          },
        ];
      }),
    );
    const metricsForRadar = [
      {
        key: "calls",
        label: "Total Calls",
        format: (value: number) => formatNumber(value),
      },
      {
        key: "durationSeconds",
        label: "Total Duration",
        format: (value: number) => secondsToClock(value),
      },
      {
        key: "averageDuration",
        label: "Avg Duration/Call",
        format: (value: number) => secondsToClock(value),
      },
      {
        key: "peakHourCalls",
        label: "Peak Hour Calls",
        format: (value: number) => formatNumber(value),
      },
      {
        key: "talkgroups",
        label: "Unique Talkgroups",
        format: (value: number) => formatNumber(value),
      },
    ] as const;

    return metricsForRadar.map((metric) => {
      const maxValue = Math.max(
        1,
        ...regionRadarSeries.map(
          (series) => rawByRegion.get(series.name)?.[metric.key] ?? 0,
        ),
      );
      const point: Record<string, string | number> = { metric: metric.label };
      regionRadarSeries.forEach((series) => {
        const raw = rawByRegion.get(series.name)?.[metric.key] ?? 0;
        point[series.key] = (raw / maxValue) * 100;
        point[`${series.key}RawText`] = metric.format(raw);
      });
      return point;
    });
  }, [filtered, regionPerformanceRows, regionRadarSeries]);

  const fleetActivation = useMemo(() => {
    const liveFleetmap = unionFleetmapRecords(
      masterFleetmap.records,
      fixedFleetmap.records,
    );
    const savedFleetmap = data?.fleetmapRecords ?? [];
    const lookupFleetmapFallback: FleetmapRecord[] = (
      data?.lookupRecords ?? []
    ).map((record) => ({
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
        .filter((radioId) => isKnownLabel(radioId)),
    );

    const registeredMap = new Map<string, FleetmapRecord>();
    fleetmapCandidates.forEach((record) => {
      const radioKey = normalizeRadioKey(record.radioId);
      if (isKnownLabel(radioKey) && !registeredMap.has(radioKey))
        registeredMap.set(radioKey, record);
    });

    const registered = [...registeredMap.entries()].map(
      ([radioKey, record]) => ({ radioKey, record }),
    );
    const activeRegistered = registered.filter((item) =>
      activeRadioIds.has(item.radioKey),
    );
    const inactive = registered
      .filter((item) => !activeRadioIds.has(item.radioKey))
      .map((item) => item.record);
    const activeRegisteredRecords = activeRegistered.map((item) => item.record);
    const registeredRecords = registered.map((item) => item.record);

    const buildAllDimensionRows = (
      getRegisteredName: (record: FleetmapRecord) => string,
      getFilteredName: (record: CallRecord) => string,
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
        if (isKnownLabel(name))
          activeMap.set(name, (activeMap.get(name) ?? 0) + 1);
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
        activeFilteredKeys.forEach((set, name) =>
          activeMap.set(name, set.size),
        );
      }

      inactive.forEach((record) => {
        const name = cleanText(getRegisteredName(record), "Unknown");
        if (isKnownLabel(name)) map.set(name, (map.get(name) ?? 0) + 1);
      });

      activeMap.forEach((_count, name) => {
        if (isKnownLabel(name) && !map.has(name)) map.set(name, 0);
      });

      return [...map.entries()]
        .map(([name, count]) => ({
          name,
          count,
          activeCount: activeMap.get(name) ?? 0,
        }))
        .sort(
          (a, b) =>
            b.count - a.count ||
            b.activeCount - a.activeCount ||
            a.name.localeCompare(b.name),
        );
    };

    return {
      registeredCount: registered.length,
      activeRegisteredCount: activeRegistered.length,
      inactiveCount: inactive.length,
      activationRate: registered.length
        ? (activeRegistered.length / registered.length) * 100
        : 0,
      inactiveByCompany: buildAllDimensionRows(
        (record) => record.company,
        (record) => record.company,
      ),
      inactiveByRegion: buildAllDimensionRows(
        (record) => record.region,
        (record) => record.region,
      ),
      inactiveByMobileType: buildAllDimensionRows(
        (record) => record.mobileType,
        (record) => record.mobileType,
      ),
    };
  }, [
    data?.fleetmapRecords,
    data?.lookupRecords,
    filtered,
    masterFleetmap.records,
    fixedFleetmap.records,
  ]);

  const unmatchedFleetmapReportRows = useMemo(() => {
    const map = new Map<
      string,
      {
        callerNumber: string;
        callerAlias: string;
        talkgroup: string;
        firstSeen: string;
        lastSeen: string;
        calls: number;
        totalDuration: number;
        baseStations: Set<string>;
        reason: string;
      }
    >();

    filtered.forEach((record) => {
      const isUnmatchedFleetmap = record.region === "Unmatched Fleetmap";
      const isUnknownCompany = record.company === "Unknown";
      if (!isUnmatchedFleetmap && !isUnknownCompany) return;

      const callerNumber =
        normalizeRadioKey(record.radioId) ||
        cleanText(record.radioId, "Unknown");
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
      if (isKnownLabel(record.baseStation))
        current.baseStations.add(record.baseStation);
      if (
        record.startTime &&
        (!current.firstSeen || record.startTime < current.firstSeen)
      )
        current.firstSeen = record.startTime;
      if (
        record.endTime &&
        (!current.lastSeen || record.endTime > current.lastSeen)
      )
        current.lastSeen = record.endTime;
      if (!isKnownLabel(current.callerAlias) && isKnownLabel(record.radioAlias))
        current.callerAlias = record.radioAlias;
      if (!isKnownLabel(current.talkgroup) && isKnownLabel(record.talkgroup))
        current.talkgroup = record.talkgroup;
      map.set(callerNumber, current);
    });

    return [...map.values()]
      .map((row) => ({
        ...row,
        baseStationsText: [...row.baseStations].sort().join(", ") || "Unknown",
      }))
      .sort(
        (a, b) =>
          b.calls - a.calls || a.callerNumber.localeCompare(b.callerNumber),
      );
  }, [filtered]);

  const trafficIntensity = useMemo(() => {
    const busyTrafficHour = [...rankings.hour].sort(
      (a, b) => b.trafficHours - a.trafficHours || b.calls - a.calls,
    )[0];
    return {
      trafficPerRadio: metrics.radios
        ? metrics.trafficHours / metrics.radios
        : 0,
      trafficPerTalkgroup: metrics.talkgroups
        ? metrics.trafficHours / metrics.talkgroups
        : 0,
      trafficPerCompany: metrics.companies
        ? metrics.trafficHours / metrics.companies
        : 0,
      trafficPerRegion: metrics.regions
        ? metrics.trafficHours / metrics.regions
        : 0,
      busyTrafficHour,
    };
  }, [metrics, rankings.hour]);

  const heatmapHours = useMemo(
    () =>
      uniqueOptions(filtered, (record) => record.hour).sort((a, b) =>
        a.localeCompare(b),
      ),
    [filtered],
  );

  const regionHourHeatmap = useMemo(() => {
    const topRegions = regionPerformanceRows.slice(0, 8).map((row) => row.name);
    const topRegionSet = new Set(topRegions);
    const hourIndex = new Map(heatmapHours.map((hour, index) => [hour, index]));
    const counts = new Map<string, number[]>();
    topRegions.forEach((region) =>
      counts.set(region, Array(heatmapHours.length).fill(0)),
    );
    filtered.forEach((record) => {
      if (!topRegionSet.has(record.region)) return;
      const index = hourIndex.get(record.hour);
      if (index == null) return;
      const cells = counts.get(record.region);
      if (cells) cells[index] += 1;
    });
    return topRegions.map((region) => {
      const cells = counts.get(region) ?? [];
      return {
        region,
        cells,
        total: cells.reduce((sum, value) => sum + value, 0),
      };
    });
  }, [filtered, heatmapHours, regionPerformanceRows]);

  const heatmapMax = useMemo(
    () => Math.max(1, ...regionHourHeatmap.flatMap((row) => row.cells)),
    [regionHourHeatmap],
  );

  const talkgroupEfficiencyRows = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        calls: number;
        durationSeconds: number;
        trafficHours: number;
        radios: Set<string>;
        users: Set<string>;
        regions: Map<string, number>;
        companies: Map<string, number>;
        hours: Map<string, number>;
      }
    >();
    filtered.forEach((record) => {
      const name = record.talkgroup || "Unknown";
      const current = map.get(name) ?? {
        name,
        calls: 0,
        durationSeconds: 0,
        trafficHours: 0,
        radios: new Set<string>(),
        users: new Set<string>(),
        regions: new Map<string, number>(),
        companies: new Map<string, number>(),
        hours: new Map<string, number>(),
      };
      current.calls += 1;
      current.durationSeconds += record.durationSeconds;
      current.trafficHours += record.trafficHours;
      if (isKnownLabel(record.radioId)) current.radios.add(record.radioId);
      if (isKnownLabel(record.employeeName) || isKnownLabel(record.employeeId))
        current.users.add(`${record.employeeName} - ${record.employeeId}`);
      current.regions.set(
        record.region,
        (current.regions.get(record.region) ?? 0) + 1,
      );
      current.companies.set(
        record.company,
        (current.companies.get(record.company) ?? 0) + 1,
      );
      current.hours.set(record.hour, (current.hours.get(record.hour) ?? 0) + 1);
      map.set(name, current);
    });
    const topEntry = (input: Map<string, number>) =>
      [...input.entries()].sort(
        (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
      )[0]?.[0] ?? "--";
    return [...map.values()]
      .map((row) => ({
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
      }))
      .sort((a, b) => b.trafficHours - a.trafficHours || b.calls - a.calls)
      .slice(0, 20);
  }, [filtered]);

  const userBehaviorRows = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        calls: number;
        durationSeconds: number;
        radios: Set<string>;
        talkgroups: Set<string>;
        stations: Set<string>;
      }
    >();
    filtered.forEach((record) => {
      const name = `${record.employeeName} - ${record.employeeId}`;
      const current = map.get(name) ?? {
        name,
        calls: 0,
        durationSeconds: 0,
        radios: new Set<string>(),
        talkgroups: new Set<string>(),
        stations: new Set<string>(),
      };
      current.calls += 1;
      current.durationSeconds += record.durationSeconds;
      if (isKnownLabel(record.radioId)) current.radios.add(record.radioId);
      if (isKnownLabel(record.talkgroup))
        current.talkgroups.add(record.talkgroup);
      if (isKnownLabel(record.baseStation))
        current.stations.add(record.baseStation);
      map.set(name, current);
    });
    return [...map.values()]
      .map((row) => ({
        ...row,
        radios: row.radios.size,
        talkgroups: row.talkgroups.size,
        stations: row.stations.size,
        averageDuration: row.calls ? row.durationSeconds / row.calls : 0,
      }))
      .sort(
        (a, b) => b.calls - a.calls || b.durationSeconds - a.durationSeconds,
      )
      .slice(0, 15);
  }, [filtered]);

  const radioBehaviorRows = useMemo(() => {
    const map = new Map<
      string,
      {
        radioId: string;
        alias: string;
        company: string;
        calls: number;
        durationSeconds: number;
        talkgroups: Set<string>;
        stations: Set<string>;
        users: Set<string>;
        regions: Set<string>;
      }
    >();
    filtered.forEach((record) => {
      const key = record.radioId;
      const current = map.get(key) ?? {
        radioId: record.radioId,
        alias: record.radioAlias,
        company: record.company,
        calls: 0,
        durationSeconds: 0,
        talkgroups: new Set<string>(),
        stations: new Set<string>(),
        users: new Set<string>(),
        regions: new Set<string>(),
      };
      current.calls += 1;
      current.durationSeconds += record.durationSeconds;
      if (isKnownLabel(record.talkgroup))
        current.talkgroups.add(record.talkgroup);
      if (isKnownLabel(record.baseStation))
        current.stations.add(record.baseStation);
      if (isKnownLabel(record.employeeName) || isKnownLabel(record.employeeId))
        current.users.add(`${record.employeeName} - ${record.employeeId}`);
      if (isKnownLabel(record.region)) current.regions.add(record.region);
      map.set(key, current);
    });
    return [...map.values()]
      .map((row) => ({
        ...row,
        talkgroups: row.talkgroups.size,
        stations: row.stations.size,
        users: row.users.size,
        regions: row.regions.size,
        averageDuration: row.calls ? row.durationSeconds / row.calls : 0,
      }))
      .sort(
        (a, b) => b.calls - a.calls || b.durationSeconds - a.durationSeconds,
      )
      .slice(0, 15);
  }, [filtered]);

  const topRadioUsers = useMemo(() => {
    const map = new Map<
      string,
      {
        radioId: string;
        radioAlias: string;
        employeeName: string;
        company: string;
        calls: number;
        durationSeconds: number;
      }
    >();
    filtered.forEach((r) => {
      const key = `${r.radioId}||${r.radioAlias}||${r.employeeName}||${r.company}`;
      const cur = map.get(key) ?? {
        radioId: r.radioId,
        radioAlias: r.radioAlias,
        employeeName: r.employeeName,
        company: r.company,
        calls: 0,
        durationSeconds: 0,
      };
      cur.calls += 1;
      cur.durationSeconds += r.durationSeconds;
      map.set(key, cur);
    });
    return [...map.values()]
      .sort(
        (a, b) =>
          b.calls - a.calls ||
          b.durationSeconds - a.durationSeconds ||
          a.radioId.localeCompare(b.radioId),
      )
      .slice(0, 10);
  }, [filtered]);

  const radioMonths = useMemo(() => {
    const rows = [...rankings.month].sort(
      (a, b) =>
        monthSortValue(a.name) - monthSortValue(b.name) ||
        a.name.localeCompare(b.name),
    );
    const total = rows.reduce((sum, r) => sum + r.radios, 0);
    return rows.map((r) => ({
      ...r,
      share: total ? (r.radios / total) * 100 : 0,
    }));
  }, [rankings.month]);

  const mobileTypes = useMemo(() => {
    return uniqueOptions(filtered, (r) => r.mobileType)
      .filter((t) => t !== "Unknown" && t !== "Not Found")
      .sort((a, b) => {
        const ai = MOBILE_TYPE_LABELS.indexOf(a);
        const bi = MOBILE_TYPE_LABELS.indexOf(b);
        return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi) || a.localeCompare(b);
      });
  }, [filtered]);

  const mobileTypeByCompany = useMemo(() => {
    const map = new Map<
      string,
      { name: string; total: Set<string>; byType: Map<string, Set<string>> }
    >();
    filtered.forEach((r) => {
      if (
        r.company === "Unknown" ||
        r.company === "Not Found" ||
        r.radioId === "Unknown"
      )
        return;
      const cur = map.get(r.company) ?? {
        name: r.company,
        total: new Set<string>(),
        byType: new Map<string, Set<string>>(),
      };
      cur.total.add(r.radioId);
      if (r.mobileType !== "Unknown" && r.mobileType !== "Not Found") {
        const ts = cur.byType.get(r.mobileType) ?? new Set<string>();
        ts.add(r.radioId);
        cur.byType.set(r.mobileType, ts);
      }
      map.set(r.company, cur);
    });
    return [...map.values()]
      .map((row) => {
        const next: Record<string, string | number> = {
          name: row.name,
          total: row.total.size,
        };
        mobileTypes.forEach((type) => {
          next[mobileTypeKey(type)] = row.byType.get(type)?.size ?? 0;
        });
        return next;
      })
      .filter((r) => Number(r.total) > 0)
      .sort((a, b) => `${a.name}`.localeCompare(`${b.name}`));
  }, [filtered, mobileTypes]);

  const mobileTypeByMonth = useMemo(() => {
    const map = new Map<
      string,
      { name: string; total: Set<string>; byType: Map<string, Set<string>> }
    >();
    filtered.forEach((r) => {
      if (r.month === "Unknown" || r.radioId === "Unknown") return;
      const cur = map.get(r.month) ?? {
        name: r.month,
        total: new Set<string>(),
        byType: new Map<string, Set<string>>(),
      };
      cur.total.add(r.radioId);
      if (r.mobileType !== "Unknown" && r.mobileType !== "Not Found") {
        const ts = cur.byType.get(r.mobileType) ?? new Set<string>();
        ts.add(r.radioId);
        cur.byType.set(r.mobileType, ts);
      }
      map.set(r.month, cur);
    });
    return [...map.values()]
      .map((row) => {
        const next: Record<string, string | number> = {
          name: row.name,
          total: row.total.size,
        };
        mobileTypes.forEach((type) => {
          next[mobileTypeKey(type)] = row.byType.get(type)?.size ?? 0;
        });
        return next;
      })
      .filter((r) => Number(r.total) > 0)
      .sort(
        (a, b) =>
          monthSortValue(`${a.name}`) - monthSortValue(`${b.name}`) ||
          `${a.name}`.localeCompare(`${b.name}`),
      );
  }, [filtered, mobileTypes]);

  const kpiRows = useMemo(() => {
    const map = new Map<
      string,
      {
        calls: number;
        durationSeconds: number;
        talkgroups: Set<string>;
        radios: Set<string>;
      }
    >();
    const lookupCompanies = new Set(
      (data?.lookupRecords ?? []).map((r) => r.company),
    );
    const lookupCompanyCounts = new Map<string, number>();
    (data?.lookupRecords ?? [])
      .filter(
        (r) => filters.region.length === 0 || filters.region.includes(r.region),
      )
      .forEach((r) =>
        lookupCompanyCounts.set(
          r.company,
          (lookupCompanyCounts.get(r.company) ?? 0) + 1,
        ),
      );
    const unlistedCount = filtered.filter(
      (r) => !lookupCompanies.has(r.company),
    ).length;
    filtered.forEach((r) => {
      const cur = map.get(r.company) ?? {
        calls: 0,
        durationSeconds: 0,
        talkgroups: new Set<string>(),
        radios: new Set<string>(),
      };
      cur.calls += 1;
      cur.durationSeconds += r.durationSeconds;
      if (r.talkgroup !== "Unknown") cur.talkgroups.add(r.talkgroup);
      if (r.radioId !== "Unknown") cur.radios.add(r.radioId);
      map.set(r.company, cur);
    });
    return Array.from(map.entries())
      .filter(([company]) => company !== "Unknown" && company !== "Not Found")
      .map(([company, value]) => {
        const lookupActivated =
          lookupCompanyCounts.get(company) ??
          (lookupCompanies.has(company) ? 0 : unlistedCount);
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
        kpiAvgDurationPerUser: row.usersActivated
          ? row.durationSeconds / row.usersActivated
          : 0,
      }))
      .sort((a, b) => a.company.localeCompare(b.company));
  }, [data?.lookupRecords, filtered, filters.region]);

  const kpiAverage = useMemo(() => {
    const values = kpiRows
      .map((r) => r.kpiAvgDurationPerUser)
      .filter((v) => v > 0);
    return values.length
      ? values.reduce((sum, v) => sum + v, 0) / values.length
      : 0;
  }, [kpiRows]);

  const monthlyKpi = useMemo(() => {
    const companies = uniqueOptions(filtered, (r) => r.company)
      .filter((c) => c !== "Unknown" && c !== "Not Found")
      .sort((a, b) => a.localeCompare(b));
    const months = uniqueOptions(filtered, (r) => r.month, true).sort(
      (a, b) => monthSortValue(a) - monthSortValue(b) || a.localeCompare(b),
    );
    const stats = new Map<string, { calls: number; durationSeconds: number }>();
    filtered.forEach((r) => {
      if (r.company === "Unknown" || r.company === "Not Found") return;
      const key = `${r.company}||${r.month}`;
      const cur = stats.get(key) ?? { calls: 0, durationSeconds: 0 };
      cur.calls += 1;
      cur.durationSeconds += r.durationSeconds;
      stats.set(key, cur);
    });
    const rows = companies.map((company) => {
      const row: Record<string, string | number | null> = { company };
      months.forEach((month) => {
        const cur = stats.get(`${company}||${month}`);
        row[dataKey(month)] = cur?.calls
          ? cur.durationSeconds / cur.calls
          : null;
      });
      return row;
    });
    return {
      rows,
      months: months.map((month, i) => ({
        name: month,
        key: dataKey(month),
        color: COLORS[i % COLORS.length],
      })),
    };
  }, [filtered]);

  const monthlyKpiPieData = useMemo(() => {
    return [...rankings.month]
      .sort(
        (a, b) =>
          monthSortValue(a.name) - monthSortValue(b.name) ||
          a.name.localeCompare(b.name),
      )
      .filter((r) => r.calls > 0 && r.durationSeconds > 0)
      .map((r) => ({
        name: shortMonthLabel(r.name),
        value: r.durationSeconds / r.calls,
      }));
  }, [rankings.month]);

  const monthlyKpiPieTotal = useMemo(
    () => monthlyKpiPieData.reduce((sum, item) => sum + item.value, 0),
    [monthlyKpiPieData],
  );

  const CompanyPeriodLabel = useMemo(() => {
    const years = [...filters.year].sort(
      (a, b) => Number(a) - Number(b) || a.localeCompare(b),
    );
    const months = [...filters.month]
      .sort(
        (a, b) => monthSortValue(a) - monthSortValue(b) || a.localeCompare(b),
      )
      .map(shortMonthLabel);
    if (months.length) {
      const t = months.join(", ");
      const hasYear = months.some((m) => /(19|20)\d{2}/.test(m));
      return !hasYear && years.length ? `${t} ${years.join(", ")}` : t;
    }
    if (years.length) return years.join(", ");
    return "selected period";
  }, [filters.month, filters.year]);

  const exportTitle = useCallback(
    (title: string) => `${title} - ${CompanyPeriodLabel}`,
    [CompanyPeriodLabel],
  );

  const kpiExportItems = useMemo(
    () => [
      { title: "KPI Average Duration per Company", ref: kpiAverageChartRef },
      {
        title: "KPI Calls and Duration per Company",
        ref: kpiCallsDurationChartRef,
      },
      { title: "Monthly KPI", ref: monthlyKpiChartRef },
      { title: "KPI Total Avg. Duration", ref: kpiTotalAvgChartRef },
    ],
    [],
  );

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

  const kpiExportTableRows = useMemo(
    () => [
      kpiTableHeaders,
      ...kpiRows.map((row, i) => [
        row.company,
        formatNumber(row.talkgroupsInUse),
        formatNumber(row.calls),
        formatNumber(row.durationSeconds),
        secondsToClock(row.durationSeconds),
        formatNumber(row.usersActivated),
        formatNumber(row.callingUsers),
        formatNumber(row.kpiAvgDurationPerUser),
        i === 0 ? formatNumber(kpiAverage) : "",
      ]),
    ],
    [kpiAverage, kpiRows],
  );

  const captureKpiChartImages = useCallback(async () => {
    const charts = await Promise.all(
      kpiExportItems.map(async (item) => {
        const element = item.ref.current;
        if (!element) return null;
        try {
          return {
            title: exportTitle(item.title),
            image: await captureElementPng(element, "#0f1b24"),
          };
        } catch {
          return null;
        }
      }),
    );
    return charts.filter((chart): chart is { title: string; image: string } =>
      Boolean(chart),
    );
  }, [exportTitle, kpiExportItems]);

  const exportKpiXlsx = useCallback(async () => {
    const ExcelJS = await loadExcelJS();
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "CDR Dashboard";
    const worksheet = workbook.addWorksheet("KPI Measurements", {
      views: [{ showGridLines: false }],
    });
    const border = {
      top: { style: "thin" as const },
      left: { style: "thin" as const },
      bottom: { style: "thin" as const },
      right: { style: "thin" as const },
    };
    const headerFill = {
      type: "pattern" as const,
      pattern: "solid" as const,
      fgColor: { argb: "FFFFFF00" },
    };
    worksheet.addRow([exportTitle("KPI Measurements")]);
    worksheet.mergeCells(1, 1, 1, kpiTableHeaders.length);
    worksheet.addRow(kpiTableHeaders);
    kpiRows.forEach((row, i) =>
      worksheet.addRow([
        row.company,
        row.talkgroupsInUse,
        row.calls,
        row.durationSeconds,
        secondsToClock(row.durationSeconds),
        row.usersActivated,
        row.callingUsers,
        row.kpiAvgDurationPerUser,
        i === 0 ? kpiAverage : "",
      ]),
    );
    worksheet.eachRow((row, rn) => {
      row.height = rn <= 2 ? 28 : 22;
      row.eachCell((cell) => {
        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
          wrapText: true,
        };
        cell.border = border;
        if (rn <= 2) {
          cell.font = { bold: true, color: { argb: "FF000000" } };
          cell.fill = headerFill;
        }
      });
    });
    worksheet.columns = kpiTableHeaders.map((h, i) => ({
      width: Math.min(
        34,
        Math.max(
          14,
          h.length / 1.7,
          ...kpiRows.map(
            (r) =>
              `${[r.company, r.talkgroupsInUse, r.calls, r.durationSeconds, secondsToClock(r.durationSeconds), r.usersActivated, r.callingUsers, r.kpiAvgDurationPerUser, kpiAverage][i] ?? ""}`
                .length + 2,
          ),
        ),
      ),
    }));
    const styleDataSheet = (sheet: ExcelJS.Worksheet) => {
      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = headerFill;
      sheet.eachRow((row) =>
        row.eachCell((cell) => {
          cell.alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };
          cell.border = border;
        }),
      );
    };
    const avgSheet = workbook.addWorksheet("KPI Avg Duration", {
      views: [{ showGridLines: false }],
    });
    avgSheet.addRow(["Company", "KPI Avg Duration"]);
    kpiRows.forEach((r) =>
      avgSheet.addRow([r.company, r.kpiAvgDurationPerUser]),
    );
    avgSheet.columns = [{ width: 28 }, { width: 18 }];
    styleDataSheet(avgSheet);
    const callsSheet = workbook.addWorksheet("KPI Calls Duration", {
      views: [{ showGridLines: false }],
    });
    callsSheet.addRow(["Company", "Calls", "Duration Seconds"]);
    kpiRows.forEach((r) =>
      callsSheet.addRow([r.company, r.calls, r.durationSeconds]),
    );
    callsSheet.columns = [{ width: 28 }, { width: 14 }, { width: 18 }];
    styleDataSheet(callsSheet);
    const monthlySheet = workbook.addWorksheet("Monthly KPI", {
      views: [{ showGridLines: false }],
    });
    monthlySheet.addRow([
      "Company",
      ...monthlyKpi.months.map((m) => shortMonthLabel(m.name)),
    ]);
    monthlyKpi.rows.forEach((r) =>
      monthlySheet.addRow([
        r.company,
        ...monthlyKpi.months.map((m) => r[m.key] ?? ""),
      ]),
    );
    monthlySheet.columns = [
      { width: 28 },
      ...monthlyKpi.months.map(() => ({ width: 14 })),
    ];
    styleDataSheet(monthlySheet);
    const totalAvgSheet = workbook.addWorksheet("KPI Total Avg", {
      views: [{ showGridLines: false }],
    });
    totalAvgSheet.addRow(["Month Year", "KPI Total Avg Duration"]);
    monthlyKpiPieData.forEach((r) => totalAvgSheet.addRow([r.name, r.value]));
    totalAvgSheet.columns = [{ width: 18 }, { width: 22 }];
    styleDataSheet(totalAvgSheet);
    const chartConfigs: NativeChartConfig[] = [
      {
        sheetIndex: 2,
        chartIndex: 1,
        title: exportTitle("KPI Average Duration per Company"),
        type: "bar",
        categoriesRef: excelRange(
          "KPI Avg Duration",
          1,
          2,
          Math.max(2, kpiRows.length + 1),
        ),
        series: [
          {
            name: "Average duration per activated user",
            valuesRef: excelRange(
              "KPI Avg Duration",
              2,
              2,
              Math.max(2, kpiRows.length + 1),
            ),
            color: "37A6D9",
          },
        ],
      },
      {
        sheetIndex: 3,
        chartIndex: 2,
        title: exportTitle("KPI Calls and Duration per Company"),
        type: "line",
        categoriesRef: excelRange(
          "KPI Calls Duration",
          1,
          2,
          Math.max(2, kpiRows.length + 1),
        ),
        series: [
          {
            name: "Calls",
            valuesRef: excelRange(
              "KPI Calls Duration",
              2,
              2,
              Math.max(2, kpiRows.length + 1),
            ),
            color: "65C18C",
          },
          {
            name: "Duration seconds",
            valuesRef: excelRange(
              "KPI Calls Duration",
              3,
              2,
              Math.max(2, kpiRows.length + 1),
            ),
            color: "F0B84F",
          },
        ],
      },
      {
        sheetIndex: 4,
        chartIndex: 3,
        title: exportTitle("Monthly KPI"),
        type: "line",
        categoriesRef: excelRange(
          "Monthly KPI",
          1,
          2,
          Math.max(2, monthlyKpi.rows.length + 1),
        ),
        series: monthlyKpi.months.map((m, i) => ({
          name: shortMonthLabel(m.name),
          valuesRef: excelRange(
            "Monthly KPI",
            i + 2,
            2,
            Math.max(2, monthlyKpi.rows.length + 1),
          ),
          color: m.color.replace("#", "").toUpperCase(),
        })),
      },
      {
        sheetIndex: 5,
        chartIndex: 4,
        title: exportTitle("KPI Total Avg. Duration"),
        type: "doughnut",
        categoriesRef: excelRange(
          "KPI Total Avg",
          1,
          2,
          Math.max(2, monthlyKpiPieData.length + 1),
        ),
        series: [
          {
            name: "KPI Total Avg. Duration",
            valuesRef: excelRange(
              "KPI Total Avg",
              2,
              2,
              Math.max(2, monthlyKpiPieData.length + 1),
            ),
            color: "37A6D9",
          },
        ],
      },
    ];
    const buffer = await workbook.xlsx.writeBuffer();
    const patched = await patchWorkbookWithNativeCharts(buffer, chartConfigs);
    downloadBlob("kpi-table-and-charts.xlsx", patched);
  }, [
    exportTitle,
    kpiAverage,
    kpiRows,
    monthlyKpi.months,
    monthlyKpi.rows,
    monthlyKpiPieData,
  ]);

  const exportKpiPdf = useCallback(async () => {
    const charts = await captureKpiChartImages();
    const jsPDF = await loadJsPdf();
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "a4",
    });
    await ensurePdfArabicFont(pdf);
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 24;
    const drawKpiTable = () => {
      const colWeights = [1.45, 0.9, 0.8, 0.95, 1.1, 1.15, 1.15, 1.45, 0.65];
      const tableWidth = pageWidth - margin * 2;
      const totalWeight = colWeights.reduce((s, w) => s + w, 0);
      const colWidths = colWeights.map((w) => (tableWidth * w) / totalWeight);
      const rowHeight = Math.min(
        30,
        (pageHeight - 76) / Math.max(1, kpiExportTableRows.length),
      );
      let y = 52;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdfText(pdf, exportTitle("KPI Measurements"), pageWidth / 2, 28, {
        align: "center",
      });
      kpiExportTableRows.forEach((row, ri) => {
        let x = margin;
        row.forEach((cell, ci) => {
          const width = colWidths[ci];
          pdf.setDrawColor(20, 36, 48);
          pdf.setFillColor(ri === 0 ? "#fff200" : "#ffffff");
          pdf.rect(x, y, width, rowHeight, "FD");
          pdf.setFont("helvetica", ri === 0 ? "bold" : "normal");
          pdf.setFontSize(ri === 0 ? 6.5 : 7);
          pdf.setTextColor(0, 0, 0);
          pdfText(pdf, cell, x + width / 2, y + rowHeight / 2 + 2.5, {
            align: "center",
            maxWidth: width - 4,
          });
          x += width;
        });
        y += rowHeight;
      });
    };
    const addImagePage = (title: string, image: string, firstPage = false) => {
      if (!firstPage) pdf.addPage("a4", "landscape");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdfText(pdf, title, pageWidth / 2, 28, { align: "center" });
      const props = pdf.getImageProperties(image);
      const maxWidth = pageWidth - margin * 2;
      const maxHeight = pageHeight - margin * 2 - 24;
      const ratio = Math.min(maxWidth / props.width, maxHeight / props.height);
      pdf.addImage(
        image,
        "PNG",
        (pageWidth - props.width * ratio) / 2,
        48 + (maxHeight - props.height * ratio) / 2,
        props.width * ratio,
        props.height * ratio,
      );
    };
    drawKpiTable();
    charts.forEach((chart) => addImagePage(chart.title, chart.image));
    downloadPdf(pdf, "kpi-table-and-charts.pdf");
  }, [captureKpiChartImages, exportTitle, kpiExportTableRows]);

  const exportKpiPpt = useCallback(async () => {
    const charts = await captureKpiChartImages();
    const pptxgen = await loadPptxgen();
    const pptx = new pptxgen();
    pptx.layout = "LAYOUT_WIDE";
    pptx.author = "CDR Dashboard";
    const tableSlide = pptx.addSlide();
    tableSlide.background = { color: "FFFFFF" };
    tableSlide.addText(
      exportTitle("KPI Measurements"),
      pptTextOptions(exportTitle("KPI Measurements"), {
        x: 0.3,
        y: 0.18,
        w: 12.7,
        h: 0.36,
        fontSize: 18,
        bold: true,
        align: "center",
        color: "111111",
      }),
    );
    const tableX = 0.18;
    const tableY = 0.7;
    const colW = [1.45, 0.86, 0.75, 0.86, 1.02, 1.08, 1.08, 1.45, 0.55];
    const rowH = kpiExportTableRows.map((_, i) => (i === 0 ? 0.58 : 0.38));
    kpiExportTableRows.forEach((row, ri) => {
      let x = tableX;
      row.forEach((cell, ci) => {
        const w = colW[ci] ?? 1;
        const h = rowH[ri] ?? 0.38;
        const isHeader = ri === 0;
        tableSlide.addShape(pptx.ShapeType.rect, {
          x,
          y: tableY + rowH.slice(0, ri).reduce((s, v) => s + v, 0),
          w,
          h,
          fill: { color: isHeader ? "FFF200" : "FFFFFF" },
          line: { color: "111111", width: 0.5 },
        });
        tableSlide.addText(
          String(cell ?? ""),
          pptTextOptions(cell, {
            x: x + 0.02,
            y: tableY + rowH.slice(0, ri).reduce((s, v) => s + v, 0) + 0.03,
            w: w - 0.04,
            h: h - 0.06,
            fontSize: isHeader ? 5.6 : 6.1,
            bold: isHeader,
            align: "center",
            valign: "mid",
            color: "111111",
            fit: "shrink",
            margin: 0,
          }),
        );
        x += w;
      });
    });
    const addImageSlide = (title: string, image: string) => {
      const slide = pptx.addSlide();
      slide.background = { color: "0F1B24" };
      slide.addText(
        title,
        pptTextOptions(title, {
          x: 0.3,
          y: 0.18,
          w: 12.7,
          h: 0.38,
          fontSize: 18,
          bold: true,
          align: "center",
          color: "EDF6FA",
        }),
      );
      slide.addImage({ data: image, x: 0.35, y: 0.72, w: 12.65, h: 6.35 });
    };
    charts.forEach((chart) => addImageSlide(chart.title, chart.image));
    await downloadPptx(pptx, "kpi-table-and-charts.pptx");
  }, [captureKpiChartImages, exportTitle, kpiExportTableRows]);

  const CompanyRows = useMemo(() => {
    const map = new Map<
      string,
      {
        calls: number;
        durationSeconds: number;
        talkgroupsUsed: Set<string>;
        callingUsers: Set<string>;
        totalTalkgroups: Set<string>;
        totalUsers: Set<string>;
      }
    >();
    const ensure = (company: string) => {
      const key = company || "Unknown";
      const cur = map.get(key) ?? {
        calls: 0,
        durationSeconds: 0,
        talkgroupsUsed: new Set<string>(),
        callingUsers: new Set<string>(),
        totalTalkgroups: new Set<string>(),
        totalUsers: new Set<string>(),
      };
      map.set(key, cur);
      return cur;
    };
    filtered.forEach((r) => {
      const cur = ensure(r.company);
      cur.calls += 1;
      cur.durationSeconds += r.durationSeconds;
      if (r.talkgroup !== "Unknown") cur.talkgroupsUsed.add(r.talkgroup);
      if (r.radioId !== "Unknown") cur.callingUsers.add(r.radioId);
    });
    const search = filters.search.toLowerCase().trim();
    (data?.lookupRecords ?? [])
      .filter((r) => {
        if (!r.company || r.company === "Unknown" || r.company === "Not Found")
          return false;
        if (filters.region.length && !filters.region.includes(r.region))
          return false;
        if (filters.company.length && !filters.company.includes(r.company))
          return false;
        if (filters.talkgroup.length) {
          const nm =
            filters.talkgroup.includes(NUMERIC_TALKGROUP_FILTER) &&
            /^\d+$/.test(r.talkgroup);
          if (!nm && !filters.talkgroup.includes(r.talkgroup)) return false;
        }
        if (
          search &&
          ![r.radioId, r.company, r.region, r.talkgroup]
            .join(" ")
            .toLowerCase()
            .includes(search)
        )
          return false;
        return true;
      })
      .forEach((r) => {
        const cur = ensure(r.company);
        if (r.talkgroup) cur.totalTalkgroups.add(r.talkgroup);
        if (r.radioId) cur.totalUsers.add(r.radioId);
      });
    return [...map.entries()]
      .map(([name, v]) => ({
        name,
        calls: v.calls,
        durationSeconds: v.durationSeconds,
        talkgroupsTotal: Math.max(
          v.totalTalkgroups.size,
          v.talkgroupsUsed.size,
        ),
        usersTotal: Math.max(v.totalUsers.size, v.callingUsers.size),
        talkgroupsUsed: v.talkgroupsUsed.size,
        callingUsers: v.callingUsers.size,
      }))
      .filter((r) => r.calls > 0 || r.usersTotal > 0 || r.talkgroupsTotal > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [
    data?.lookupRecords,
    filtered,
    filters.company,
    filters.region,
    filters.search,
    filters.talkgroup,
  ]);

  const CompanyChartData = {
    duration: CompanyRows.filter((r) => r.durationSeconds > 0).map((r) => ({
      name: r.name,
      value: r.durationSeconds,
    })),
    totalTalkgroups: CompanyRows.filter((r) => r.talkgroupsTotal > 0).map(
      (r) => ({ name: r.name, value: r.talkgroupsTotal }),
    ),
    totalUsers: CompanyRows.filter((r) => r.usersTotal > 0).map((r) => ({
      name: r.name,
      value: r.usersTotal,
    })),
    calls: CompanyRows.filter((r) => r.calls > 0).map((r) => ({
      name: r.name,
      value: r.calls,
    })),
    talkgroupsUsed: CompanyRows.filter((r) => r.talkgroupsUsed > 0).map(
      (r) => ({ name: r.name, value: r.talkgroupsUsed }),
    ),
    callingUsers: CompanyRows.filter((r) => r.callingUsers > 0).map((r) => ({
      name: r.name,
      value: r.callingUsers,
    })),
  };

  const monthlyCompanyRows = useMemo(() => {
    const selectedCompanies = filters.company.length
      ? [...filters.company].sort((a, b) => a.localeCompare(b))
      : rankings.company.map((r) => r.name).sort((a, b) => a.localeCompare(b));
    const allowedCompanies = new Set(selectedCompanies);
    const groupByWeek = filters.month.length === 1;
    const periods = groupByWeek
      ? uniqueOptions(filtered, (r) => r.week).sort(
          (a, b) => weekSortValue(a) - weekSortValue(b) || a.localeCompare(b),
        )
      : rankings.month
          .map((r) => r.name)
          .sort(
            (a, b) =>
              monthSortValue(a) - monthSortValue(b) || a.localeCompare(b),
          );
    const map = new Map<
      string,
      {
        period: string;
        company: string;
        calls: number;
        durationSeconds: number;
        sort: number;
      }
    >();
    filtered.forEach((r) => {
      if (!allowedCompanies.has(r.company)) return;
      const period = groupByWeek ? r.week : r.month;
      const key = `${period}||${r.company}`;
      const cur = map.get(key) ?? {
        period,
        company: r.company,
        calls: 0,
        durationSeconds: 0,
        sort: groupByWeek ? weekSortValue(period) : monthSortValue(period),
      };
      cur.calls += 1;
      cur.durationSeconds += r.durationSeconds;
      map.set(key, cur);
    });
    return periods.flatMap((period) =>
      selectedCompanies.map((company, ci) => {
        const row = map.get(`${period}||${company}`) ?? {
          period,
          company,
          calls: 0,
          durationSeconds: 0,
          sort: groupByWeek ? weekSortValue(period) : monthSortValue(period),
        };
        const isMiddle = ci === Math.floor((selectedCompanies.length - 1) / 2);
        return {
          ...row,
          companyLabel: truncateLabel(company, 18),
          periodLabel: isMiddle
            ? groupByWeek
              ? period
              : shortMonthLabel(period)
            : "",
          periodType: groupByWeek ? "Week" : "Month",
        };
      }),
    );
  }, [
    filtered,
    filters.company,
    filters.month,
    rankings.company,
    rankings.month,
  ]);

  const peakHour = [...rankings.hour].sort((a, b) => b.calls - a.calls)[0];
  const peakTrafficHour = [...rankings.hour].sort(
    (a, b) => b.trafficHours - a.trafficHours,
  )[0];
  const topCompany = rankings.company[0];
  const topStation = rankings.station[0];
  const topTalkgroup = rankings.talkgroup[0];
  const peakRadioEntry = modeBy(filtered, (r) => r.radioId);
  const peakUserEntry = modeBy(
    filtered,
    (r) => `${r.employeeName}||${r.employeeId}||${r.company}`,
  );
  const peakUserParts =
    `${peakUserEntry?.[0] ?? "Unknown||Unknown||Unknown"}`.split("||");
  const peakMonthEntry = modeBy(filtered, (r) => r.month);
  const peakWeekEntry = modeBy(filtered, (r) =>
    weekLabelFromDate(r.callDate) !== "Unknown"
      ? weekLabelFromDate(r.callDate)
      : r.week,
  );
  const peakDayEntry = modeBy(filtered, (r) => r.callDate);
  const maxDuration = filtered.reduce(
    (max, r) => Math.max(max, r.durationSeconds),
    0,
  );
  const minDuration = filtered.reduce((min, r) => {
    if (r.durationSeconds <= 0) return min;
    return min === 0 ? r.durationSeconds : Math.min(min, r.durationSeconds);
  }, 0);
  const peakHourAvgDuration = peakHour?.calls
    ? peakHour.durationSeconds / peakHour.calls
    : 0;
  const filteredShare = records.length
    ? (filtered.length / records.length) * 100
    : 0;

  const qualityIssues = useMemo(() => {
    const total = records.length || 1;
    const mc = records.filter((r) => r.company === "Unknown").length;
    const ms = records.filter((r) => r.baseStation === "Unknown").length;
    const md = records.filter((r) => r.durationSeconds <= 0).length;
    const mr = records.filter((r) => r.radioId === "Unknown").length;
    return [
      { name: "Missing company", count: mc, pct: (mc / total) * 100 },
      { name: "Missing station", count: ms, pct: (ms / total) * 100 },
      { name: "Missing duration", count: md, pct: (md / total) * 100 },
      { name: "Missing radio", count: mr, pct: (mr / total) * 100 },
    ];
  }, [records]);
  const qualityScore = Math.max(
    0,
    100 - qualityIssues.reduce((s, i) => s + i.pct, 0),
  );

  const cdrSummaryRows = useMemo<(string | number)[][]>(
    () => [
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
    ],
    [CompanyPeriodLabel, metrics, peakHour, topCompany],
  );
  const recordExportHeaders = [
    "SN",
    "Radio ID",
    "Radio Alias",
    "Mobile Type",
    "Employee Name",
    "Employee ID",
    "Region",
    "Company",
    "Talkgroup Alias",
    "Start Time",
    "End Time",
    "Duration (s)",
    "Caller Base Station",
  ];
  const buildFilteredRecordRows = useCallback(
    () =>
      filtered.map((r, i) => [
        i + 1,
        r.radioId,
        r.radioAlias,
        r.mobileType,
        r.employeeName,
        r.employeeId,
        r.region,
        r.company,
        r.talkgroup,
        r.startTime,
        r.endTime,
        r.durationSeconds,
        r.baseStation,
      ]),
    [filtered],
  );

  const exportRows = useCallback(() => {
    const rows = buildFilteredRecordRows();
    downloadText(
      "premium-cdr-filtered-records.csv",
      [
        [exportTitle("Filtered Calls Register")],
        [],
        recordExportHeaders,
        ...rows,
      ]
        .map((r) => r.map(csvEscape).join(","))
        .join("\n"),
    );
  }, [buildFilteredRecordRows, exportTitle]);

  const exportRowsXlsx = useCallback(async () => {
    const ExcelJS = await loadExcelJS();
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "CDR Dashboard";
    const border = {
      top: { style: "thin" as const },
      left: { style: "thin" as const },
      bottom: { style: "thin" as const },
      right: { style: "thin" as const },
    };
    const titleFill = {
      type: "pattern" as const,
      pattern: "solid" as const,
      fgColor: { argb: "FF1F4E79" },
    };
    const headerFill = {
      type: "pattern" as const,
      pattern: "solid" as const,
      fgColor: { argb: "FFFFFF00" },
    };
    const styleSheet = (sheet: ExcelJS.Worksheet, titleRows = 1) => {
      sheet.eachRow((row, rn) => {
        row.height = rn <= titleRows + 1 ? 24 : 18;
        row.eachCell((cell) => {
          cell.alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };
          cell.border = border;
          if (rn <= titleRows) {
            cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
            cell.fill = titleFill;
          }
          if (rn === titleRows + 1) {
            cell.font = { bold: true, color: { argb: "FF000000" } };
            cell.fill = headerFill;
          }
        });
      });
    };
    const summarySheet = workbook.addWorksheet("CDR Summary", {
      views: [{ showGridLines: false }],
    });
    summarySheet.addRow([exportTitle("CDR Summary")]);
    summarySheet.mergeCells(1, 1, 1, 2);
    summarySheet.addRow(["Metric", "Value"]);
    cdrSummaryRows.forEach((row) => summarySheet.addRow(row));
    summarySheet.columns = [{ width: 24 }, { width: 38 }];
    summarySheet.autoFilter = { from: "A2", to: "B2" };
    styleSheet(summarySheet);
    const worksheet = workbook.addWorksheet("Filtered Calls Register", {
      views: [{ showGridLines: false }],
    });
    worksheet.addRow([exportTitle("Filtered Calls Register")]);
    worksheet.mergeCells(1, 1, 1, recordExportHeaders.length);
    worksheet.addRow(recordExportHeaders);
    buildFilteredRecordRows().forEach((r) => worksheet.addRow(r));
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
    worksheet.autoFilter = {
      from: "A2",
      to: `${excelColumnName(recordExportHeaders.length)}2`,
    };
    styleSheet(worksheet);
    applyWorkbookArabicSupport(workbook);
    const buffer = await workbook.xlsx.writeBuffer();
    downloadBlob(
      "premium-cdr-filtered-records.xlsx",
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
    );
  }, [buildFilteredRecordRows, cdrSummaryRows, exportTitle]);
  const exportUnmatchedFleetmapXlsx = useCallback(() => {
    const headers = [
      "Caller Number",
      "Caller Alias",
      "Talkgroup",
      "Call Count",
      "Total Duration",
      "First Seen",
      "Last Seen",
      "Base Stations",
      "Reason",
    ];
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
      },
    );
  }, [CompanyPeriodLabel, exportTitle, unmatchedFleetmapReportRows]);

  const exportTablePdf = useCallback(
    async (
      fileName: string,
      title: string,
      headers: string[],
      rows: (string | number)[][],
    ) => {
      const jsPDF = await loadJsPdf();
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "a4",
      });
      await ensurePdfArabicFont(pdf);
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 24;
      const tableWidth = pageWidth - margin * 2;
      const colWidth = tableWidth / Math.max(1, headers.length);
      const rowHeight = 20;
      let y = 54;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(15);
      pdf.setTextColor(0, 0, 0);
      pdfText(pdf, exportTitle(title), pageWidth / 2, 28, { align: "center" });
      const drawRow = (row: (string | number)[], isHeader = false) => {
        if (y + rowHeight > pageHeight - margin) {
          pdf.addPage("a4", "landscape");
          y = margin;
        }
        let x = margin;
        row.forEach((cell) => {
          pdf.setDrawColor(20, 36, 48);
          pdf.setFillColor(isHeader ? "#fff200" : "#ffffff");
          pdf.rect(x, y, colWidth, rowHeight, "FD");
          pdf.setFont("helvetica", isHeader ? "bold" : "normal");
          pdf.setFontSize(isHeader ? 7 : 7.2);
          pdf.setTextColor(0, 0, 0);
          pdfText(pdf, cell, x + colWidth / 2, y + 13, {
            align: "center",
            maxWidth: colWidth - 4,
          });
          x += colWidth;
        });
        y += rowHeight;
      };
      drawRow(headers, true);
      rows.forEach((row) => drawRow(row));
      downloadPdf(pdf, fileName);
    },
    [exportTitle],
  );

  const regionPerformanceHeaders = [
    "Region",
    "Calls",
    "Duration",
    "Traffic Hours",
    "Active Radios",
    "Talkgroups",
    "Companies",
    "Base Stations",
    "Average Duration",
    "Peak Hour",
    "Top Company",
  ];
  const regionPerformanceExportRows = useMemo(
    () =>
      regionPerformanceRows.map((row) => [
        row.name,
        formatNumber(row.calls),
        secondsToClock(row.durationSeconds),
        formatDecimal(row.trafficHours, 2),
        formatNumber(row.radios),
        formatNumber(row.talkgroups),
        formatNumber(row.companies),
        formatNumber(row.stations),
        secondsToClock(row.averageDuration),
        row.peakHour,
        row.topCompany,
      ]),
    [regionPerformanceRows],
  );
  const exportRegionPerformanceXlsx = useCallback(
    () =>
      downloadWorkbookData(
        `region-performance-${fileSlug(CompanyPeriodLabel)}.xlsx`,
        "Region Performance",
        exportTitle("Region Performance Matrix"),
        {
          headers: regionPerformanceHeaders,
          rows: regionPerformanceExportRows,
        },
      ),
    [CompanyPeriodLabel, exportTitle, regionPerformanceExportRows],
  );
  const exportRegionPerformancePdf = useCallback(
    () =>
      exportTablePdf(
        `region-performance-${fileSlug(CompanyPeriodLabel)}.pdf`,
        "Region Performance Matrix",
        regionPerformanceHeaders,
        regionPerformanceExportRows,
      ),
    [CompanyPeriodLabel, exportTablePdf, regionPerformanceExportRows],
  );

  const talkgroupEfficiencyHeaders = [
    "Talkgroup",
    "Calls",
    "Duration",
    "Traffic Hours",
    "Radios",
    "Users",
    "Average Duration",
    "Peak Hour",
    "Peak Region",
    "Peak Company",
  ];
  const talkgroupEfficiencyExportRows = useMemo(
    () =>
      talkgroupEfficiencyRows.map((row) => [
        row.name,
        formatNumber(row.calls),
        secondsToClock(row.durationSeconds),
        formatDecimal(row.trafficHours, 2),
        formatNumber(row.radios),
        formatNumber(row.users),
        secondsToClock(row.averageDuration),
        row.peakHour,
        row.peakRegion,
        row.peakCompany,
      ]),
    [talkgroupEfficiencyRows],
  );
  const exportTalkgroupEfficiencyXlsx = useCallback(
    () =>
      downloadWorkbookData(
        `talkgroup-efficiency-${fileSlug(CompanyPeriodLabel)}.xlsx`,
        "Talkgroup Efficiency",
        exportTitle("Talkgroup Efficiency"),
        {
          headers: talkgroupEfficiencyHeaders,
          rows: talkgroupEfficiencyExportRows,
        },
      ),
    [CompanyPeriodLabel, exportTitle, talkgroupEfficiencyExportRows],
  );
  const exportTalkgroupEfficiencyPdf = useCallback(
    () =>
      exportTablePdf(
        `talkgroup-efficiency-${fileSlug(CompanyPeriodLabel)}.pdf`,
        "Talkgroup Efficiency",
        talkgroupEfficiencyHeaders,
        talkgroupEfficiencyExportRows,
      ),
    [CompanyPeriodLabel, exportTablePdf, talkgroupEfficiencyExportRows],
  );

  const exportRowsPdfPage = useCallback(async () => {
    const jsPDF = await loadJsPdf();
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "a4",
    });
    await ensurePdfArabicFont(pdf);
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 18;
    const tableWidth = pageWidth - margin * 2;
    const colWeights = [
      0.42, 0.78, 0.9, 1.18, 1.18, 0.78, 0.78, 1.05, 1.15, 0.95, 0.95, 0.65,
      1.18,
    ];
    const totalWeight = colWeights.reduce((s, w) => s + w, 0);
    const colWidths = colWeights.map((w) => (tableWidth * w) / totalWeight);
    const rows = pagedRecords.map((r, i) => [
      (page - 1) * 50 + i + 1,
      r.radioId,
      r.radioAlias,
      r.mobileType,
      r.employeeName,
      r.employeeId,
      r.region,
      r.company,
      r.talkgroup,
      r.startTime,
      r.endTime,
      r.durationSeconds,
      r.baseStation,
    ]);
    const allRows = [recordExportHeaders, ...rows];
    let y = 34;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdfText(
      pdf,
      `${exportTitle("Filtered Calls Register")} - Page ${page}`,
      pageWidth / 2,
      22,
      { align: "center" },
    );
    const summaryCols = 4;
    const summaryGap = 4;
    const summaryCellWidth =
      (tableWidth - summaryGap * (summaryCols - 1)) / summaryCols;
    const summaryRowHeight = 18;
    cdrSummaryRows.forEach((row, index) => {
      const col = index % summaryCols;
      const rowIndex = Math.floor(index / summaryCols);
      const x = margin + col * (summaryCellWidth + summaryGap);
      const sy = y + rowIndex * summaryRowHeight;
      pdf.setDrawColor(20, 36, 48);
      pdf.setFillColor("#ffffff");
      pdf.rect(x, sy, summaryCellWidth, summaryRowHeight, "FD");
      pdf.setFillColor("#fff200");
      pdf.rect(x, sy, summaryCellWidth * 0.45, summaryRowHeight, "FD");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(6.5);
      pdf.setTextColor(0, 0, 0);
      pdfText(pdf, row[0], x + 4, sy + 11.5, {
        maxWidth: summaryCellWidth * 0.45 - 8,
      });
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(6.5);
      pdfText(pdf, row[1], x + summaryCellWidth * 0.45 + 4, sy + 11.5, {
        maxWidth: summaryCellWidth * 0.55 - 8,
      });
    });
    y += Math.ceil(cdrSummaryRows.length / summaryCols) * summaryRowHeight + 10;
    const rowHeight = 8.5;
    allRows.forEach((row, ri) => {
      let x = margin;
      row.forEach((cell, ci) => {
        const width = colWidths[ci];
        pdf.setDrawColor(20, 36, 48);
        pdf.setFillColor(ri === 0 ? "#fff200" : "#ffffff");
        pdf.rect(x, y, width, rowHeight, "FD");
        pdf.setFont("helvetica", ri === 0 ? "bold" : "normal");
        pdf.setFontSize(ri === 0 ? 4.2 : 4.35);
        pdf.setTextColor(0, 0, 0);
        pdfText(pdf, cell, x + width / 2, y + 6, {
          align: "center",
          maxWidth: width - 2,
        });
        x += width;
      });
      y += rowHeight;
    });
    downloadPdf(pdf, `premium-cdr-filtered-records-page-${page}.pdf`);
  }, [cdrSummaryRows, exportTitle, page, pagedRecords]);
  const exportUtilizationXlsx = useCallback(async () => {
    const ExcelJS = await loadExcelJS();
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "CDR Dashboard";
    const border = {
      top: { style: "thin" as const },
      left: { style: "thin" as const },
      bottom: { style: "thin" as const },
      right: { style: "thin" as const },
    };
    const headerFill = {
      type: "pattern" as const,
      pattern: "solid" as const,
      fgColor: { argb: "FFFFFF00" },
    };
    const styleSheet = (sheet: ExcelJS.Worksheet) => {
      sheet.eachRow((row, rn) =>
        row.eachCell((cell) => {
          cell.alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };
          cell.border = border;
          if (rn <= 2) {
            cell.font = { bold: true, color: { argb: "FF000000" } };
            cell.fill = headerFill;
          }
        }),
      );
    };
    const radios = workbook.addWorksheet("Top Radios", {
      views: [{ showGridLines: false }],
    });
    radios.addRow([exportTitle("Top Radios")]);
    radios.mergeCells(1, 1, 1, 5);
    radios.addRow([
      "Radio ID & Alias",
      "Employee Name",
      "Company",
      "Total Calls",
      "Total Duration",
    ]);
    topRadioUsers.forEach((item) =>
      radios.addRow([
        `${item.radioId} - ${item.radioAlias}`,
        item.employeeName,
        item.company,
        item.calls,
        secondsToClock(item.durationSeconds),
      ]),
    );
    radios.columns = [
      { width: 28 },
      { width: 26 },
      { width: 22 },
      { width: 14 },
      { width: 16 },
    ];
    styleSheet(radios);
    const users = workbook.addWorksheet("Top Users", {
      views: [{ showGridLines: false }],
    });
    users.addRow([exportTitle("Top Users")]);
    users.mergeCells(1, 1, 1, 3);
    users.addRow(["User", "Total Calls", "Total Duration"]);
    rankings.user
      .slice(0, 10)
      .forEach((item) =>
        users.addRow([
          item.name,
          item.calls,
          secondsToClock(item.durationSeconds),
        ]),
      );
    users.columns = [{ width: 42 }, { width: 14 }, { width: 16 }];
    styleSheet(users);
    const buffer = await workbook.xlsx.writeBuffer();
    downloadBlob(
      "top-radios-users.xlsx",
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
    );
  }, [exportTitle, rankings.user, topRadioUsers]);

  const exportUtilizationPdf = useCallback(async () => {
    const jsPDF = await loadJsPdf();
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "a4",
    });
    await ensurePdfArabicFont(pdf);
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 24;
    const drawTable = (
      title: string,
      headers: string[],
      rows: (string | number)[][],
      startY: number,
      widths: number[],
    ) => {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdfText(pdf, title, pageWidth / 2, startY, { align: "center" });
      let y = startY + 16;
      const tableW = widths.reduce((s, w) => s + w, 0);
      const startX = (pageWidth - tableW) / 2;
      const rowHeight = 18;
      [headers, ...rows].forEach((row, ri) => {
        let x = startX;
        row.forEach((cell, ci) => {
          const width = widths[ci];
          pdf.setDrawColor(20, 36, 48);
          pdf.setFillColor(ri === 0 ? "#fff200" : "#ffffff");
          pdf.rect(x, y, width, rowHeight, "FD");
          pdf.setFont("helvetica", ri === 0 ? "bold" : "normal");
          pdf.setFontSize(ri === 0 ? 7 : 7.5);
          pdf.setTextColor(0, 0, 0);
          pdfText(pdf, cell, x + width / 2, y + 12, {
            align: "center",
            maxWidth: width - 4,
          });
          x += width;
        });
        y += rowHeight;
      });
      return y;
    };
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdfText(
      pdf,
      exportTitle("Top radios and employee utilization"),
      pageWidth / 2,
      26,
      { align: "center" },
    );
    const nextY = drawTable(
      "Top Radios",
      [
        "Radio ID & Alias",
        "Employee Name",
        "Company",
        "Total Calls",
        "Total Duration",
      ],
      topRadioUsers.map((item) => [
        `${item.radioId} - ${item.radioAlias}`,
        item.employeeName,
        item.company,
        formatNumber(item.calls),
        secondsToClock(item.durationSeconds),
      ]),
      52,
      [170, 160, 130, 80, 95],
    );
    drawTable(
      "Top Users",
      ["User", "Total Calls", "Total Duration"],
      rankings.user
        .slice(0, 10)
        .map((item) => [
          item.name,
          formatNumber(item.calls),
          secondsToClock(item.durationSeconds),
        ]),
      nextY + 28,
      [360, 95, 110],
    );
    downloadPdf(pdf, "top-radios-users.pdf");
  }, [exportTitle, rankings.user, topRadioUsers]);

  const monthlyCompanyPivot = useMemo(() => {
    const companies = [
      ...new Set(monthlyCompanyRows.map((r) => r.company)),
    ].sort((a, b) => a.localeCompare(b));
    const periods = [...new Set(monthlyCompanyRows.map((r) => r.period))].sort(
      (a, b) => {
        const ft = monthlyCompanyRows.find((r) => r.period === a)?.periodType;
        return ft === "Week"
          ? weekSortValue(a) - weekSortValue(b) || a.localeCompare(b)
          : monthSortValue(a) - monthSortValue(b) || a.localeCompare(b);
      },
    );
    const periodType = monthlyCompanyRows[0]?.periodType ?? "Period";
    const byKey = new Map(
      monthlyCompanyRows.map((r) => [`${r.period}||${r.company}`, r]),
    );
    const totals = new Map(
      companies.map((c) => [c, { calls: 0, durationSeconds: 0 }]),
    );
    const rows = periods.map((period) => {
      const values = companies.map((company) => {
        const row = byKey.get(`${period}||${company}`);
        const total = totals.get(company);
        if (total && row) {
          total.calls += row.calls;
          total.durationSeconds += row.durationSeconds;
        }
        return {
          calls: row?.calls ?? 0,
          durationSeconds: row?.durationSeconds ?? 0,
        };
      });
      return {
        period,
        label: periodType === "Week" ? period : shortMonthLabel(period),
        values,
      };
    });
    return { companies, periodType, rows, totals };
  }, [monthlyCompanyRows]);

  const monthlyCompanyChartData = useMemo(() => {
    return monthlyCompanyRows
      .map((r) => ({
        category: `${r.periodType === "Week" ? r.period : shortMonthLabel(r.period)} - ${r.company}`,
        company: r.company,
        period: r.period,
        calls: r.calls,
        durationSeconds: r.durationSeconds,
      }))
      .filter((r) => r.calls > 0 || r.durationSeconds > 0);
  }, [monthlyCompanyRows]);

  const patchWorkbookWithNativeChart = useCallback(
    async (buffer: ExcelJS.Buffer) => {
      const { default: JSZip } = await import("jszip");
      const zip = await JSZip.loadAsync(buffer);
      const lastRow = Math.max(2, monthlyCompanyChartData.length + 1);
      const categoriesRef = `'ChartData'!$A$2:$A$${lastRow}`;
      const callsRef = `'ChartData'!$B$2:$B$${lastRow}`;
      const durationRef = `'ChartData'!$C$2:$C$${lastRow}`;
      const chartXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><c:date1904 val="0"/><c:lang val="en-US"/><c:roundedCorners val="0"/><c:chart><c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" b="1" sz="1400"/><a:t>${escapeXml(exportTitle("Calls and Duration per Company"))}</a:t></a:r></a:p></c:rich></c:tx><c:layout/></c:title><c:plotArea><c:layout/><c:barChart><c:barDir val="col"/><c:grouping val="clustered"/><c:varyColors val="0"/><c:ser><c:idx val="0"/><c:order val="0"/><c:tx><c:v>Calls</c:v></c:tx><c:spPr><a:solidFill><a:srgbClr val="2D86B4"/></a:solidFill></c:spPr><c:cat><c:strRef><c:f>${categoriesRef}</c:f></c:strRef></c:cat><c:val><c:numRef><c:f>${callsRef}</c:f></c:numRef></c:val></c:ser><c:ser><c:idx val="1"/><c:order val="1"/><c:tx><c:v>Duration Seconds</c:v></c:tx><c:spPr><a:solidFill><a:srgbClr val="8FD0E8"/></a:solidFill></c:spPr><c:cat><c:strRef><c:f>${categoriesRef}</c:f></c:strRef></c:cat><c:val><c:numRef><c:f>${durationRef}</c:f></c:numRef></c:val></c:ser><c:axId val="12345678"/><c:axId val="12345679"/></c:barChart><c:catAx><c:axId val="12345678"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:tickLblPos val="low"/><c:crossAx val="12345679"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/></c:catAx><c:valAx><c:axId val="12345679"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:majorGridlines/><c:numFmt formatCode="#,##0" sourceLinked="0"/><c:tickLblPos val="nextTo"/><c:crossAx val="12345678"/><c:crosses val="autoZero"/><c:crossBetween val="between"/></c:valAx></c:plotArea><c:legend><c:legendPos val="b"/><c:layout/><c:overlay val="0"/></c:legend><c:plotVisOnly val="1"/></c:chart></c:chartSpace>`;
      const drawingXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><xdr:twoCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${monthlyCompanyPivot.rows.length + 5}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>12</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${monthlyCompanyPivot.rows.length + 25}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="2" name="Calls Duration Chart"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rId1"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor></xdr:wsDr>`;
      zip.file("xl/charts/chart1.xml", chartXml);
      zip.file("xl/drawings/drawing1.xml", drawingXml);
      zip.file(
        "xl/drawings/_rels/drawing1.xml.rels",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart1.xml"/></Relationships>`,
      );
      const sheetRelPath = "xl/worksheets/_rels/sheet1.xml.rels";
      const sheetRelXml = await zip.file(sheetRelPath)?.async("string");
      const nextRid = sheetRelXml
        ? `rId${(sheetRelXml.match(/Id="rId\d+"/g)?.length ?? 0) + 1}`
        : "rId1";
      const drawingRel = `<Relationship Id="${nextRid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>`;
      zip.file(
        sheetRelPath,
        sheetRelXml
          ? sheetRelXml.replace(
              "</Relationships>",
              `${drawingRel}</Relationships>`,
            )
          : `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${drawingRel}</Relationships>`,
      );
      const sheetXml = await zip
        .file("xl/worksheets/sheet1.xml")
        ?.async("string");
      if (sheetXml) {
        const withNs = sheetXml.includes("xmlns:r=")
          ? sheetXml
          : sheetXml.replace(
              "<worksheet ",
              '<worksheet xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ',
            );
        zip.file(
          "xl/worksheets/sheet1.xml",
          withNs.replace(
            "</worksheet>",
            `<drawing r:id="${nextRid}"/></worksheet>`,
          ),
        );
      }
      const contentTypes = await zip
        .file("[Content_Types].xml")
        ?.async("string");
      if (contentTypes) {
        let next = contentTypes;
        if (!next.includes("/xl/charts/chart1.xml"))
          next = next.replace(
            "</Types>",
            '<Override PartName="/xl/charts/chart1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/></Types>',
          );
        if (!next.includes("/xl/drawings/drawing1.xml"))
          next = next.replace(
            "</Types>",
            '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>',
          );
        zip.file("[Content_Types].xml", next);
      }
      return zip.generateAsync({
        type: "blob",
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
    },
    [exportTitle, monthlyCompanyChartData, monthlyCompanyPivot.rows.length],
  );

  const monthlyCompanyTableHtml = useCallback(() => {
    const { companies, periodType, rows, totals } = monthlyCompanyPivot;
    const bodyRows = rows
      .map(
        (row) =>
          `<tr><th>${htmlEscape(row.label)}</th>${row.values.map((v) => `<td>${formatNumber(v.calls)}</td><td>${formatNumber(v.durationSeconds)}</td>`).join("")}</tr>`,
      )
      .join("");
    const totalCells = companies
      .map((c) => {
        const t = totals.get(c) ?? { calls: 0, durationSeconds: 0 };
        return `<td>${formatNumber(t.calls)}</td><td>${formatNumber(t.durationSeconds)}</td>`;
      })
      .join("");
    return `<table><thead><tr><th class="period">Period</th>${companies.map((c) => `<th colspan="2">${htmlEscape(c)}</th>`).join("")}</tr><tr><th>${htmlEscape(periodType === "Week" ? "Week" : "Month Year")}</th>${companies.map(() => "<th>Calls</th><th>Duration</th>").join("")}</tr></thead><tbody>${bodyRows}</tbody><tfoot><tr><th>Total</th>${totalCells}</tr></tfoot></table>`;
  }, [monthlyCompanyPivot]);

  const captureMonthlyCompanyChart = useCallback(async () => {
    const chart = monthlyCompanyChartRef.current?.querySelector(
      ".recharts-wrapper",
    ) as HTMLElement | null;
    if (!chart) throw new Error("Chart is not ready yet.");
    return captureElementPng(chart, "#0f1b24");
  }, []);

  const monthlyCompanyChartHtml = useCallback(
    () =>
      monthlyCompanyChartRef.current?.querySelector(".recharts-wrapper")
        ?.outerHTML ?? "",
    [],
  );

  const monthlyCompanyExportHtml = useCallback(
    (autoPrint = false) => {
      return `<!doctype html><html><head><title>${htmlEscape(exportTitle("No. of Calls and Duration per Company"))}</title><style>body{margin:0;padding:18px;font-family:Arial,sans-serif;background:#f4f6f8;color:#050505}h1{margin:0 0 12px;text-align:center;font-size:22px}.table-wrap{overflow:auto;border:1px solid #111;background:#fff}table{width:max-content;min-width:100%;border-collapse:collapse;table-layout:auto}th,td{border:1px solid #111;padding:6px 8px;text-align:center;white-space:nowrap}thead th{background:#fff;font-weight:800}thead tr:first-child th{font-size:16px}tbody th,tfoot th{background:#f8fafc;font-weight:800}tfoot td,tfoot th{background:#fff200;font-weight:900}.period{width:120px}.chart-wrap{margin-top:22px;padding:14px;background:#0f1b24;border:1px solid #111;overflow:auto}.chart-wrap svg{max-width:100%;height:auto}</style></head><body><h1>${htmlEscape(exportTitle("No. of Calls and Duration per Company"))}</h1><div class="table-wrap">${monthlyCompanyTableHtml()}</div><div class="chart-wrap">${monthlyCompanyChartHtml()}</div>${autoPrint ? "<script>window.onload=()=>setTimeout(()=>window.print(),250);</script>" : ""}</body></html>`;
    },
    [exportTitle, monthlyCompanyChartHtml, monthlyCompanyTableHtml],
  );

  const exportMonthlyCompanyXlsx = useCallback(async () => {
    const { companies, periodType, rows, totals } = monthlyCompanyPivot;
    const ExcelJS = await loadExcelJS();
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Calls Duration Pivot", {
      views: [{ showGridLines: false }],
    });
    const chartData = workbook.addWorksheet("ChartData", { state: "hidden" });
    const headerFill = {
      type: "pattern" as const,
      pattern: "solid" as const,
      fgColor: { argb: "FFFFFF00" },
    };
    const border = {
      top: { style: "thin" as const },
      left: { style: "thin" as const },
      bottom: { style: "thin" as const },
      right: { style: "thin" as const },
    };
    worksheet.addRow([exportTitle("Calls and Duration per Company")]);
    worksheet.mergeCells(1, 1, 1, 1 + companies.length * 2);
    worksheet.addRow(["Period", ...companies.flatMap((c) => [c, ""])]);
    worksheet.addRow([
      periodType === "Week" ? "Week" : "Month Year",
      ...companies.flatMap(() => ["Calls", "Duration"]),
    ]);
    companies.forEach((_, i) =>
      worksheet.mergeCells(2, 2 + i * 2, 2, 3 + i * 2),
    );
    rows.forEach((row) =>
      worksheet.addRow([
        row.label,
        ...row.values.flatMap((v) => [v.calls, v.durationSeconds]),
      ]),
    );
    worksheet.addRow([
      "Total",
      ...companies.flatMap((c) => {
        const t = totals.get(c) ?? { calls: 0, durationSeconds: 0 };
        return [t.calls, t.durationSeconds];
      }),
    ]);
    worksheet.eachRow((row, rn) => {
      row.eachCell((cell) => {
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = border;
        if (rn <= 3 || rn === rows.length + 4) {
          cell.font = { bold: true };
          if (rn === rows.length + 4 || rn === 1) cell.fill = headerFill;
        }
      });
    });
    worksheet.columns = [
      { width: 16 },
      ...companies.flatMap((c) => [
        { width: Math.max(12, c.length + 3) },
        { width: 14 },
      ]),
    ];
    chartData.addRow(["Category", "Calls", "Duration Seconds"]);
    monthlyCompanyChartData.forEach((r) =>
      chartData.addRow([r.category, r.calls, r.durationSeconds]),
    );
    chartData.columns = [{ width: 34 }, { width: 14 }, { width: 18 }];
    const buffer = await workbook.xlsx.writeBuffer();
    const patched = await patchWorkbookWithNativeChart(buffer);
    downloadBlob("calls-duration-per-company.xlsx", patched);
  }, [
    exportTitle,
    monthlyCompanyChartData,
    monthlyCompanyPivot,
    patchWorkbookWithNativeChart,
  ]);

  const exportMonthlyCompanyPdf = useCallback(async () => {
    const { companies, periodType, rows, totals } = monthlyCompanyPivot;
    const chartPng = await captureMonthlyCompanyChart();
    const jsPDF = await loadJsPdf();
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "a4",
    });
    await ensurePdfArabicFont(pdf);
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 24;
    const totalCols = 1 + companies.length * 2;
    const cellW = Math.min(86, (pageWidth - margin * 2) / totalCols);
    const tableW = cellW * totalCols;
    const startX = (pageWidth - tableW) / 2;
    const rowH = 28;
    let y = 58;
    const drawCell = (
      text: string,
      x: number,
      cy: number,
      w: number,
      h: number,
      fill?: string,
      bold = false,
    ) => {
      if (fill) {
        pdf.setFillColor(fill);
        pdf.rect(x, cy, w, h, "F");
      }
      pdf.setDrawColor(0);
      pdf.rect(x, cy, w, h);
      pdf.setFont("helvetica", bold ? "bold" : "normal");
      pdf.setFontSize(8);
      pdfText(pdf, text, x + w / 2, cy + h / 2 + 3, {
        align: "center",
        maxWidth: w - 4,
      });
    };
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdfText(
      pdf,
      exportTitle("Calls and Duration per Company"),
      pageWidth / 2,
      30,
      { align: "center" },
    );
    drawCell("Period", startX, y, cellW, rowH, "#fff200", true);
    companies.forEach((c, i) =>
      drawCell(
        c,
        startX + cellW + i * cellW * 2,
        y,
        cellW * 2,
        rowH,
        "#fff200",
        true,
      ),
    );
    y += rowH;
    drawCell(
      periodType === "Week" ? "Week" : "Month Year",
      startX,
      y,
      cellW,
      rowH,
      "#fff200",
      true,
    );
    companies.forEach((_, i) => {
      drawCell(
        "Calls",
        startX + cellW + i * cellW * 2,
        y,
        cellW,
        rowH,
        "#ffffff",
        true,
      );
      drawCell(
        "Duration",
        startX + cellW * 2 + i * cellW * 2,
        y,
        cellW,
        rowH,
        "#ffffff",
        true,
      );
    });
    y += rowH;
    rows.forEach((row) => {
      if (y + rowH > pageHeight - margin) {
        pdf.addPage("a4", "landscape");
        y = margin;
      }
      drawCell(row.label, startX, y, cellW, rowH, "#f8fafc", true);
      row.values.forEach((v, i) => {
        drawCell(
          formatNumber(v.calls),
          startX + cellW + i * cellW * 2,
          y,
          cellW,
          rowH,
        );
        drawCell(
          formatNumber(v.durationSeconds),
          startX + cellW * 2 + i * cellW * 2,
          y,
          cellW,
          rowH,
        );
      });
      y += rowH;
    });
    drawCell("Total", startX, y, cellW, rowH, "#fff200", true);
    companies.forEach((c, i) => {
      const t = totals.get(c) ?? { calls: 0, durationSeconds: 0 };
      drawCell(
        formatNumber(t.calls),
        startX + cellW + i * cellW * 2,
        y,
        cellW,
        rowH,
        "#fff200",
        true,
      );
      drawCell(
        formatNumber(t.durationSeconds),
        startX + cellW * 2 + i * cellW * 2,
        y,
        cellW,
        rowH,
        "#fff200",
        true,
      );
    });
    const tableBottom = y + rowH;
    const gap = 18;
    const props = pdf.getImageProperties(chartPng);
    const remainingHeight = pageHeight - tableBottom - gap - margin;
    const samePage = remainingHeight >= 170;
    if (!samePage) pdf.addPage("a4", "landscape");
    const chartTop = samePage ? tableBottom + gap : margin;
    const maxW = pageWidth - margin * 2;
    const maxH = samePage ? remainingHeight : pageHeight - margin * 2;
    const ratio = Math.min(maxW / props.width, maxH / props.height);
    pdf.addImage(
      chartPng,
      "PNG",
      (pageWidth - props.width * ratio) / 2,
      samePage ? chartTop : (pageHeight - props.height * ratio) / 2,
      props.width * ratio,
      props.height * ratio,
    );
    downloadPdf(pdf, "calls-duration-per-company.pdf");
  }, [captureMonthlyCompanyChart, exportTitle, monthlyCompanyPivot]);

  const exportMonthlyCompanyPpt = useCallback(async () => {
    const chartPng = await captureMonthlyCompanyChart();
    const { companies, rows, totals } = monthlyCompanyPivot;
    const pptxgen = await loadPptxgen();
    const pptx = new pptxgen();
    pptx.layout = "LAYOUT_WIDE";
    pptx.author = "CDR Dashboard";
    const tableSlide = pptx.addSlide();
    tableSlide.addText(
      exportTitle("Calls and Duration per Company - Table"),
      pptTextOptions(exportTitle("Calls and Duration per Company - Table"), {
        x: 0.3,
        y: 0.18,
        w: 12.7,
        h: 0.35,
        fontSize: 18,
        bold: true,
        align: "center",
        color: "111111",
      }),
    );
    const pptRows = [
      ["Period", ...companies.flatMap((c) => [`${c} Calls`, `${c} Duration`])],
      ...rows.map((r) => [
        r.label,
        ...r.values.flatMap((v) => [
          formatNumber(v.calls),
          formatNumber(v.durationSeconds),
        ]),
      ]),
      [
        "Total",
        ...companies.flatMap((c) => {
          const t = totals.get(c) ?? { calls: 0, durationSeconds: 0 };
          return [formatNumber(t.calls), formatNumber(t.durationSeconds)];
        }),
      ],
    ];
    const tableX = 0.2;
    const tableY = 0.7;
    const tableW = 12.93;
    const colW = tableW / Math.max(1, pptRows[0].length);
    const rowH = Math.min(0.42, 6.45 / Math.max(1, pptRows.length));
    pptRows.forEach((row, ri) => {
      row.forEach((cell, ci) => {
        const isH = ri === 0 || ri === pptRows.length - 1;
        tableSlide.addShape(pptx.ShapeType.rect, {
          x: tableX + ci * colW,
          y: tableY + ri * rowH,
          w: colW,
          h: rowH,
          fill: { color: isH ? "FFF200" : "FFFFFF" },
          line: { color: "111111", width: 0.5 },
        });
        tableSlide.addText(
          cell,
          pptTextOptions(cell, {
            x: tableX + ci * colW + 0.01,
            y: tableY + ri * rowH + 0.02,
            w: colW - 0.02,
            h: rowH - 0.04,
            fontSize: ri === 0 ? 5.7 : 6.3,
            bold: isH,
            align: "center",
            valign: "mid",
            color: "111111",
            fit: "shrink",
            margin: 0,
          }),
        );
      });
    });
    if (chartPng) {
      const chartSlide = pptx.addSlide();
      chartSlide.addText(
        exportTitle("Calls and Duration per Company - Chart"),
        pptTextOptions(exportTitle("Calls and Duration per Company - Chart"), {
          x: 0.3,
          y: 0.18,
          w: 12.7,
          h: 0.35,
          fontSize: 18,
          bold: true,
          align: "center",
          color: "111111",
        }),
      );
      chartSlide.addImage({
        data: chartPng,
        x: 0.35,
        y: 0.72,
        w: 12.65,
        h: 6.35,
      });
    }
    await downloadPptx(pptx, "calls-duration-per-company.pptx");
  }, [captureMonthlyCompanyChart, exportTitle, monthlyCompanyPivot]);

  const openMonthlyCompanyTable = useCallback(() => {
    const w = window.open(
      "",
      "cdr-monthly-company-table",
      "width=1400,height=800,scrollbars=yes,resizable=yes",
    );
    if (!w) return;
    w.document.open();
    w.document.write(monthlyCompanyExportHtml(false));
    w.document.close();
    w.focus();
  }, [monthlyCompanyExportHtml]);

  const chartExportDatasets = useMemo<
    Record<string, ChartExportDataset>
  >(() => {
    const valueDataset = (
      headers: string[],
      rows: { name: string; value: number }[],
    ): ChartExportDataset => ({
      headers,
      rows: rows.map((r) => [r.name, r.value]),
    });
    const rankingDataset = (rows: Ranking[]): ChartExportDataset => ({
      headers: ["Name", "Calls", "Duration Seconds", "Traffic Hours", "Radios"],
      rows: rows.map((r) => [
        r.name,
        r.calls,
        r.durationSeconds,
        formatDecimal(r.trafficHours, 3),
        r.radios,
      ]),
    });
    const mobileDataset = (
      rows: Record<string, string | number>[],
      firstColumn: string,
    ): ChartExportDataset => ({
      headers: [firstColumn, "Total Radios", ...mobileTypes],
      rows: rows.map((r) => [
        `${r.name}`,
        Number(r.total ?? 0),
        ...mobileTypes.map((type) => Number(r[mobileTypeKey(type)] ?? 0)),
      ]),
    });
    return {
      "KPI Average Duration per Company": {
        headers: [
          "Company",
          "KPI Avg Duration per Activated User (sec)",
          "Users Activated",
          "Calling Users",
        ],
        rows: kpiRows.map((r) => [
          r.company,
          formatDecimal(r.kpiAvgDurationPerUser, 2),
          r.usersActivated,
          r.callingUsers,
        ]),
      },
      "KPI Calls and Duration per Company": {
        headers: ["Company", "Calls", "Duration Seconds", "Duration"],
        rows: kpiRows.map((r) => [
          r.company,
          r.calls,
          r.durationSeconds,
          secondsToClock(r.durationSeconds),
        ]),
      },
      "Monthly KPI": {
        headers: [
          "Company",
          ...monthlyKpi.months.map((m) => shortMonthLabel(m.name)),
        ],
        rows: monthlyKpi.rows.map((r) => [
          `${r.company}`,
          ...monthlyKpi.months.map((m) =>
            r[m.key] == null ? "" : Number(r[m.key]),
          ),
        ]),
      },
      "KPI Total Avg. Duration": valueDataset(
        ["Month", "Avg Duration per Call (sec)"],
        monthlyKpiPieData,
      ),
      "Company Calls & Duration Performance": {
        headers: [
          "Company",
          "Calls",
          "Duration Seconds",
          "Duration",
          "Avg Duration per Call",
        ],
        rows: CompanyRows.map((r) => [
          r.name,
          r.calls,
          r.durationSeconds,
          secondsToClock(r.durationSeconds),
          secondsToClock(r.calls ? r.durationSeconds / r.calls : 0),
        ]),
      },
      "Total Calls per Company": valueDataset(
        ["Company", "Calls"],
        CompanyChartData.calls,
      ),
      "Total Duration per Company": {
        headers: ["Company", "Duration Seconds", "Duration"],
        rows: CompanyChartData.duration.map((r) => [
          r.name,
          r.value,
          secondsToClock(r.value),
        ]),
      },
      "Talkgroups per Company": {
        headers: ["Company", "Total Talkgroups", "Used Talkgroups"],
        rows: CompanyRows.map((r) => [
          r.name,
          r.talkgroupsTotal,
          r.talkgroupsUsed,
        ]),
      },
      "Radios per Company": {
        headers: ["Company", "Total Radios", "Radios Made Calls"],
        rows: CompanyRows.map((r) => [r.name, r.usersTotal, r.callingUsers]),
      },
      "Radios Type per Company": mobileDataset(mobileTypeByCompany, "Company"),
      "Calls and Duration per Company": {
        headers: ["Period", "Company", "Calls", "Duration Seconds", "Duration"],
        rows: monthlyCompanyRows.map((r) => [
          r.period,
          r.company,
          r.calls,
          r.durationSeconds,
          secondsToClock(r.durationSeconds),
        ]),
      },
      "Monthly Performance": rankingDataset(rankings.month),
      "Radios per Month": {
        headers: ["Month", "Radios", "Share"],
        rows: radioMonths.map((r) => [
          r.name,
          r.radios,
          formatPercent(r.share, 2),
        ]),
      },
      "Radio Type per Month": mobileDataset(mobileTypeByMonth, "Month"),
      "Region Performance": rankingDataset(rankings.region),
      "Calls per Month": rankingDataset(rankings.month),
      "Base Station Performance": rankingDataset(rankings.station.slice(0, 12)),
      "Talkgroup Performance": rankingDataset(rankings.talkgroup.slice(0, 12)),
      "Radio Type Performance": rankingDataset(rankings.mobileType),
      "Hour Performance": rankingDataset(rankings.hour),
      "Call Type": rankingDataset(rankings.callType),
      "Call Type Distribution": {
        headers: [
          "Month",
          ...CALL_TYPE_SERIES.flatMap((series) => [
            `${series.name} %`,
            `${series.name} Calls`,
          ]),
        ],
        rows: callTypeMonthlyMix.map((row) => [
          row.month,
          ...CALL_TYPE_SERIES.flatMap((series) => [
            formatDecimal(Number(row[series.key] ?? 0), 1),
            Number(row[`${series.key}Count`] ?? 0),
          ]),
        ]),
      },
      "Duplex Type": {
        headers: ["Duplex Type", "Duration Seconds", "Duration", "Calls"],
        rows: rankings.duplexType.map((r) => [
          r.name,
          r.durationSeconds,
          secondsToClock(r.durationSeconds),
          r.calls,
        ]),
      },
      "Call Priority": rankingDataset(rankings.callPriority),
      Encrypted: rankingDataset(rankings.encrypted),
      "Call Distribution by TG": rankingDataset(topTalkgroupDistribution),
      "Busy-hour profile": rankingDataset(rankings.hour),
      "Top Companies by Calls": rankingDataset(rankings.company.slice(0, 10)),
      "Top Base Stations by Calls": rankingDataset(
        rankings.station.slice(0, 10),
      ),
      "Top Talkgroups by Calls": rankingDataset(
        rankings.talkgroup.slice(0, 10),
      ),
    };
  }, [
    CompanyChartData.calls,
    CompanyChartData.duration,
    CompanyRows,
    callTypeMonthlyMix,
    kpiRows,
    mobileTypeByCompany,
    mobileTypeByMonth,
    mobileTypes,
    monthlyCompanyRows,
    monthlyKpi.months,
    monthlyKpi.rows,
    monthlyKpiPieData,
    rankings.callPriority,
    rankings.callType,
    rankings.company,
    rankings.duplexType,
    rankings.encrypted,
    rankings.hour,
    rankings.mobileType,
    rankings.month,
    rankings.region,
    rankings.station,
    rankings.talkgroup,
    radioMonths,
    topTalkgroupDistribution,
  ]);

  const exportChartWorkbookXlsx = useCallback(
    async (fileName: string, datasets: Record<string, ChartExportDataset>) => {
      const ExcelJS = await loadExcelJS();
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "CDR Dashboard";
      workbook.created = new Date();
      const border = {
        top: { style: "thin" as const },
        left: { style: "thin" as const },
        bottom: { style: "thin" as const },
        right: { style: "thin" as const },
      };
      const headerFill = {
        type: "pattern" as const,
        pattern: "solid" as const,
        fgColor: { argb: "FF0F5F8F" },
      };
      const titleFill = {
        type: "pattern" as const,
        pattern: "solid" as const,
        fgColor: { argb: "FF082033" },
      };
      const usedSheetNames = new Set<string>();
      const chartConfigs: NativeChartConfig[] = [];
      const isNumericLike = (value: unknown) => {
        if (typeof value === "number") return Number.isFinite(value);
        if (typeof value !== "string") return false;
        const normalized = value.replace(/,/g, "").trim();
        return normalized !== "" && Number.isFinite(Number(normalized));
      };
      const toNumericValue = (value: unknown) => {
        if (typeof value === "number") return value;
        if (typeof value === "string") {
          const normalized = value.replace(/,/g, "").trim();
          return normalized === "" ? value : Number(normalized);
        }
        return value;
      };
      const safeSheetName = (value: string) => {
        const base =
          value
            .replace(/[\\/?*[\]:]/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 31) || "Chart Data";
        let name = base;
        let index = 2;
        while (usedSheetNames.has(name)) {
          const suffix = ` ${index}`;
          name = `${base.slice(0, 31 - suffix.length)}${suffix}`;
          index += 1;
        }
        usedSheetNames.add(name);
        return name;
      };
      const chartTypeForTitle = (title: string): NativeChartConfig["type"] => {
        const lower = title.toLowerCase();
        if (lower.includes("radios per month") || lower.includes("total avg"))
          return "doughnut";
        if (
          lower.includes("month") ||
          lower.includes("hour") ||
          lower.includes("kpi")
        )
          return "line";
        return "bar";
      };

      Object.entries(datasets).forEach(([title, dataset]) => {
        if (!dataset.headers.length) return;
        const sheetName = safeSheetName(title);
        const sheetIndex = workbook.worksheets.length + 1;
        const worksheet = workbook.addWorksheet(sheetName, {
          views: [{ showGridLines: false }],
        });
        const numericColumns = dataset.headers
          .map((_, index) => index)
          .filter(
            (index) =>
              index > 0 &&
              dataset.rows.some((row) => isNumericLike(row[index])),
          );
        const chartRows = dataset.rows.map((row) =>
          row.map((cell, index) =>
            numericColumns.includes(index) ? toNumericValue(cell) : cell,
          ),
        );

        worksheet.addRow([exportTitle(title)]);
        worksheet.mergeCells(1, 1, 1, Math.max(1, dataset.headers.length));
        worksheet.addRow([]);
        worksheet.addRow(dataset.headers);
        chartRows.forEach((row) => worksheet.addRow(row));
        worksheet.columns = dataset.headers.map((header, index) => {
          const max = Math.max(
            `${header}`.length,
            ...chartRows.map((row) => `${row[index] ?? ""}`.length),
          );
          return { width: Math.min(42, Math.max(12, max + 2)) };
        });
        worksheet.eachRow((row, rowNumber) => {
          row.height = rowNumber === 1 ? 26 : 22;
          row.eachCell((cell) => {
            cell.alignment = {
              horizontal: "center",
              vertical: "middle",
              wrapText: true,
            };
            cell.border = border;
            if (rowNumber === 1) {
              cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 13 };
              cell.fill = titleFill;
            } else if (rowNumber === 3) {
              cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
              cell.fill = headerFill;
            }
          });
        });

        if (numericColumns.length > 0 && chartRows.length > 0) {
          const type = chartTypeForTitle(title);
          const firstDataRow = 4;
          const lastDataRow = firstDataRow + chartRows.length - 1;
          const seriesColumns =
            type === "doughnut"
              ? numericColumns.slice(0, 1)
              : numericColumns.slice(0, 8);
          chartConfigs.push({
            sheetIndex,
            chartIndex: chartConfigs.length + 1,
            title: exportTitle(title),
            type,
            categoriesRef: excelRange(sheetName, 1, firstDataRow, lastDataRow),
            series: seriesColumns.map((columnIndex, seriesIndex) => ({
              name: dataset.headers[columnIndex],
              valuesRef: excelRange(
                sheetName,
                columnIndex + 1,
                firstDataRow,
                lastDataRow,
              ),
              color: COLORS[seriesIndex % COLORS.length]
                .replace("#", "")
                .toUpperCase(),
            })),
            from: { col: Math.max(4, dataset.headers.length + 1), row: 1 },
            to: { col: Math.max(14, dataset.headers.length + 11), row: 24 },
          });
        }
      });

      applyWorkbookArabicSupport(workbook);
      let output: Blob | ExcelJS.Buffer = await workbook.xlsx.writeBuffer();
      if (chartConfigs.length > 0) {
        output = await patchWorkbookWithNativeCharts(output, chartConfigs);
      }
      downloadBlob(
        fileName,
        output instanceof Blob
          ? output
          : new Blob([output], {
              type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            }),
      );
    },
    [exportTitle],
  );

  const exportAllChartDataXlsx = useCallback(
    () =>
      exportChartWorkbookXlsx(
        `all-chart-data-${fileSlug(CompanyPeriodLabel)}.xlsx`,
        chartExportDatasets,
      ),
    [CompanyPeriodLabel, chartExportDatasets, exportChartWorkbookXlsx],
  );

  const exportSingleChartDataXlsx = useCallback(
    (title: string, dataset: ChartExportDataset) =>
      exportChartWorkbookXlsx(`${fileSlug(exportTitle(title))}.xlsx`, {
        [title]: dataset,
      }),
    [exportChartWorkbookXlsx, exportTitle],
  );

  const chartExportItems = useMemo(
    () =>
      Object.entries(chartExportDatasets).map(([title, dataset]) => ({
        label: title,
        onClick: () => exportSingleChartDataXlsx(title, dataset),
      })),
    [chartExportDatasets, exportSingleChartDataXlsx],
  );

  useEffect(() => {
    if (!data) return;
    const cards = Array.from(
      document.querySelectorAll<HTMLElement>(".app-shell .chart-card"),
    );
    const buttons: HTMLButtonElement[] = [];
    const titleRows: HTMLElement[] = [];
    cards.forEach((card) => {
      if (card.querySelector(".chart-export-actions")) return;
      const heading = card.querySelector<HTMLElement>("h3");
      const title = heading?.textContent?.trim() || "Dashboard Card";
      if (!heading) return;
      const titleRow = document.createElement("div");
      titleRow.className = "chart-card-title-row";
      const actions = document.createElement("div");
      actions.className = "chart-export-actions";
      card.insertBefore(titleRow, heading);
      titleRow.appendChild(heading);
      titleRow.appendChild(actions);
      titleRows.push(titleRow);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "button small quick-card-export";
      button.innerHTML = `${exportIconSvg("png")}<span>PNG</span>`;
      button.title = `Export ${title}`;
      button.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const exportButtons = Array.from(
          card.querySelectorAll<HTMLElement>(".quick-card-export"),
        );
        exportButtons.forEach((b) => {
          b.style.visibility = "hidden";
        });
        try {
          await new Promise((resolve) => requestAnimationFrame(resolve));
          const image = await captureElementPng(card, "#0f1b24");
          downloadDataUrl(`${fileSlug(exportTitle(title))}.png`, image);
        } finally {
          exportButtons.forEach((b) => {
            b.style.visibility = "";
          });
        }
      });
      actions.appendChild(button);
      buttons.push(button);
    });
    return () => {
      buttons.forEach((b) => b.remove());
      titleRows.forEach((row) => {
        const heading = row.querySelector("h3");
        if (heading && row.parentElement)
          row.parentElement.insertBefore(heading, row);
        row.remove();
      });
    };
  }, [CompanyPeriodLabel, data, exportTitle, filtered.length, page]);

  if (!isLocalDbReady) {
    return (
      <main className={`local-login-shell ${themeClass(theme)}`}>
        <section className="local-login-card local-login-loading">
          <ShieldCheck size={38} />
          <h1>Connecting to MySQL...</h1>
          <p>Preparing saved credentials and interface settings from the MySQL backend.</p>
        </section>
      </main>
    );
  }

  if (!portalSession) {
    return (
      <LoginScreen
        settings={appSettings}
        theme={theme}
        isDark={isDark}
        onLogin={handlePortalLogin}
        onToggleTheme={toggleTheme}
        onThemeChange={setTheme}
      />
    );
  }

  // Customer users also start from the upload screen when no workbook is loaded.
  // The upload screen keeps fleetmap and settings actions Admin-only.
  if (!data)
    return (
      <>
        <UploadView
          portalMode={portalMode}
          onUploadCdr={handleUpload}
          onUploadRawSystem={handleRawSystemUpload}
          onUploadMasterFleetmap={handleUploadMasterFleetmap}
          onUploadFixedFleetmap={handleUploadFixedFleetmap}
          onLoadSaved={handleLoadSavedWorkbook}
          onLoadSample={handleLoadSampleData}
          onConfirmUpload={handleConfirmStagedUpload}
          onClearStagedUpload={handleClearStagedUpload}
          savedWorkbook={savedWorkbook}
          stagedTrafficUpload={stagedTrafficUpload}
          masterFleetmap={masterFleetmap}
          fixedFleetmap={fixedFleetmap}
          isParsing={isParsing}
          isLoadingSaved={isLoadingSaved}
          error={error}
          theme={theme}
          onToggleTheme={toggleTheme}
          onThemeChange={setTheme}
          formatNumber={formatNumber}
          appSettings={appSettings}
          portalSession={portalSession}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onLogout={handleLogout}
        />
        {canOpenLocalSettings && (
          <LocalSettingsPanel
            settings={appSettings}
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            onSaveSettings={handleSaveLocalSettings}
            onSaveCredential={handleSaveLocalCredential}
            canManageCredentials={isSystemAdmin}
            theme={theme}
            onThemeChange={setTheme}
          />
        )}
      </>
    );

  const showOverviewTab = activeTab === "overview";
  const showChartsTab = activeTab === "charts";
  const showFleetTab = activeTab === "fleet";
  const showCompanyTab = activeTab === "company";
  const showKpiTab = activeTab === "kpi";
  const showReportsTab = activeTab === "reports";
  const activePageLabel =
    DASHBOARD_TABS.find((tab) => tab.id === activeTab)?.label ?? "Global View";
  const activePageDescription = {
    overview:
      "Main operational command screen with all executive KPI cards and live CDR pulse preserved.",
    company:
      "Detailed CDR ticket/register operations with compact table view, pagination, and supporting radio/user matrices.",
    charts:
      "Chart-based analysis for trends, call attributes, radio usage, top sites, and distribution views.",
    fleet:
      "Management summary for fleet activation, unmatched fleetmap quality, and high-level operational findings.",
    kpi: "Deep KPI and performance trends covering company, region, talkgroup, base station, and hour behavior.",
    reports:
      "Centralized report generation, report type selection, recent history, and download status.",
  }[activeTab];

  const commandHeaderActions = (
    <div className="cdr-header-actions" aria-label="Dashboard quick actions">
      <ThemeSelector theme={theme} onThemeChange={setTheme} compact label="Design" />
      <button
        className="button small cdr-action-pill"
        type="button"
        onClick={() => {
          setData(null);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      >
        <Home size={18} /> Home
      </button>
      {canOpenLocalSettings && (
        <button
          className="button small cdr-action-pill"
          type="button"
          onClick={() => setIsSettingsOpen(true)}
        >
          <ShieldCheck size={18} /> Admin Settings
        </button>
      )}
      <button
        className="button small cdr-action-pill"
        type="button"
        onClick={handleLogout}
      >
        <LogOut size={18} /> Logout
      </button>
      {canAddRegion && (
        <button
          className="button small cdr-action-pill"
          type="button"
          onClick={() => {
            setActiveTab("company");
            window.setTimeout(
              () =>
                document
                  .getElementById("regionPerformance")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" }),
              80,
            );
          }}
        >
          <UploadCloud size={18} /> Add Region ({formatNumber(metrics.regions)})
        </button>
      )}
      {canManageCustomerWorkbook && (
        <label
          className="button small cdr-action-pill cdr-action-file"
          title="Add new workbook files to the current dashboard"
        >
          <RefreshCw size={18} /> {isSystemAdmin ? "New workbook(s)" : "Upload Sheet"}
          <input
            type="file"
            accept=".xlsx,.xls,.xlsm,.xlsb"
            multiple
            onChange={handleAddMoreCdr}
          />
        </label>
      )}
    </div>
  );

  const headerWorkbookProfile = showOverviewTab ? (
    <section className="cdr-header-profile-band cdr-profile-inline-row" aria-label="Workbook profile and data source">
      <div className="cdr-profile-record-card">
        <img className="cdr-profile-record-icon" src="/assets/call.png" alt="Calls under analysis" />
        <div className="cdr-profile-record-copy">
          <span>Live workbook profile</span>
          <strong>{formatNumber(metrics.totalCalls)}</strong>
          <p>Calls under analysis</p>
        </div>
      </div>
      <div className="cdr-profile-source-card">
        <ShieldCheck className="cdr-profile-source-icon" size={28} />
        <div className="cdr-profile-source-copy">
          <span>Data Source</span>
          <strong>{data.fileName}</strong>
          <p>{formatNumber(data.rawRows)} records - loaded {data.loadedAt}</p>
          <div className="cdr-profile-source-chips">
            {data.cdrSources.slice(0, 4).map((source, index) => (
              <em key={`${source.fileName}-${index}`} title={source.fileName}>
                {source.fileName} - {formatNumber(source.recordCount)} rows
              </em>
            ))}
          </div>
          <small>
            Fleetmap: Master ({formatNumber(masterFleetmap.records.length)}) + Fixed ({formatNumber(fixedFleetmap.records.length)})
          </small>
        </div>
      </div>
    </section>
  ) : null;

  // Customer and Admin share the same dashboard interface after data is loaded.
  // Customer permissions are handled by hiding only Admin-only controls such as Admin Settings.
  return (
    <>
    <main className={`app-shell ${themeClass(theme)} active-tab-${activeTab}`}>
      <section className="cdr-command-shell">
        <header className="topbar followup-style-topbar cdr-navy-banner">
          <div className="cdr-banner-art" aria-hidden="true">
            <svg
              className="cdr-banner-svg"
              viewBox="0 0 1440 132"
              preserveAspectRatio="none"
            >
              <defs>
                <pattern
                  id="cdr-risk-dot-grid"
                  width="34"
                  height="24"
                  patternUnits="userSpaceOnUse"
                >
                  <circle
                    cx="3"
                    cy="3"
                    r="1.15"
                    fill="rgba(118,178,255,0.38)"
                  />
                </pattern>
                <filter
                  id="cdr-risk-soft-glow"
                  x="-80%"
                  y="-80%"
                  width="260%"
                  height="260%"
                >
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <radialGradient
                  id="cdr-risk-left-glow"
                  cx="50%"
                  cy="50%"
                  r="50%"
                >
                  <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.54" />
                  <stop offset="42%" stopColor="var(--design-accent)" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="var(--design-accent)" stopOpacity="0" />
                </radialGradient>
                <radialGradient
                  id="cdr-risk-right-glow"
                  cx="50%"
                  cy="50%"
                  r="50%"
                >
                  <stop offset="0%" stopColor="#fb7185" stopOpacity="0.60" />
                  <stop offset="44%" stopColor="var(--design-danger)" stopOpacity="0.34" />
                  <stop offset="100%" stopColor="var(--design-danger)" stopOpacity="0" />
                </radialGradient>
                <linearGradient
                  id="cdr-risk-blue-wave"
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="0"
                >
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.82" />
                  <stop offset="48%" stopColor="var(--chart-calls-deep)" stopOpacity="0.58" />
                  <stop offset="100%" stopColor="var(--design-accent-2)" stopOpacity="0.18" />
                </linearGradient>
                <linearGradient
                  id="cdr-risk-teal-wave"
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="0"
                >
                  <stop offset="0%" stopColor="var(--design-accent-2)" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="var(--design-accent)" stopOpacity="0.12" />
                </linearGradient>
                <linearGradient
                  id="cdr-risk-red-wave"
                  x1="1"
                  y1="0"
                  x2="0"
                  y2="0"
                >
                  <stop offset="0%" stopColor="#f87171" stopOpacity="0.78" />
                  <stop offset="48%" stopColor="#b91c1c" stopOpacity="0.54" />
                  <stop offset="100%" stopColor="var(--design-danger)" stopOpacity="0.16" />
                </linearGradient>
                <linearGradient id="cdr-risk-frame" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="var(--design-accent-2)" stopOpacity="0" />
                  <stop offset="14%" stopColor="var(--design-accent-2)" stopOpacity="0.72" />
                  <stop offset="44%" stopColor="#38bdf8" stopOpacity="0.18" />
                  <stop offset="58%" stopColor="#38bdf8" stopOpacity="0.18" />
                  <stop offset="86%" stopColor="var(--design-danger)" stopOpacity="0.64" />
                  <stop offset="100%" stopColor="var(--design-danger)" stopOpacity="0" />
                </linearGradient>
              </defs>

              <rect
                x="0"
                y="0"
                width="1440"
                height="132"
                fill="url(#cdr-risk-dot-grid)"
                opacity="0.42"
              />
              <ellipse
                cx="74"
                cy="66"
                rx="170"
                ry="92"
                fill="url(#cdr-risk-left-glow)"
                opacity="0.92"
              />
              <ellipse
                cx="1366"
                cy="66"
                rx="170"
                ry="92"
                fill="url(#cdr-risk-right-glow)"
                opacity="0.96"
              />

              <g
                className="cdr-risk-frame-lines"
                filter="url(#cdr-risk-soft-glow)"
              >
                <line
                  x1="0"
                  y1="25"
                  x2="408"
                  y2="25"
                  stroke="url(#cdr-risk-frame)"
                  strokeWidth="1.7"
                  opacity="0.88"
                />
                <line
                  x1="1032"
                  y1="25"
                  x2="1440"
                  y2="25"
                  stroke="url(#cdr-risk-frame)"
                  strokeWidth="1.7"
                  opacity="0.76"
                />
                <line
                  x1="0"
                  y1="118"
                  x2="408"
                  y2="118"
                  stroke="rgba(0,206,209,0.24)"
                  strokeWidth="1.3"
                  opacity="0.80"
                />
                <line
                  x1="1032"
                  y1="118"
                  x2="1440"
                  y2="118"
                  stroke="rgba(239,68,68,0.24)"
                  strokeWidth="1.3"
                  opacity="0.80"
                />
              </g>

              <g
                className="cdr-risk-blue-waves"
                fill="none"
                strokeLinecap="round"
                filter="url(#cdr-risk-soft-glow)"
              >
                <path
                  d="M-24 87 C94 54 144 101 246 70 S390 60 548 88"
                  stroke="url(#cdr-risk-blue-wave)"
                  strokeWidth="3"
                  opacity="0.92"
                />
                <path
                  d="M-34 105 C88 84 144 123 248 92 S414 84 548 106"
                  stroke="url(#cdr-risk-teal-wave)"
                  strokeWidth="2"
                  opacity="0.82"
                />
                <path
                  d="M88 66 C184 46 264 44 348 63 S450 78 536 61"
                  stroke="var(--design-accent)"
                  strokeWidth="2.2"
                  opacity="0.72"
                />
              </g>

              <g
                className="cdr-risk-red-waves"
                fill="none"
                strokeLinecap="round"
                filter="url(#cdr-risk-soft-glow)"
              >
                <path
                  d="M1464 87 C1346 54 1296 101 1194 70 S1050 60 892 88"
                  stroke="url(#cdr-risk-red-wave)"
                  strokeWidth="3"
                  opacity="0.88"
                />
                <path
                  d="M1474 105 C1352 84 1296 123 1192 92 S1026 84 892 106"
                  stroke="var(--design-danger)"
                  strokeWidth="2"
                  opacity="0.56"
                />
                <path
                  d="M1352 66 C1256 46 1176 44 1092 63 S990 78 904 61"
                  stroke="var(--design-danger)"
                  strokeWidth="2.2"
                  opacity="0.68"
                />
              </g>

              <g
                className="cdr-risk-shield"
                transform="translate(710 -8)"
                filter="url(#cdr-risk-soft-glow)"
              >
                <path
                  d="M10 0 L30 8 V22 C30 38 21 48 10 55 C-1 48 -10 38 -10 22 V8 Z"
                  fill="rgba(5,22,55,0.80)"
                  stroke="rgba(0,206,209,0.66)"
                  strokeWidth="1.5"
                />
                <path
                  d="M3 24 l5 5 10 -14"
                  fill="none"
                  stroke="rgba(0,206,209,0.92)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>

              <g
                className="cdr-risk-bar-chart"
                transform="translate(585 104)"
                opacity="0.60"
              >
                <rect
                  x="0"
                  y="-28"
                  width="7"
                  height="28"
                  rx="2"
                  fill="var(--design-accent)"
                />
                <rect
                  x="13"
                  y="-40"
                  width="7"
                  height="40"
                  rx="2"
                  fill="var(--chart-calls-deep)"
                />
                <rect
                  x="26"
                  y="-54"
                  width="7"
                  height="54"
                  rx="2"
                  fill="var(--chart-total)"
                />
              </g>

              <g
                className="cdr-risk-donut"
                transform="translate(820 111)"
                opacity="0.48"
              >
                <circle
                  cx="0"
                  cy="0"
                  r="21"
                  fill="none"
                  stroke="rgba(255,255,255,0.14)"
                  strokeWidth="11"
                />
                <path
                  d="M0 -21 A21 21 0 0 1 20 7"
                  fill="none"
                  stroke="var(--design-danger)"
                  strokeWidth="11"
                  strokeLinecap="round"
                />
                <path
                  d="M20 7 A21 21 0 0 1 -11 18"
                  fill="none"
                  stroke="var(--design-accent)"
                  strokeWidth="11"
                  strokeLinecap="round"
                />
              </g>

              <g
                className="cdr-risk-circuit"
                fill="none"
                strokeWidth="1.4"
                opacity="0.70"
              >
                <path d="M70 25 h330" stroke="rgba(0,206,209,0.42)" />
                <path d="M1040 25 h330" stroke="rgba(239,68,68,0.34)" />
                <circle cx="68" cy="25" r="5" fill="none" stroke="var(--design-accent-2)" />
                <circle cx="68" cy="25" r="2" fill="var(--design-accent-2)" />
                <circle cx="1372" cy="25" r="5" fill="none" stroke="var(--design-danger)" />
                <circle cx="1372" cy="25" r="2" fill="var(--design-danger)" />
              </g>
            </svg>
          </div>
          <div className="cdr-header-logo cdr-header-logo-left">
            <img src={appSettings.leftLogoDataUrl || "/assets/se-logo.png"} alt={appSettings.leftLogoName || "Left logo"} />
          </div>

          <div className="followup-dashboard-title">
            <h1>{appSettings.dashboardHeaderTitle}</h1>
            <p>{appSettings.dashboardHeaderDescription}</p>
          </div>

          <div className="cdr-header-logo cdr-header-logo-right">
            <img src={appSettings.rightLogoDataUrl || "/assets/nasco-logo.png"} alt={appSettings.rightLogoName || "Right logo"} />
          </div>
        </header>

        {headerWorkbookProfile}

        <DashboardTabs
          tabs={DASHBOARD_TABS}
          activeTab={activeTab}
          onChange={handleTabChange}
          actions={commandHeaderActions}
        />

        <DashboardFilters
          filters={filters}
          options={options}
          talkgroupLabels={talkgroupLabels}
          filteredCount={filtered.length}
          recordsCount={records.length}
          filteredShare={filteredShare}
          formatNumber={formatNumber}
          formatPercent={formatPercent}
          onSearchChange={updateSearchFilter}
          onArrayFilterChange={updateArrayFilter}
          onReset={resetAllFilters}
        />
      </section>

      {!showOverviewTab && (
        <WorkbookHero
          data={data}
          metrics={metrics}
          masterFleetmap={masterFleetmap}
          fixedFleetmap={fixedFleetmap}
          formatNumber={formatNumber}
        />
      )}
      {data.warnings.length > 0 && (
        <div
          className="warning-strip"
          style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--design-warning)" }}
        >
          <AlertTriangle size={18} /> {data.warnings.join(" ")}
        </div>
      )}

      <section
        className="cdr-page-intro"
        aria-label={`${activePageLabel} page summary`}
      >
        <div>
          <span>Active CDR Portal Page</span>
          <h2>{activePageLabel}</h2>
          <p>{activePageDescription}</p>
        </div>
        <div
          className="cdr-page-intro-stats"
          aria-label="Current filter status"
        >
          <strong>{formatNumber(filtered.length)}</strong>
          <small>Filtered Calls</small>
          <strong>{formatNumber(records.length)}</strong>
          <small>Total Calls</small>
        </div>
      </section>

      {showReportsTab && (
        <ReportsPanel
          showRegister={showReportsCdrRegister}
          pagedRecords={pagedRecords}
          totalFiltered={filtered.length}
          totalRecords={records.length}
          page={page}
          pageCount={pageCount}
          formatNumber={formatNumber}
          onToggleRegister={toggleReportsCdrRegister}
          onPreviousPage={goToPreviousPage}
          onNextPage={goToNextPage}
          onExportRowsXlsx={exportRowsXlsx}
          onExportRowsPdf={exportRowsPdfPage}
          onExportKpiXlsx={exportKpiXlsx}
          onExportKpiPdf={exportKpiPdf}
          onExportKpiPpt={exportKpiPpt}
          onOpenCompanyContribution={openMonthlyCompanyTable}
          onExportCompanyContributionXlsx={exportMonthlyCompanyXlsx}
          onExportCompanyContributionPdf={exportMonthlyCompanyPdf}
          onExportCompanyContributionPpt={exportMonthlyCompanyPpt}
          onExportRegionPerformanceXlsx={exportRegionPerformanceXlsx}
          onExportRegionPerformancePdf={exportRegionPerformancePdf}
          onExportTalkgroupEfficiencyXlsx={exportTalkgroupEfficiencyXlsx}
          onExportTalkgroupEfficiencyPdf={exportTalkgroupEfficiencyPdf}
          onExportUtilizationXlsx={exportUtilizationXlsx}
          onExportUtilizationPdf={exportUtilizationPdf}
          onExportUnmatchedFleetmapXlsx={exportUnmatchedFleetmapXlsx}
          onExportChartDataXlsx={exportAllChartDataXlsx}
          chartExportItems={chartExportItems}
        />
      )}
      {showOverviewTab && (
        <>
          <ModernOverview
            metrics={metrics}
            rankings={rankings}
            filteredCount={filtered.length}
            totalCount={records.length}
            periodLabel={CompanyPeriodLabel}
            loadedAt={data.loadedAt}
            data={data}
            filteredRecords={filtered}
            masterFleetmap={masterFleetmap}
            fixedFleetmap={fixedFleetmap}
            maxDuration={maxDuration}
            minDuration={minDuration}
            qualityScore={qualityScore}
            qualityIssues={qualityIssues}
            peakUserParts={peakUserParts}
            peakWeekName={peakWeekEntry?.[0] ?? "Unknown"}
            peakDayName={peakDayEntry?.[0] ?? "Unknown"}
            trafficIntensity={trafficIntensity}
            showProfile={false}
          />

          {filtered.length === 0 && (
            <div className="empty-state" role="status">
              <Search size={34} />
              <strong
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  color: "var(--design-text)",
                }}
              >
                No records found
              </strong>
              <span style={{ fontSize: "0.9rem", color: "var(--design-muted)" }}>
                Try changing or resetting your filters.
              </span>
            </div>
          )}
        </>
      )}

      {showFleetTab && (
        <>
          <SectionTitle
            id="networkUtilization"
            eyebrow="Fleet activation"
            title={`Network Utilization & Fleet Activation in ${CompanyPeriodLabel}`}
            text="Compare registered fleetmap radios against radios that made calls in the filtered period."
            collapsed={isSectionCollapsed("networkUtilization")}
            onToggle={() => toggleSection("networkUtilization")}
          />
          <section
            id="networkUtilization-content"
            className={`network-utilization-section fleet-activation-panel ${isSectionCollapsed("networkUtilization") ? "section-content-collapsed" : ""}`}
          >
            <div className="summary-cards network-utilization-cards">
              <div className="summary-card yellow">
                <span
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: "var(--design-faint)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Registered Radios
                </span>
                <strong
                  style={{
                    fontSize: "1.6rem",
                    fontWeight: 900,
                    color: "var(--design-warning)",
                  }}
                >
                  {formatNumber(fleetActivation.registeredCount)}
                </strong>
                <small style={{ fontSize: "0.75rem", color: "var(--design-muted)" }}>
                  From fleetmap
                </small>
              </div>
              <div className="summary-card green">
                <span
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: "var(--design-faint)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Active Registered
                </span>
                <strong
                  style={{
                    fontSize: "1.6rem",
                    fontWeight: 900,
                    color: "var(--design-success)",
                  }}
                >
                  {formatNumber(fleetActivation.activeRegisteredCount)}
                </strong>
                <small style={{ fontSize: "0.75rem", color: "var(--design-muted)" }}>
                  Made calls
                </small>
              </div>
              <div className="summary-card yellow">
                <span
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: "var(--design-faint)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Inactive Radios
                </span>
                <strong
                  style={{
                    fontSize: "1.6rem",
                    fontWeight: 900,
                    color: "var(--design-warning)",
                  }}
                >
                  {formatNumber(fleetActivation.inactiveCount)}
                </strong>
                <small style={{ fontSize: "0.75rem", color: "var(--design-muted)" }}>
                  No calls found
                </small>
              </div>
              <div className="summary-card green">
                <span
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: "var(--design-faint)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Activation %
                </span>
                <strong
                  style={{
                    fontSize: "1.6rem",
                    fontWeight: 900,
                    color: "var(--design-success)",
                  }}
                >
                  {formatDecimal(fleetActivation.activationRate, 1)}%
                </strong>
                <small style={{ fontSize: "0.75rem", color: "var(--design-muted)" }}>
                  Active / registered
                </small>
              </div>
              <div className="summary-card yellow">
                <span
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: "var(--design-faint)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Traffic / Active Radio
                </span>
                <strong
                  style={{
                    fontSize: "1.6rem",
                    fontWeight: 900,
                    color: "var(--design-warning)",
                  }}
                >
                  {formatDecimal(trafficIntensity.trafficPerRadio, 2)}
                </strong>
                <small style={{ fontSize: "0.75rem", color: "var(--design-muted)" }}>
                  Erlangs per radio
                </small>
              </div>
            </div>
            <div className="quality-grid fleet-activation-tables">
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
                        <td className="inactive-count-cell">
                          {formatNumber(Number(item.count ?? 0))}
                        </td>
                        <td className="active-count-cell">
                          {formatNumber(Number(item.activeCount ?? 0))}
                        </td>
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
                        <td className="inactive-count-cell">
                          {formatNumber(Number(item.count ?? 0))}
                        </td>
                        <td className="active-count-cell">
                          {formatNumber(Number(item.activeCount ?? 0))}
                        </td>
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
          />
          <section
            id="unmatchedFleetmap-content"
            className={`unmatched-fleetmap-report-section fleet-unmatched-section ${isSectionCollapsed("unmatchedFleetmap") ? "section-content-collapsed" : ""}`}
          >
            <div className="fleet-unmatched-layout">
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
                      {unmatchedFleetmapReportRows.length ? (
                        unmatchedFleetmapReportRows.map((row) => (
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
                        ))
                      ) : (
                        <tr>
                          <td colSpan={9}>
                            All raw Caller Numbers are matched to the
                            Master/Fixed Fleetmap for the current filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </article>
              <aside
                className="fleet-radio-showcase"
                aria-label="Hytera radio fleet visual"
              >
                <img
                  src={appSettings.radioShowcaseImageDataUrl || "/assets/radio.png"}
                  alt={appSettings.radioShowcaseImageName || "Hytera radio on display stand"}
                />
              </aside>
            </div>
          </section>
        </>
      )}

      {showCompanyTab && (
        <>
          <FilteredCallsRegister
            id="ticket-portal-cdr-register"
            title="Ticket Portal Register"
            eyebrow="CDR Register"
            records={pagedRecords}
            totalFiltered={filtered.length}
            totalRecords={records.length}
            page={page}
            pageCount={pageCount}
            showTopButton
            formatNumber={formatNumber}
            onPreviousPage={goToPreviousPage}
            onNextPage={goToNextPage}
          />
          <section
            id="companyMatrices-content"
            className="company-matrix-pair"
            aria-label="Region and talkgroup performance matrices"
          >
            <section
              id="regionPerformance-content"
              className="region-performance-section company-matrix-section"
            >
              <article className="table-card wide-table-card company-matrix-card region-matrix-card">
                <h3>Region Performance Matrix</h3>
                <div className="records-scroll small no-scroll-table fixed-row-table company-matrix-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Region</th>
                        <th>Calls</th>
                        <th>Total Duration</th>
                        <th>Traffic</th>
                        <th>Active Radios</th>
                        <th>TGs</th>
                        <th>Companies</th>
                        <th>BS</th>
                        <th>Avg Duration</th>
                        <th>Peak Hour</th>
                        <th>Top Company</th>
                      </tr>
                    </thead>
                    <tbody>
                      {regionPerformanceRows.map((row) => (
                        <tr key={row.name}>
                          <td>{row.name}</td>
                          <td>{formatNumber(row.calls)}</td>
                          <td>{secondsToClock(row.durationSeconds)}</td>
                          <td>{formatDecimal(row.trafficHours, 2)}</td>
                          <td>{formatNumber(row.radios)}</td>
                          <td>{formatNumber(row.talkgroups)}</td>
                          <td>{formatNumber(row.companies)}</td>
                          <td>{formatNumber(row.stations)}</td>
                          <td>{secondsToClock(row.averageDuration)}</td>
                          <td>{row.peakHour}</td>
                          <td>{row.topCompany}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            </section>
            <section
              id="talkgroupEfficiency-content"
              className="talkgroup-efficiency-section company-matrix-section"
            >
              <article className="table-card wide-table-card company-matrix-card tg-efficiency-card">
                <h3>TG Efficiency Matrix</h3>
                <div className="records-scroll small no-scroll-table fixed-row-table company-matrix-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>TG</th>
                        <th>Calls</th>
                        <th>Duration</th>
                        <th>Traffic</th>
                        <th>Active Radios</th>
                        <th>Active Users</th>
                        <th>Avg Duration</th>
                        <th>Peak Hour</th>
                        <th>Peak Region</th>
                        <th>Peak Company</th>
                      </tr>
                    </thead>
                    <tbody>
                      {talkgroupEfficiencyRows.map((row) => (
                        <tr key={row.name}>
                          <td>{row.name}</td>
                          <td>{formatNumber(row.calls)}</td>
                          <td>{secondsToClock(row.durationSeconds)}</td>
                          <td>{formatDecimal(row.trafficHours, 2)}</td>
                          <td>{formatNumber(row.radios)}</td>
                          <td>{formatNumber(row.users)}</td>
                          <td>{secondsToClock(row.averageDuration)}</td>
                          <td>{row.peakHour}</td>
                          <td>{row.peakRegion}</td>
                          <td>{row.peakCompany}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            </section>
          </section>
        </>
      )}

      {showKpiTab && (
        <>
          <SectionTitle
            id="kpi"
            eyebrow="1"
            title="Key KPI Profiles: Aggregate Metrics"
            text={`Data grid and KPI chart profiles in ${CompanyPeriodLabel}.`}
            collapsed={isSectionCollapsed("kpi")}
            onToggle={() => toggleSection("kpi")}
          />
          <section
            id="kpi-content"
            className={`kpi-grid ${isSectionCollapsed("kpi") ? "section-content-collapsed" : ""}`}
          >
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
                  <thead>
                    <tr>
                      <th>Call Source</th>
                      <th>Talkgroups</th>
                      <th>Calls</th>
                      <th>Duration Sec</th>
                      <th>Duration</th>
                      <th>Users Activated</th>
                      <th>Calling Users</th>
                      <th>Avg Duration / User</th>
                      <th>KPI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kpiRows.map((row, i) => (
                      <tr key={row.company}>
                        <td>{row.company}</td>
                        <td>{formatNumber(row.talkgroupsInUse)}</td>
                        <td>{formatNumber(row.calls)}</td>
                        <td>{formatNumber(row.durationSeconds)}</td>
                        <td>{secondsToClock(row.durationSeconds)}</td>
                        <td>{formatNumber(row.usersActivated)}</td>
                        <td>{formatNumber(row.callingUsers)}</td>
                        <td>{formatNumber(row.kpiAvgDurationPerUser)}</td>
                        <td>{i === 0 ? formatNumber(kpiAverage) : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
            <article
              className="chart-card kpi-average-card"
              ref={kpiAverageChartRef}
            >
              <h3>KPI Average Duration per Company</h3>
              <ResponsiveContainer
                width="100%"
                height={Math.max(340, kpiRows.length * 34)}
              >
                <BarChart
                  layout="vertical"
                  data={kpiRows}
                  margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    stroke={CHART_COLORS.grid}
                    strokeDasharray="3 3"
                    opacity={0.32}
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="company"
                    width={140}
                    tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
                    tickFormatter={(v) => truncateLabel(v, 18)}
                    interval={0}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(v: number) => [
                      `${formatDecimal(v, 1)} sec`,
                      "KPI avg duration",
                    ]}
                  />
                  <Bar
                    dataKey="kpiAvgDurationPerUser"
                    fill={CHART_COLORS.calls}
                  >
                    <LabelList
                      dataKey="kpiAvgDurationPerUser"
                      content={RightValueLabel}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <ChartLegend
                items={[
                  {
                    name: "Average duration per activated user",
                    color: CHART_COLORS.calls,
                  },
                ]}
              />
            </article>
            <article
              className="chart-card kpi-calls-duration-card"
              ref={kpiCallsDurationChartRef}
            >
              <h3>KPI Calls and Duration per Company</h3>
              <ResponsiveContainer width="100%" height={390}>
                <ComposedChart
                  data={kpiRows}
                  margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    stroke={CHART_COLORS.grid}
                    strokeDasharray="3 3"
                    opacity={0.32}
                  />
                  <XAxis
                    dataKey="company"
                    tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
                    angle={-55}
                    textAnchor="end"
                    interval={0}
                    tickMargin={12}
                    height={128}
                    tickFormatter={(v) => truncateLabel(v, 18)}
                  />
                  <YAxis
                    yAxisId="calls"
                    tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
                  />
                  <YAxis
                    yAxisId="duration"
                    orientation="right"
                    tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(v: number) => formatNumber(v)}
                  />
                  <Line
                    yAxisId="calls"
                    dataKey="calls"
                    stroke={CHART_COLORS.calls}
                    strokeWidth={3}
                    dot={{ r: 4, fill: CHART_COLORS.calls }}
                    name="Calls"
                  >
                    <LabelList dataKey="calls" content={KpiBarLabel} />
                  </Line>
                  <Line
                    yAxisId="duration"
                    dataKey="durationSeconds"
                    stroke={CHART_COLORS.duration}
                    strokeWidth={3}
                    name="Duration seconds"
                  >
                    <LabelList
                      dataKey="durationSeconds"
                      content={KpiLineLabel}
                    />
                  </Line>
                </ComposedChart>
              </ResponsiveContainer>
              <ChartLegend
                items={[
                  { name: "Calls", color: CHART_COLORS.calls },
                  { name: "Duration seconds", color: CHART_COLORS.duration },
                ]}
              />
            </article>
            <article
              className="chart-card monthly-kpi-card kpi-monthly-card"
              ref={monthlyKpiChartRef}
            >
              <h3>Monthly KPI</h3>
              <p>(Avg. call duration per company) in sec</p>
              <ResponsiveContainer width="100%" height={430}>
                <LineChart
                  data={monthlyKpi.rows}
                  margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    stroke={CHART_COLORS.grid}
                    strokeDasharray="3 3"
                    opacity={0.32}
                  />
                  <XAxis
                    dataKey="company"
                    tick={{
                      fill: CHART_COLORS.axis,
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                    tickFormatter={(v) => truncateLabel(v, 22)}
                    interval={0}
                    angle={-35}
                    textAnchor="end"
                    tickMargin={12}
                    height={82}
                  />
                  <YAxis
                    tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
                    tickFormatter={(v) => `${formatDecimal(Number(v), 0)}s`}
                    domain={[0, "dataMax + 20"]}
                    label={{
                      value: "Average duration (sec)",
                      angle: -90,
                      position: "insideLeft",
                      fill: CHART_COLORS.axis,
                      fontSize: 12,
                    }}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(v: number, name: string) => [
                      v == null ? "" : `${formatDecimal(v, 2)} sec`,
                      name,
                    ]}
                  />
                  {monthlyKpi.months.map((month) => (
                    <Line
                      key={month.key}
                      type="monotone"
                      dataKey={month.key}
                      name={shortMonthLabel(month.name)}
                      stroke={month.color}
                      strokeWidth={3}
                      dot={{ r: 6 }}
                      activeDot={{ r: 8 }}
                      connectNulls={false}
                    >
                      <LabelList
                        dataKey={month.key}
                        content={(props) => (
                          <PointValueLabel {...props} fill={month.color} />
                        )}
                      />
                    </Line>
                  ))}
                </LineChart>
              </ResponsiveContainer>
              <ChartLegend
                items={monthlyKpi.months.map((m) => ({
                  name: shortMonthLabel(m.name),
                  color: m.color,
                }))}
              />
            </article>
            <article
              className="chart-card monthly-kpi-card kpi-total-avg-card"
              ref={kpiTotalAvgChartRef}
            >
              <h3>KPI Total Avg. Duration</h3>
              <p>Average call duration by month in sec</p>
              <div className="Company-pie-layout">
                <ResponsiveContainer width="64%" height={430}>
                  <PieChart margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
                    <Pie
                      data={monthlyKpiPieData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={180}
                      innerRadius={100}
                      paddingAngle={2}
                      label={PieOuterDecimalLabel}
                      labelLine
                    >
                      {monthlyKpiPieData.map((entry, i) => (
                        <Cell
                          key={entry.name}
                          fill={COLORS[i % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <text
                      x="50%"
                      y="47%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="modern-pie-center-value"
                    >
                      {formatDecimal(monthlyKpiPieTotal, 2)}
                    </text>
                    <text
                      x="50%"
                      y="57%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="modern-pie-center-label"
                    >
                      Total
                    </text>
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(v: number) => [
                        `${formatDecimal(v, 2)} sec`,
                        "Average duration",
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <ChartLegend
                  className="pie-legend kpi-total-avg-legend"
                  items={monthlyKpiPieData.map((item, i) => ({
                    name: item.name,
                    color: COLORS[i % COLORS.length],
                  }))}
                />
              </div>
            </article>
          </section>
        </>
      )}

      {showChartsTab && (
        <ChartsTab
          monthlyCompanyChartRef={monthlyCompanyChartRef}
          monthlyCompanyRows={monthlyCompanyRows}
          mobileTypeByMonth={mobileTypeByMonth}
          mobileTypeByCompany={mobileTypeByCompany}
          mobileTypes={mobileTypes}
          rankings={rankings}
          callTypeMonthlyMix={callTypeMonthlyMix}
          callTypeSeries={CALL_TYPE_SERIES}
          stackedPercentLabel={StackedPercentLabel}
          callTypeMixTooltip={<CallTypeMixTooltip />}
          topTalkgroupDistribution={topTalkgroupDistribution}
          topCompanyTreemapData={topCompanyTreemapData}
          companyTreemapTile={<CompanyTreemapTile />}
          CompanyChartData={CompanyChartData}
        />
      )}

      {showKpiTab && (
        <>
          <SectionTitle
            id="Performance"
            eyebrow="2"
            title="Performance Dimensions: Deep Dive"
            text={`Calls, duration, and utilization dimensions in ${CompanyPeriodLabel}.`}
            collapsed={isSectionCollapsed("Performance")}
            onToggle={() => toggleSection("Performance")}
          />
          <section
            id="Performance-content"
            className={`chart-grid performance-chart-grid ${isSectionCollapsed("Performance") ? "section-content-collapsed" : ""}`}
          >
            <article className="chart-card performance-region region-radar-card">
              <h3>Regions Performance</h3>
              <p>
                Normalized view across calls, duration, peak hour, and TG
                activity.
              </p>
              <ResponsiveContainer width="100%" height={350}>
                <RadarChart data={regionRadarData} outerRadius="74%">
                  <PolarGrid stroke={CHART_COLORS.grid} strokeOpacity={0.48} />
                  <PolarAngleAxis
                    dataKey="metric"
                    tick={{
                      fill: CHART_COLORS.axis,
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={{ fill: CHART_COLORS.axis, fontSize: 10 }}
                    tickFormatter={(value) =>
                      `${formatDecimal(Number(value), 0)}%`
                    }
                  />
                  <Tooltip content={<RegionRadarTooltip />} />
                  {regionRadarSeries.map((series) => (
                    <Radar
                      key={series.key}
                      name={series.name}
                      dataKey={series.key}
                      stroke={series.color}
                      fill={series.color}
                      fillOpacity={0.16}
                      strokeWidth={2.4}
                      dot={{ r: 3, fill: series.color }}
                    />
                  ))}
                </RadarChart>
              </ResponsiveContainer>
              <ChartLegend
                items={regionRadarSeries.map((series) => ({
                  name: series.name,
                  color: series.color,
                }))}
              />
            </article>
            <article className="chart-card performance-month">
              <CallsDurationPerformanceChart
                title="Monthly Performance"
                data={rankings.month}
                gradientId="performanceMonth"
                xTickFormatter={shortMonthLabel}
              />
            </article>
            <article className="chart-card performance-company">
              <CallsDurationPerformanceChart
                title="Companies Performance"
                data={rankings.company}
                gradientId="performanceCompany"
              />
            </article>
            <article className="chart-card performance-talkgroup">
              <CallsDurationPerformanceChart
                title="Talkgroups Performance"
                data={rankings.talkgroup.slice(0, 12)}
                gradientId="performanceTalkgroup"
              />
            </article>
            <article className="chart-card performance-basestation">
              <CallsDurationPerformanceChart
                title="Base Stations Performance"
                data={rankings.station.slice(0, 12)}
                gradientId="performanceStation"
              />
            </article>
            <article className="chart-card performance-hour">
              <CallsDurationPerformanceChart
                title="Hours Performance"
                data={rankings.hour}
                gradientId="performanceHour"
                xTickFormatter={(v) => `${v ?? ""}`}
              />
            </article>
          </section>
        </>
      )}

      {false && showChartsTab && (
        <>
          <SectionTitle
            id="General"
            eyebrow="General"
            title={`General Charts in ${CompanyPeriodLabel}`}
            text="Monthly radio activity and source call attributes from the filtered CDR records."
            collapsed={isSectionCollapsed("General")}
            onToggle={() => toggleSection("General")}
          />
          <section
            id="General-content"
            className={`chart-grid dashboard-chart-grid general-chart-grid ${isSectionCollapsed("General") ? "section-content-collapsed" : ""}`}
          >
            <article className="chart-card general-mobile-type wide">
              <h3>Radio Type per Month</h3>
              <p>
                Total radios{" "}
                {formatNumber(
                  mobileTypeByMonth.reduce(
                    (s, r) => s + Number(r.total ?? 0),
                    0,
                  ),
                )}
              </p>
              <ChartLegend
                items={mobileTypes.map((type) => ({
                  name: type,
                  color: mobileTypeColor(type),
                }))}
              />
              <ResponsiveContainer width="100%" height={340}>
                <LineChart
                  data={mobileTypeByMonth}
                  margin={{ left: 0, right: 16, top: 14, bottom: 0 }}
                >
                  <CartesianGrid
                    stroke={CHART_COLORS.grid}
                    strokeDasharray="3 3"
                    opacity={0.32}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: CHART_COLORS.axis, fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    angle={-35}
                    textAnchor="end"
                    height={52}
                    tickMargin={8}
                    tickFormatter={shortMonthLabel}
                  />
                  <YAxis
                    tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => formatNumber(v)}
                    domain={[0, (dm: number) => Math.ceil(dm * 1.18)]}
                  />
                  <Tooltip
                    content={(props) => (
                      <MobileTypeTooltip {...props} mobileTypes={mobileTypes} />
                    )}
                  />
                  {mobileTypes.map((type) => (
                    <Line
                      key={type}
                      type="monotone"
                      dataKey={mobileTypeKey(type)}
                      name={type}
                      stroke={mobileTypeColor(type)}
                      strokeWidth={2.2}
                      dot={{ r: 3, fill: mobileTypeColor(type) }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </article>
            <article className="chart-card">
              <CallsDurationPerformanceChart
                title="Call Type"
                data={rankings.callType}
                gradientId="callTypePerformance"
              />
            </article>
            <article className="chart-card">
              <h3>Duplex Type</h3>
              <ResponsiveContainer width="100%" height={340}>
                <BarChart
                  data={rankings.duplexType}
                  margin={{ left: 0, right: 8, top: 18, bottom: 0 }}
                >
                  <CartesianGrid
                    stroke={CHART_COLORS.grid}
                    strokeDasharray="3 3"
                    opacity={0.32}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: CHART_COLORS.axis, fontSize: 10 }}
                    interval={0}
                    angle={-30}
                    textAnchor="end"
                    height={62}
                    tickFormatter={(v) => truncateLabel(v, 18)}
                  />
                  <YAxis
                    tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
                    tickFormatter={chartLabel}
                  />
                  <Tooltip
                    content={<CompanyPerformanceTooltip />}
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  />
                  <Bar
                    dataKey="durationSeconds"
                    name="Duration seconds"
                    fill={CHART_COLORS.duration}
                    radius={[8, 8, 0, 0]}
                    maxBarSize={58}
                  >
                    <LabelList
                      dataKey="durationSeconds"
                      content={TopValueLabel}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <ChartLegend
                items={[
                  { name: "Duration seconds", color: CHART_COLORS.duration },
                ]}
              />
            </article>

            <article className="chart-card">
              <CallsDurationPerformanceChart
                title="Call Priority"
                data={rankings.callPriority}
                gradientId="callPriorityPerformance"
              />
            </article>
            <article className="chart-card">
              <CallsDurationPerformanceChart
                title="Encrypted"
                data={rankings.encrypted}
                gradientId="encryptedPerformance"
              />
            </article>
          </section>
        </>
      )}

      {false && showChartsTab && (
        <>
          <SectionTitle
            id="Charts"
            eyebrow="Top 10"
            title={`Top 10 per Calls in ${CompanyPeriodLabel}`}
            text="Highest call contributors by company, base station, and talkgroup."
            collapsed={isSectionCollapsed("Charts")}
            onToggle={() => toggleSection("Charts")}
          />
          <section
            id="Charts-content"
            className={`chart-grid top-10-row ${isSectionCollapsed("Charts") ? "section-content-collapsed" : ""}`}
          >
            <article className="chart-card">
              <h3>Top Companies by Calls</h3>
              <ResponsiveContainer width="100%" height={340}>
                <BarChart
                  layout="vertical"
                  data={rankings.company.slice(0, 10)}
                  margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    stroke={CHART_COLORS.grid}
                    strokeDasharray="3 3"
                    opacity={0.32}
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={130}
                    tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
                    tickFormatter={(v) => truncateLabel(v, 18)}
                    interval={0}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(v: number) => formatNumber(v)}
                  />
                  <Bar dataKey="calls" fill={CHART_COLORS.usedGreen}>
                    <LabelList dataKey="calls" content={RightValueLabel} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <ChartLegend
                items={[{ name: "Calls", color: CHART_COLORS.usedGreen }]}
              />
            </article>
            <article className="chart-card">
              <h3>Top Base Stations by Calls</h3>
              <ResponsiveContainer width="100%" height={340}>
                <BarChart
                  layout="vertical"
                  data={rankings.station.slice(0, 10)}
                  margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    stroke={CHART_COLORS.grid}
                    strokeDasharray="3 3"
                    opacity={0.32}
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={140}
                    tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
                    tickFormatter={(v) => truncateLabel(v, 18)}
                    interval={0}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(v: number) => formatNumber(v)}
                  />
                  <Bar dataKey="calls" fill={CHART_COLORS.duration}>
                    <LabelList dataKey="calls" content={RightValueLabel} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <ChartLegend
                items={[{ name: "Calls", color: CHART_COLORS.duration }]}
              />
            </article>
            <article className="chart-card">
              <h3>Top Talkgroups by Calls</h3>
              <ResponsiveContainer width="100%" height={340}>
                <BarChart
                  layout="vertical"
                  data={rankings.talkgroup.slice(0, 10)}
                  margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    stroke={CHART_COLORS.grid}
                    strokeDasharray="3 3"
                    opacity={0.32}
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={140}
                    tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
                    tickFormatter={(v) => truncateLabel(v, 18)}
                    interval={0}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(v: number) => formatNumber(v)}
                  />
                  <Bar dataKey="calls" fill={CHART_COLORS.calls}>
                    <LabelList dataKey="calls" content={RightValueLabel} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <ChartLegend
                items={[{ name: "Calls", color: CHART_COLORS.calls }]}
              />
            </article>
          </section>
        </>
      )}

      {showCompanyTab && (
        <>
          <section
            id="users-content"
            className="behavior-grid company-behavior-grid"
          >
            <article className="table-card company-behavior-card">
              <h3>Radio Behavior Insights</h3>
              <div className="records-scroll small no-scroll-table fixed-row-table company-matrix-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Radio ID</th>
                      <th>Alias</th>
                      <th>Company</th>
                      <th>Calls</th>
                      <th>Duration</th>
                      <th>Avg Duration</th>
                      <th>TGs</th>
                      <th>BS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {radioBehaviorRows.map((item) => (
                      <tr key={item.radioId}>
                        <td>{item.radioId}</td>
                        <td>{item.alias}</td>
                        <td>{item.company}</td>
                        <td>{formatNumber(item.calls)}</td>
                        <td>{secondsToClock(item.durationSeconds)}</td>
                        <td>{secondsToClock(item.averageDuration)}</td>
                        <td>{formatNumber(item.talkgroups)}</td>
                        <td>{formatNumber(item.stations)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
            <article className="table-card user-behavior-table-card company-behavior-card">
              <h3>User Behavior Insights</h3>
              <div className="records-scroll small no-scroll-table fixed-row-table company-matrix-scroll">
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
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Calls</th>
                      <th>Duration</th>
                      <th>Avg Duration</th>
                      <th>Radios</th>
                      <th>TGs</th>
                      <th>BS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userBehaviorRows.map((item) => (
                      <tr key={item.name}>
                        <td>{item.name}</td>
                        <td>{formatNumber(item.calls)}</td>
                        <td>{secondsToClock(item.durationSeconds)}</td>
                        <td>{secondsToClock(item.averageDuration)}</td>
                        <td>{formatNumber(item.radios)}</td>
                        <td>{formatNumber(item.talkgroups)}</td>
                        <td>{formatNumber(item.stations)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </section>
        </>
      )}

      {isAddingMoreCdr && (
        <div className="loading-overlay" role="status" aria-live="polite">
          <div className="loading-card">
            <Activity size={28} />
            <strong
              style={{ fontSize: "1rem", fontWeight: 700, color: "var(--design-text)" }}
            >
              Merging additional CDR region...
            </strong>
            <span style={{ fontSize: "0.85rem", color: "var(--design-muted)" }}>
              The dashboard will refresh once the new records are added.
            </span>
          </div>
        </div>
      )}
      {error && <div className="toast error">{error}</div>}
    </main>
    {canOpenLocalSettings && (
      <LocalSettingsPanel
        settings={appSettings}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSaveSettings={handleSaveLocalSettings}
        onSaveCredential={handleSaveLocalCredential}
        canManageCredentials={isSystemAdmin}
        theme={theme}
        onThemeChange={setTheme}
      />
    )}
    </>
  );
}
