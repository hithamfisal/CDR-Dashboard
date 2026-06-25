import type { Metrics, QualityIssue, Ranking, TrafficIntensity } from "../types/dashboard";
import {
  Antenna,
  BadgeCheck,
  Building2,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  Gauge,
  Globe,
  MessageSquare,
  PhoneCall,
  PhoneIncoming,
  Radio,
  ShieldCheck,
  Timer,
  User,
  Waves,
  type LucideIcon,
} from "lucide-react";

type SummaryCardTone = "cyan" | "green" | "purple" | "amber" | "red" | "blue" | "slate";


type OverviewSummaryCardsProps = {
  metrics: Metrics;
  maxDuration: number;
  minDuration: number;
  peakRadioName: string;
  peakUserParts: string[];
  topCompany?: Ranking;
  topTalkgroup?: Ranking;
  topStation?: Ranking;
  peakMonthName: string;
  peakWeekName: string;
  peakDayName: string;
  peakHour?: Ranking;
  peakTrafficHour?: Ranking;
  peakHourAvgDuration: number;
  trafficIntensity: TrafficIntensity;
  qualityScore: number;
  qualityIssues: QualityIssue[];
  recordsCount: number;
  formatNumber: (value: number) => string;
  formatDecimal: (value: number, digits?: number) => string;
  secondsToClock: (value: number) => string;
};

const DASHBOARD_CARD_ICONS = {
  totalCalls: PhoneCall,
  regions: Globe,
  companies: Building2,
  radios: Radio,
  talkgroups: MessageSquare,
  baseStations: Antenna,
  totalDuration: Timer,
  averageDuration: Gauge,
  maxDuration: Timer,
  minDuration: Timer,
  peakRadio: Radio,
  peakUserName: User,
  peakUserId: BadgeCheck,
  peakUserCompany: Building2,
  peakCompany: Building2,
  peakTalkgroup: MessageSquare,
  peakBaseStation: Antenna,
  peakMonth: CalendarDays,
  peakWeek: CalendarRange,
  peakDay: CalendarClock,
  busyHour: Timer,
  peakHourCalls: PhoneIncoming,
  trafficErlangs: Waves,
  peakTrafficErlangs: Waves,
  peakHourAvgDuration: Gauge,
  dataQuality: ShieldCheck,
  missingCompany: Building2,
  missingStation: Antenna,
  missingDuration: Timer,
  missingRadio: Radio,
} satisfies Record<string, LucideIcon>;

type DashboardCardIconKey = keyof typeof DASHBOARD_CARD_ICONS;

