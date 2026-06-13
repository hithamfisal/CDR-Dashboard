import { NUMERIC_TALKGROUP_FILTER } from "./dashboardConstants";
import { monthSortValue } from "./dateSort";
import type { CallRecord } from "../types/dashboard";

export function uniqueOptions(records: CallRecord[], getValue: (record: CallRecord) => string, sortAsMonth = false) {
  const values = Array.from(new Set(records.map(getValue).filter(Boolean)));
  return values.sort((a, b) => sortAsMonth ? monthSortValue(a) - monthSortValue(b) || a.localeCompare(b) : a.localeCompare(b));
}

export function buildFilterOptions(records: CallRecord[], selectedYears: string[]) {
  const selectedYearSet = new Set(selectedYears);
  const regions = new Set<string>();
  const years = new Set<string>();
  const companies = new Set<string>();
  const months = new Set<string>();
  const baseStations = new Set<string>();
  const talkgroups = new Set<string>();
  let hasNumericTalkgroup = false;

  records.forEach((record) => {
    if (record.region) regions.add(record.region);
    if (record.year) years.add(record.year);
    if (record.company) companies.add(record.company);
    if ((!selectedYearSet.size || selectedYearSet.has(record.year)) && record.month) months.add(record.month);
    if (record.baseStation) baseStations.add(record.baseStation);
    if (/^\d+$/.test(record.talkgroup)) {
      hasNumericTalkgroup = true;
    } else if (record.talkgroup) {
      talkgroups.add(record.talkgroup);
    }
  });

  return {
    region: [...regions].sort((a, b) => a.localeCompare(b)),
    year: [...years].sort((a, b) => Number(a) - Number(b) || a.localeCompare(b)),
    company: [...companies].sort((a, b) => a.localeCompare(b)),
    month: [...months].sort((a, b) => monthSortValue(a) - monthSortValue(b) || a.localeCompare(b)),
    baseStation: [...baseStations].sort((a, b) => a.localeCompare(b)),
    talkgroup: [
      ...[...talkgroups].sort((a, b) => a.localeCompare(b)),
      ...(hasNumericTalkgroup ? [NUMERIC_TALKGROUP_FILTER] : []),
    ],
  };
}
