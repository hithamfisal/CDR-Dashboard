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
import { useMemo, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CallRecord, DashboardData, FleetmapState, Metrics, QualityIssue, Ranking, TrafficIntensity } from "../types/dashboard";
import { chartLabel, formatDecimal, formatNumber, secondsToClock } from "../lib/formatters";
import { shortMonthLabel, truncateLabel } from "../lib/chartHelpers";
import { CHART_COLORS, COLORS, TOOLTIP_STYLE } from "../lib/dashboardConstants";
import { PieOuterValueLabel, PointValueLabel, TopValueLabel } from "./ChartParts";
import { ChartLegend } from "./DashboardUi";

type ModernOverviewProps = {
  metrics: Metrics;
  rankings: {
    month: Ranking[];
    talkgroup: Ranking[];
    hour: Ranking[];
    station: Ranking[];
    company: Ranking[];
    region: Ranking[];
    mobileType: Ranking[];
    radio: Ranking[];
    user: Ranking[];
    callType: Ranking[];
    duplexType: Ranking[];
    callPriority: Ranking[];
    encrypted: Ranking[];
  };
  filteredCount: number;
  totalCount: number;
  periodLabel: string;
  loadedAt: string;
  data: DashboardData;
  filteredRecords: CallRecord[];
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
  showProfile?: boolean;
};

const kpiPalette = ["cyan", "green", "amber", "blue", "purple", "teal", "red"] as const;
const callTypeSeries = [
  { key: "phoneCall", name: "Phone Call", color: "var(--chart-series-1)" },
  { key: "groupCall", name: "Group Call", color: "var(--chart-series-2)" },
  { key: "environmentalListening", name: "Environmental Listening", color: "var(--chart-series-3)" },
  { key: "individualCall", name: "Individual Call", color: "var(--chart-series-4)" },
  { key: "networkWide", name: "Network-wide", color: "var(--chart-series-5)" },
  { key: "broadcast", name: "Broadcast", color: "var(--chart-series-6)" },
];
const monthBuckets = [
  { label: "Jan", match: "jan" },
  { label: "Feb", match: "feb" },
  { label: "Mar", match: "mar" },
  { label: "Apr", match: "apr" },
  { label: "May", match: "may" },
  { label: "Jun", match: "jun" },
  { label: "Jul", match: "jul" },
  { label: "Aug", match: "aug" },
  { label: "Sep", match: "sep" },
  { label: "Oct", match: "oct" },
  { label: "Nov", match: "nov" },
  { label: "Dec", match: "dec" },
];

function monthIndexFromRecord(record: CallRecord) {
  const text = `${record.month || record.callDate || ""}`.trim().toLowerCase();
  const explicit = monthBuckets.findIndex((month) => text.startsWith(month.match) || text.includes(` ${month.match}`));
  if (explicit >= 0) return explicit;
  const parsed = new Date(record.callDate);
  return Number.isNaN(parsed.getTime()) ? -1 : parsed.getMonth();
}

function normalizeCallTypeKey(value: string) {
  const text = `${value || ""}`.toLowerCase();
  if (text.includes("broadcast")) return "broadcast";
  if (text.includes("network")) return "networkWide";
  if (text.includes("environment") || text.includes("listen")) return "environmentalListening";
  if (text.includes("individual") || text.includes("private")) return "individualCall";
  if (text.includes("group")) return "groupCall";
  return "phoneCall";
}

function StackedPercentLabel(props: any) {
  const { x = 0, y = 0, width = 0, height = 0, value = 0 } = props;
  const numeric = Number(value);
  if (numeric < 9 || width < 18 || height < 18) return null;
  return (
    <text x={x + width / 2} y={y + height / 2 + 4} textAnchor="middle" fill="var(--design-bg)" fontSize={10} fontWeight={900}>
      {formatDecimal(numeric, 0)}%
    </text>
  );
}

function CallTypeMixTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const visible = payload.filter((item: any) => Number(item.value) > 0);
  return (
    <div className="modern-calltype-tooltip">
      <strong>{label}</strong>
      {visible.map((item: any) => (
        <span key={item.dataKey} style={{ color: item.color }}>
          {item.name}: {formatDecimal(Number(item.value), 1)}% ({formatNumber(Number(item.payload?.[`${item.dataKey}Count`] ?? 0))})
        </span>
      ))}
    </div>
  );
}

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
  key?: string;
  label: string;
  value: string;
  icon: ReactNode;
  tone: typeof kpiPalette[number];
}) {
  const displayValue = String(value ?? "--");
  const longValue = displayValue.length > 13 || displayValue.includes(" - ") || displayValue.includes("/");
  return (
    <article className={`modern-stat-tile modern-kpi-${tone} ${longValue ? "modern-stat-tile-long-value" : ""}`}>
      <div className="modern-stat-icon">{icon}</div>
      <span>{label}</span>
      <strong className="modern-stat-value" title={displayValue}>{displayValue}</strong>
    </article>
  );
}

