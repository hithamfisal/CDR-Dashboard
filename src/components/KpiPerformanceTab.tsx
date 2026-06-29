import type { RefObject } from "react";
import {
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
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartLegend, SectionTitle } from "./DashboardUi";
import {
  CallsDurationPerformanceChart,
  KpiBarLabel,
  KpiLineLabel,
  PieOuterDecimalLabel,
  PointValueLabel,
  RegionRadarTooltip,
  RightValueLabel,
} from "./ChartParts";
import { CHART_COLORS, COLORS, TOOLTIP_STYLE } from "../lib/dashboardConstants";
import { formatDecimal, formatNumber, secondsToClock } from "../lib/formatters";
import { shortMonthLabel, truncateLabel } from "../lib/chartHelpers";
import type { Ranking } from "../types/dashboard";

type KpiPerformanceTabProps = {
  periodLabel: string;
  kpiRows: any[];
  kpiAverage: number;
  monthlyKpi: { rows: any[]; months: Array<{ key: string; name: string; color: string }> };
  monthlyKpiPieData: Array<{ name: string; value: number }>;
  monthlyKpiPieTotal: number;
  regionRadarData: any[];
  regionRadarSeries: Array<{ key: string; name: string; color: string }>;
  rankings: {
    month: Ranking[];
    company: Ranking[];
    talkgroup: Ranking[];
    station: Ranking[];
    hour: Ranking[];
  };
  kpiTableRef: RefObject<HTMLDivElement | null>;
  kpiAverageChartRef: RefObject<HTMLElement | null>;
  kpiCallsDurationChartRef: RefObject<HTMLElement | null>;
  monthlyKpiChartRef: RefObject<HTMLElement | null>;
  kpiTotalAvgChartRef: RefObject<HTMLElement | null>;
  isSectionCollapsed: (id: string) => boolean;
  toggleSection: (id: string) => void;
};

