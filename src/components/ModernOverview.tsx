import {
  Activity,
  Antenna,
  Building2,
  CalendarClock,
  Gauge,
  Clock3,
  MessageSquare,
  MoreVertical,
  PhoneCall,
  Radio,
  ShieldCheck,
  Timer,
  BadgeCheck,
  CalendarDays,
  CalendarRange,
  Users,
  User,
  PhoneIncoming,
  Waves,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardData, FleetmapState, Metrics, QualityIssue, Ranking, TrafficIntensity } from "../types/dashboard";
import { chartLabel, formatDecimal, formatNumber, secondsToClock } from "../lib/formatters";
import { shortMonthLabel, truncateLabel } from "../lib/chartHelpers";
import { CHART_COLORS, COLORS, TOOLTIP_STYLE } from "../lib/dashboardConstants";
import { PieValueLabel, PointValueLabel, TopValueLabel } from "./ChartParts";

type ModernOverviewProps = {
  metrics: Metrics;
  rankings: {
    month: Ranking[];
    talkgroup: Ranking[];
    hour: Ranking[];
    station: Ranking[];
    company: Ranking[];
    radio: Ranking[];
    user: Ranking[];
    callType: Ranking[];
  };
  filteredCount: number;
  totalCount: number;
  periodLabel: string;
  loadedAt: string;
  data: DashboardData;
  masterFleetmap: FleetmapState;
  fixedFleetmap: FleetmapState;
  maxDuration: number;
  minDuration: number;
  qualityScore: number;
  qualityIssues: QualityIssue[];
  peakUserParts: string[];
  peakWeekName: string;
  peakDayName: string;
  trafficIntensity: TrafficIntensity;
};

const kpiPalette = ["cyan", "green", "amber", "blue", "purple", "teal", "red"] as const;

