import { memo } from "react";
import type { DashboardTab } from "../types/dashboard";

type DashboardTabsProps = {
  tabs: readonly { id: DashboardTab; label: string }[];
  activeTab: DashboardTab;
  onChange: (tab: DashboardTab) => void;
};

function DashboardTabsComponent({ tabs, activeTab, onChange }: DashboardTabsProps) {
  return (
    <nav className="dashboard-tabs" aria-label="Dashboard tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`dashboard-tab ${activeTab === tab.id ? "active" : ""}`}
          type="button"
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

export const DashboardTabs = memo(DashboardTabsComponent);