import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { FilePlus2, FolderOpen, Save, Search, Trash2, X } from "lucide-react";
import type { ExportKind } from "./DashboardUi";
import { FilteredCallsRegister } from "./FilteredCallsRegister";
import type { CallRecord } from "../types/dashboard";

type ChartExportItem = {
  label: string;
  onClick: () => void | Promise<void>;
};

type ReportAction = {
  id: string;
  group: string;
  label: string;
  kind: ExportKind;
  onClick: () => void | Promise<void>;
};

type ReportPreset = {
  id: string;
  label: string;
  description: string;
  actionIds: string[] | "all";
};

type GeneratedReport = {
  id: string;
  fileName: string;
  generatedAt: string;
  format: string;
  savedPath?: string;
};

type GeneratedFileEventDetail = {
  fileName: string;
  blob: Blob;
  mimeType?: string;
};

type DownloadDirectoryState = {
  configured: boolean;
  directory: string;
  canBrowse: boolean;
  apiAvailable: boolean;
  isLoading: boolean;
  isSaving: boolean;
  message: string;
};

type DownloadDirectoryResponse = {
  ok?: boolean;
  configured: boolean;
  directory: string;
  canBrowse: boolean;
  updatedAt?: string;
  cancelled?: boolean;
};

type SaveGeneratedFileResponse = {
  ok: boolean;
  fileName: string;
  directory: string;
  filePath: string;
  size: number;
  savedAt: string;
};

type BrowserWritableFile = {
  write: (data: Blob | ArrayBuffer | string) => Promise<void>;
  close: () => Promise<void>;
};

type BrowserFileHandle = {
  createWritable: () => Promise<BrowserWritableFile>;
};

type BrowserDirectoryHandle = {
  name: string;
  queryPermission?: (descriptor: { mode: "readwrite" }) => Promise<PermissionState>;
  requestPermission?: (descriptor: { mode: "readwrite" }) => Promise<PermissionState>;
  getFileHandle: (name: string, options: { create: boolean }) => Promise<BrowserFileHandle>;
};

type BrowserDirectoryPickerWindow = Window & {
  showDirectoryPicker?: (options?: { mode?: "read" | "readwrite" }) => Promise<BrowserDirectoryHandle>;
};

type ReportsPanelProps = {
  showRegister: boolean;
  pagedRecords: CallRecord[];
  totalFiltered: number;
  totalRecords: number;
  page: number;
  pageCount: number;
  formatNumber: (value: number) => string;
  onToggleRegister: () => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onExportRowsXlsx: () => void | Promise<void>;
  onExportRowsPdf: () => void | Promise<void>;
  onExportKpiXlsx: () => void | Promise<void>;
  onExportKpiPdf: () => void | Promise<void>;
  onExportKpiPpt: () => void | Promise<void>;
  onOpenCompanyContribution: () => void;
  onExportCompanyContributionXlsx: () => void | Promise<void>;
  onExportCompanyContributionPdf: () => void | Promise<void>;
  onExportCompanyContributionPpt: () => void | Promise<void>;
  onExportRegionPerformanceXlsx: () => void | Promise<void>;
  onExportRegionPerformancePdf: () => void | Promise<void>;
  onExportTalkgroupEfficiencyXlsx: () => void | Promise<void>;
  onExportTalkgroupEfficiencyPdf: () => void | Promise<void>;
  onExportUtilizationXlsx: () => void | Promise<void>;
  onExportUtilizationPdf: () => void | Promise<void>;
  onExportUnmatchedFleetmapXlsx: () => void | Promise<void>;
  onExportChartDataXlsx: () => void | Promise<void>;
  chartExportItems: ChartExportItem[];
};

const formatNameByKind: Record<ExportKind, string> = {
  xlsx: "XLSX",
  pdf: "PDF",
  ppt: "PPTX",
  view: "VIEW",
  csv: "CSV",
  png: "PNG",
};

const fileExtensionByKind: Record<ExportKind, string> = {
  xlsx: "xlsx",
  pdf: "pdf",
  ppt: "pptx",
  view: "view",
  csv: "csv",
  png: "png",
};

