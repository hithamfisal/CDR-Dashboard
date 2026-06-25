import { ReactElement, RefObject } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, ResponsiveContainer, Treemap, Tooltip, XAxis, YAxis } from "recharts";
import { ChartLegend } from "./DashboardUi";
import {
  CallsDurationPerformanceChart,
  CompanyPerformanceTooltip,
  MobileTypeOverlayBarShape,
  MobileTypeTooltip,
  OverlayBarShape,
  RadioTooltip,
  RightValueLabel,
  TalkgroupTooltip,
  TopValueLabel,
} from "./ChartParts";
import { CHART_COLORS, COLORS, TOOLTIP_STYLE } from "../lib/dashboardConstants";
import { chartLabel, formatNumber } from "../lib/formatters";
import { companyColor, companyMetricColor, mobileTypeColor, mobileTypeKey, shortMonthLabel, truncateLabel } from "../lib/chartHelpers";
import type { Ranking } from "../types/dashboard";

type ChartsTabProps = {
  monthlyCompanyChartRef: RefObject<HTMLElement | null>;
  monthlyCompanyRows: any[];
  mobileTypeByMonth: Record<string, string | number>[];
  mobileTypeByCompany: Record<string, string | number>[];
  mobileTypes: string[];
  rankings: {
    callType: Ranking[];
    callPriority: Ranking[];
    duplexType: Ranking[];
    encrypted: Ranking[];
    talkgroup: Ranking[];
    station: Ranking[];
  };
  callTypeMonthlyMix: Record<string, string | number>[];
  callTypeSeries: { key: string; name: string; color: string }[];
  stackedPercentLabel: (props: any) => ReactElement | null;
  callTypeMixTooltip: ReactElement;
  topTalkgroupDistribution: Ranking[];
  topCompanyTreemapData: any[];
  companyTreemapTile: ReactElement;
  CompanyChartData: {
    totalTalkgroups: { name: string; value: number }[];
    talkgroupsUsed: { name: string; value: number }[];
    totalUsers: { name: string; value: number }[];
    callingUsers: { name: string; value: number }[];
  };
};

