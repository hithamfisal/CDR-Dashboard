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
  callType: string[];
  radioType: string[];
  encryption: string[];
  duplexMode: string[];
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
  const selectedFiltersSummary = [
    { key: "region" as ArrayFilterKey, label: "Region", values: filters.region },
    { key: "year" as ArrayFilterKey, label: "Year", values: filters.year },
    { key: "month" as ArrayFilterKey, label: "Month", values: filters.month },
    { key: "company" as ArrayFilterKey, label: "Company", values: filters.company },
    { key: "baseStation" as ArrayFilterKey, label: "Base Station", values: filters.baseStation },
    { key: "talkgroup" as ArrayFilterKey, label: "Talkgroup", values: filters.talkgroup },
    { key: "callType" as ArrayFilterKey, label: "Call Type", values: filters.callType },
    { key: "radioType" as ArrayFilterKey, label: "Radio Type", values: filters.radioType },
    { key: "encryption" as ArrayFilterKey, label: "Encryption", values: filters.encryption },
    { key: "duplexMode" as ArrayFilterKey, label: "Duplex", values: filters.duplexMode },
  ].filter((item) => item.values.length > 0);
  const hasSearch = filters.search.trim().length > 0;
  return (
    <section id="filters" className="filters-panel filters-panel-arranged">
      <div className="filters-fields-grid">
        <div className="filters-row filters-row-primary">
          <label className="search-box search-compact cdr-filter-search">
            <span>Search Radio / User</span>
            <Search size={18} />
            <input value={filters.search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Radio ID, alias, user, employee ID" />
          </label>
          <MultiSelectFilter className="cdr-filter-region filter-compact" label="Region" value={filters.region} options={options.region} onChange={(region) => onArrayFilterChange("region", region)} />
          <MultiSelectFilter className="cdr-filter-year filter-compact" label="Year" value={filters.year} options={options.year} onChange={(year) => onArrayFilterChange("year", year)} />
          <MultiSelectFilter className="cdr-filter-month filter-compact" label="Month" value={filters.month} options={options.month} onChange={(month) => onArrayFilterChange("month", month)} />
          <MultiSelectFilter className="cdr-filter-company filter-company" label="Company" value={filters.company} options={options.company} onChange={(company) => onArrayFilterChange("company", company)} />
          <MultiSelectFilter className="cdr-filter-base-station filter-xwide" label="Base Station" value={filters.baseStation} options={options.baseStation} onChange={(baseStation) => onArrayFilterChange("baseStation", baseStation)} />
          <MultiSelectFilter className="cdr-filter-talkgroup filter-wide" label="Talkgroup" value={filters.talkgroup} options={options.talkgroup} optionLabels={talkgroupLabels} onChange={(talkgroup) => onArrayFilterChange("talkgroup", talkgroup)} />
        </div>
        <div className="filters-row filters-row-secondary">
          <MultiSelectFilter className="cdr-filter-call-type filter-compact" label="Call Type" value={filters.callType} options={options.callType} onChange={(callType) => onArrayFilterChange("callType", callType)} />
          <MultiSelectFilter className="cdr-filter-radio-type filter-compact" label="Radio Type" value={filters.radioType} options={options.radioType} onChange={(radioType) => onArrayFilterChange("radioType", radioType)} />
          <MultiSelectFilter className="cdr-filter-encryption filter-compact" label="Encryption" value={filters.encryption} options={options.encryption} onChange={(encryption) => onArrayFilterChange("encryption", encryption)} />
          <MultiSelectFilter className="cdr-filter-duplex filter-compact" label="Duplex Mode" value={filters.duplexMode} options={options.duplexMode} onChange={(duplexMode) => onArrayFilterChange("duplexMode", duplexMode)} />
          <div className="filter-action-cell cdr-filter-reset-cell" aria-label="Filter actions">
            <span className="filter-action-label" aria-hidden="true">&nbsp;</span>
            <button className="button reset-filter-button" type="button" onClick={onReset} title="Reset filters"><X size={16} /> Reset</button>
          </div>
          <div className="filter-action-cell cdr-filter-info-cell" aria-label="Filtered records count">
            <span className="filter-action-label" aria-hidden="true">&nbsp;</span>
            <span className="filter-count">{formatNumber(filteredCount)} from {formatNumber(recordsCount)} - {formatPercent(filteredShare)}</span>
          </div>
        </div>
      </div>
      {(selectedFiltersSummary.length > 0 || hasSearch) && (
        <div className="selected-filter-summary" aria-label="Selected filters summary">
          <strong>Selected filters</strong>
          {hasSearch && (
            <button type="button" className="selected-filter-chip" onClick={() => onSearchChange("")}>
              Search: {filters.search} <X size={12} />
            </button>
          )}
          {selectedFiltersSummary.map((item) => (
            <button key={item.key} type="button" className="selected-filter-chip" onClick={() => onArrayFilterChange(item.key, [])}>
              {item.label}: {item.values.length === 1 ? item.values[0] : `${item.values.length} selected`} <X size={12} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export const DashboardFilters = memo(DashboardFiltersComponent);