export function KpiPerformanceTab({
  periodLabel,
  kpiRows,
  kpiAverage,
  monthlyKpi,
  monthlyKpiPieData,
  monthlyKpiPieTotal,
  regionRadarData,
  regionRadarSeries,
  rankings,
  kpiTableRef,
  kpiAverageChartRef,
  kpiCallsDurationChartRef,
  monthlyKpiChartRef,
  kpiTotalAvgChartRef,
  isSectionCollapsed,
  toggleSection,
}: KpiPerformanceTabProps) {
  const kpiCollapsed = isSectionCollapsed("kpi");
  const performanceCollapsed = isSectionCollapsed("Performance");

  return (
    <>
      <SectionTitle
        id="kpi"
        eyebrow="1"
        title="Key KPI Profiles: Aggregate Metrics"
        text={`Data grid and KPI chart profiles in ${periodLabel}.`}
        collapsed={kpiCollapsed}
        onToggle={() => toggleSection("kpi")}
      />
      <section
        id="kpi-content"
        className={`kpi-grid ${kpiCollapsed ? "section-content-collapsed" : ""}`}
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
                  <th>TGs</th>
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

        <article className="chart-card kpi-average-card" ref={kpiAverageChartRef}>
          <h3>KPI Average Duration per Company</h3>
          <ResponsiveContainer width="100%" height={Math.max(340, kpiRows.length * 34)}>
            <BarChart layout="vertical" data={kpiRows} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" opacity={0.32} horizontal={false} />
              <XAxis type="number" tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} />
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
                formatter={(v: number) => [`${formatDecimal(v, 1)} sec`, "KPI avg duration"]}
              />
              <Bar dataKey="kpiAvgDurationPerUser" fill={CHART_COLORS.calls}>
                <LabelList dataKey="kpiAvgDurationPerUser" content={RightValueLabel} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <ChartLegend
            items={[{ name: "Average duration per activated user", color: CHART_COLORS.calls }]}
          />
        </article>

        <article className="chart-card kpi-calls-duration-card" ref={kpiCallsDurationChartRef}>
          <h3>KPI Calls and Duration per Company</h3>
          <ResponsiveContainer width="100%" height={390}>
            <ComposedChart data={kpiRows} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" opacity={0.32} />
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
              <YAxis yAxisId="calls" tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} />
              <YAxis yAxisId="duration" orientation="right" tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => formatNumber(v)} />
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
                <LabelList dataKey="durationSeconds" content={KpiLineLabel} />
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

        <article className="chart-card monthly-kpi-card kpi-monthly-card" ref={monthlyKpiChartRef}>
          <h3>Monthly KPI</h3>
          <p>(Avg. call duration per company) in sec</p>
          <ResponsiveContainer width="100%" height={430}>
            <LineChart data={monthlyKpi.rows} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" opacity={0.32} />
              <XAxis
                dataKey="company"
                tick={{ fill: CHART_COLORS.axis, fontSize: 11, fontWeight: 700 }}
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
                formatter={(v: number, name: string) => [v == null ? "" : `${formatDecimal(v, 2)} sec`, name]}
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
                  <LabelList dataKey={month.key} content={(props) => <PointValueLabel {...props} fill={month.color} />} />
                </Line>
              ))}
            </LineChart>
          </ResponsiveContainer>
          <ChartLegend items={monthlyKpi.months.map((m) => ({ name: shortMonthLabel(m.name), color: m.color }))} />
        </article>

        <article className="chart-card monthly-kpi-card kpi-total-avg-card" ref={kpiTotalAvgChartRef}>
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
                    <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" className="modern-pie-center-value">
                  {formatDecimal(monthlyKpiPieTotal, 2)}
                </text>
                <text x="50%" y="57%" textAnchor="middle" dominantBaseline="middle" className="modern-pie-center-label">
                  Total
                </text>
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v: number) => [`${formatDecimal(v, 2)} sec`, "Average duration"]}
                />
              </PieChart>
            </ResponsiveContainer>
            <ChartLegend
              className="pie-legend kpi-total-avg-legend"
              items={monthlyKpiPieData.map((item, i) => ({ name: item.name, color: COLORS[i % COLORS.length] }))}
            />
          </div>
        </article>
      </section>

      <SectionTitle
        id="Performance"
        eyebrow="2"
        title="Performance Dimensions: Deep Dive"
        text={`Calls, duration, and utilization dimensions in ${periodLabel}.`}
        collapsed={performanceCollapsed}
        onToggle={() => toggleSection("Performance")}
      />
      <section
        id="Performance-content"
        className={`chart-grid performance-chart-grid ${performanceCollapsed ? "section-content-collapsed" : ""}`}
      >
        <article className="chart-card performance-region region-radar-card">
          <h3>Regions Performance</h3>
          <p>Normalized view across calls, duration, peak hour, and TG activity.</p>
          <ResponsiveContainer width="100%" height={350}>
            <RadarChart data={regionRadarData} outerRadius="74%">
              <PolarGrid stroke={CHART_COLORS.grid} strokeOpacity={0.48} />
              <PolarAngleAxis dataKey="metric" tick={{ fill: CHART_COLORS.axis, fontSize: 11, fontWeight: 700 }} />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fill: CHART_COLORS.axis, fontSize: 10 }}
                tickFormatter={(value) => `${formatDecimal(Number(value), 0)}%`}
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
          <ChartLegend items={regionRadarSeries.map((series) => ({ name: series.name, color: series.color }))} />
        </article>
        <article className="chart-card performance-month">
          <CallsDurationPerformanceChart title="Monthly Performance" data={rankings.month} gradientId="performanceMonth" xTickFormatter={shortMonthLabel} />
        </article>
        <article className="chart-card performance-company">
          <CallsDurationPerformanceChart title="Companies Performance" data={rankings.company} gradientId="performanceCompany" />
        </article>
        <article className="chart-card performance-talkgroup">
          <CallsDurationPerformanceChart title="TG Performance" data={rankings.talkgroup.slice(0, 12)} gradientId="performanceTalkgroup" />
        </article>
        <article className="chart-card performance-basestation">
          <CallsDurationPerformanceChart title="BS Performance" data={rankings.station.slice(0, 12)} gradientId="performanceStation" />
        </article>
        <article className="chart-card performance-hour">
          <CallsDurationPerformanceChart title="Hours Performance" data={rankings.hour} gradientId="performanceHour" xTickFormatter={(v) => `${v ?? ""}`} />
        </article>
      </section>
    </>
  );
}