const REPORT_PRESETS: ReportPreset[] = [
  {
    id: "single",
    label: "Single selected report",
    description: "Generate only the report selected below.",
    actionIds: [],
  },
  {
    id: "executive-summary",
    label: "Executive Summary Pack",
    description: "Filtered CDR register, KPI PDF, company contribution, and regional performance.",
    actionIds: ["cdr-register-pdf", "kpi-report-pdf", "company-contribution-pdf", "region-performance-pdf"],
  },
  {
    id: "kpi-pack",
    label: "KPI Pack",
    description: "KPI workbook, PDF, PPT, and the four KPI chart source exports.",
    actionIds: [
      "kpi-report-xlsx",
      "kpi-report-pdf",
      "kpi-report-ppt",
      "KPI-KPI Average Duration / Co.-xlsx",
      "KPI-KPI Calls and Duration / Co.-xlsx",
      "KPI-Monthly KPI-xlsx",
      "KPI-KPI Total Avg. Duration-xlsx",
    ],
  },
  {
    id: "operations-pack",
    label: "Operations Pack",
    description: "Fleetmap, radio/user behavior, busiest assets, radios, and busy-hour exports.",
    actionIds: [
      "unmatched-fleetmap-xlsx",
      "radio-user-behavior-xlsx",
      "radio-user-behavior-pdf",
      "Fleetmap & Users-Radios / Month-xlsx",
      "Fleetmap & Users-Radio Type / Month-xlsx",
      "Fleetmap & Users-Busy-hour profile-xlsx",
      "Fleetmap & Users-Top Companies / Calls-xlsx",
      "Fleetmap & Users-Top BS / Calls-xlsx",
      "Fleetmap & Users-Top TG / Calls-xlsx",
    ],
  },
  {
    id: "all-data",
    label: "Full Data Export Pack",
    description: "All available non-view report exports for the current filters.",
    actionIds: "all",
  },
];

const emptyDownloadDirectoryState: DownloadDirectoryState = {
  configured: false,
  directory: "",
  canBrowse: false,
  apiAvailable: true,
  isLoading: true,
  isSaving: false,
  message: "",
};

function getApiSessionToken() {
  const directToken = sessionStorage.getItem("cdr_mysql_session_token");
  if (directToken) return directToken;
  try {
    const session = JSON.parse(sessionStorage.getItem("cdr_portal_session") || "{}");
    return typeof session.token === "string" ? session.token : "";
  } catch {
    return "";
  }
}

async function reportApiJson<T>(url: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  const token = getApiSessionToken();
  if (token) headers.set("X-CDR-Session", token);
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers,
    });
  } catch {
    throw new Error("Report service is not reachable. Check that the API app is running before using server-folder exports.");
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof payload.error === "string" ? payload.error : `Report service request failed (${response.status}).`);
  }
  return payload as T;
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read generated file."));
    reader.readAsDataURL(blob);
  });
}

function triggerBrowserDownload(fileName: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}

async function saveGeneratedFileToApi(generatedFile: GeneratedFileEventDetail) {
  return reportApiJson<SaveGeneratedFileResponse>("/api/reports/save-generated-file", {
    method: "POST",
    body: JSON.stringify({
      fileName: generatedFile.fileName,
      mimeType: generatedFile.mimeType || generatedFile.blob.type,
      base64: await blobToBase64(generatedFile.blob),
    }),
  });
}

function safeFileName(label: string) {
  return label.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim();
}

function canUseBrowserDirectoryPicker() {
  if (typeof window === "undefined") return false;
  const pickerWindow = window as BrowserDirectoryPickerWindow;
  return Boolean(window.isSecureContext && pickerWindow.showDirectoryPicker);
}

async function saveGeneratedFileToBrowserDirectory(directoryHandle: BrowserDirectoryHandle, generatedFile: GeneratedFileEventDetail) {
  const permission = await directoryHandle.queryPermission?.({ mode: "readwrite" });
  if (permission !== "granted") {
    const requested = await directoryHandle.requestPermission?.({ mode: "readwrite" });
    if (requested !== "granted") {
      throw new Error("Folder write permission was not granted.");
    }
  }
  const fileName = safeFileName(generatedFile.fileName) || generatedFile.fileName;
  const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(generatedFile.blob);
  await writable.close();
  return {
    fileName,
    directory: directoryHandle.name,
    filePath: `${directoryHandle.name} / ${fileName}`,
    size: generatedFile.blob.size,
    savedAt: new Date().toISOString(),
  };
}

function timestampForFile() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}


function downloadFolderDisplay(report: Pick<GeneratedReport, "fileName" | "savedPath">) {
  return report.savedPath || `Downloads / ${report.fileName}`;
}

function timestampForDisplay() {
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());
}

function waitForGeneratedFile(timeoutMs = 12000) {
  return new Promise<GeneratedFileEventDetail | null>((resolve) => {
    let done = false;
    const cleanup = () => {
      window.removeEventListener("cdr-report-generated-file", onGenerated as EventListener);
      window.clearTimeout(timer);
    };
    const finish = (detail: GeneratedFileEventDetail | null) => {
      if (done) return;
      done = true;
      cleanup();
      resolve(detail);
    };
    const onGenerated = (event: CustomEvent<GeneratedFileEventDetail>) => finish(event.detail);
    const timer = window.setTimeout(() => finish(null), timeoutMs);
    window.addEventListener("cdr-report-generated-file", onGenerated as EventListener, { once: true });
  });
}

