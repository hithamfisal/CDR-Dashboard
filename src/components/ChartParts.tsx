import { CHART_COLORS } from "../lib/dashboardConstants";
import { chartLabel, formatDecimal, formatNumber, secondsToClock } from "../lib/formatters";
import { mobileTypeColor, mobileTypeKey, truncateLabel } from "../lib/chartHelpers";
import type { Ranking } from "../types/dashboard";
import { ChartLegend } from "./DashboardUi";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function KpiBarLabel(props: any) {
  const value = Number(props.value ?? 0);
  if (!Number.isFinite(value) || value <= 0) return null;
  const x = Number(props.x ?? 0) + Number(props.width ?? 0) / 2;
  const y = Number(props.y ?? 0) - 8;
  return <text x={x} y={y} textAnchor="middle" fill={CHART_COLORS.label} stroke={CHART_COLORS.labelStroke} strokeWidth={3} paintOrder="stroke" fontSize={11} fontWeight={900}>{chartLabel(value)}</text>;
}

export function KpiLineLabel(props: any) {
  const value = Number(props.value ?? 0);
  if (!Number.isFinite(value) || value <= 0) return null;
  const x = Number(props.x ?? 0);
  const y = Number(props.y ?? 0) - 16;
  return <text x={x} y={y} textAnchor="middle" fill={CHART_COLORS.duration} stroke={CHART_COLORS.labelStroke} strokeWidth={3} paintOrder="stroke" fontSize={11} fontWeight={900}>{chartLabel(value)}</text>;
}

export function TopValueLabel(props: any) {
  const value = Number(props.value ?? 0);
  if (!Number.isFinite(value) || value <= 0) return null;
  const x = Number(props.x ?? 0) + Number(props.width ?? 0) / 2;
  const y = Number(props.y ?? 0) - 7;
  return <text x={x} y={y} textAnchor="middle" fill={CHART_COLORS.label} stroke={CHART_COLORS.labelStroke} strokeWidth={3} paintOrder="stroke" fontSize={10} fontWeight={900}>{chartLabel(value)}</text>;
}

export function RightValueLabel(props: any) {
  const value = Number(props.value ?? 0);
  if (!Number.isFinite(value) || value <= 0) return null;
  const x = Number(props.x ?? 0) + Number(props.width ?? 0) + 8;
  const y = Number(props.y ?? 0) + Number(props.height ?? 0) / 2 + 4;
  return <text x={x} y={y} textAnchor="start" fill={CHART_COLORS.label} stroke={CHART_COLORS.labelStroke} strokeWidth={3} paintOrder="stroke" fontSize={10} fontWeight={900}>{chartLabel(value)}</text>;
}

export function PointValueLabel(props: any) {
  const value = Number(props.value ?? 0);
  if (!Number.isFinite(value) || value <= 0) return null;
  const x = Number(props.x ?? 0);
  const y = Number(props.y ?? 0) - 12;
  return <text x={x} y={y} textAnchor="middle" fill={props.fill ?? CHART_COLORS.label} stroke={CHART_COLORS.labelStroke} strokeWidth={3} paintOrder="stroke" fontSize={10} fontWeight={900}>{chartLabel(value)}</text>;
}

export function PieValueLabel(props: any) {
  const value = Number(props.value ?? 0);
  if (!Number.isFinite(value) || value <= 0) return null;
  return <text x={props.x} y={props.y} textAnchor="middle" dominantBaseline="central" fill={CHART_COLORS.label} stroke={CHART_COLORS.labelStroke} strokeWidth={3} paintOrder="stroke" fontSize={10} fontWeight={900}>{chartLabel(value)}</text>;
}

export function PieDurationLabel(props: any) {
  const value = Number(props.value ?? 0);
  if (!Number.isFinite(value) || value <= 0) return null;
  return <text x={props.x} y={props.y} textAnchor="middle" dominantBaseline="central" fill={CHART_COLORS.label} stroke={CHART_COLORS.labelStroke} strokeWidth={3} paintOrder="stroke" fontSize={10} fontWeight={900}>{secondsToClock(value)}</text>;
}