function ModernQualityTile({ label, value, detail }: { key?: string; label: string; value: string; detail: string }) {
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
  filteredRecords,
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
  showProfile = true,
}: ModernOverviewProps) {
  const topHour = [...rankings.hour].sort((a, b) => b.calls - a.calls)[0];
  const filteredPct = totalCount ? (filteredCount / totalCount) * 100 : 0;
  const monthlyTrend = rankings.month.map((item) => ({
    ...item,
    durationMinutes: item.durationSeconds / 60,
  }));
  const tgTop = rankings.talkgroup.slice(0, 7);
  const tgTotal = tgTop.reduce((sum, item) => sum + item.calls, 0);
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
  const callTypeMonthlyMix = useMemo(() => {
    const rows = monthBuckets.map((month) => {
      const row: Record<string, string | number> = { month: month.label, total: 0 };
      callTypeSeries.forEach((series) => {
        row[series.key] = 0;
        row[`${series.key}Count`] = 0;
      });
      return row;
    });
    filteredRecords.forEach((record) => {
      const monthIndex = monthIndexFromRecord(record);
      if (monthIndex < 0) return;
      const typeKey = normalizeCallTypeKey(record.callType);
      const row = rows[monthIndex];
      row[typeKey] = Number(row[typeKey] ?? 0) + 1;
      row[`${typeKey}Count`] = Number(row[`${typeKey}Count`] ?? 0) + 1;
      row.total = Number(row.total ?? 0) + 1;
    });
    return rows.map((row) => {
      const total = Number(row.total) || 0;
      callTypeSeries.forEach((series) => {
        const count = Number(row[`${series.key}Count`] ?? 0);
        row[series.key] = total ? (count / total) * 100 : 0;
      });
      return row;
    });
  }, [filteredRecords]);

  const aggregateRecords = (field: keyof CallRecord): Ranking[] => {
    const map = new Map<string, { calls: number; durationSeconds: number; trafficHours: number; radios: Set<string> }>();
    filteredRecords.forEach((record) => {
      const name = String(record[field] || "Unknown").trim() || "Unknown";
      const item = map.get(name) ?? { calls: 0, durationSeconds: 0, trafficHours: 0, radios: new Set<string>() };
      item.calls += 1;
      item.durationSeconds += record.durationSeconds || 0;
      item.trafficHours += record.trafficHours || 0;
      if (record.radioId) item.radios.add(record.radioId);
      map.set(name, item);
    });
    return Array.from(map.entries())
      .map(([name, item]) => ({ name, calls: item.calls, durationSeconds: item.durationSeconds, trafficHours: item.trafficHours, radios: item.radios.size }))
      .sort((a, b) => b.calls - a.calls || b.durationSeconds - a.durationSeconds);
  };

  const regionMatrix = useMemo(() => {
    const map = new Map<string, { calls: number; durationSeconds: number; trafficHours: number; radios: Set<string>; tgs: Set<string>; companies: Set<string>; hours: Map<string, number> }>();
    filteredRecords.forEach((record) => {
      const region = record.region || "Unknown";
      const row = map.get(region) ?? { calls: 0, durationSeconds: 0, trafficHours: 0, radios: new Set<string>(), tgs: new Set<string>(), companies: new Set<string>(), hours: new Map<string, number>() };
      row.calls += 1;
      row.durationSeconds += record.durationSeconds || 0;
      row.trafficHours += record.trafficHours || 0;
      if (record.radioId) row.radios.add(record.radioId);
      if (record.talkgroup) row.tgs.add(record.talkgroup);
      if (record.company) row.companies.add(record.company);
      const hour = record.hour || "Unknown";
      row.hours.set(hour, (row.hours.get(hour) ?? 0) + 1);
      map.set(region, row);
    });
    return Array.from(map.entries())
      .map(([region, row]) => {
        const peakHourName = Array.from(row.hours.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "--";
        return {
          region,
          calls: row.calls,
          durationSeconds: row.durationSeconds,
          trafficHours: row.trafficHours,
          activeRadios: row.radios.size,
          tgs: row.tgs.size,
          companies: row.companies.size,
          avgDuration: row.calls ? row.durationSeconds / row.calls : 0,
          peakHour: peakHourName,
        };
      })
      .sort((a, b) => b.calls - a.calls);
  }, [filteredRecords]);

  const distributionTop = rankings.region.length > 1 ? rankings.region.slice(0, 7) : rankings.company.slice(0, 7);
  const distributionTotal = distributionTop.reduce((sum, item) => sum + item.calls, 0);
  const callTypeTop = rankings.callType.slice(0, 8).map((item) => ({ ...item, durationMinutes: Math.round(item.durationSeconds / 60) }));
  const radioTypeTop = aggregateRecords("mobileType").slice(0, 8).map((item) => ({ ...item, durationMinutes: Math.round(item.durationSeconds / 60) }));
  const encryptedTop = aggregateRecords("encrypted").slice(0, 5);
  const duplexTop = aggregateRecords("duplexType").slice(0, 6);
  const callTypePie = callTypeTop.slice(0, 5);
  const radioTypePie = radioTypeTop.slice(0, 5);
  const duplexPie = duplexTop.slice(0, 5);
  const callTypeTotal = callTypePie.reduce((sum, item) => sum + item.calls, 0);
  const radioTypeTotal = radioTypePie.reduce((sum, item) => sum + item.calls, 0);
  const encryptedTotal = encryptedTop.reduce((sum, item) => sum + item.calls, 0);
  const duplexTotal = duplexPie.reduce((sum, item) => sum + item.calls, 0);

  const buildCategoryTrend = (field: keyof CallRecord, rows: Ranking[]) => {
    const primaryName = rows[0]?.name || "Top";
    const secondaryName = rows[1]?.name || "Others";
    const trend = monthBuckets.map((month) => ({ month: month.label, primary: 0, secondary: 0 }));
    filteredRecords.forEach((record) => {
      const index = monthIndexFromRecord(record);
      if (index < 0) return;
      const value = String(record[field] || "Unknown").trim() || "Unknown";
      if (value === primaryName) trend[index].primary += 1;
      else if (value === secondaryName) trend[index].secondary += 1;
    });
    return { primaryName, secondaryName, trend };
  };

  const distributionColors = ["var(--chart-calls)", "#7C3AED", "var(--chart-used)", "var(--chart-duration)", "#22C55E", "#FB7185", "#38BDF8"];
  const callTypeColors = ["var(--chart-calls)", "var(--chart-used)", "#7C3AED", "var(--chart-duration)", "#22C55E"];
  const radioTypeColors = ["#7C3AED", "var(--chart-used)", "var(--chart-calls)", "var(--chart-duration)", "#22C55E"];
  const encryptionColors = ["var(--chart-used)", "var(--chart-duration)", "#7C3AED", "var(--chart-calls)", "#22C55E"];
  const duplexColors = ["var(--chart-calls)", "var(--chart-used)", "#7C3AED", "var(--chart-duration)", "#22C55E"];

  const buildMultiCategoryTrend = (field: keyof CallRecord, rows: Ranking[]) => {
    const series = rows.map((row, index) => ({
      name: row.name,
      key: `series${index}`,
      color: radioTypeColors[index % radioTypeColors.length],
    }));
    const trend = monthBuckets.map((month) => {
      const row: Record<string, string | number> = { month: month.label };
      series.forEach((item) => { row[item.key] = 0; });
      return row;
    });
    filteredRecords.forEach((record) => {
      const monthIndex = monthIndexFromRecord(record);
      if (monthIndex < 0) return;
      const value = String(record[field] || "Unknown").trim() || "Unknown";
      const item = series.find((entry) => entry.name === value);
      if (!item) return;
      trend[monthIndex][item.key] = Number(trend[monthIndex][item.key] || 0) + 1;
    });
    return { series, trend };
  };

  const callTypeTrend = buildCategoryTrend("callType", callTypeTop);
  const radioTypeTrend = buildMultiCategoryTrend("mobileType", radioTypePie);
  const duplexTrend = buildCategoryTrend("duplexType", duplexTop);

  const encryptedTrend = monthBuckets.map((month) => ({ month: month.label, encrypted: 0, notEncrypted: 0 }));
  filteredRecords.forEach((record) => {
    const index = monthIndexFromRecord(record);
    if (index < 0) return;
    if ((record.encrypted || "").toLowerCase().includes("not")) encryptedTrend[index].notEncrypted += 1;
    else if ((record.encrypted || "").toLowerCase().includes("encrypt")) encryptedTrend[index].encrypted += 1;
  });


  const distributionLegend = distributionTop.map((item, index) => ({ name: item.name, color: distributionColors[index % distributionColors.length] }));
  const callTypePieLegend = callTypePie.map((item, index) => ({ name: item.name, color: callTypeColors[index % callTypeColors.length] }));
  const radioTypePieLegend = radioTypePie.map((item, index) => ({ name: item.name, color: radioTypeColors[index % radioTypeColors.length] }));
  const encryptedPieLegend = encryptedTop.map((item, index) => ({ name: item.name, color: encryptionColors[index % encryptionColors.length] }));
  const duplexPieLegend = duplexPie.map((item, index) => ({ name: item.name, color: duplexColors[index % duplexColors.length] }));
  const callVolumeLegend = [{ name: "Calls", color: "var(--chart-calls)" }];

  const radioBehavior = useMemo(() => {
    const map = new Map<string, { radioId: string; alias: string; company: string; calls: number; durationSeconds: number; tgs: Set<string>; bs: Set<string> }>();
    filteredRecords.forEach((record) => {
      const key = record.radioId || record.radioAlias || "Unknown";
      const row = map.get(key) ?? { radioId: record.radioId || "--", alias: record.radioAlias || "--", company: record.company || "--", calls: 0, durationSeconds: 0, tgs: new Set<string>(), bs: new Set<string>() };
      row.calls += 1;
      row.durationSeconds += record.durationSeconds || 0;
      if (record.talkgroup) row.tgs.add(record.talkgroup);
      if (record.baseStation) row.bs.add(record.baseStation);
      map.set(key, row);
    });
    return Array.from(map.values()).sort((a, b) => b.durationSeconds - a.durationSeconds).slice(0, 8);
  }, [filteredRecords]);

  const userBehavior = useMemo(() => {
    const map = new Map<string, { user: string; radioIds: Set<string>; calls: number; durationSeconds: number; tgs: Set<string>; bs: Set<string> }>();
    filteredRecords.forEach((record) => {
      const user = record.employeeName || record.radioAlias || record.radioId || "Unknown";
      const row = map.get(user) ?? { user, radioIds: new Set<string>(), calls: 0, durationSeconds: 0, tgs: new Set<string>(), bs: new Set<string>() };
      row.calls += 1;
      row.durationSeconds += record.durationSeconds || 0;
      if (record.radioId) row.radioIds.add(record.radioId);
      if (record.talkgroup) row.tgs.add(record.talkgroup);
      if (record.baseStation) row.bs.add(record.baseStation);
      map.set(user, row);
    });
    return Array.from(map.values()).sort((a, b) => b.durationSeconds - a.durationSeconds).slice(0, 8);
  }, [filteredRecords]);

  const kpiTiles = [
    { label: "Total Calls", value: formatNumber(metrics.totalCalls), icon: <PhoneCall size={18} />, tone: "cyan" as const },
    { label: "Regions", value: formatNumber(metrics.regions), icon: <Activity size={18} />, tone: "green" as const },
    { label: "Companies", value: formatNumber(metrics.companies), icon: <Building2 size={18} />, tone: "purple" as const },
    { label: "Radios", value: formatNumber(metrics.radios), icon: <Radio size={18} />, tone: "amber" as const },
    { label: "TG", value: formatNumber(metrics.talkgroups), icon: <MessageSquare size={18} />, tone: "green" as const },
    { label: "BS", value: formatNumber(metrics.stations), icon: <Antenna size={18} />, tone: "teal" as const },
    { label: "Total Duration", value: secondsToClock(metrics.totalDuration), icon: <Timer size={18} />, tone: "blue" as const },
    { label: "Avg Duration", value: secondsToClock(metrics.averageDuration), icon: <Gauge size={18} />, tone: "purple" as const },
    { label: "Max Duration", value: secondsToClock(maxDuration), icon: <Timer size={18} />, tone: "amber" as const },
    { label: "Min Duration", value: secondsToClock(minDuration), icon: <Timer size={18} />, tone: "blue" as const },
    { label: "Peak Radio", value: topRadio?.name ?? "--", icon: <Radio size={18} />, tone: "amber" as const },
    { label: "Peak User", value: peakUserParts[0] ?? topUser?.name ?? "--", icon: <User size={18} />, tone: "purple" as const },
    { label: "Peak User ID", value: peakUserParts[1] ?? "--", icon: <BadgeCheck size={18} />, tone: "amber" as const },
    { label: "Peak User Co.", value: peakUserParts[2] ?? "--", icon: <Building2 size={18} />, tone: "red" as const },
    { label: "Peak Co.", value: topCompany?.name ?? "--", icon: <Building2 size={18} />, tone: "red" as const },
    { label: "Peak TG", value: topTalkgroup?.name ?? "--", icon: <MessageSquare size={18} />, tone: "green" as const },
    { label: "Peak BS", value: topStation?.name ?? "--", icon: <Antenna size={18} />, tone: "teal" as const },
    { label: "Peak Month", value: topMonth?.name ?? "--", icon: <CalendarDays size={18} />, tone: "red" as const },
    { label: "Peak Week", value: peakWeekName, icon: <CalendarRange size={18} />, tone: "red" as const },
    { label: "Peak Day", value: peakDayName, icon: <CalendarClock size={18} />, tone: "red" as const },
    { label: "Peak Hour", value: topHour?.name ?? "--", icon: <Clock3 size={18} />, tone: "amber" as const },
    { label: "Peak Hour Calls", value: formatNumber(topHour?.calls ?? 0), icon: <PhoneIncoming size={18} />, tone: "amber" as const },
    { label: "Traffic", value: formatDecimal(metrics.trafficHours, 1), icon: <Activity size={18} />, tone: "cyan" as const },
    { label: "Peak Traffic", value: formatDecimal(peakTrafficHour?.trafficHours ?? 0, 1), icon: <Activity size={18} />, tone: "green" as const },
    { label: "Peak Hour Avg", value: formatDecimal(peakHourAvgDuration, 1), icon: <Gauge size={18} />, tone: "purple" as const },
    { label: "Busy Traffic Hour", value: trafficIntensity.busyTrafficHour?.name ?? "--", icon: <Clock3 size={18} />, tone: "cyan" as const },
    { label: "Busy Hour Traffic", value: formatDecimal(trafficIntensity.busyTrafficHour?.trafficHours ?? 0, 2), icon: <Waves size={18} />, tone: "green" as const },
    { label: "Traffic / TG", value: formatDecimal(trafficIntensity.trafficPerTalkgroup, 2), icon: <Waves size={18} />, tone: "blue" as const },
    { label: "Traffic / Co.", value: formatDecimal(trafficIntensity.trafficPerCompany, 2), icon: <Waves size={18} />, tone: "amber" as const },
    { label: "Traffic / Region", value: formatDecimal(trafficIntensity.trafficPerRegion, 2), icon: <Waves size={18} />, tone: "purple" as const },
  ];

  return (
    <section className="modern-overview-shell cdr-saas-overview">
      {showProfile && (
      <section className="modern-profile-band cdr-saas-profile-band">
        <div className="modern-profile-main">
          <img src="/assets/call.png" alt="Calls under analysis" />
          <div>
            <span>Live workbook profile</span>
            <strong>{formatNumber(metrics.totalCalls)}</strong>
            <p>Calls under analysis</p>
          </div>
        </div>
        <div className="modern-profile-card">
          <ShieldCheck size={28} />
          <div>
            <span>Data Source</span>
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
      )}

      <section className="modern-stat-deck cdr-kpi-strip-30" aria-label="CDR KPI strip - 30 cards">
        {kpiTiles.map((tile) => (
          <ModernStatTile key={tile.label} label={tile.label} value={tile.value} icon={tile.icon} tone={tile.tone} />
        ))}
      </section>

      <section className="modern-dashboard-grid cdr-saas-overview-grid">
        <ModernPanel title="Call Volume Over Time" className="modern-panel-wide cdr-overview-volume">
          <ResponsiveContainer width="100%" height={290}>
            <AreaChart data={monthlyTrend} margin={{ left: 4, right: 24, top: 14, bottom: 2 }}>
              <defs>
                <linearGradient id="cdr-volume-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-calls)" stopOpacity={0.78} />
                  <stop offset="100%" stopColor="#1E3A8A" stopOpacity={0.08} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} tickFormatter={shortMonthLabel} interval="preserveStartEnd" minTickGap={28} />
              <YAxis tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} width={48} tickFormatter={chartLabel} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number) => [formatNumber(value), "Calls"]} />
              <Area type="monotone" dataKey="calls" stroke="var(--chart-calls)" fill="url(#cdr-volume-gradient)" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
          <ChartLegend className="cdr-chart-legend cdr-volume-legend" items={callVolumeLegend} />
        </ModernPanel>

        <ModernPanel title={`Call Distribution by ${rankings.region.length > 1 ? "Region" : "Company"}`} className="modern-panel-tg cdr-overview-distribution">
          <div className="modern-donut-layout">
            <div className="modern-donut-chart">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={distributionTop} dataKey="calls" nameKey="name" innerRadius={54} outerRadius={82} paddingAngle={3} label={PieOuterValueLabel} labelLine>
                    {distributionTop.map((item, index) => <Cell key={item.name} fill={distributionColors[index % distributionColors.length]} />)}
                  </Pie>
                  <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" className="modern-pie-center-value">{formatNumber(distributionTotal)}</text>
                  <text x="50%" y="57%" textAnchor="middle" dominantBaseline="middle" className="modern-pie-center-label">Total</text>
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number) => formatNumber(value)} />
                </PieChart>
              </ResponsiveContainer>
              <ChartLegend className="cdr-chart-legend cdr-pie-legend" items={distributionLegend} />
            </div>
          </div>
        </ModernPanel>
      </section>

      <ModernPanel title="Performance Matrix" className="modern-panel-table-wide cdr-performance-matrix-panel">
        <div className="modern-table-wrap cdr-performance-matrix-wrap">
          <table className="modern-table cdr-performance-matrix-table">
            <thead>
              <tr><th>Region</th><th>Calls</th><th>Duration</th><th>Traffic</th><th>Active Radios</th><th>TGs</th><th>Companies</th><th>Avg Duration</th><th>Peak Hour</th></tr>
            </thead>
            <tbody>
              {regionMatrix.map((row) => (
                <tr key={row.region}>
                  <td title={row.region}>{row.region}</td>
                  <td>{formatNumber(row.calls)}</td>
                  <td>{secondsToClock(row.durationSeconds)}</td>
                  <td>{formatDecimal(row.trafficHours, 2)}</td>
                  <td>{formatNumber(row.activeRadios)}</td>
                  <td>{formatNumber(row.tgs)}</td>
                  <td>{formatNumber(row.companies)}</td>
                  <td>{secondsToClock(row.avgDuration)}</td>
                  <td>{row.peakHour}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ModernPanel>

      <section className="modern-dashboard-grid cdr-deep-dive-grid">
        <ModernPanel title="Call Type Analysis" className="modern-panel-call-type">
          <div className="cdr-split-chart">
            <div className="modern-donut-chart">
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie data={callTypePie} dataKey="calls" nameKey="name" innerRadius={42} outerRadius={66} paddingAngle={2} label={PieOuterValueLabel} labelLine>
                    {callTypePie.map((item, index) => <Cell key={item.name} fill={callTypeColors[index % callTypeColors.length]} />)}
                  </Pie>
                  <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" className="modern-pie-center-value">{formatNumber(callTypeTotal)}</text>
                  <text x="50%" y="57%" textAnchor="middle" dominantBaseline="middle" className="modern-pie-center-label">Total</text>
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number) => formatNumber(value)} />
                </PieChart>
              </ResponsiveContainer>
              <ChartLegend className="cdr-chart-legend cdr-pie-legend" items={callTypePieLegend} />
            </div>
            <div className="cdr-trend-chart-block">
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={callTypeTrend.trend} margin={{ left: 0, right: 12, top: 12, bottom: 0 }}>
                <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: CHART_COLORS.axis, fontSize: 10 }} />
                <YAxis tick={{ fill: CHART_COLORS.axis, fontSize: 10 }} tickFormatter={chartLabel} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number, name) => [formatNumber(value), name === "primary" ? callTypeTrend.primaryName : callTypeTrend.secondaryName]} />
                <Area type="monotone" dataKey="primary" name={callTypeTrend.primaryName} stroke="var(--chart-calls)" fill="var(--chart-calls)" fillOpacity={0.18} strokeWidth={2.5} />
                <Area type="monotone" dataKey="secondary" name={callTypeTrend.secondaryName} stroke="var(--chart-used)" fill="var(--chart-used)" fillOpacity={0.10} strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
            <ChartLegend className="cdr-chart-legend cdr-trend-legend" items={[{ name: callTypeTrend.primaryName, color: "var(--chart-calls)" }, { name: callTypeTrend.secondaryName, color: "var(--chart-used)" }]} />
            </div>
          </div>
        </ModernPanel>

        <ModernPanel title="Radio Type Usage" className="modern-panel-radio-type">
          <div className="cdr-split-chart">
            <div className="modern-donut-chart">
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie data={radioTypePie} dataKey="calls" nameKey="name" innerRadius={42} outerRadius={66} paddingAngle={2} label={PieOuterValueLabel} labelLine>
                    {radioTypePie.map((item, index) => <Cell key={item.name} fill={radioTypeColors[index % radioTypeColors.length]} />)}
                  </Pie>
                  <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" className="modern-pie-center-value">{formatNumber(radioTypeTotal)}</text>
                  <text x="50%" y="57%" textAnchor="middle" dominantBaseline="middle" className="modern-pie-center-label">Total</text>
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number) => formatNumber(value)} />
                </PieChart>
              </ResponsiveContainer>
              <ChartLegend className="cdr-chart-legend cdr-pie-legend" items={radioTypePieLegend} />
            </div>
            <div className="cdr-trend-chart-block">
            <ResponsiveContainer width="100%" height={210}>
              <LineChart data={radioTypeTrend.trend} margin={{ left: 0, right: 12, top: 12, bottom: 0 }}>
                <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: CHART_COLORS.axis, fontSize: 10 }} />
                <YAxis tick={{ fill: CHART_COLORS.axis, fontSize: 10 }} tickFormatter={chartLabel} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number, name) => {
                  const matched = radioTypeTrend.series.find((item) => item.key === name);
                  return [formatNumber(value), matched?.name || name];
                }} />
                {radioTypeTrend.series.map((item) => (
                  <Line
                    key={item.key}
                    type="monotone"
                    dataKey={item.key}
                    name={item.name}
                    stroke={item.color}
                    strokeWidth={2.4}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
            <ChartLegend className="cdr-chart-legend cdr-trend-legend" items={radioTypeTrend.series.map((item) => ({ name: item.name, color: item.color }))} />
            </div>
          </div>
        </ModernPanel>

        <ModernPanel title="Encryption Analysis" className="modern-panel-encryption">
          <div className="cdr-split-chart">
            <div className="modern-donut-chart">
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie data={encryptedTop} dataKey="calls" nameKey="name" innerRadius={42} outerRadius={66} paddingAngle={2} label={PieOuterValueLabel} labelLine>
                    {encryptedTop.map((item, index) => <Cell key={item.name} fill={encryptionColors[index % encryptionColors.length]} />)}
                  </Pie>
                  <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" className="modern-pie-center-value">{formatNumber(encryptedTotal)}</text>
                  <text x="50%" y="57%" textAnchor="middle" dominantBaseline="middle" className="modern-pie-center-label">Total</text>
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number) => formatNumber(value)} />
                </PieChart>
              </ResponsiveContainer>
              <ChartLegend className="cdr-chart-legend cdr-pie-legend" items={encryptedPieLegend} />
            </div>
            <div className="cdr-trend-chart-block">
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={encryptedTrend} margin={{ left: 0, right: 12, top: 12, bottom: 0 }}>
                <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: CHART_COLORS.axis, fontSize: 10 }} />
                <YAxis tick={{ fill: CHART_COLORS.axis, fontSize: 10 }} tickFormatter={chartLabel} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number) => formatNumber(value)} />
                <Area type="monotone" dataKey="encrypted" name="Encrypted" stroke="var(--chart-used)" fill="var(--chart-used)" fillOpacity={0.18} strokeWidth={2.5} />
                <Area type="monotone" dataKey="notEncrypted" name="Not Encrypted" stroke="var(--chart-duration)" fill="var(--chart-duration)" fillOpacity={0.10} strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
            <ChartLegend className="cdr-chart-legend cdr-trend-legend" items={[{ name: "Encrypted", color: "var(--chart-used)" }, { name: "Not Encrypted", color: "var(--chart-duration)" }]} />
            </div>
          </div>
        </ModernPanel>

        <ModernPanel title="Duplex Mode Analysis" className="modern-panel-duplex">
          <div className="cdr-split-chart">
            <div className="modern-donut-chart">
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie data={duplexPie} dataKey="calls" nameKey="name" innerRadius={42} outerRadius={66} paddingAngle={2} label={PieOuterValueLabel} labelLine>
                    {duplexPie.map((item, index) => <Cell key={item.name} fill={duplexColors[index % duplexColors.length]} />)}
                  </Pie>
                  <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" className="modern-pie-center-value">{formatNumber(duplexTotal)}</text>
                  <text x="50%" y="57%" textAnchor="middle" dominantBaseline="middle" className="modern-pie-center-label">Total</text>
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number) => formatNumber(value)} />
                </PieChart>
              </ResponsiveContainer>
              <ChartLegend className="cdr-chart-legend cdr-pie-legend" items={duplexPieLegend} />
            </div>
            <div className="cdr-trend-chart-block">
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={duplexTrend.trend} margin={{ left: 0, right: 12, top: 12, bottom: 0 }}>
                <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: CHART_COLORS.axis, fontSize: 10 }} />
                <YAxis tick={{ fill: CHART_COLORS.axis, fontSize: 10 }} tickFormatter={chartLabel} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number, name) => [formatNumber(value), name === "primary" ? duplexTrend.primaryName : duplexTrend.secondaryName]} />
                <Area type="monotone" dataKey="primary" name={duplexTrend.primaryName} stroke="var(--chart-calls)" fill="var(--chart-calls)" fillOpacity={0.18} strokeWidth={2.5} />
                <Area type="monotone" dataKey="secondary" name={duplexTrend.secondaryName} stroke="var(--chart-used)" fill="var(--chart-used)" fillOpacity={0.10} strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
            <ChartLegend className="cdr-chart-legend cdr-trend-legend" items={[{ name: duplexTrend.primaryName, color: "var(--chart-calls)" }, { name: duplexTrend.secondaryName, color: "var(--chart-used)" }]} />
            </div>
          </div>
        </ModernPanel>
      </section>

      <section className="modern-dashboard-grid cdr-top-entities-grid">
        <ModernPanel title="Top 10 Base Stations" className="modern-panel-top-bs"><RankTable className="modern-ranking-table-wrap" rows={rankings.station.slice(0, 10)} columns={["rank", "name", "calls", "duration"]} /></ModernPanel>
        <ModernPanel title="Top 10 Talkgroups" className="modern-panel-talkgroups"><RankTable className="modern-ranking-table-wrap" rows={rankings.talkgroup.slice(0, 10)} columns={["rank", "name", "duration", "calls"]} /></ModernPanel>
        <ModernPanel title="Top 10 Users (Call Minutes)" className="modern-panel-users"><RankTable className="modern-ranking-table-wrap" rows={[...rankings.user].sort((a, b) => b.durationSeconds - a.durationSeconds).slice(0, 10)} columns={["rank", "name", "duration", "calls"]} /></ModernPanel>
      </section>

      <section className="cdr-behavior-grid">
        <ModernPanel title="Radio Behavior" className="cdr-behavior-panel">
          <div className="modern-table-wrap"><table className="modern-table cdr-behavior-table"><thead><tr><th>Radio ID</th><th>Alias</th><th>Company</th><th>Calls</th><th>Duration</th><th>Avg Duration</th><th>TGs</th><th>BS</th></tr></thead><tbody>{radioBehavior.map((row) => <tr key={row.radioId + row.alias}><td>{row.radioId}</td><td title={row.alias}>{row.alias}</td><td title={row.company}>{row.company}</td><td>{formatNumber(row.calls)}</td><td>{secondsToClock(row.durationSeconds)}</td><td>{secondsToClock(row.calls ? row.durationSeconds / row.calls : 0)}</td><td>{formatNumber(row.tgs.size)}</td><td>{formatNumber(row.bs.size)}</td></tr>)}</tbody></table></div>
        </ModernPanel>
        <ModernPanel title="User Behavior" className="cdr-behavior-panel">
          <div className="modern-table-wrap"><table className="modern-table cdr-behavior-table"><thead><tr><th>User</th><th>Calls</th><th>Duration</th><th>Avg Duration</th><th>Radios</th><th>TGs</th><th>BS</th></tr></thead><tbody>{userBehavior.map((row) => <tr key={row.user}><td title={row.user}>{row.user}</td><td>{formatNumber(row.calls)}</td><td>{secondsToClock(row.durationSeconds)}</td><td>{secondsToClock(row.calls ? row.durationSeconds / row.calls : 0)}</td><td>{formatNumber(row.radioIds.size)}</td><td>{formatNumber(row.tgs.size)}</td><td>{formatNumber(row.bs.size)}</td></tr>)}</tbody></table></div>
        </ModernPanel>
      </section>

      <section className="modern-quality-strip cdr-quality-footer-strip">
        <ModernQualityTile label="Data Quality Score" value={`${formatDecimal(qualityScore, 1)}%`} detail={`${formatNumber(totalCount)} source rows checked`} />
        {qualityIssues.map((issue) => <ModernQualityTile key={issue.name} label={issue.name} value={formatNumber(issue.count)} detail={`${formatDecimal(issue.pct, 1)}%`} />)}
        <article className="modern-record-card"><span>Filtered Records</span><strong>{formatNumber(filteredCount)}</strong><small>{filteredPct.toFixed(1)}% of {formatNumber(totalCount)} rows</small><em>as of {loadedAt}</em></article>
      </section>

      <footer className="modern-status-footer cdr-saas-footer">
        <span>Data Source: {data.fileName}</span>
        <span>Last Refresh: {loadedAt}</span>
        <span>Total Records Loaded: {formatNumber(totalCount)}</span>
        <span>Processing Profile: {formatNumber(filteredCount)} filtered rows</span>
        <span><i /> Data is current</span>
      </footer>
    </section>
  );
}