import { type ChangeEvent } from "react";
import type { FleetmapState, SavedWorkbookMeta, StagedTrafficUpload, ThemeName } from "../types/dashboard";
import { Activity, FileSpreadsheet, FileText, HardDrive, Palette, Radio, UploadCloud, Users, X } from "lucide-react";


type UploadViewProps = {
  onUploadCdr: (event: ChangeEvent<HTMLInputElement>) => void;
  onUploadRawSystem: (event: ChangeEvent<HTMLInputElement>) => void;
  onUploadMasterFleetmap: (event: ChangeEvent<HTMLInputElement>) => void;
  onUploadFixedFleetmap: (event: ChangeEvent<HTMLInputElement>) => void;
  onLoadSaved: () => void;
  onConfirmUpload: () => void;
  onClearStagedUpload: () => void;
  savedWorkbook: SavedWorkbookMeta | null;
  stagedTrafficUpload: StagedTrafficUpload;
  masterFleetmap: FleetmapState;
  fixedFleetmap: FleetmapState;
  isParsing: boolean;
  isLoadingSaved: boolean;
  error: string;
  theme: ThemeName;
  onToggleTheme: () => void;
  formatNumber: (value: number) => string;
};

function themeClass(theme: ThemeName) {
  return theme === "dark" ? "dark-background-theme" : "light-background-theme";
}

export function UploadView({
  onUploadCdr,
  onUploadRawSystem,
  onUploadMasterFleetmap,
  onUploadFixedFleetmap,
  onLoadSaved,
  onConfirmUpload,
  onClearStagedUpload,
  savedWorkbook,
  stagedTrafficUpload,
  masterFleetmap,
  fixedFleetmap,
  isParsing,
  isLoadingSaved,
  error,
  theme,
  onToggleTheme,
  formatNumber,
}: UploadViewProps) {
  const stagedCount = stagedTrafficUpload?.files.length ?? 0;
  const stagedKind = stagedTrafficUpload?.mode === "raw" ? "raw call log" : "CDR workbook";
  const stagedNames = stagedTrafficUpload?.files.map((file) => file.name).join(", ") ?? "";

  return (
    <main className={`upload-shell ${themeClass(theme)}`}>
      <section className="followup-upload-shell">
        <div className="followup-upload-card">
          <button className="followup-theme-button" type="button" onClick={onToggleTheme}>
            <Palette size={16} />
            {theme === "dark" ? "Dark Theme" : "Light Theme"}
          </button>

          <div className="followup-upload-left">
            <p className="followup-eyebrow"><UploadCloud size={14} /> CDR WORKBOOKS UPLOAD</p>
            <h1><span>Load the CDR Traffic Workbook</span></h1>
            <p className="followup-lead">
              Start with Master and Fixed Fleetmap, then upload processed CDR files or raw system call logs.
            </p>

            <div className="followup-primary-actions">
              <label className="followup-action-button followup-primary-upload">
                <input type="file" accept=".xlsx,.xls,.xlsm,.xlsb" multiple onChange={onUploadCdr} />
                <FileSpreadsheet size={18} />
                <span>{stagedTrafficUpload?.mode === "cdr" ? `${stagedCount} CDR selected` : "Select CDR workbook"}</span>
              </label>

              <label className="followup-action-button">
                <input type="file" accept=".csv,.xlsx,.xls,.xlsm,.xlsb" multiple onChange={onUploadRawSystem} />
                <FileText size={18} />
                <span>{stagedTrafficUpload?.mode === "raw" ? `${stagedCount} raw selected` : "Select raw call log"}</span>
              </label>
            </div>

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

            <div className={`followup-staged-upload ${stagedTrafficUpload ? "has-files" : ""}`}>
              <div>
                <strong>{stagedTrafficUpload ? `${stagedCount} ${stagedKind}${stagedCount > 1 ? "s" : ""} ready` : "No main file selected yet"}</strong>
                <span>{stagedTrafficUpload ? stagedNames : "Select a CDR workbook or raw call log, then press Upload selected."}</span>
              </div>
              
              <button
                className="followup-action-button"
                type="button"
                onClick={onLoadSaved}
                disabled={!savedWorkbook || isLoadingSaved || isParsing}
              >
                <HardDrive size={18} />
                <span>{isLoadingSaved ? "Opening..." : "Continue previous workbook"}</span>
              </button>
              
              <div className="followup-staged-actions">
                <button className="followup-action-button followup-confirm-upload" type="button" onClick={onConfirmUpload} disabled={!stagedTrafficUpload || isParsing || isLoadingSaved}>
                  <UploadCloud size={18} />
                  <span>{isParsing ? "Uploading..." : "Upload selected"}</span>
                </button>
                <button className="followup-action-button followup-clear-upload" type="button" onClick={onClearStagedUpload} disabled={!stagedTrafficUpload || isParsing}>
                  <X size={18} />
                  <span>Clear</span>
                </button>
              </div>
            </div>
          </div>

          <div className="followup-upload-visual" aria-hidden="true">
            <img src="/assets/h.png" alt="" />
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
