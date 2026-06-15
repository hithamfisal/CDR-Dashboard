import { memo, useCallback, useMemo, useState } from "react";
import { Download, Eye, FilePlus2, Search, Share2, Trash2 } from "lucide-react";
import { ExportButton, type ExportKind } from "./DashboardUi";
import { FilteredCallsRegister } from "./FilteredCallsRegister";
import type { CallRecord } from "../types/dashboard";

type ChartExportItem = {
  label: string;
  onClick: () => void;
};

type ReportAction = {
  id: string;
  group: string;
  label: string;
  kind: ExportKind;
  onClick: () => void | Promise<void>;
};

type GeneratedReport = {
  id: string;
  actionId: string;
  fileName: string;
  generatedAt: string;
  format: string;
  kind: ExportKind;
  blob?: Blob;
  fileUrl?: string;
  mimeType?: string;
};

type GeneratedFileEventDetail = {
  fileName: string;
  blob: Blob;
  mimeType?: string;
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
  onExportRowsXlsx: () => void;
  onExportRowsPdf: () => void;
  onExportKpiXlsx: () => void;
  onExportKpiPdf: () => void;
  onExportKpiPpt: () => void;
  onOpenCompanyContribution: () => void;
  onExportCompanyContributionXlsx: () => void;
  onExportCompanyContributionPdf: () => void;
  onExportCompanyContributionPpt: () => void;
  onExportRegionPerformanceXlsx: () => void;
  onExportRegionPerformancePdf: () => void;
  onExportTalkgroupEfficiencyXlsx: () => void;
  onExportTalkgroupEfficiencyPdf: () => void;
  onExportUtilizationXlsx: () => void;
  onExportUtilizationPdf: () => void;
  onExportUnmatchedFleetmapXlsx: () => void;
  onExportChartDataXlsx: () => void;
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

function safeFileName(label: string) {
  return label.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim();
}

function timestampForFile() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
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
        "Duplex Type",
        "Call Priority",
        "Encrypted",
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
  const [selectedReportId, setSelectedReportId] = useState(() => reportActions[0]?.id ?? "");
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([]);
  const [previewNotice, setPreviewNotice] = useState("");
  const [reportSearch, setReportSearch] = useState("");
  const selectedReport = reportActions.find((action) => action.id === selectedReportId) ?? reportActions[0];
  const visibleGeneratedReports = useMemo(() => {
    const query = reportSearch.trim().toLowerCase();
    if (!query) return generatedReports;
    return generatedReports.filter((report) => `${report.fileName} ${report.format} ${report.generatedAt}`.toLowerCase().includes(query));
  }, [generatedReports, reportSearch]);

  const runReportAction = useCallback(async (action: ReportAction) => {
    setPreviewNotice("");
    const generatedFilePromise = action.kind === "view"
      ? Promise.resolve(null)
      : waitForGeneratedFile(30000);
    try {
      await action.onClick();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown export error";
      setPreviewNotice(`${action.label} could not be generated. ${message}`);
      return;
    }
    const generatedFile = await generatedFilePromise;
    if (action.kind !== "view" && !generatedFile) {
      setPreviewNotice(`${action.label} was requested, but no generated file was captured. Try the export again after the dashboard finishes rendering.`);
      return;
    }
    const fileUrl = generatedFile?.blob ? URL.createObjectURL(generatedFile.blob) : undefined;
    const format = formatNameByKind[action.kind];
    const newReport: GeneratedReport = {
      id: `${action.id}-${Date.now()}`,
      actionId: action.id,
      fileName: generatedFile?.fileName ?? `${safeFileName(action.label)}.${timestampForFile()}.${fileExtensionByKind[action.kind]}`,
      generatedAt: timestampForDisplay(),
      format,
      kind: action.kind,
      blob: generatedFile?.blob,
      fileUrl,
      mimeType: generatedFile?.mimeType,
    };
    setGeneratedReports((current) => {
      const next = [newReport, ...current];
      next.slice(10).forEach((item) => {
        if (item.fileUrl) URL.revokeObjectURL(item.fileUrl);
      });
      return next.slice(0, 10);
    });
  }, []);

  const renderActionButton = (action: ReportAction) => (
    <ExportButton
      key={action.id}
      kind={action.kind}
      label={action.label}
      report={action.group}
      onClick={() => runReportAction(action)}
    />
  );

  const repeatGeneratedReport = (report: GeneratedReport) => {
    const action = reportActions.find((candidate) => candidate.id === report.actionId);
    if (action) void runReportAction(action);
  };

  const viewGeneratedReport = (report: GeneratedReport) => {
    const action = reportActions.find((candidate) => candidate.id === report.actionId);
    if (!action) return;
    if (action.kind === "view") {
      setPreviewNotice("");
      void action.onClick();
      return;
    }
    if (report.kind === "pdf" && report.fileUrl) {
      window.open(report.fileUrl, "_blank", "noopener,noreferrer");
      setPreviewNotice("");
      return;
    }
    if (report.kind === "xlsx" || report.kind === "ppt") {
      setPreviewNotice(`${report.fileName} is already in the generated reports list. A web browser cannot open Excel or PowerPoint files from your Downloads folder without downloading again. Open it from the browser downloads bar or Downloads folder. Native Open File can be added in the Electron desktop version.`);
      return;
    }
    setPreviewNotice(`${report.fileName} is not available as a browser-viewable file in this session. Use Download again if you need to regenerate it.`);
  };

  const shareGeneratedReport = async (report: GeneratedReport) => {
    const text = `${report.fileName} - generated ${report.generatedAt}`;
    if (navigator.share) {
      await navigator.share({ title: report.fileName, text });
      return;
    }
    await navigator.clipboard?.writeText(text);
  };

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
            <button className="generate-report-tile" type="button" onClick={() => selectedReport && runReportAction(selectedReport)}>
              <FilePlus2 size={28} />
              <span>Generate New Report</span>
            </button>

            <div className="report-generation-form">
              <h4>Report Generation Form</h4>
              <label>
                <span>Select Report Type</span>
                <select value={selectedReportId} onChange={(event) => setSelectedReportId(event.target.value)}>
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
                <input value={selectedReport ? formatNameByKind[selectedReport.kind] : "XLSX"} readOnly />
              </label>
            </div>
          </aside>

          <div className="generated-reports-panel">
            <div className="generated-reports-title">
              <h4>Generated Reports History</h4>
              <span>{reportSearch ? `${visibleGeneratedReports.length} / ${generatedReports.length}` : generatedReports.length} recent</span>
            </div>
            {previewNotice && <div className="generated-preview-notice">{previewNotice}</div>}
            <div className="generated-reports-table-wrap">
              <table className="generated-reports-table">
                <thead>
                  <tr><th>File Name</th><th>Generated Date</th><th>Format</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {visibleGeneratedReports.length === 0 ? (
                    <tr><td colSpan={4} className="generated-reports-empty">{generatedReports.length === 0 ? "No reports generated in this session yet." : "No generated reports match your search."}</td></tr>
                  ) : visibleGeneratedReports.map((report) => (
                    <tr key={report.id}>
                      <td>{report.fileName}</td>
                      <td>{report.generatedAt}</td>
                      <td>{report.format}</td>
                      <td>
                        <button type="button" className={!(report.kind === "view" || (report.kind === "pdf" && report.fileUrl)) ? "history-view-limited" : ""} onClick={() => viewGeneratedReport(report)} title={report.kind === "view" || (report.kind === "pdf" && report.fileUrl) ? "Open report" : "Open from Downloads folder"}><Eye size={15} /></button>
                        <button type="button" onClick={() => repeatGeneratedReport(report)} title="Download again"><Download size={15} /></button>
                        <button type="button" onClick={() => void shareGeneratedReport(report)} title="Share or copy name"><Share2 size={15} /></button>
                        <button type="button" onClick={() => setGeneratedReports((current) => {
                          if (report.fileUrl) URL.revokeObjectURL(report.fileUrl);
                          return current.filter((item) => item.id !== report.id);
                        })} title="Delete from history"><Trash2 size={15} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </article>

      <article className="table-card export-center-card reports-export-groups-hidden" aria-hidden="true">
        <h3>Export Groups</h3>
        <p className="table-note">Every button uses the same report action registry and carries data-report, data-format, and data-label attributes.</p>
        <div className="export-center-grid">
          {reportGroups.map((group) => (
            <div key={group.name} className={`export-center-subgroup ${group.name === "Combined" ? "export-center-subgroup-wide" : ""}`}>
              <h4>{group.name}</h4>
              <div className="export-center-actions">
                {group.actions.map(renderActionButton)}
              </div>
            </div>
          ))}
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