export function PieDecimalLabel(props: any) {
  const value = Number(props.value ?? 0);
  if (!Number.isFinite(value) || value <= 0) return null;
  return <text x={props.x} y={props.y} textAnchor="middle" dominantBaseline="central" fill={CHART_COLORS.label} stroke={CHART_COLORS.labelStroke} strokeWidth={3} paintOrder="stroke" fontSize={10} fontWeight={900}>{formatDecimal(value, 2)}</text>;
}

export function CompanyPerformanceTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload ?? {};
  return (
    <div className="custom-tooltip">
      <strong>{row.name ?? label}</strong>
      <span>Calls: {formatNumber(row.calls ?? 0)}</span>
      <span>Duration: {secondsToClock(row.durationSeconds ?? 0)}</span>
    </div>
  );
}

export function TalkgroupTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="custom-tooltip">
      <strong>{row.name}</strong>
      <span>Total talkgroups: {formatNumber(row.total ?? 0)}</span>
      <span>Used talkgroups: {formatNumber(row.used ?? 0)}</span>
    </div>
  );
}

export function RadioTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="custom-tooltip">
      <strong>{row.name}</strong>
      <span>Total radios: {formatNumber(row.total ?? 0)}</span>
      <span>Radios made calls: {formatNumber(row.used ?? 0)}</span>
    </div>
  );
}

export function MobileTypeTooltip({ active, payload, label, mobileTypes = [] }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload ?? {};
  return (
    <div className="custom-tooltip">
      <strong>{row.name ?? label}</strong>
      <span>Total radios: {formatNumber(row.total ?? 0)}</span>
      {mobileTypes.map((type: string) => (
        <span key={type}>{type}: {formatNumber(row[mobileTypeKey(type)] ?? 0)}</span>
      ))}
    </div>
  );
}

export function CallsDurationPerformanceChart({ title, data, height = 360, xTickFormatter = (value: unknown) => truncateLabel(value, 18), gradientId }: { title: string; data: Ranking[]; height?: number; xTickFormatter?: (value: unknown) => string; gradientId: string }) {
  return (
    <>
      <h3>{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ left: 0, right: 8, top: 18, bottom: 0 }}>
          <defs>
            <linearGradient id={`${gradientId}Calls`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.callsLight} stopOpacity={0.98} />
              <stop offset="55%" stopColor={CHART_COLORS.calls} stopOpacity={0.9} />
              <stop offset="100%" stopColor={CHART_COLORS.callsDeep} stopOpacity={0.76} />
            </linearGradient>
            <filter id={`${gradientId}Glow`} x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" vertical={false} opacity={0.32} />
          <XAxis dataKey="name" tick={{ fill: CHART_COLORS.axis, fontSize: 10 }} interval={0} angle={-35} textAnchor="end" tickMargin={10} height={72} tickFormatter={xTickFormatter} />
          <YAxis yAxisId="calls" tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} tickFormatter={chartLabel} />
          <YAxis yAxisId="duration" orientation="right" tick={{ fill: CHART_COLORS.durationDeep, fontSize: 11 }} tickFormatter={chartLabel} />
          <Tooltip content={<CompanyPerformanceTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
          <Bar yAxisId="calls" dataKey="calls" name="Calls" fill={`url(#${gradientId}Calls)`} radius={[8, 8, 0, 0]} maxBarSize={42}>
            <LabelList dataKey="calls" content={TopValueLabel} />
          </Bar>
          <Line yAxisId="duration" type="monotone" dataKey="durationSeconds" name="Duration seconds" stroke={CHART_COLORS.duration} strokeWidth={4} dot={{ r: 5, fill: CHART_COLORS.duration, stroke: CHART_COLORS.durationLight, strokeWidth: 2 }} activeDot={{ r: 8 }} style={{ filter: `url(#${gradientId}Glow)` }}>
            <LabelList dataKey="durationSeconds" content={(props) => <PointValueLabel {...props} fill={CHART_COLORS.duration} />} />
          </Line>
        </ComposedChart>
      </ResponsiveContainer>
      <ChartLegend items={[{ name: "Total calls", color: CHART_COLORS.calls }, { name: "Total duration", color: CHART_COLORS.duration }]} />
    </>
  );
}

