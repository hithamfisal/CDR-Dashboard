import { useCallback, useEffect, useState } from "react";
import {
  DESIGN_PROPOSAL_STORAGE_KEY,
  normalizeDesignProposal,
  type DesignProposalName,
} from "./designProposals";

const LEGACY_DESIGN_KEYS = [
  "cdr-selected-ui-theme",
  "cdr-theme",
  "theme",
  "dashboard-theme",
  "selected-theme",
  "selectedTheme",
  "isDarkMode",
  "darkMode",
  "cdr-selected-ui-layout",
];

function readSavedDesignProposal(): DesignProposalName {
  if (typeof window === "undefined") return "proposal1";
  try {
    const saved = window.localStorage.getItem(DESIGN_PROPOSAL_STORAGE_KEY);
    if (saved) return normalizeDesignProposal(saved);

    for (const key of LEGACY_DESIGN_KEYS) {
      const legacy = window.localStorage.getItem(key);
      if (legacy) {
        const normalized = normalizeDesignProposal(legacy);
        window.localStorage.setItem(DESIGN_PROPOSAL_STORAGE_KEY, normalized);
        return normalized;
      }
    }
  } catch {
    /* ignore */
  }
  return "proposal1";
}

function clearLegacyDesignKeys() {
  if (typeof window === "undefined") return;
  try {
    LEGACY_DESIGN_KEYS.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    /* ignore */
  }
}

export function useDesignProposal() {
  const [designProposal, setDesignProposalState] = useState<DesignProposalName>(() => readSavedDesignProposal());
  const isDark = designProposal !== "proposal2";

  const applyDesign = useCallback((nextDesign: DesignProposalName) => {
    try {
      document.documentElement.setAttribute("data-design", nextDesign);
      document.documentElement.setAttribute("data-cdr-theme", nextDesign);
      window.localStorage.setItem(DESIGN_PROPOSAL_STORAGE_KEY, nextDesign);
      clearLegacyDesignKeys();
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    applyDesign(designProposal);
  }, [applyDesign, designProposal]);

  const setDesignProposal = useCallback((nextDesign: DesignProposalName) => {
    setDesignProposalState(nextDesign);
    applyDesign(nextDesign);
  }, [applyDesign]);

  const toggleDesignProposal = useCallback(() => {
    setDesignProposalState((current) => {
      const nextDesign: DesignProposalName = current === "proposal2" ? "proposal1" : "proposal2";
      applyDesign(nextDesign);
      return nextDesign;
    });
  }, [applyDesign]);

  return {
    designProposal,
    isDark,
    setDesignProposal,
    toggleDesignProposal,
  };
}
