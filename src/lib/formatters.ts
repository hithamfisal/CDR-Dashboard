export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(value || 0));
}

export function formatDecimal(value: number, digits = 2) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value || 0);
}

export function formatPercent(value: number, digits = 1) {
  return `${formatDecimal(value, digits)}%`;
}

export function secondsToClock(totalSeconds: number) {
  const safe = Math.max(0, Math.round(totalSeconds || 0));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function sumValues(data: { value: number }[]) {
  return data.reduce((sum, item) => sum + item.value, 0);
}

export function chartLabel(value: unknown) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return "";
  if (numeric >= 1_000_000) return `${formatDecimal(numeric / 1_000_000, 1)}M`;
  if (numeric >= 1_000) return `${formatDecimal(numeric / 1_000, 1)}K`;
  return formatNumber(numeric);
}
