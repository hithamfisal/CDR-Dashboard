import { SectionTitle } from "./DashboardUi";

type FleetActivationSummary = {
  registeredCount: number;
  activeRegisteredCount: number;
  inactiveCount: number;
  activationRate: number;
  inactiveByCompany: Array<{ name: string; count?: number; activeCount?: number }>;
  inactiveByRegion: Array<{ name: string; count?: number; activeCount?: number }>;
};

type TrafficIntensitySummary = {
  trafficPerRadio: number;
};

type UnmatchedFleetmapRow = {
  callerNumber: string;
  callerAlias: string;
  talkgroup: string;
  calls: number;
  totalDuration: number;
  firstSeen: string;
  lastSeen: string;
  baseStationsText: string;
  reason: string;
};

type FleetActivationTabProps = {
  periodLabel: string;
  fleetActivation: FleetActivationSummary;
  trafficIntensity: TrafficIntensitySummary;
  unmatchedFleetmapReportRows: UnmatchedFleetmapRow[];
  radioImageDataUrl?: string;
  radioImageName?: string;
  isSectionCollapsed: (id: string) => boolean;
  toggleSection: (id: string) => void;
  formatNumber: (value: number) => string;
  formatDecimal: (value: number, digits?: number) => string;
  secondsToClock: (seconds: number) => string;
};

export function FleetActivationTab({
  periodLabel,
  fleetActivation,
  trafficIntensity,
  unmatchedFleetmapReportRows,
  radioImageDataUrl,
  radioImageName,
  isSectionCollapsed,
  toggleSection,
  formatNumber,
  formatDecimal,
  secondsToClock,
}: FleetActivationTabProps) {
  const networkCollapsed = isSectionCollapsed("networkUtilization");
  const unmatchedCollapsed = isSectionCollapsed("unmatchedFleetmap");
  const labelStyle = {
    fontSize: "0.78rem",
    fontWeight: 600,
    color: "var(--design-faint)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  } as const;
  const detailStyle = {
    fontSize: "0.75rem",
    color: "var(--design-muted)",
  } as const;
  const valueStyle = (color: string) =>
    ({
      fontSize: "1.6rem",
      fontWeight: 900,
      color,
    }) as const;

  return (
    <>
      <SectionTitle
        id="networkUtilization"
        eyebrow="Fleet activation"
        title={`Network Utilization & Fleet Activation in ${periodLabel}`}
        text="Compare registered fleetmap radios against radios that made calls in the filtered period."
        collapsed={networkCollapsed}
        onToggle={() => toggleSection("networkUtilization")}
      />
      <section
        id="networkUtilization-content"
        className={`network-utilization-section fleet-activation-panel ${networkCollapsed ? "section-content-collapsed" : ""}`}
      >
        <div className="summary-cards network-utilization-cards">
          <div className="summary-card yellow">
            <span style={labelStyle}>Registered Radios</span>
            <strong style={valueStyle("var(--design-warning)")}>{formatNumber(fleetActivation.registeredCount)}</strong>
            <small style={detailStyle}>From fleetmap</small>
          </div>
          <div className="summary-card green">
            <span style={labelStyle}>Active Registered</span>
            <strong style={valueStyle("var(--design-success)")}>{formatNumber(fleetActivation.activeRegisteredCount)}</strong>
            <small style={detailStyle}>Made calls</small>
          </div>
          <div className="summary-card yellow">
            <span style={labelStyle}>Inactive Radios</span>
            <strong style={valueStyle("var(--design-warning)")}>{formatNumber(fleetActivation.inactiveCount)}</strong>
            <small style={detailStyle}>No calls found</small>
          </div>
          <div className="summary-card green">
            <span style={labelStyle}>Activation %</span>
            <strong style={valueStyle("var(--design-success)")}>{formatDecimal(fleetActivation.activationRate, 1)}%</strong>
            <small style={detailStyle}>Active / registered</small>
          </div>
          <div className="summary-card yellow">
            <span style={labelStyle}>Traffic / Active Radio</span>
            <strong style={valueStyle("var(--design-warning)")}>{formatDecimal(trafficIntensity.trafficPerRadio, 2)}</strong>
            <small style={detailStyle}>Erlangs per radio</small>
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
                    <td className="inactive-count-cell">{formatNumber(Number(item.count ?? 0))}</td>
                    <td className="active-count-cell">{formatNumber(Number(item.activeCount ?? 0))}</td>
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
                    <td className="inactive-count-cell">{formatNumber(Number(item.count ?? 0))}</td>
                    <td className="active-count-cell">{formatNumber(Number(item.activeCount ?? 0))}</td>
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
        title={`Unmatched Fleetmap Report in ${periodLabel}`}
        text="Unique raw Caller Numbers that did not match Master/Fixed Fleetmap Radio ID, or matched with incomplete fleetmap details."
        collapsed={unmatchedCollapsed}
        onToggle={() => toggleSection("unmatchedFleetmap")}
      />
      <section
        id="unmatchedFleetmap-content"
        className={`unmatched-fleetmap-report-section fleet-unmatched-section ${unmatchedCollapsed ? "section-content-collapsed" : ""}`}
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
                    <th>TG</th>
                    <th>Calls</th>
                    <th>Total Duration</th>
                    <th>First Seen</th>
                    <th>Last Seen</th>
                    <th>BS</th>
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
                        All raw Caller Numbers are matched to the Master/Fixed Fleetmap for the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>
          <aside className="fleet-radio-showcase" aria-label="Hytera radio fleet visual">
            <img
              src={radioImageDataUrl || "/assets/radio.png"}
              alt={radioImageName || "Hytera radio on display stand"}
            />
          </aside>
        </div>
      </section>
    </>
  );
}
