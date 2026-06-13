import { memo } from "react";
import { ExportButton } from "./DashboardUi";
import { FilteredCallsRegister } from "./FilteredCallsRegister";
import type { CallRecord } from "../types/dashboard";

type ChartExportItem = {
  label: string;
  onClick: () => void;
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
  const chartItemMap = new Map(chartExportItems.map((item) => [item.label, item]));
  const renderChartItems = (items: Array<string | { source: string; label: string }>) => items
    .map((entry) => {
      const source = typeof entry === "string" ? entry : entry.source;
      const label = typeof entry === "string" ? entry : entry.label;
      const item = chartItemMap.get(source);
      return item ? { ...item, label } : null;
    })
    .filter((item): item is ChartExportItem => Boolean(item))
    .map((item) => <ExportButton key={item.label} kind="xlsx" label={item.label} onClick={item.onClick} />);

  return (
    <section id="reportsTabPanel" className="reports-tab-panel">
      <article className="table-card export-center-card">
        <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#e8f4ff" }}>Reports & Export Center</h3>
        <p className="table-note" style={{ fontSize: "0.85rem", color: "#8aafc8" }}>Export the current filtered dashboard view, KPI data, row register, utilization analysis, and unmatched fleetmap report.</p>
        <div className="export-center-grid">
          <div className="export-center-subgroup">
            <h4>CDR Register</h4>
            <div className="export-center-actions">
              <ExportButton kind="xlsx" label="CDR Report" onClick={onExportRowsXlsx} />
              <ExportButton kind="pdf" label="CDR Report" onClick={onExportRowsPdf} />
              <ExportButton kind="view" label="CDR View" onClick={onToggleRegister} />
            </div>
          </div>

          <div className="export-center-subgroup">
            <h4>KPI</h4>
            <div className="export-center-actions">
              <ExportButton kind="xlsx" label="KPI Report" onClick={onExportKpiXlsx} />
              <ExportButton kind="pdf" label="KPI Report" onClick={onExportKpiPdf} />
              <ExportButton kind="ppt" label="KPI Report" onClick={onExportKpiPpt} />
              {renderChartItems([
                { source: "KPI Average Duration per Company", label: "KPI Average Duration / Co." },
                { source: "KPI Calls and Duration per Company", label: "KPI Calls and Duration / Co." },
                "Monthly KPI",
                "KPI Total Avg. Duration",
              ])}
            </div>
          </div>

          <div className="export-center-subgroup">
            <h4>Companies</h4>
            <div className="export-center-actions">
              <ExportButton kind="view" label="Co. Contribution" onClick={onOpenCompanyContribution} />
              <ExportButton kind="xlsx" label="Co. Contribution" onClick={onExportCompanyContributionXlsx} />
              <ExportButton kind="pdf" label="Co. Contribution" onClick={onExportCompanyContributionPdf} />
              <ExportButton kind="ppt" label="Co. Contribution" onClick={onExportCompanyContributionPpt} />
              {renderChartItems([
                { source: "Total Calls per Company", label: "Total Calls / Co." },
                { source: "Total Duration per Company", label: "Total Duration / Co." },
                { source: "Calls and Duration per Company", label: "Calls and Duration / Co." },                
                { source: "Radios per Company", label: "Radios / Co." },
                { source: "Radios Type per Company", label: "Radios Type / Co." },
                { source: "Talkgroups per Company", label: "TG / Co." },
                
              ])}
            </div>
          </div>

          <div className="export-center-subgroup">
            <h4>Performance</h4>
            <div className="export-center-actions">
              <ExportButton kind="xlsx" label="Region Performance" onClick={onExportRegionPerformanceXlsx} />
              <ExportButton kind="pdf" label="Region Performance" onClick={onExportRegionPerformancePdf} />
              <ExportButton kind="xlsx" label="TG Efficiency" onClick={onExportTalkgroupEfficiencyXlsx} />
              <ExportButton kind="pdf" label="TG Efficiency" onClick={onExportTalkgroupEfficiencyPdf} />
              {renderChartItems([
                "Monthly Performance",
                "Region  Performance",
                { source: "Base Station Performance", label: "BS Performance" },
                { source: "Company Calls & Duration Performance", label: "Co. Performance" },
                { source: "Talkgroup Performance", label: "TG Performance" },
                "Radio Type Performance",
                "Hour Performance",
              ])}
            </div>
          </div>

          <div className="export-center-subgroup">
            <h4>Fleetmap & Users</h4>
            <div className="export-center-actions">
              <ExportButton kind="xlsx" label="Unmatched Fleetmap" onClick={onExportUnmatchedFleetmapXlsx} />
              <ExportButton kind="xlsx" label="Radio & User Behavior" onClick={onExportUtilizationXlsx} />
              <ExportButton kind="pdf" label="Radio & User Behavior" onClick={onExportUtilizationPdf} />
              {renderChartItems([
                { source: "Radios per Month", label: "Radios / Month" },
                { source: "Radio Type per Month", label: "Radio Type / Month" },
                "Busy-hour profile",
                { source: "Top Companies by Calls", label: "Top Companies / Calls" },
                { source: "Top Base Stations by Calls", label: "Top BS / Calls" },
                { source: "Top Talkgroups by Calls", label: "Top TG / Calls" },
              ])}
            </div>
          </div>

          <div className="export-center-subgroup">
            <h4>Call Attributes</h4>
            <div className="export-center-actions">
              {renderChartItems([
                { source: "Calls per Month", label: "Calls / Month" },
                "Call Type",
                "Duplex Type",
                "Call Priority",
                "Encrypted",
              ])}
            </div>
          </div>

          <div className="export-center-subgroup export-center-subgroup-wide">
            <h4>Combined</h4>
            <div className="export-center-actions">
              <ExportButton kind="xlsx" label="All Charts Data" onClick={onExportChartDataXlsx} />
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
