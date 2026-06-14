import { memo, type ReactNode } from "react";
import type { DashboardTab } from "../types/dashboard";

type DashboardTabsProps = {
  tabs: readonly { id: DashboardTab; label: string }[];
  activeTab: DashboardTab;
  onChange: (tab: DashboardTab) => void;
  actions?: ReactNode;
};

function DashboardTabsComponent({ tabs, activeTab, onChange, actions }: DashboardTabsProps) {
  return (
    <div className="dashboard-tabs-row">
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
      {actions ? <div className="dashboard-tabs-actions">{actions}</div> : null}
    </div>
  );
}

export const DashboardTabs = memo(DashboardTabsComponent);
