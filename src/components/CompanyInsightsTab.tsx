import type { CallRecord } from "../types/dashboard";
import { FilteredCallsRegister } from "./FilteredCallsRegister";

type CompanyInsightsTabProps = {
  pagedRecords: CallRecord[];
  totalFiltered: number;
  totalRecords: number;
  page: number;
  pageCount: number;
  regionPerformanceRows: any[];
  talkgroupEfficiencyRows: any[];
  radioBehaviorRows: any[];
  userBehaviorRows: any[];
  formatNumber: (value: number) => string;
  formatDecimal: (value: number, digits?: number) => string;
  secondsToClock: (seconds: number) => string;
  onPreviousPage: () => void;
  onNextPage: () => void;
};

export function CompanyInsightsTab({
  pagedRecords,
  totalFiltered,
  totalRecords,
  page,
  pageCount,
  regionPerformanceRows,
  talkgroupEfficiencyRows,
  radioBehaviorRows,
  userBehaviorRows,
  formatNumber,
  formatDecimal,
  secondsToClock,
  onPreviousPage,
  onNextPage,
}: CompanyInsightsTabProps) {
  return (
    <>
      <FilteredCallsRegister
        id="ticket-portal-cdr-register"
        title="Ticket Portal Register"
        eyebrow="CDR Register"
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

      <section id="users-content" className="behavior-grid company-behavior-grid">
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
  );
}
