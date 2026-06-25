import { memo } from "react";
import { ShieldCheck } from "lucide-react";
import type { DashboardData, FleetmapState, Metrics } from "../types/dashboard";

type WorkbookHeroProps = {
  data: DashboardData;
  metrics: Metrics;
  masterFleetmap: FleetmapState;
  fixedFleetmap: FleetmapState;
  formatNumber: (value: number) => string;
};

function WorkbookHeroComponent({ data, metrics, masterFleetmap, fixedFleetmap, formatNumber }: WorkbookHeroProps) {
  return (
    <section id="command" className="hero-panel">
      <div className="hero-main hero-main-with-icon">
        <img className="hero-call-icon" src="/assets/call.png" alt="Calls under analysis" />
        <div className="hero-profile-copy">
          <p className="eyebrow" style={{ fontSize: "18px", fontWeight: 900, letterSpacing: "0.08em", color: "var(--design-accent-2)", textTransform: "uppercase" }}>Uploaded workbook profile</p>
          <h2 style={{ fontSize: "18px", fontWeight: 900, color: "var(--design-text)", lineHeight: 1.0 }}>{formatNumber(metrics.totalCalls)}</h2>
          <p className="hero-subtitle" style={{ fontSize: "14px", fontWeight: 500, color: "var(--design-muted)" }}>Calls under Analysis</p>
        </div>
      </div>
      <div className="workbook-card">
        <ShieldCheck size={28} />
        <span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", color: "var(--design-accent-2)", textTransform: "uppercase" }}>Workbook</span>
        <strong style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--design-text)" }}>{data.fileName}</strong>
        <p style={{ fontSize: "0.82rem", color: "var(--design-muted)" }}>{formatNumber(data.rawRows)} records - loaded {data.loadedAt}</p>
        {data.cdrSources.length > 1 && (
          <ul className="cdr-sources-list">
            {data.cdrSources.map((source, index) => (
              <li key={`${source.fileName}-${index}`} style={{ fontSize: "0.8rem", color: "var(--design-muted)" }}>
                <strong style={{ color: "var(--design-text)" }}>{source.fileName}</strong> - {formatNumber(source.recordCount)} rows
              </li>
            ))}
          </ul>
        )}
        {(masterFleetmap.meta || fixedFleetmap.meta) && (
          <p className="fleetmap-status" style={{ fontSize: "0.8rem", color: "var(--design-accent-2)" }}>
            Fleetmap: {masterFleetmap.meta ? `Master (${formatNumber(masterFleetmap.records.length)})` : "-"}
            {" + "}
            {fixedFleetmap.meta ? `Fixed (${formatNumber(fixedFleetmap.records.length)})` : "-"}
          </p>
        )}
      </div>
    </section>
  );
}

export const WorkbookHero = memo(WorkbookHeroComponent);
