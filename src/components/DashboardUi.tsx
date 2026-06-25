import { type CSSProperties, type ReactNode } from "react";
import { ArrowUp, ChevronDown } from "lucide-react";

export type ExportKind = "xlsx" | "ppt" | "pdf" | "view" | "csv" | "png";

function FileTypeIcon({ kind }: { kind: ExportKind }) {
  if (kind === "view") return <svg className="file-export-svg file-export-svg-view" viewBox="0 0 64 64" aria-hidden="true"><path d="M6 32s9-16 26-16 26 16 26 16-9 16-26 16S6 32 6 32Z" /><circle cx="32" cy="32" r="8" /></svg>;
  if (kind === "png") return <svg className="file-export-svg file-export-svg-png" viewBox="0 0 64 64" aria-hidden="true"><path className="file-page" d="M14 5h25l11 11v43H14Z" /><path className="file-fold" d="M39 5v12h11" /><circle className="file-mark" cx="25" cy="24" r="5" /><path className="file-mark" d="m18 49 11-13 7 8 5-6 8 11Z" /></svg>;

  const meta = {
    pdf: { label: "PDF", color: "#ef1b2d", grid: false, chart: false },
    xlsx: { label: "XLSX", color: "#21a366", grid: false, chart: false },
    csv: { label: "CSV", color: "#45c957", grid: true, chart: false },
    ppt: { label: "PPTX", color: "#d6421f", grid: false, chart: true },
  }[kind];

  return (
    <svg className={`file-export-svg file-export-svg-${kind}`} viewBox="0 0 64 64" aria-hidden="true" style={{ "--file-color": meta.color } as CSSProperties}>
      <path className="file-page" d="M14 5h25l11 11v43H14Z" />
      <path className="file-fold" d="M39 5v12h11" />
      {!meta.grid && !meta.chart && <path className="file-lines" d="M21 23h22M21 30h22M21 37h18" />}
      {meta.grid && <path className="file-grid" d="M22 36h20M22 44h20M22 52h20M29 30v27M37 30v27" />}
      {meta.chart && <><path className="file-chart" d="M28 48a10 10 0 1 0 10-10v10Z" /><path className="file-chart" d="M39 37a10 10 0 0 1 9 9h-9Z" /></>}
      <rect className="file-ribbon" x="6" y="34" width="52" height="20" rx="3" />
      <text className="file-label" x="32" y="49" textAnchor="middle">{meta.label}</text>
    </svg>
  );
}

export function ExportButton({
  kind,
  label,
  onClick,
  title,
  report,
  className = "",
}: {
  kind: ExportKind;
  label: string;
  onClick: () => void | Promise<void>;
  title?: string;
  report?: string;
  className?: string;
}) {
  return (
    <button
      className={`button small export-button export-button-${kind} ${className}`.trim()}
      type="button"
      onClick={onClick}
      title={title ?? label}
      data-report={report ?? label}
      data-format={kind}
      data-label={label}
    >
      <FileTypeIcon kind={kind} /><span>{label}</span>
    </button>
  );
}

export function SectionTitle({ id, eyebrow, title, text, actions, collapsed = false, onToggle }: { id?: string; eyebrow: string; title: string; text?: string; actions?: ReactNode; collapsed?: boolean; onToggle?: () => void }) {
  return (
    <div id={id} className={`section-title ${collapsed ? "section-title-collapsed" : ""}`}>
      <div className="section-title-heading">
        {onToggle && (
          <button className="section-title-arrow" type="button" onClick={onToggle} aria-expanded={!collapsed} aria-label={collapsed ? "Expand section" : "Collapse section"}>
            <ChevronDown size={16} />
          </button>
        )}
        <div className="section-title-copy">
          <p>{eyebrow}</p><h2>{title}</h2>
          {text && <span>{text}</span>}
        </div>
      </div>
      <div className="section-title-actions">
        {actions}
        {id && <button className="button small section-top-button" type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}><ArrowUp size={15} /><span>Top</span></button>}
      </div>
    </div>
  );
}

export function ChartLegend({ items, className = "" }: { items: { name: string; color: string }[]; className?: string }) {
  return (
    <div className={`chart-legend ${className}`.trim()}>
      {items.map((item) => (
        <span key={`${item.name}-${item.color}`}>
          <i style={{ background: item.color }} />
          {item.name}
        </span>
      ))}
    </div>
  );
}
