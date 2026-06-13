import { NUMERIC_TALKGROUP_FILTER } from "./dashboardConstants";
import type { CallRecord, Filters } from "../types/dashboard";

export function filterCallRecords(records: CallRecord[], filters: Filters, monthOptions: string[]) {
  const search = filters.search.trim().toLowerCase();
  const validMonths = new Set(monthOptions);
  const regionFilter = new Set(filters.region);
  const yearFilter = new Set(filters.year);
  const companyFilter = new Set(filters.company);
  const monthFilter = new Set(filters.month);
  const stationFilter = new Set(filters.baseStation);
  const talkgroupFilter = new Set(filters.talkgroup);
  const includeNumericTalkgroups = talkgroupFilter.has(NUMERIC_TALKGROUP_FILTER);

  return records.filter((record) => {
    if (regionFilter.size && !regionFilter.has(record.region)) return false;
    if (yearFilter.size && !yearFilter.has(record.year)) return false;
    if (companyFilter.size && !companyFilter.has(record.company)) return false;
    if (monthFilter.size && (!validMonths.has(record.month) || !monthFilter.has(record.month))) return false;
    if (stationFilter.size && !stationFilter.has(record.baseStation)) return false;
    if (talkgroupFilter.size) {
      const numericMatch = includeNumericTalkgroups && /^\d+$/.test(record.talkgroup);
      if (!numericMatch && !talkgroupFilter.has(record.talkgroup)) return false;
    }
    if (!search) return true;
    return [record.radioId, record.radioAlias, record.employeeName, record.employeeId].join(" ").toLowerCase().includes(search);
  });
}
