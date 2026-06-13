import { memo } from "react";
import { Search, X } from "lucide-react";
import { MultiSelectFilter } from "./MultiSelectFilter";
import type { Filters } from "../types/dashboard";

export type FilterOptions = {
  region: string[];
  year: string[];
  month: string[];
  company: string[];
  baseStation: string[];
  talkgroup: string[];
};

type ArrayFilterKey = Exclude<keyof Filters, "search">;

type DashboardFiltersProps = {
  filters: Filters;
  options: FilterOptions;
  talkgroupLabels: Record<string, string>;
  filteredCount: number;
  recordsCount: number;
  filteredShare: number;
  formatNumber: (value: number) => string;
  formatPercent: (value: number) => string;
  onSearchChange: (value: string) => void;
  onArrayFilterChange: (key: ArrayFilterKey, value: string[]) => void;
  onReset: () => void;
};

function DashboardFiltersComponent({
  filters,
  options,
  talkgroupLabels,
  filteredCount,
  recordsCount,
  filteredShare,
  formatNumber,
  formatPercent,
  onSearchChange,
  onArrayFilterChange,
  onReset,
}: DashboardFiltersProps) {
  return (
    <section id="filters" className="filters-panel">
      <label className="search-box search-compact">
        <span>Search Radio / User</span>
        <Search size={16} />
        <input value={filters.search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Radio ID, alias, user, employee ID" />
      </label>
      <MultiSelectFilter className="filter-compact" label="Region" value={filters.region} options={options.region} onChange={(region) => onArrayFilterChange("region", region)} />
      <MultiSelectFilter className="filter-compact" label="Year" value={filters.year} options={options.year} onChange={(year) => onArrayFilterChange("year", year)} />
      <MultiSelectFilter className="filter-compact" label="Month" value={filters.month} options={options.month} onChange={(month) => onArrayFilterChange("month", month)} />
      <MultiSelectFilter className="filter-company" label="Company" value={filters.company} options={options.company} onChange={(company) => onArrayFilterChange("company", company)} />
      <MultiSelectFilter className="filter-xwide" label="Base Station" value={filters.baseStation} options={options.baseStation} onChange={(baseStation) => onArrayFilterChange("baseStation", baseStation)} />
      <MultiSelectFilter className="filter-wide" label="Talkgroup" value={filters.talkgroup} options={options.talkgroup} optionLabels={talkgroupLabels} onChange={(talkgroup) => onArrayFilterChange("talkgroup", talkgroup)} />
      <button className="button reset-filter-button" type="button" onClick={onReset}><X size={16} /> Reset Filters</button>
      <span className="filter-count" style={{ fontSize: "0.8rem", fontWeight: 600, color: "#7ecef4" }}>{formatNumber(filteredCount)} from {formatNumber(recordsCount)} - {formatPercent(filteredShare)}</span>
    </section>
  );
}

export const DashboardFilters = memo(DashboardFiltersComponent);
