import { memo } from "react";
import { ExportButton } from "./DashboardUi";
import { FilteredCallsRegister } from "./FilteredCallsRegister";
import type { CallRecord } from "../types/dashboard";

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
  onExportUtilizationXlsx: () => void;
  onExportUtilizationPdf: () => void;
  onExportUnmatchedFleetmapXlsx: () => void;
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
  onExportUtilizationXlsx,
  onExportUtilizationPdf,
  onExportUnmatchedFleetmapXlsx,
}: ReportsPanelProps) {
  return (
    <section id="reportsTabPanel" className="reports-tab-panel">
      <article className="table-card export-center-card">
        <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#e8f4ff" }}>Reports & Export Center</h3>
        <p className="table-note" style={{ fontSize: "0.85rem", color: "#8aafc8" }}>Export the current filtered dashboard view, KPI data, row register, utilization analysis, and unmatched fleetmap report.</p>
        <div className="export-center-actions">
          <ExportButton kind="xlsx" label="CDR Report" onClick={onExportRowsXlsx} />
          <ExportButton kind="pdf" label="CDR Report" onClick={onExportRowsPdf} />
          <ExportButton kind="view" label="CDR View" onClick={onToggleRegister} />
          <ExportButton kind="xlsx" label="KPI Report" onClick={onExportKpiXlsx} />
          <ExportButton kind="pdf" label="KPI Report" onClick={onExportKpiPdf} />
          <ExportButton kind="ppt" label="KPI Report" onClick={onExportKpiPpt} />
          <ExportButton kind="xlsx" label="Utilization Report" onClick={onExportUtilizationXlsx} />
          <ExportButton kind="pdf" label="Utilization Report" onClick={onExportUtilizationPdf} />
          <ExportButton kind="xlsx" label="Unmatched Report" onClick={onExportUnmatchedFleetmapXlsx} />
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
