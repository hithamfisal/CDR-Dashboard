export type DesignProposalName = "proposal1" | "proposal2" | "proposal3";

export type DesignProposalOption = {
  value: DesignProposalName;
  label: string;
  description: string;
  className: string;
};

export const DESIGN_PROPOSAL_STORAGE_KEY = "cdr-selected-design-proposal";

export const DESIGN_PROPOSALS: readonly DesignProposalOption[] = [
  {
    value: "proposal1",
    label: "Dark Blue",
    description: "Dark blue telecom command-center design for operations monitoring.",
    className: "design-proposal-1",
  },
  {
    value: "proposal2",
    label: "Light Executive",
    description: "Light, clean executive SaaS design for reports and customer review.",
    className: "design-proposal-2",
  },
  {
    value: "proposal3",
    label: "Dark Emerald",
    description: "Dark emerald operations design for network and service monitoring.",
    className: "design-proposal-3",
  },
] as const;

export function isDesignProposal(value: unknown): value is DesignProposalName {
  return value === "proposal1" || value === "proposal2" || value === "proposal3";
}

export function normalizeDesignProposal(value: unknown): DesignProposalName {
  if (isDesignProposal(value)) return value;
  if (value === "dark" || value === "theme-dark-command" || value === "dark-command") return "proposal1";
  if (value === "light" || value === "theme-light-modern" || value === "light-modern") return "proposal2";
  if (value === "neon" || value === "theme-neon-futuristic" || value === "emerald" || value === "green") return "proposal3";
  return "proposal1";
}

export function designProposalClassName(value: DesignProposalName) {
  return DESIGN_PROPOSALS.find((proposal) => proposal.value === value)?.className ?? DESIGN_PROPOSALS[0].className;
}
