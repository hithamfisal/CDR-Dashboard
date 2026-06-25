import { LayoutTemplate } from "lucide-react";
import type { ThemeName } from "../types/dashboard";
import { DESIGN_PROPOSALS } from "../theme/designProposals";

const DESIGN_OPTIONS = DESIGN_PROPOSALS;

type DesignSelectorProps = {
  theme: ThemeName;
  onThemeChange: (theme: ThemeName) => void;
  compact?: boolean;
  label?: string;
};

export function ThemeSelector({
  theme,
  onThemeChange,
  compact = false,
  label = "Design",
}: DesignSelectorProps) {
  const activeDesign = DESIGN_OPTIONS.find((item) => item.value === theme) ?? DESIGN_OPTIONS[0];

  return (
    <label className={`cdr-design-selector ${compact ? "compact" : ""}`} title={activeDesign.description}>
      <span className="cdr-design-selector-label">
        <LayoutTemplate size={16} />
        {label}
      </span>
      <select
        value={theme}
        aria-label="Select dashboard design proposal"
        onChange={(event) => onThemeChange(event.target.value as ThemeName)}
      >
        {DESIGN_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export const DesignSelector = ThemeSelector;
