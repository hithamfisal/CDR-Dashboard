import { monthSortValue } from "./dateSort";
import type { CallRecord, Metrics, Ranking } from "../types/dashboard";

function isKnownLabel(value: string) {
  return !["", "unknown", "not found"].includes(`${value ?? ""}`.trim().toLowerCase());
}

export function groupBy(records: CallRecord[], getName: (record: CallRecord) => string): Ranking[] {
  const map = new Map<string, { calls: number; durationSeconds: number; trafficHours: number; radios: Set<string> }>();
  records.forEach((record) => {
    const name = getName(record) || "Unknown";
    const current = map.get(name) ?? { calls: 0, durationSeconds: 0, trafficHours: 0, radios: new Set<string>() };
    current.calls += 1;
    current.durationSeconds += record.durationSeconds;
    current.trafficHours += record.trafficHours;
    current.radios.add(record.radioId);
    map.set(name, current);
  });
  return [...map.entries()]
    .map(([name, value]) => ({ name, calls: value.calls, durationSeconds: value.durationSeconds, trafficHours: value.trafficHours, radios: value.radios.size }))
    .sort((a, b) => b.calls - a.calls || b.durationSeconds - a.durationSeconds);
}

export function calculateMetrics(records: CallRecord[]): Metrics {
  const totalCalls = records.length;
  let totalDuration = 0;
  let trafficHours = 0;
  const radios = new Set<string>();
  const companies = new Set<string>();
  const regions = new Set<string>();
  const talkgroups = new Set<string>();
  const stations = new Set<string>();

  records.forEach((record) => {
    totalDuration += record.durationSeconds;
    trafficHours += record.trafficHours;
    if (isKnownLabel(record.radioId)) radios.add(record.radioId);
    companies.add(record.company);
    regions.add(record.region);
    if (isKnownLabel(record.talkgroup)) talkgroups.add(record.talkgroup);
    stations.add(record.baseStation);
  });

  return {
    totalCalls,
    totalDuration,
    trafficHours,
    radios: radios.size,
    companies: companies.size,
    regions: regions.size,
    talkgroups: talkgroups.size,
    stations: stations.size,
    averageDuration: totalCalls ? totalDuration / totalCalls : 0,
  };
}

export function calculateRankings(records: CallRecord[]) {
  return {
    company: groupBy(records, (record) => record.company),
    station: groupBy(records, (record) => record.baseStation),
    talkgroup: groupBy(records, (record) => record.talkgroup),
    region: groupBy(records, (record) => record.region),
    mobileType: groupBy(records, (record) => record.mobileType),
    radio: groupBy(records, (record) => `${record.radioId} - ${record.radioAlias}`),
    user: groupBy(records, (record) => `${record.employeeName} - ${record.employeeId}`),
    hour: groupBy(records, (record) => record.hour).sort((a, b) => a.name.localeCompare(b.name)),
    month: groupBy(records, (record) => record.month).sort((a, b) => monthSortValue(a.name) - monthSortValue(b.name) || a.name.localeCompare(b.name)),
    callType: groupBy(records, (record) => record.callType || "Unknown"),
    duplexType: groupBy(records, (record) => record.duplexType || "Unknown"),
    callPriority: groupBy(records, (record) => record.callPriority || "Unknown"),
    encrypted: groupBy(records, (record) => record.encrypted || "Unknown"),
  };
}

export function modeBy<T extends string>(records: CallRecord[], getValue: (record: CallRecord) => T) {
  const counts = new Map<T, { count: number; durationSeconds: number }>();
  records.forEach((record) => {
    const value = getValue(record);
    const current = counts.get(value) ?? { count: 0, durationSeconds: 0 };
    current.count += 1;
    current.durationSeconds += record.durationSeconds;
    counts.set(value, current);
  });
  return [...counts.entries()].sort((a, b) => b[1].count - a[1].count || b[1].durationSeconds - a[1].durationSeconds)[0];
}