export function MobileTypeOverlayBarShape(props: any) {
  const { x, y, width, height, value, payload, mobileTypes = [] } = props;
  const total = Number(value ?? 0);
  if (!height || height <= 0 || total <= 0) return <g />;
  const safeY = Math.max(y, 6);
  const safeHeight = Math.max(0, height - (safeY - y));
  const wideW = Math.min(Math.max(width * 0.78, 34), 64);
  const cx = x + width / 2;
  const activeTypes = mobileTypes.filter((type: string) => Number(payload[mobileTypeKey(type)] ?? 0) > 0);
  const narrowW = Math.max(5, Math.min(13, (wideW - 8) / Math.max(1, activeTypes.length)));
  const groupW = activeTypes.length ? activeTypes.length * narrowW + (activeTypes.length - 1) * 3 : 0;
  const startX = cx - groupW / 2;
  return (
    <g>
      <rect x={cx - wideW / 2} y={safeY} width={wideW} height={safeHeight} fill={CHART_COLORS.total} opacity={0.9} rx={5} />
      <text x={cx} y={Math.max(12, safeY - 7)} textAnchor="middle" fill={CHART_COLORS.label} stroke={CHART_COLORS.labelStroke} strokeWidth={3} paintOrder="stroke" fontSize={9} fontWeight={900}>{chartLabel(total)}</text>
      {activeTypes.map((type: string, index: number) => {
        const typeValue = Number(payload[mobileTypeKey(type)] ?? 0);
        const barHeight = Math.min(safeHeight, (typeValue / total) * safeHeight);
        const barX = startX + index * (narrowW + 3);
        const barY = y + height - barHeight;
        const labelX = barX + narrowW / 2;
        const labelY = barY + barHeight / 2;
        return (
          <g key={type}>
            <rect x={barX} y={barY} width={narrowW} height={barHeight} fill={mobileTypeColor(type)} rx={3} />
            {typeValue > 0 && barHeight > 18 && (
              <text x={labelX} y={labelY} textAnchor="middle" dominantBaseline="central" transform={`rotate(-90 ${labelX} ${labelY})`} fill={CHART_COLORS.label} stroke={CHART_COLORS.labelStroke} strokeWidth={3} paintOrder="stroke" fontSize={8} fontWeight={900}>{chartLabel(typeValue)}</text>
            )}
          </g>
        );
      })}
    </g>
  );
}

export function OverlayBarShape(props: any) {
  const { x, y, width, height, value, payload, totalColor, usedColor } = props;
  if (!height || height <= 0) return <g />;
  const wideW = Math.min(width * 0.85, 48);
  const narrowW = Math.min(width * 0.42, 22);
  const cx = x + width / 2;
  const usedVal = payload.used ?? 0;
  const safeY = Math.max(y, 4);
  const safeHeight = Math.max(0, height - (safeY - y));
  const usedH = safeHeight > 0 && value > 0 ? Math.min(safeHeight, (usedVal / value) * safeHeight) : 0;
  const usedY = y + height - usedH;
  const totalLabelY = Math.max(12, safeY - 6);
  const usedLabelX = cx + narrowW / 2 + 10;
  const usedLabelY = usedY + usedH / 2;
  return (
    <g>
      <rect x={cx - wideW / 2} y={safeY} width={wideW} height={safeHeight} fill={totalColor} rx={4} />
      <rect x={cx - narrowW / 2} y={usedY} width={narrowW} height={usedH} fill={usedColor} rx={3} />
      <text x={cx} y={totalLabelY} textAnchor="middle" fill={CHART_COLORS.label} stroke={CHART_COLORS.labelStroke} strokeWidth={3} paintOrder="stroke" fontSize={9} fontWeight={900}>{chartLabel(value)}</text>
      {usedVal > 0 && (
        <text x={usedLabelX} y={usedLabelY} textAnchor="middle" dominantBaseline="central" transform={`rotate(-90 ${usedLabelX} ${usedLabelY})`} fill={CHART_COLORS.label} stroke={CHART_COLORS.labelStroke} strokeWidth={3} paintOrder="stroke" fontSize={9} fontWeight={900}>{chartLabel(usedVal)}</text>
      )}
    </g>
  );
}