function VisualSummaryCard({
  label,
  value,
  detail,
  iconKey,
  tone = "cyan",
  primary = false,
}: {
  label: string;
  value: string;
  detail: string;
  iconKey: DashboardCardIconKey;
  tone?: SummaryCardTone;
  primary?: boolean;
}) {
  const Icon = DASHBOARD_CARD_ICONS[iconKey];
  return (
    <div className={`summary-card visual-summary-card visual-tone-${tone} ${primary ? "summary-card-primary" : ""}`}>
      <div className="summary-card-head">
        <Icon className="summary-card-icon" size={18} strokeWidth={2.4} />
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function qualityIssueIconKey(name: string): DashboardCardIconKey {
  const normalized = name.toLowerCase();
  if (normalized.includes("company")) return "missingCompany";
  if (normalized.includes("station")) return "missingStation";
  if (normalized.includes("duration")) return "missingDuration";
  if (normalized.includes("radio")) return "missingRadio";
  return "dataQuality";
}

export function OverviewSummaryCards({
  metrics,
  maxDuration,
  minDuration,
  peakRadioName,
  peakUserParts,
  topCompany,
  topTalkgroup,
  topStation,
  peakMonthName,
  peakWeekName,
  peakDayName,
  peakHour,
  peakTrafficHour,
  peakHourAvgDuration,
  trafficIntensity,
  qualityScore,
  qualityIssues,
  recordsCount,
  formatNumber,
  formatDecimal,
  secondsToClock,
}: OverviewSummaryCardsProps) {
  return (
    <>
      <section className="summary-cards summary-cards-arranged summary-cards-manual-rows summary-cards-10-layout visual-kpi-cards">
        <div className="summary-card-row summary-card-row-10">
          <VisualSummaryCard label="Total Calls" value={formatNumber(metrics.totalCalls)} detail="Filtered result" iconKey="totalCalls" tone="cyan" primary />
          <VisualSummaryCard label="Regions" value={formatNumber(metrics.regions)} detail="Geographic coverage" iconKey="regions" tone="green" />
          <VisualSummaryCard label="Companies" value={formatNumber(metrics.companies)} detail="Business coverage" iconKey="companies" tone="purple" />
          <VisualSummaryCard label="Radios" value={formatNumber(metrics.radios)} detail="Active radio users" iconKey="radios" tone="amber" />
          <VisualSummaryCard label="Talkgroups" value={formatNumber(metrics.talkgroups)} detail="Used groups" iconKey="talkgroups" tone="green" />
          <VisualSummaryCard label="Base Stations" value={formatNumber(metrics.stations)} detail="Network sites" iconKey="baseStations" tone="red" />
          <VisualSummaryCard label="Total Duration" value={secondsToClock(metrics.totalDuration)} detail="Filtered result" iconKey="totalDuration" tone="blue" />
          <VisualSummaryCard label="Avg Duration" value={secondsToClock(metrics.averageDuration)} detail="Per call" iconKey="averageDuration" tone="purple" />
          <VisualSummaryCard label="Max Duration" value={secondsToClock(maxDuration)} detail="Longest call" iconKey="maxDuration" tone="amber" />
          <VisualSummaryCard label="Min Duration" value={secondsToClock(minDuration)} detail="Shortest call" iconKey="minDuration" tone="blue" />
        </div>

        <div className="summary-card-row summary-card-row-8">
          <VisualSummaryCard label="Peak Radio" value={peakRadioName} detail="Most active radio" iconKey="peakRadio" tone="amber" />
          <VisualSummaryCard label="Peak User Name" value={peakUserParts[0] ?? "--"} detail="Most active user" iconKey="peakUserName" tone="red" />
          <VisualSummaryCard label="Peak User ID" value={peakUserParts[1] ?? "--"} detail="User identifier" iconKey="peakUserId" tone="amber" />
          <VisualSummaryCard label="Peak User Co." value={peakUserParts[2] ?? "--"} detail="User company" iconKey="peakUserCompany" tone="red" />
          <VisualSummaryCard label="Peak Co." value={topCompany?.name ?? "--"} detail="Most calls" iconKey="peakCompany" tone="red" />
          <VisualSummaryCard label="Peak TG" value={topTalkgroup?.name ?? "--"} detail="Most calls" iconKey="peakTalkgroup" tone="red" />
          <VisualSummaryCard label="Peak BS" value={topStation?.name ?? "--"} detail="Most calls" iconKey="peakBaseStation" tone="red" />
          <VisualSummaryCard label="Peak Month" value={peakMonthName} detail="Highest calls" iconKey="peakMonth" tone="red" />
          <VisualSummaryCard label="Peak Week" value={peakWeekName} detail="Highest calls" iconKey="peakWeek" tone="red" />
          <VisualSummaryCard label="Peak Day" value={peakDayName} detail="Highest calls" iconKey="peakDay" tone="red" />
        </div>

        <div className="summary-card-row summary-card-row-7">
          <VisualSummaryCard label="Peak Hour" value={peakHour?.name ?? "--"} detail="Highest calls" iconKey="busyHour" tone="amber" />
          <VisualSummaryCard label="Peak Hour Calls" value={formatNumber(peakHour?.calls ?? 0)} detail="Busy hour volume" iconKey="peakHourCalls" tone="amber" />
          <VisualSummaryCard label="Traffic (Erlangs)" value={formatDecimal(metrics.trafficHours, 1)} detail="Total traffic" iconKey="trafficErlangs" tone="cyan" />
          <VisualSummaryCard label="Peak Traffic (Erlangs)" value={formatDecimal(peakTrafficHour?.trafficHours ?? 0, 1)} detail="Highest traffic hour" iconKey="peakTrafficErlangs" tone="red" />
          <VisualSummaryCard label="Peak Hour Avg Duration" value={formatDecimal(peakHourAvgDuration, 1)} detail="Seconds per call" iconKey="peakHourAvgDuration" tone="purple" />
          <VisualSummaryCard label="Busy Traffic Hour" value={trafficIntensity.busyTrafficHour?.name ?? "--"} detail="Highest Erlangs" iconKey="busyHour" tone="cyan" />
          <VisualSummaryCard label="Busy Hour Traffic" value={formatDecimal(trafficIntensity.busyTrafficHour?.trafficHours ?? 0, 2)} detail="Erlangs" iconKey="trafficErlangs" tone="green" />
          <VisualSummaryCard label="Traffic / TG" value={formatDecimal(trafficIntensity.trafficPerTalkgroup, 2)} detail="Erlangs" iconKey="trafficErlangs" tone="blue" />
          <VisualSummaryCard label="Traffic / Co." value={formatDecimal(trafficIntensity.trafficPerCompany, 2)} detail="Erlangs" iconKey="trafficErlangs" tone="amber" />
          <VisualSummaryCard label="Traffic / Region" value={formatDecimal(trafficIntensity.trafficPerRegion, 2)} detail="Erlangs" iconKey="trafficErlangs" tone="purple" />
        </div>
      </section>

      <section className="data-quality-panel visual-quality-panel" aria-label="Data quality and filter health">
        <div className="quality-score-card visual-quality-card">
          <div className="summary-card-head">
            <span>Data Quality Score</span>
            <CheckCircle2 className="summary-card-icon" size={18} strokeWidth={2.4} />
          </div>
          <strong>{formatDecimal(qualityScore, 1)}%</strong>
          <small>{formatNumber(recordsCount)} source rows checked</small>
        </div>
        <div className="quality-issue-grid">
          {qualityIssues.map((issue) => {
            const IssueIcon = DASHBOARD_CARD_ICONS[qualityIssueIconKey(issue.name)];
            return (
              <div className="quality-issue visual-quality-issue" key={issue.name}>
                <div className="summary-card-head">
                  <span>{issue.name}</span>
                  <IssueIcon className="summary-card-icon" size={18} strokeWidth={2.4} />
                </div>
                <strong>{formatNumber(issue.count)}</strong>
                <small>{formatDecimal(issue.pct, 1)}%</small>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

