import { useMemo } from "react";
import { COLORS } from "../lib/dashboardConstants";
import { dataKey, shortMonthLabel } from "../lib/chartHelpers";
import { monthSortValue } from "../lib/dateSort";
import { uniqueOptions } from "../lib/filterOptions";
import type { CallRecord, DashboardData, Filters, Ranking } from "../types/dashboard";

export function useKpiAnalytics({
  data,
  filtered,
  filters,
  monthRankings,
}: {
  data: DashboardData | null;
  filtered: CallRecord[];
  filters: Filters;
  monthRankings: Ranking[];
}) {
  const kpiRows = useMemo(() => {
    const map = new Map<
      string,
      {
        calls: number;
        durationSeconds: number;
        talkgroups: Set<string>;
        radios: Set<string>;
      }
    >();
    const lookupCompanies = new Set((data?.lookupRecords ?? []).map((r) => r.company));
    const lookupCompanyCounts = new Map<string, number>();
    (data?.lookupRecords ?? [])
      .filter((r) => filters.region.length === 0 || filters.region.includes(r.region))
      .forEach((r) => lookupCompanyCounts.set(r.company, (lookupCompanyCounts.get(r.company) ?? 0) + 1));
    const unlistedCount = filtered.filter((r) => !lookupCompanies.has(r.company)).length;
    filtered.forEach((r) => {
      const cur = map.get(r.company) ?? {
        calls: 0,
        durationSeconds: 0,
        talkgroups: new Set<string>(),
        radios: new Set<string>(),
      };
      cur.calls += 1;
      cur.durationSeconds += r.durationSeconds;
      if (r.talkgroup !== "Unknown") cur.talkgroups.add(r.talkgroup);
      if (r.radioId !== "Unknown") cur.radios.add(r.radioId);
      map.set(r.company, cur);
    });
    return Array.from(map.entries())
      .filter(([company]) => company !== "Unknown" && company !== "Not Found")
      .map(([company, value]) => {
        const lookupActivated = lookupCompanyCounts.get(company) ?? (lookupCompanies.has(company) ? 0 : unlistedCount);
        return {
          company,
          talkgroupsInUse: value.talkgroups.size,
          calls: value.calls,
          durationSeconds: value.durationSeconds,
          usersActivated: lookupActivated || value.radios.size,
          callingUsers: value.radios.size,
          kpiAvgDurationPerUser: 0,
        };
      })
      .map((row) => ({
        ...row,
        kpiAvgDurationPerUser: row.usersActivated ? row.durationSeconds / row.usersActivated : 0,
      }))
      .sort((a, b) => a.company.localeCompare(b.company));
  }, [data?.lookupRecords, filtered, filters.region]);

  const kpiAverage = useMemo(() => {
    const values = kpiRows.map((r) => r.kpiAvgDurationPerUser).filter((v) => v > 0);
    return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
  }, [kpiRows]);

  const monthlyKpi = useMemo(() => {
    const companies = uniqueOptions(filtered, (r) => r.company)
      .filter((c) => c !== "Unknown" && c !== "Not Found")
      .sort((a, b) => a.localeCompare(b));
    const months = uniqueOptions(filtered, (r) => r.month, true).sort(
      (a, b) => monthSortValue(a) - monthSortValue(b) || a.localeCompare(b),
    );
    const stats = new Map<string, { calls: number; durationSeconds: number }>();
    filtered.forEach((r) => {
      if (r.company === "Unknown" || r.company === "Not Found") return;
      const key = `${r.company}||${r.month}`;
      const cur = stats.get(key) ?? { calls: 0, durationSeconds: 0 };
      cur.calls += 1;
      cur.durationSeconds += r.durationSeconds;
      stats.set(key, cur);
    });
    const rows = companies.map((company) => {
      const row: Record<string, string | number | null> = { company };
      months.forEach((month) => {
        const cur = stats.get(`${company}||${month}`);
        row[dataKey(month)] = cur?.calls ? cur.durationSeconds / cur.calls : null;
      });
      return row;
    });
    return {
      rows,
      months: months.map((month, i) => ({
        name: month,
        key: dataKey(month),
        color: COLORS[i % COLORS.length],
      })),
    };
  }, [filtered]);

  const monthlyKpiPieData = useMemo(() => {
    return [...monthRankings]
      .sort((a, b) => monthSortValue(a.name) - monthSortValue(b.name) || a.name.localeCompare(b.name))
      .filter((r) => r.calls > 0 && r.durationSeconds > 0)
      .map((r) => ({
        name: shortMonthLabel(r.name),
        value: r.durationSeconds / r.calls,
      }));
  }, [monthRankings]);

  const monthlyKpiPieTotal = useMemo(
    () => monthlyKpiPieData.reduce((sum, item) => sum + item.value, 0),
    [monthlyKpiPieData],
  );

  const CompanyPeriodLabel = useMemo(() => {
    const years = [...filters.year].sort((a, b) => Number(a) - Number(b) || a.localeCompare(b));
    const months = [...filters.month]
      .sort((a, b) => monthSortValue(a) - monthSortValue(b) || a.localeCompare(b))
      .map(shortMonthLabel);
    if (months.length) {
      const t = months.join(", ");
      const hasYear = months.some((m) => /(19|20)\d{2}/.test(m));
      return !hasYear && years.length ? `${t} ${years.join(", ")}` : t;
    }
    if (years.length) return years.join(", ");
    return "selected period";
  }, [filters.month, filters.year]);

  return {
    kpiRows,
    kpiAverage,
    monthlyKpi,
    monthlyKpiPieData,
    monthlyKpiPieTotal,
    CompanyPeriodLabel,
  };
}