function ReportsPanelComponent({
  showRegister,
  pagedRecords,
  totalFiltered,
  totalRecords,
  page,
  pageCount,
  formatNumber,
  onToggleRegister,
  onPreviousPage,
  onNextPage,
  onExportRowsXlsx,
  onExportRowsPdf,
  onExportKpiXlsx,
  onExportKpiPdf,
  onExportKpiPpt,
  onOpenCompanyContribution,
  onExportCompanyContributionXlsx,
  onExportCompanyContributionPdf,
  onExportCompanyContributionPpt,
  onExportRegionPerformanceXlsx,
  onExportRegionPerformancePdf,
  onExportTalkgroupEfficiencyXlsx,
  onExportTalkgroupEfficiencyPdf,
  onExportUtilizationXlsx,
  onExportUtilizationPdf,
  onExportUnmatchedFleetmapXlsx,
  onExportChartDataXlsx,
  chartExportItems,
}: ReportsPanelProps) {
  const chartItemMap = useMemo(() => new Map(chartExportItems.map((item) => [item.label, item])), [chartExportItems]);

  const chartActions = useCallback((items: Array<string | { source: string; label: string }>, group: string): ReportAction[] => items
    .map((entry) => {
      const source = typeof entry === "string" ? entry : entry.source;
      const label = typeof entry === "string" ? entry : entry.label;
      const item = chartItemMap.get(source);
      return item ? { id: `${group}-${label}-xlsx`, group, label, kind: "xlsx" as ExportKind, onClick: item.onClick } : null;
    })
    .filter((item): item is ReportAction => Boolean(item)), [chartItemMap]);

  const reportGroups = useMemo(() => [
    {
      name: "CDR Register",
      actions: [
        { id: "cdr-register-xlsx", group: "CDR Register", label: "CDR Report", kind: "xlsx" as ExportKind, onClick: onExportRowsXlsx },
        { id: "cdr-register-pdf", group: "CDR Register", label: "CDR Report", kind: "pdf" as ExportKind, onClick: onExportRowsPdf },
        { id: "cdr-register-view", group: "CDR Register", label: "CDR View", kind: "view" as ExportKind, onClick: onToggleRegister },
      ],
    },
    {
      name: "KPI",
      actions: [
        { id: "kpi-report-xlsx", group: "KPI", label: "KPI Report", kind: "xlsx" as ExportKind, onClick: onExportKpiXlsx },
        { id: "kpi-report-pdf", group: "KPI", label: "KPI Report", kind: "pdf" as ExportKind, onClick: onExportKpiPdf },
        { id: "kpi-report-ppt", group: "KPI", label: "KPI Report", kind: "ppt" as ExportKind, onClick: onExportKpiPpt },
        ...chartActions([
          { source: "KPI Average Duration per Company", label: "KPI Average Duration / Co." },
          { source: "KPI Calls and Duration per Company", label: "KPI Calls and Duration / Co." },
          "Monthly KPI",
          "KPI Total Avg. Duration",
        ], "KPI"),
      ],
    },
    {
      name: "Companies",
      actions: [
        { id: "company-contribution-view", group: "Companies", label: "Co. Contribution", kind: "view" as ExportKind, onClick: onOpenCompanyContribution },
        { id: "company-contribution-xlsx", group: "Companies", label: "Co. Contribution", kind: "xlsx" as ExportKind, onClick: onExportCompanyContributionXlsx },
        { id: "company-contribution-pdf", group: "Companies", label: "Co. Contribution", kind: "pdf" as ExportKind, onClick: onExportCompanyContributionPdf },
        { id: "company-contribution-ppt", group: "Companies", label: "Co. Contribution", kind: "ppt" as ExportKind, onClick: onExportCompanyContributionPpt },
        ...chartActions([
          { source: "Total Calls per Company", label: "Total Calls / Co." },
          { source: "Total Duration per Company", label: "Total Duration / Co." },
          { source: "Calls and Duration per Company", label: "Calls and Duration / Co." },
          { source: "Radios per Company", label: "Radios / Co." },
          { source: "Radios Type per Company", label: "Radios Type / Co." },
          { source: "Talkgroups per Company", label: "TG / Co." },
        ], "Companies"),
      ],
    },
    {
      name: "Performance",
      actions: [
        { id: "region-performance-xlsx", group: "Performance", label: "Region Performance", kind: "xlsx" as ExportKind, onClick: onExportRegionPerformanceXlsx },
        { id: "region-performance-pdf", group: "Performance", label: "Region Performance", kind: "pdf" as ExportKind, onClick: onExportRegionPerformancePdf },
        { id: "tg-efficiency-xlsx", group: "Performance", label: "TG Efficiency", kind: "xlsx" as ExportKind, onClick: onExportTalkgroupEfficiencyXlsx },
        { id: "tg-efficiency-pdf", group: "Performance", label: "TG Efficiency", kind: "pdf" as ExportKind, onClick: onExportTalkgroupEfficiencyPdf },
        ...chartActions([
          "Monthly Performance",
          "Region Performance",
          { source: "Base Station Performance", label: "BS Performance" },
          { source: "Company Calls & Duration Performance", label: "Co. Performance" },
          { source: "Talkgroup Performance", label: "TG Performance" },
          "Radio Type Performance",
          "Hour Performance",
        ], "Performance"),
      ],
    },
    {
      name: "Fleetmap & Users",
      actions: [
        { id: "unmatched-fleetmap-xlsx", group: "Fleetmap & Users", label: "Unmatched Fleetmap", kind: "xlsx" as ExportKind, onClick: onExportUnmatchedFleetmapXlsx },
        { id: "radio-user-behavior-xlsx", group: "Fleetmap & Users", label: "Radio & User Behavior", kind: "xlsx" as ExportKind, onClick: onExportUtilizationXlsx },
        { id: "radio-user-behavior-pdf", group: "Fleetmap & Users", label: "Radio & User Behavior", kind: "pdf" as ExportKind, onClick: onExportUtilizationPdf },
        ...chartActions([
          { source: "Radios per Month", label: "Radios / Month" },
          { source: "Radio Type per Month", label: "Radio Type / Month" },
          "Busy-hour profile",
          { source: "Top Companies by Calls", label: "Top Companies / Calls" },
          { source: "Top Base Stations by Calls", label: "Top BS / Calls" },
          { source: "Top Talkgroups by Calls", label: "Top TG / Calls" },
        ], "Fleetmap & Users"),
      ],
    },
    {
      name: "Call Attributes",
      actions: chartActions([
        { source: "Calls per Month", label: "Calls / Month" },
        "Call Type",
        "Call Type Distribution",
        "Duplex Type",
        "Call Priority",
        "Encrypted",
        { source: "Call Distribution by TG", label: "Call Distribution / TG" },
      ], "Call Attributes"),
    },
    {
      name: "Combined",
      actions: [
        { id: "all-charts-data-xlsx", group: "Combined", label: "All Charts Data", kind: "xlsx" as ExportKind, onClick: onExportChartDataXlsx },
      ],
    },
  ], [
    chartActions,
    onExportChartDataXlsx,
    onExportCompanyContributionPdf,
    onExportCompanyContributionPpt,
    onExportCompanyContributionXlsx,
    onExportKpiPdf,
    onExportKpiPpt,
    onExportKpiXlsx,
    onExportRegionPerformancePdf,
    onExportRegionPerformanceXlsx,
    onExportRowsPdf,
    onExportRowsXlsx,
    onExportTalkgroupEfficiencyPdf,
    onExportTalkgroupEfficiencyXlsx,
    onExportUnmatchedFleetmapXlsx,
    onExportUtilizationPdf,
    onExportUtilizationXlsx,
    onOpenCompanyContribution,
    onToggleRegister,
  ]);

  const reportActions = useMemo(() => reportGroups.flatMap((group) => group.actions), [reportGroups]);
  const reportActionById = useMemo(() => new Map(reportActions.map((action) => [action.id, action])), [reportActions]);
  const reportPresetOptions = useMemo(() => REPORT_PRESETS.map((preset) => {
    const actionIds = preset.actionIds === "all"
      ? reportActions.filter((action) => action.kind !== "view").map((action) => action.id)
      : preset.actionIds.filter((id) => reportActionById.has(id));
    return { ...preset, actionIds };
  }), [reportActionById, reportActions]);
  const [selectedReportId, setSelectedReportId] = useState(() => reportActions[0]?.id ?? "");
  const [selectedPresetId, setSelectedPresetId] = useState("single");
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([]);
  const [previewNotice, setPreviewNotice] = useState("");
  const [reportSearch, setReportSearch] = useState("");
  const [generatingReportId, setGeneratingReportId] = useState("");
  const [downloadDirectory, setDownloadDirectory] = useState<DownloadDirectoryState>(emptyDownloadDirectoryState);
  const [downloadDirectoryInput, setDownloadDirectoryInput] = useState("");
  const [browserDirectoryHandle, setBrowserDirectoryHandle] = useState<BrowserDirectoryHandle | null>(null);
  const browserDirectoryPickerAvailable = canUseBrowserDirectoryPicker();
  const downloadDirectoryDisplay = browserDirectoryHandle?.name || downloadDirectoryInput;
  const selectedReport = reportActions.find((action) => action.id === selectedReportId) ?? reportActions[0];
  const selectedPreset = reportPresetOptions.find((preset) => preset.id === selectedPresetId) ?? reportPresetOptions[0];
  const selectedPresetActions = selectedPreset && selectedPreset.id !== "single"
    ? selectedPreset.actionIds.map((id) => reportActionById.get(id)).filter((action): action is ReportAction => Boolean(action))
    : [];
  const visibleGeneratedReports = useMemo(() => {
    const query = reportSearch.trim().toLowerCase();
    if (!query) return generatedReports;
    return generatedReports.filter((report) => `${report.fileName} ${downloadFolderDisplay(report)} ${report.format} ${report.generatedAt}`.toLowerCase().includes(query));
  }, [generatedReports, reportSearch]);

  useEffect(() => {
    if (!selectedReportId || reportActionById.has(selectedReportId)) return;
    setSelectedReportId(reportActions[0]?.id ?? "");
  }, [reportActionById, reportActions, selectedReportId]);

  const loadDownloadDirectory = useCallback(async () => {
    try {
      const payload = await reportApiJson<DownloadDirectoryResponse>("/api/reports/download-directory");
      setDownloadDirectory({
        configured: Boolean(payload.configured && payload.directory),
        directory: payload.directory || "",
        canBrowse: Boolean(payload.canBrowse),
        apiAvailable: true,
        isLoading: false,
        isSaving: false,
        message: payload.directory
          ? "API folder is active for report exports."
          : browserDirectoryPickerAvailable
            ? "No API folder selected. Use Browse to choose a local folder, or reports use normal browser downloads."
            : "No API folder selected. Reports use normal browser downloads.",
      });
      setDownloadDirectoryInput(payload.directory || "");
      setBrowserDirectoryHandle(null);
    } catch (error) {
      setDownloadDirectory({
        ...emptyDownloadDirectoryState,
        apiAvailable: false,
        isLoading: false,
        message: browserDirectoryPickerAvailable
          ? "Local folder API is unavailable. Use Browse to choose a local browser folder."
          : error instanceof Error ? error.message : "Local report folder API is unavailable.",
      });
    }
  }, [browserDirectoryPickerAvailable]);

  useEffect(() => {
    void loadDownloadDirectory();
  }, [loadDownloadDirectory]);

  const saveDownloadDirectory = useCallback(async () => {
    setDownloadDirectory((current) => ({ ...current, isSaving: true, message: "Saving report folder..." }));
    try {
      const payload = await reportApiJson<DownloadDirectoryResponse>("/api/reports/download-directory", {
        method: "POST",
        body: JSON.stringify({ directory: downloadDirectoryInput }),
      });
      setDownloadDirectory({
        configured: Boolean(payload.configured && payload.directory),
        directory: payload.directory || "",
        canBrowse: Boolean(payload.canBrowse),
        apiAvailable: true,
        isLoading: false,
        isSaving: false,
        message: payload.directory ? "Reports will be saved to the selected API folder." : "No API folder selected.",
      });
      setDownloadDirectoryInput(payload.directory || "");
      setBrowserDirectoryHandle(null);
    } catch (error) {
      setDownloadDirectory((current) => ({
        ...current,
        isSaving: false,
        message: error instanceof Error ? error.message : "Could not save report folder.",
      }));
    }
  }, [downloadDirectoryInput]);

  const browseDownloadDirectory = useCallback(async () => {
    setDownloadDirectory((current) => ({ ...current, isSaving: true, message: "Waiting for folder selection..." }));
    try {
      if (browserDirectoryPickerAvailable) {
        const pickerWindow = window as BrowserDirectoryPickerWindow;
        const directoryHandle = await pickerWindow.showDirectoryPicker?.({ mode: "readwrite" });
        if (!directoryHandle) {
          setDownloadDirectory((current) => ({ ...current, isSaving: false, message: "Folder selection was cancelled." }));
          return;
        }
        setBrowserDirectoryHandle(directoryHandle);
        setDownloadDirectory((current) => ({
          ...current,
          configured: false,
          isLoading: false,
          isSaving: false,
          message: `Browser folder selected: ${directoryHandle.name}. Reports will be written there directly.`,
        }));
        setDownloadDirectoryInput(directoryHandle.name);
        return;
      }
      if (!downloadDirectory.apiAvailable || !downloadDirectory.canBrowse) {
        setDownloadDirectory((current) => ({
          ...current,
          isSaving: false,
          message: "Folder browsing is not available in this browser/session. If you are online, the website cannot open your PC folders unless the browser folder picker is supported. Use the normal browser Downloads folder, or run the desktop/local API version.",
        }));
        return;
      }
      const payload = await reportApiJson<DownloadDirectoryResponse>("/api/reports/download-directory/browse", {
        method: "POST",
        body: JSON.stringify({ currentDirectory: downloadDirectoryInput || downloadDirectory.directory }),
      });
      if (payload.cancelled) {
        setDownloadDirectory((current) => ({ ...current, isSaving: false, message: "Folder selection was cancelled." }));
        return;
      }
      setDownloadDirectory({
        configured: Boolean(payload.configured && payload.directory),
        directory: payload.directory || "",
        canBrowse: Boolean(payload.canBrowse),
        apiAvailable: true,
        isLoading: false,
        isSaving: false,
        message: payload.directory ? "Reports will be saved to the selected API folder." : "No API folder selected.",
      });
      setDownloadDirectoryInput(payload.directory || "");
    } catch (error) {
      setDownloadDirectory((current) => ({
        ...current,
        isSaving: false,
        message: error instanceof Error ? error.message : "Could not open the folder picker.",
      }));
    }
  }, [browserDirectoryPickerAvailable, downloadDirectory.directory, downloadDirectoryInput]);

  const clearDownloadDirectory = useCallback(async () => {
    setDownloadDirectory((current) => ({ ...current, isSaving: true, message: "Clearing report folder..." }));
    try {
      const payload = await reportApiJson<DownloadDirectoryResponse>("/api/reports/download-directory/clear", {
        method: "POST",
        body: JSON.stringify({}),
      });
      setDownloadDirectory({
        configured: false,
        directory: "",
        canBrowse: Boolean(payload.canBrowse),
        apiAvailable: true,
        isLoading: false,
        isSaving: false,
        message: browserDirectoryPickerAvailable
          ? "API folder cleared. Use Browse to choose a local folder, or reports use normal browser downloads."
          : "API folder cleared. Reports use normal browser downloads.",
      });
      setDownloadDirectoryInput("");
      setBrowserDirectoryHandle(null);
    } catch (error) {
      setDownloadDirectory((current) => ({
        ...current,
        isSaving: false,
        message: error instanceof Error ? error.message : "Could not clear report folder.",
      }));
    }
  }, [browserDirectoryPickerAvailable]);

  const clearGeneratedReportsHistory = useCallback(() => {
    setGeneratedReports([]);
    setPreviewNotice("");
  }, []);

  const runReportAction = useCallback(async (action: ReportAction) => {
    if (generatingReportId) return;
    setGeneratingReportId(action.id);
    setPreviewNotice("");
    const shouldUseBrowserDirectory = action.kind !== "view" && Boolean(browserDirectoryHandle);
    const shouldUseApiDirectory = action.kind !== "view" && !shouldUseBrowserDirectory && downloadDirectory.configured && Boolean(downloadDirectory.directory);
    const generatedFilePromise = action.kind === "view"
      ? Promise.resolve(null)
      : waitForGeneratedFile(30000);
    const reportWindow = window as Window & { __cdrSuppressBrowserDownload?: boolean };
    const previousSuppressDownload = reportWindow.__cdrSuppressBrowserDownload;
    try {
      if (shouldUseBrowserDirectory || shouldUseApiDirectory) reportWindow.__cdrSuppressBrowserDownload = true;
      await action.onClick();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown export error";
      setPreviewNotice(`${action.label} could not be generated. ${message}`);
      setGeneratingReportId("");
      return;
    } finally {
      reportWindow.__cdrSuppressBrowserDownload = previousSuppressDownload;
    }
    const generatedFile = await generatedFilePromise;
    if (action.kind !== "view" && !generatedFile) {
      setPreviewNotice(`${action.label} was requested, but no generated file was captured. Try the export again after the dashboard finishes rendering.`);
      setGeneratingReportId("");
      return;
    }
    let apiSave: SaveGeneratedFileResponse | null = null;
    let browserSave: Awaited<ReturnType<typeof saveGeneratedFileToBrowserDirectory>> | null = null;
    let apiSaveError = "";
    let browserSaveError = "";
    if (generatedFile?.blob && shouldUseBrowserDirectory && browserDirectoryHandle) {
      try {
        browserSave = await saveGeneratedFileToBrowserDirectory(browserDirectoryHandle, generatedFile);
      } catch (error) {
        browserSaveError = error instanceof Error ? error.message : "The browser folder save failed.";
        triggerBrowserDownload(generatedFile.fileName, generatedFile.blob);
      }
    } else if (generatedFile?.blob && shouldUseApiDirectory) {
      try {
        apiSave = await saveGeneratedFileToApi(generatedFile);
      } catch (error) {
        apiSaveError = error instanceof Error ? error.message : "The API folder save failed.";
        triggerBrowserDownload(generatedFile.fileName, generatedFile.blob);
      }
    }
    const format = formatNameByKind[action.kind];
    const fileName = browserSave?.fileName ?? apiSave?.fileName ?? generatedFile?.fileName ?? `${safeFileName(action.label)}.${timestampForFile()}.${fileExtensionByKind[action.kind]}`;
    const newReport: GeneratedReport = {
      id: `${action.id}-${Date.now()}`,
      fileName,
      generatedAt: timestampForDisplay(),
      format,
      savedPath: browserSave?.filePath ?? apiSave?.filePath,
    };
    setGeneratedReports((current) => {
      const next = [newReport, ...current];
      return next.slice(0, 10);
    });
    if (browserSave?.filePath) {
      setPreviewNotice(`${newReport.fileName} saved to ${browserSave.filePath}.`);
    } else if (apiSave?.filePath) {
      setPreviewNotice(`${newReport.fileName} saved to ${apiSave.filePath}.`);
    } else if (browserSaveError) {
      setPreviewNotice(`${newReport.fileName} generated, but browser folder save failed: ${browserSaveError}. Normal browser download was used instead.`);
    } else if (apiSaveError) {
      setPreviewNotice(`${newReport.fileName} generated, but API folder save failed: ${apiSaveError}. Normal browser download was used instead.`);
    } else {
      setPreviewNotice(`${newReport.fileName} generated successfully.`);
    }
    setGeneratingReportId("");
  }, [browserDirectoryHandle, downloadDirectory.configured, downloadDirectory.directory, generatingReportId]);

  const runSelectedReport = useCallback(async () => {
    if (generatingReportId) return;
    if (selectedPresetActions.length > 0) {
      for (const action of selectedPresetActions) {
        await runReportAction(action);
      }
      setPreviewNotice(`${selectedPreset.label} completed with ${selectedPresetActions.length} generated file${selectedPresetActions.length === 1 ? "" : "s"}.`);
      return;
    }
    if (selectedReport) await runReportAction(selectedReport);
  }, [generatingReportId, runReportAction, selectedPreset.label, selectedPresetActions, selectedReport]);

  return (
    <section id="reportsTabPanel" className="reports-tab-panel">
      <article className="table-card report-management-card">
        <div className="report-management-header">
          <div>
            <h3>Report Management Center</h3>
            <p>Generate filtered reports, preview CDR records, and keep recent export actions in one place.</p>
          </div>
          <label className="report-search-box">
            <Search size={16} />
            <input type="search" placeholder="Search reports" aria-label="Search reports" value={reportSearch} onChange={(event) => setReportSearch(event.target.value)} />
          </label>
        </div>

        <div className="report-management-grid">
          <aside className="report-generator-panel">
            <button className="generate-report-tile" type="button" disabled={Boolean(generatingReportId)} onClick={() => void runSelectedReport()}>
              <FilePlus2 size={28} />
              <span>{generatingReportId ? "Generating Report..." : selectedPresetActions.length > 0 ? "Generate Report Pack" : "Generate New Report"}</span>
            </button>

            <div className="report-generation-form">
              <h4>Report Generation Form</h4>
              <label>
                <span>Report Preset</span>
                <select value={selectedPresetId} onChange={(event) => setSelectedPresetId(event.target.value)}>
                  {reportPresetOptions.map((preset) => (
                    <option key={preset.id} value={preset.id}>{preset.label}</option>
                  ))}
                </select>
                <small>{selectedPreset.description}</small>
              </label>
              <label>
                <span>Select Report Type</span>
                <select value={selectedReportId} onChange={(event) => setSelectedReportId(event.target.value)} disabled={selectedPresetActions.length > 0}>
                  {reportGroups.map((group) => (
                    <optgroup key={group.name} label={group.name}>
                      {group.actions.map((action) => <option key={action.id} value={action.id}>{action.label} - {formatNameByKind[action.kind]}</option>)}
                    </optgroup>
                  ))}
                </select>
              </label>
              <label>
                <span>Filtered Records</span>
                <input value={`${formatNumber(totalFiltered)} from ${formatNumber(totalRecords)}`} readOnly />
              </label>
              <label>
                <span>Output Format</span>
                <input value={selectedPresetActions.length > 0 ? `${selectedPresetActions.length} files` : selectedReport ? formatNameByKind[selectedReport.kind] : "XLSX"} readOnly />
              </label>
              <div className="report-download-directory">
                <label>
                  <span>Download Directory</span>
                  <div className="report-directory-row">
                    <input
                      value={downloadDirectoryDisplay}
                      onChange={(event) => {
                        setBrowserDirectoryHandle(null);
                        setDownloadDirectoryInput(event.target.value);
                      }}
                      placeholder={browserDirectoryPickerAvailable ? "Use Browse for a PC folder, or type an API server path" : downloadDirectory.apiAvailable ? "Example: D:\\Reports\\CDR" : "Local report folder API is unavailable"}
                      disabled={downloadDirectory.isSaving}
                    />
                    <button
                      type="button"
                      className="report-directory-button"
                      onClick={() => void browseDownloadDirectory()}
                      disabled={downloadDirectory.isSaving}
                      title={browserDirectoryPickerAvailable ? "Choose a local report folder in this browser" : downloadDirectory.canBrowse ? "Browse for report folder" : "Click to check folder picker availability"}
                    >
                      <FolderOpen size={15} />
                      <span>Browse</span>
                    </button>
                  </div>
                </label>
                <div className="report-directory-actions">
                  <button
                    type="button"
                    className="report-directory-button"
                    onClick={() => void saveDownloadDirectory()}
                    disabled={Boolean(browserDirectoryHandle) || !downloadDirectory.apiAvailable || !downloadDirectoryInput.trim() || downloadDirectory.isSaving}
                    title={browserDirectoryHandle ? "Browser-selected folders are already active and do not need Save" : "Save API/server folder path"}
                  >
                    <Save size={15} />
                    <span>Save</span>
                  </button>
                  <button
                    type="button"
                    className="report-directory-button"
                    onClick={() => void clearDownloadDirectory()}
                    disabled={downloadDirectory.isSaving}
                  >
                    <X size={15} />
                    <span>Clear</span>
                  </button>
                </div>
                <p className={`report-directory-status ${downloadDirectory.configured ? "is-configured" : ""}`}>
                  {downloadDirectory.isLoading ? "Checking local report folder API..." : downloadDirectory.message}
                </p>
              </div>
            </div>
          </aside>

          <div className="generated-reports-panel">
            <div className="generated-reports-title">
              <div className="generated-reports-title-copy">
                <h4>Generated Reports History</h4>
                <p className="generated-reports-note">
                  {browserDirectoryHandle
                    ? `Generated files are saved to the browser-selected folder: ${browserDirectoryHandle.name}.`
                    : downloadDirectory.configured
                    ? `Generated files are saved by the local API to ${downloadDirectory.directory}.`
                    : "Generated files are saved by your browser to the Downloads folder."}
                </p>
              </div>
              <div className="generated-reports-title-actions">
                <span>{reportSearch ? `${visibleGeneratedReports.length} / ${generatedReports.length}` : generatedReports.length} recent</span>
                <button
                  type="button"
                  className="clear-history-button"
                  disabled={generatedReports.length === 0 || Boolean(generatingReportId)}
                  onClick={clearGeneratedReportsHistory}
                  title={generatedReports.length === 0 ? "No generated reports to clear" : "Clear generated reports history"}
                >
                  <Trash2 size={14} />
                  <span>Clear History</span>
                </button>
              </div>
            </div>
            {previewNotice && <div className="generated-preview-notice">{previewNotice}</div>}
            <div className="generated-reports-table-wrap">
              <table className="generated-reports-table">
                <thead>
                  <tr><th>File Name</th><th>Generated Date</th><th>Format</th></tr>
                </thead>
                <tbody>
                  {visibleGeneratedReports.length === 0 ? (
                    <tr><td colSpan={3} className="generated-reports-empty">{generatedReports.length === 0 ? "No reports generated in this session yet." : "No generated reports match your search."}</td></tr>
                  ) : visibleGeneratedReports.map((report) => (
                    <tr key={report.id}>
                      <td>{report.fileName}</td>
                      <td>{report.generatedAt}</td>
                      <td>{report.format}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </article>

      {showRegister && (
        <FilteredCallsRegister
          id="reports-cdr-register"
          records={pagedRecords}
          totalFiltered={totalFiltered}
          totalRecords={totalRecords}
          page={page}
          pageCount={pageCount}
          showTopButton
          formatNumber={formatNumber}
          onPreviousPage={onPreviousPage}
          onNextPage={onNextPage}
        />
      )}
    </section>
  );
}

export const ReportsPanel = memo(ReportsPanelComponent);