export function ChartsTab({
  monthlyCompanyChartRef,
  monthlyCompanyRows,
  mobileTypeByMonth,
  mobileTypeByCompany,
  mobileTypes,
  rankings,
  callTypeMonthlyMix,
  callTypeSeries,
  stackedPercentLabel,
  callTypeMixTooltip,
  topTalkgroupDistribution,
  topCompanyTreemapData,
  companyTreemapTile,
  CompanyChartData,
}: ChartsTabProps) {
  const flexChartStyle = { flex: 1, minHeight: 0 } as any;

  return (
    <section id="Charts-content" className="chart-grid charts-arranged-grid">
      <article className="chart-card monthly-Company-card charts-calls-duration" ref={monthlyCompanyChartRef} style={{ display: "flex", flexDirection: "column" }}>
        <h3>Calls and Duration per Company</h3>
        <div className="company-color-legend" style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginBottom: 6 }}>
          {[...new Set(monthlyCompanyRows.map((r) => r.company))].map((company) => (
            <span key={company} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--design-muted)" }}>
              <i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: companyColor(company), flexShrink: 0 }} />
              {company}
            </span>
          ))}
        </div>
        <ResponsiveContainer width="100%" style={flexChartStyle}>
          <BarChart data={monthlyCompanyRows} margin={{ left: 8, right: 16, top: 18, bottom: 4 }} barCategoryGap="18%" barGap={2}>
            <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" opacity={0.25} vertical={false} />
            <XAxis xAxisId="company" dataKey="companyLabel" interval={0} angle={-55} textAnchor="end" height={90} tickMargin={6} tick={{ fill: CHART_COLORS.axis, fontSize: 10 }} axisLine={false} tickLine={false} />
            <XAxis xAxisId="month" dataKey="periodLabel" interval={0} axisLine={{ stroke: "rgba(100,160,200,0.25)" }} tickLine={false} height={22} tick={{ fill: "#7eb8d4", fontSize: 11, fontWeight: 700 }} />
            <YAxis yAxisId="duration" tick={{ fill: CHART_COLORS.axis, fontSize: 10 }} tickFormatter={chartLabel} axisLine={false} tickLine={false} width={42} />
            <YAxis yAxisId="calls" orientation="right" tick={{ fill: CHART_COLORS.axis, fontSize: 10 }} tickFormatter={chartLabel} axisLine={false} tickLine={false} width={42} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, name: string) => [formatNumber(v), name]} labelFormatter={(_, payload) => { const r = payload?.[0]?.payload; return r ? `${r.periodType} ${r.period} - ${r.company}` : ""; }} />
            <Bar xAxisId="company" yAxisId="duration" dataKey="durationSeconds" name="Duration (Sec)" maxBarSize={22} radius={[3, 3, 0, 0]}>
              {monthlyCompanyRows.map((entry) => <Cell key={`dur-${entry.period}-${entry.company}`} fill={companyMetricColor(entry.company, "duration")} />)}
              <LabelList dataKey="durationSeconds" content={TopValueLabel} />
            </Bar>
            <Bar xAxisId="company" yAxisId="calls" dataKey="calls" name="No. of Calls" maxBarSize={22} radius={[3, 3, 0, 0]}>
              {monthlyCompanyRows.map((entry) => <Cell key={`calls-${entry.period}-${entry.company}`} fill={companyMetricColor(entry.company, "calls")} />)}
              <LabelList dataKey="calls" content={(props) => <TopValueLabel {...props} />} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <ChartLegend items={[{ name: "Duration (Sec)", color: CHART_COLORS.duration }, { name: "No. of Calls", color: CHART_COLORS.callsDeep }]} />
      </article>

      <article className="chart-card general-mobile-type charts-radio-month" style={{ display: "flex", flexDirection: "column" }}>
        <h3>Radio Type per Month</h3>
        <ChartLegend items={mobileTypes.map((type) => ({ name: type, color: mobileTypeColor(type) }))} />
        <ResponsiveContainer width="100%" style={flexChartStyle}>
          <LineChart data={mobileTypeByMonth} margin={{ left: 0, right: 16, top: 14, bottom: 0 }}>
            <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" opacity={0.32} vertical={false} />
            <XAxis dataKey="name" tick={{ fill: CHART_COLORS.axis, fontSize: 9 }} axisLine={false} tickLine={false} interval={0} angle={-35} textAnchor="end" height={52} tickMargin={8} tickFormatter={shortMonthLabel} />
            <YAxis tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatNumber(v)} domain={[0, (dm: number) => Math.ceil(dm * 1.18)]} />
            <Tooltip content={(props) => <MobileTypeTooltip {...props} mobileTypes={mobileTypes} />} />
            {mobileTypes.map((type) => (
              <Line key={type} type="monotone" dataKey={mobileTypeKey(type)} name={type} stroke={mobileTypeColor(type)} strokeWidth={2.2} dot={{ r: 3, fill: mobileTypeColor(type) }} activeDot={{ r: 5 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </article>

      <article className="chart-card charts-call-type">
        <CallsDurationPerformanceChart title="Call Type" data={rankings.callType} height={200} gradientId="callTypePerformance" />
      </article>
      <article className="chart-card charts-priority">
        <CallsDurationPerformanceChart title="Call Priority" data={rankings.callPriority} height={220} gradientId="callPriorityPerformance" />
      </article>
      <article className="chart-card charts-duplex">
        <h3>Duplex Type</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={rankings.duplexType} margin={{ left: 0, right: 8, top: 18, bottom: 0 }}>
            <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" opacity={0.32} vertical={false} />
            <XAxis dataKey="name" tick={{ fill: CHART_COLORS.axis, fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={54} tickFormatter={(v) => truncateLabel(v, 18)} />
            <YAxis tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} tickFormatter={chartLabel} />
            <Tooltip content={<CompanyPerformanceTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <Bar dataKey="durationSeconds" name="Duration seconds" fill={CHART_COLORS.duration} radius={[8, 8, 0, 0]} maxBarSize={58}>
              <LabelList dataKey="durationSeconds" content={TopValueLabel} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <ChartLegend items={[{ name: "Duration seconds", color: CHART_COLORS.duration }]} />
      </article>
      <article className="chart-card charts-encrypted">
        <CallsDurationPerformanceChart title="Encrypted" data={rankings.encrypted} height={220} gradientId="encryptedPerformance" />
      </article>

      <article className="chart-card charts-call-type-distribution" style={{ display: "flex", flexDirection: "column" }}>
        <h3>Call Type Distribution</h3>
        <ResponsiveContainer width="100%" style={flexChartStyle}>
          <BarChart data={callTypeMonthlyMix} margin={{ left: 0, right: 8, top: 12, bottom: 0 }}>
            <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" opacity={0.32} vertical={false} />
            <XAxis dataKey="month" tick={{ fill: CHART_COLORS.axis, fontSize: 10, fontWeight: 700 }} interval={0} />
            <YAxis tick={{ fill: CHART_COLORS.axis, fontSize: 10 }} width={38} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
            <Tooltip content={callTypeMixTooltip} />
            {callTypeSeries.map((series) => (
              <Bar key={series.key} dataKey={series.key} name={series.name} stackId="callType" fill={series.color}>
                <LabelList dataKey={series.key} content={stackedPercentLabel} />
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
        <ChartLegend items={callTypeSeries.map((series) => ({ name: series.name, color: series.color }))} />
      </article>

      <article className="chart-card charts-top-talkgroup">
        <h3>Top TG by Calls</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart layout="vertical" data={rankings.talkgroup.slice(0, 10)} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
            <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" opacity={0.32} horizontal={false} />
            <XAxis type="number" tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} />
            <YAxis type="category" dataKey="name" width={122} tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} tickFormatter={(v) => truncateLabel(v, 16)} interval={0} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => formatNumber(v)} />
            <Bar dataKey="calls" fill={CHART_COLORS.calls}><LabelList dataKey="calls" content={RightValueLabel} /></Bar>
          </BarChart>
        </ResponsiveContainer>
        <ChartLegend items={[{ name: "Calls", color: CHART_COLORS.calls }]} />
      </article>
      <article className="chart-card charts-top-company">
        <h3>Top Companies by Calls</h3>
        <ResponsiveContainer width="100%" height={260}>
          <Treemap data={topCompanyTreemapData} dataKey="size" nameKey="name" aspectRatio={4 / 3} stroke="rgba(237,246,250,0.2)" content={companyTreemapTile}>
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, name: string, item: any) => [formatNumber(item?.payload?.calls ?? v), "Calls"]} />
          </Treemap>
        </ResponsiveContainer>
        <ChartLegend items={topCompanyTreemapData.map((item) => ({ name: truncateLabel(item.name, 20), color: item.fill }))} />
      </article>
      <article className="chart-card charts-top-station">
        <h3>Top BS by Calls</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart layout="vertical" data={rankings.station.slice(0, 10)} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
            <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" opacity={0.32} horizontal={false} />
            <XAxis type="number" tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} />
            <YAxis type="category" dataKey="name" width={122} tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} tickFormatter={(v) => truncateLabel(v, 16)} interval={0} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => formatNumber(v)} />
            <Bar dataKey="calls" fill={CHART_COLORS.duration}><LabelList dataKey="calls" content={RightValueLabel} /></Bar>
          </BarChart>
        </ResponsiveContainer>
        <ChartLegend items={[{ name: "Calls", color: CHART_COLORS.duration }]} />
      </article>
      <article className="chart-card charts-tg-distribution">
        <h3>Call Distribution by TG</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart layout="vertical" data={topTalkgroupDistribution} margin={{ left: 0, right: 32, top: 8, bottom: 0 }}>
            <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" opacity={0.32} horizontal={false} />
            <XAxis type="number" tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} tickFormatter={(v) => formatNumber(v)} />
            <YAxis type="category" dataKey="name" width={120} tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} tickFormatter={(v) => truncateLabel(v, 16)} interval={0} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => formatNumber(v)} />
            <Bar dataKey="calls" radius={[0, 6, 6, 0]} maxBarSize={28}>
              {topTalkgroupDistribution.map((item, index) => (
                <Cell key={item.name} fill={COLORS[index % COLORS.length]} />
              ))}
              <LabelList dataKey="calls" content={RightValueLabel} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <ChartLegend items={topTalkgroupDistribution.map((item, index) => ({ name: truncateLabel(item.name, 18), color: COLORS[index % COLORS.length] }))} />
      </article>

      <article className="chart-card Company-card company-talkgroups charts-talkgroups" style={{ minWidth: 0, overflow: "hidden" }}>
        <h3>Talkgroups per Company</h3>
        <ChartLegend items={[{ name: "Total talkgroups", color: CHART_COLORS.total }, { name: "Used talkgroups", color: CHART_COLORS.used }]} />
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={CompanyChartData.totalTalkgroups.map((item) => ({ name: item.name, total: item.value, used: CompanyChartData.talkgroupsUsed.find((u) => u.name === item.name)?.value ?? 0 }))} margin={{ left: 0, right: 0, top: 12, bottom: 0 }}>
            <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" opacity={0.32} vertical={false} />
            <XAxis dataKey="name" tick={{ fill: CHART_COLORS.axis, fontSize: 9 }} axisLine={false} tickLine={false} interval={0} angle={-45} textAnchor="end" height={40} tickMargin={0} tickFormatter={(v) => truncateLabel(v, 12)} />
            <YAxis tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatNumber(v)} domain={[0, (dm: number) => Math.ceil(dm * 1.35)]} allowDataOverflow={false} />
            <Tooltip content={<TalkgroupTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <Bar dataKey="total" name="total" shape={(props: any) => <OverlayBarShape {...props} totalColor={CHART_COLORS.total} usedColor={CHART_COLORS.used} />}><LabelList dataKey="total" content={() => null} /></Bar>
          </BarChart>
        </ResponsiveContainer>
      </article>
      <article className="chart-card Company-card company-radios charts-radios" style={{ minWidth: 0, overflow: "hidden" }}>
        <h3>Radios per Company</h3>
        <ChartLegend items={[{ name: "Total radios", color: CHART_COLORS.totalGreen }, { name: "Radios made calls", color: CHART_COLORS.usedGreen }]} />
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={CompanyChartData.totalUsers.map((item) => ({ name: item.name, total: item.value, used: CompanyChartData.callingUsers.find((u) => u.name === item.name)?.value ?? 0 }))} margin={{ left: 0, right: 0, top: 12, bottom: 0 }}>
            <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" opacity={0.32} vertical={false} />
            <XAxis dataKey="name" tick={{ fill: CHART_COLORS.axis, fontSize: 9 }} axisLine={false} tickLine={false} interval={0} angle={-45} textAnchor="end" height={40} tickMargin={0} tickFormatter={(v) => truncateLabel(v, 12)} />
            <YAxis tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatNumber(v)} domain={[0, (dm: number) => Math.ceil(dm * 1.35)]} allowDataOverflow={false} />
            <Tooltip content={<RadioTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <Bar dataKey="total" name="total" shape={(props: any) => <OverlayBarShape {...props} totalColor={CHART_COLORS.totalGreen} usedColor={CHART_COLORS.usedGreen} />}><LabelList dataKey="total" content={() => null} /></Bar>
          </BarChart>
        </ResponsiveContainer>
      </article>
      <article className="chart-card Company-card company-radio-type charts-radio-type-company" style={{ minWidth: 0, overflow: "hidden" }}>
        <h3>Radios Type per Company</h3>
        <ChartLegend items={[{ name: "Total radios", color: CHART_COLORS.total }, ...mobileTypes.map((type) => ({ name: type, color: mobileTypeColor(type) }))]} />
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={mobileTypeByCompany} margin={{ left: 0, right: 0, top: 14, bottom: 0 }} barCategoryGap="14%" barGap={2}>
            <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" opacity={0.32} vertical={false} />
            <XAxis dataKey="name" tick={{ fill: CHART_COLORS.axis, fontSize: 9 }} axisLine={false} tickLine={false} interval={0} angle={-45} textAnchor="end" height={44} tickMargin={2} tickFormatter={(v) => truncateLabel(v, 12)} />
            <YAxis tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatNumber(v)} domain={[0, (dm: number) => Math.ceil(dm * 1.28)]} />
            <Tooltip content={(props) => <MobileTypeTooltip {...props} mobileTypes={mobileTypes} />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <Bar dataKey="total" name="Total radios" maxBarSize={72} shape={(props: any) => <MobileTypeOverlayBarShape {...props} mobileTypes={mobileTypes} />}><LabelList dataKey="total" content={() => null} /></Bar>
          </BarChart>
        </ResponsiveContainer>
      </article>
    </section>
  );
}