function MiniSparkline({ data, color }: { data: Ranking[]; color: string }) {
  const spark = data.slice(-8).map((item) => ({ name: item.name, value: item.calls }));
  return (
    <ResponsiveContainer width="100%" height={34}>
      <AreaChart data={spark} margin={{ left: 0, right: 0, top: 5, bottom: 0 }}>
        <Area type="monotone" dataKey="value" stroke={color} fill={color} fillOpacity={0.18} strokeWidth={2} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function ModernKpiCard({
  label,
  value,
  detail,
  icon,
  color,
  trend,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
  color: string;
  trend: Ranking[];
  tone: typeof kpiPalette[number];
}) {
  return (
    <article className={`modern-kpi-card modern-kpi-${tone}`}>
      <div className="modern-kpi-icon" style={{ color }}>
        {icon}
      </div>
      <div className="modern-kpi-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
      <div className="modern-kpi-spark">
        <MiniSparkline data={trend} color={color} />
      </div>
    </article>
  );
}

function ModernStatTile({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tone: typeof kpiPalette[number];
}) {
  return (
    <article className={`modern-stat-tile modern-kpi-${tone}`}>
      <div className="modern-stat-icon">{icon}</div>
      <span>{label}</span>
      <strong title={value}>{value}</strong>
    </article>
  );
}

function ModernQualityTile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="modern-quality-tile">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function ModernPanel({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={`modern-panel ${className}`.trim()}>
      <div className="modern-panel-head">
        <h3>{title}</h3>
        {action ?? <button className="modern-panel-menu" type="button" aria-label={`${title} options`}><MoreVertical size={15} /></button>}
      </div>
      {children}
    </article>
  );
}

function RankTable({
  rows,
  columns,
  className = "",
}: {
  rows: Ranking[];
  columns: Array<"rank" | "name" | "calls" | "duration" | "percent">;
  className?: string;
}) {
  const total = rows.reduce((sum, row) => sum + row.calls, 0) || 1;
  return (
    <div className={`modern-table-wrap ${className}`.trim()}>
      <table className="modern-table">
        <thead>
          <tr>
            {columns.includes("rank") && <th>#</th>}
            {columns.includes("name") && <th>Name</th>}
            {columns.includes("calls") && <th>Calls</th>}
            {columns.includes("duration") && <th>Duration</th>}
            {columns.includes("percent") && <th>%</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.name}-${index}`}>
              {columns.includes("rank") && <td>{index + 1}</td>}
              {columns.includes("name") && <td title={row.name}>{row.name}</td>}
              {columns.includes("calls") && <td>{formatNumber(row.calls)}</td>}
              {columns.includes("duration") && <td>{secondsToClock(row.durationSeconds)}</td>}
              {columns.includes("percent") && <td>{((row.calls / total) * 100).toFixed(1)}%</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ModernOverview({
  metrics,
  rankings,
  filteredCount,
  totalCount,
  periodLabel,
  loadedAt,
  data,
  masterFleetmap,
  fixedFleetmap,
  maxDuration,
  minDuration,
  qualityScore,
  qualityIssues,
  peakUserParts,
  peakWeekName,
  peakDayName,
  trafficIntensity,
}: ModernOverviewProps) {
  const topHour = [...rankings.hour].sort((a, b) => b.calls - a.calls)[0];
  const filteredPct = totalCount ? (filteredCount / totalCount) * 100 : 0;
  const callTypeTotal = rankings.callType.reduce((sum, item) => sum + item.calls, 0);
  const monthlyTrend = rankings.month.map((item) => ({
    ...item,
    durationMinutes: item.durationSeconds / 60,
  }));
  const tgTop = rankings.talkgroup.slice(0, 7);
  const tgTotal = tgTop.reduce((sum, item) => sum + item.calls, 0);
  const callTypeTop = rankings.callType.slice(0, 6);
  const topCompany = rankings.company[0];
  const topStation = rankings.station[0];
  const topTalkgroup = rankings.talkgroup[0];
  const topRadio = rankings.radio[0];
  const topUser = rankings.user[0];
  const peakTrafficHour = [...rankings.hour].sort((a, b) => b.trafficHours - a.trafficHours || b.calls - a.calls)[0];
  const topMonth = [...rankings.month].sort((a, b) => b.calls - a.calls || b.durationSeconds - a.durationSeconds)[0];
  const peakHourAvgDuration = topHour?.calls ? topHour.durationSeconds / topHour.calls : 0;
  const masterCount = masterFleetmap.records.length;
  const fixedCount = fixedFleetmap.records.length;

  const kpis = [
    { label: "Total Calls", value: formatNumber(metrics.totalCalls), detail: periodLabel, icon: <PhoneCall size={26} />, color: "#1dd6c5", tone: "cyan" as const },
    { label: "Call Minutes", value: formatNumber(Math.round(metrics.totalDuration / 60)), detail: "Filtered duration", icon: <Clock3 size={26} />, color: "#4ade80", tone: "green" as const },
    { label: "Unique Users", value: formatNumber(metrics.radios), detail: "Active radios", icon: <Users size={26} />, color: "#f5c542", tone: "amber" as const },
    { label: "Active BS", value: formatNumber(metrics.stations), detail: "Serving stations", icon: <Antenna size={26} />, color: "#38bdf8", tone: "blue" as const },
    { label: "Active TG", value: formatNumber(metrics.talkgroups), detail: "Used groups", icon: <MessageSquare size={26} />, color: "#a78bfa", tone: "purple" as const },
    { label: "Availability", value: `${Math.max(0, 100 - (filteredCount ? 0.36 : 0)).toFixed(2)}%`, detail: "Dashboard health", icon: <ShieldCheck size={26} />, color: "#2dd4bf", tone: "teal" as const },
  ];

  return (
    <section className="modern-overview-shell">
      <section className="modern-profile-band">
        <div className="modern-profile-main">
          <img src="/assets/call.png" alt="Calls under analysis" />
          <div>
            <span>Uploaded workbook profile</span>
            <strong>{formatNumber(metrics.totalCalls)}</strong>
            <p>Calls under Analysis</p>
          </div>
        </div>
        <div className="modern-profile-card">
          <ShieldCheck size={28} />
          <div>
            <span>Workbook</span>
            <strong>{data.fileName}</strong>
            <p>{formatNumber(data.rawRows)} records - loaded {loadedAt}</p>
            <div className="modern-source-chips">
              {data.cdrSources.slice(0, 4).map((source, index) => (
                <em key={`${source.fileName}-${index}`} title={source.fileName}>{source.fileName} - {formatNumber(source.recordCount)} rows</em>
              ))}
            </div>
            <small>Fleetmap: Master ({formatNumber(masterCount)}) + Fixed ({formatNumber(fixedCount)})</small>
          </div>
        </div>
      </section>

      <section className="modern-stat-deck">
        <ModernStatTile label="Total Calls" value={formatNumber(metrics.totalCalls)} icon={<PhoneCall size={18} />} tone="cyan" />
        <ModernStatTile label="Regions" value={formatNumber(metrics.regions)} icon={<Activity size={18} />} tone="green" />
        <ModernStatTile label="Companies" value={formatNumber(metrics.companies)} icon={<Building2 size={18} />} tone="purple" />
        <ModernStatTile label="Radios" value={formatNumber(metrics.radios)} icon={<Radio size={18} />} tone="amber" />
        <ModernStatTile label="TG" value={formatNumber(metrics.talkgroups)} icon={<MessageSquare size={18} />} tone="green" />
        <ModernStatTile label="BS" value={formatNumber(metrics.stations)} icon={<Antenna size={18} />} tone="teal" />
        <ModernStatTile label="Total Duration" value={secondsToClock(metrics.totalDuration)} icon={<Timer size={18} />} tone="blue" />
        <ModernStatTile label="Avg Duration" value={secondsToClock(metrics.averageDuration)} icon={<Gauge size={18} />} tone="purple" />
        <ModernStatTile label="Max Duration" value={secondsToClock(maxDuration)} icon={<Timer size={18} />} tone="amber" />
        <ModernStatTile label="Min Duration" value={secondsToClock(minDuration)} icon={<Timer size={18} />} tone="blue" />
        <ModernStatTile label="Peak Radio" value={truncateLabel(topRadio?.name ?? "--", 16)} icon={<Radio size={18} />} tone="amber" />
        <ModernStatTile label="Peak User" value={truncateLabel(peakUserParts[0] ?? topUser?.name ?? "--", 16)} icon={<User size={18} />} tone="purple" />
        <ModernStatTile label="Peak User ID" value={truncateLabel(peakUserParts[1] ?? "--", 16)} icon={<BadgeCheck size={18} />} tone="amber" />
        <ModernStatTile label="Peak User Co." value={truncateLabel(peakUserParts[2] ?? "--", 16)} icon={<Building2 size={18} />} tone="red" />
        <ModernStatTile label="Peak Co." value={truncateLabel(topCompany?.name ?? "--", 16)} icon={<Building2 size={18} />} tone="red" />
        <ModernStatTile label="Peak TG" value={truncateLabel(topTalkgroup?.name ?? "--", 16)} icon={<MessageSquare size={18} />} tone="green" />
        <ModernStatTile label="Peak BS" value={truncateLabel(topStation?.name ?? "--", 16)} icon={<Antenna size={18} />} tone="teal" />
        <ModernStatTile label="Peak Month" value={topMonth?.name ?? "--"} icon={<CalendarDays size={18} />} tone="red" />
        <ModernStatTile label="Peak Week" value={peakWeekName} icon={<CalendarRange size={18} />} tone="red" />
        <ModernStatTile label="Peak Day" value={peakDayName} icon={<CalendarClock size={18} />} tone="red" />
        <ModernStatTile label="Peak Hour" value={topHour?.name ?? "--"} icon={<Clock3 size={18} />} tone="amber" />
        <ModernStatTile label="Peak Hour Calls" value={formatNumber(topHour?.calls ?? 0)} icon={<PhoneIncoming size={18} />} tone="amber" />
        <ModernStatTile label="Traffic" value={formatDecimal(metrics.trafficHours, 1)} icon={<Activity size={18} />} tone="cyan" />
        <ModernStatTile label="Peak Traffic" value={formatDecimal(peakTrafficHour?.trafficHours ?? 0, 1)} icon={<Activity size={18} />} tone="green" />
        <ModernStatTile label="Peak Hour Avg" value={formatDecimal(peakHourAvgDuration, 1)} icon={<Gauge size={18} />} tone="purple" />
        <ModernStatTile label="Busy Traffic Hour" value={trafficIntensity.busyTrafficHour?.name ?? "--"} icon={<Clock3 size={18} />} tone="cyan" />
        <ModernStatTile label="Busy Hour Traffic" value={formatDecimal(trafficIntensity.busyTrafficHour?.trafficHours ?? 0, 2)} icon={<Waves size={18} />} tone="green" />
        <ModernStatTile label="Traffic / TG" value={formatDecimal(trafficIntensity.trafficPerTalkgroup, 2)} icon={<Waves size={18} />} tone="blue" />
        <ModernStatTile label="Traffic / Co." value={formatDecimal(trafficIntensity.trafficPerCompany, 2)} icon={<Waves size={18} />} tone="amber" />
        <ModernStatTile label="Traffic / Region" value={formatDecimal(trafficIntensity.trafficPerRegion, 2)} icon={<Waves size={18} />} tone="purple" />
      </section>

      <section className="modern-quality-strip">
        <ModernQualityTile label="Data Quality Score" value={`${formatDecimal(qualityScore, 1)}%`} detail={`${formatNumber(totalCount)} source rows checked`} />
        {qualityIssues.map((issue) => (
          <ModernQualityTile key={issue.name} label={issue.name} value={formatNumber(issue.count)} detail={`${formatDecimal(issue.pct, 1)}%`} />
        ))}
        <article className="modern-record-card">
          <span>Filtered Records</span>
          <strong>{formatNumber(filteredCount)}</strong>
          <small>{filteredPct.toFixed(1)}% of {formatNumber(totalCount)} rows</small>
          <em>as of {loadedAt}</em>
        </article>
      </section>

      <section className="modern-dashboard-grid">
        <ModernPanel title="Call Volume Over Time" className="modern-panel-wide">
          <ResponsiveContainer width="100%" height={188}>
            <BarChart data={monthlyTrend} margin={{ left: 4, right: 22, top: 18, bottom: 2 }}>
              <CartesianGrid stroke="#20313e" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} tickFormatter={shortMonthLabel} interval={0} />
              <YAxis yAxisId="calls" tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} width={48} tickFormatter={chartLabel} />
              <YAxis yAxisId="duration" orientation="right" tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} width={50} tickFormatter={chartLabel} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number) => formatNumber(value)} />
              <Bar yAxisId="calls" dataKey="calls" name="Calls" fill="#11b7b0" radius={[6, 6, 0, 0]}>
                <LabelList dataKey="calls" content={TopValueLabel} />
              </Bar>
              <Line yAxisId="duration" type="monotone" dataKey="durationMinutes" name="Call Minutes" stroke="#58d36f" strokeWidth={3} dot={{ r: 4 }}>
                <LabelList dataKey="durationMinutes" content={(props) => <PointValueLabel {...props} fill="#58d36f" />} />
              </Line>
            </BarChart>
          </ResponsiveContainer>
        </ModernPanel>

        <ModernPanel title="Call Distribution by TG" className="modern-panel-tg">
          <div className="modern-donut-layout">
            <div className="modern-donut-chart">
              <ResponsiveContainer width="100%" height={188}>
                <PieChart>
                  <Pie data={tgTop} dataKey="calls" nameKey="name" innerRadius={42} outerRadius={70} paddingAngle={2} label={PieValueLabel} labelLine={false}>
                    {tgTop.map((item, index) => <Cell key={item.name} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number) => formatNumber(value)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="modern-donut-center"><strong>{formatNumber(tgTotal)}</strong><span>Total</span></div>
            </div>
            <RankTable className="modern-pie-table-wrap" rows={tgTop} columns={["name", "calls", "percent"]} />
          </div>
        </ModernPanel>

        <ModernPanel title="Busy Hour Profile" className="modern-panel-busy">
          <ResponsiveContainer width="100%" height={188}>
            <AreaChart data={rankings.hour} margin={{ left: 0, right: 18, top: 18, bottom: 4 }}>
              <CartesianGrid stroke="#20313e" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} interval={2} />
              <YAxis tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} width={48} tickFormatter={chartLabel} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number) => formatNumber(value)} />
              <Area type="monotone" dataKey="calls" stroke="#18d4cf" fill="#18d4cf" fillOpacity={0.2} strokeWidth={3}>
                <LabelList dataKey="calls" content={(props) => <PointValueLabel {...props} fill="#18d4cf" />} />
              </Area>
            </AreaChart>
          </ResponsiveContainer>
          {topHour && <div className="modern-callout"><Activity size={14} /> Peak {topHour.name}: {formatNumber(topHour.calls)} calls</div>}
        </ModernPanel>

        <ModernPanel title="Top 10 BS by Call Volume" className="modern-panel-top-bs">
          <RankTable className="modern-ranking-table-wrap" rows={rankings.station.slice(0, 10)} columns={["rank", "name", "calls", "percent"]} />
          <button className="modern-export-chip" type="button">Export</button>
        </ModernPanel>

        <ModernPanel title="Top 10 Companies by Call Volume" className="modern-panel-companies">
          <RankTable className="modern-ranking-table-wrap" rows={rankings.company.slice(0, 10)} columns={["rank", "name", "calls", "duration"]} />
          <button className="modern-export-chip" type="button">Export</button>
        </ModernPanel>

        <ModernPanel title="Top 10 Users by Call Minutes" className="modern-panel-users">
          <RankTable className="modern-ranking-table-wrap" rows={[...rankings.user].sort((a, b) => b.durationSeconds - a.durationSeconds).slice(0, 10)} columns={["rank", "name", "duration", "calls"]} />
          <button className="modern-export-chip" type="button">Export</button>
        </ModernPanel>

        <ModernPanel title="Call Type Distribution" className="modern-panel-call-type">
          <div className="modern-donut-layout modern-donut-compact">
            <div className="modern-donut-chart">
              <ResponsiveContainer width="100%" height={172}>
                <PieChart>
                  <Pie data={callTypeTop} dataKey="calls" nameKey="name" innerRadius={40} outerRadius={64} paddingAngle={2} label={PieValueLabel} labelLine={false}>
                    {callTypeTop.map((item, index) => <Cell key={item.name} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number) => formatNumber(value)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="modern-donut-center"><strong>{formatNumber(callTypeTotal)}</strong><span>Total</span></div>
            </div>
            <div className="modern-legend-list">
              {callTypeTop.map((item, index) => (
                <p key={item.name}><i style={{ background: COLORS[index % COLORS.length] }} />{item.name}</p>
              ))}
            </div>
          </div>
          <button className="modern-export-chip" type="button">Export</button>
        </ModernPanel>
      </section>

      <footer className="modern-status-footer">
        <span>Data Range: {periodLabel}</span>
        <span>Last Refreshed: {loadedAt}</span>
        <span><i /> Data is current</span>
      </footer>
    </section>
  );
}
