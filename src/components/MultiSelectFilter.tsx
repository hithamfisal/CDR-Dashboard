import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

type MultiSelectFilterProps = {
  label: string;
  value: string[];
  options: string[];
  optionLabels?: Record<string, string>;
  onChange: (value: string[]) => void;
  showAllOption?: boolean;
  className?: string;
};

export function MultiSelectFilter({ label, value, options, optionLabels, onChange, showAllOption = true, className = "" }: MultiSelectFilterProps) {
  const active = value.length > 0;
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<CSSProperties>({});
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const longestOptionLength = useMemo(() => {
    const values = [label, "All", ...options.map((option) => optionLabels?.[option] ?? option)];
    return Math.max(10, ...values.map((item) => item.length));
  }, [label, options, optionLabels]);

  const fieldStyle = {
    // Width support: include extra characters so the visible trigger can fit
    // the longest option plus the dropdown arrow/padding without truncation.
    "--filter-fit-ch": `${Math.min(Math.max(longestOptionLength + 3, 13), 42)}ch`,
  } as CSSProperties;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (!wrapRef.current?.contains(target) && !dropdownRef.current?.contains(target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function computePosition() {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const longest = Math.max(longestOptionLength, ...options.map((o) => (optionLabels?.[o] ?? o).length), label.length, 10);
    const dropWidth = Math.min(Math.max(rect.width, longest * 9 + 76, 240), 620);
    const dropHeight = Math.min(280, options.length * 36 + 48);
    const spaceBelow = window.innerHeight - rect.bottom;
    const left = Math.min(rect.left, window.innerWidth - dropWidth - 8);
    if (spaceBelow >= dropHeight || spaceBelow >= 160) setDropdownStyle({ position: "fixed", top: rect.bottom + 4, left, width: dropWidth, zIndex: 99999 });
    else setDropdownStyle({ position: "fixed", bottom: window.innerHeight - rect.top + 4, left, width: dropWidth, zIndex: 99999 });
  }

  function handleOpen() {
    if (!open) computePosition();
    setOpen((current) => !current);
  }

  useEffect(() => {
    if (!open) return;
    const update = () => computePosition();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, options.length, longestOptionLength]);

  const toggleOption = (option: string) => {
    if (!active) {
      onChange([option]);
      return;
    }
    onChange(value.includes(option) ? value.filter((item) => item !== option) : [...value, option]);
  };

  const displayValue = active ? value.length === 1 ? (optionLabels?.[value[0]] ?? value[0]) : `${value.length} selected` : "All";
  const dropdown = open ? createPortal(
    <div className="multi-select-dropdown" style={dropdownStyle} ref={dropdownRef}>
      {showAllOption && (
        <label className="multi-select-option multi-select-option-all" onClick={() => onChange([])}>
          <input type="checkbox" readOnly checked={!active} />
          <span style={{ fontWeight: !active ? 700 : undefined, color: !active ? "#22d3ee" : undefined }}>All</span>
        </label>
      )}
      {!showAllOption && active && <button type="button" className="multi-select-clear" onClick={() => onChange([])}>Clear</button>}
      {options.map((option) => (
        <label key={option} className="multi-select-option">
          <input type="checkbox" checked={value.includes(option)} onChange={() => toggleOption(option)} />
          <span>{optionLabels?.[option] ?? option}</span>
        </label>
      ))}
    </div>,
    document.body,
  ) : null;

  return (
    <div className={`filter-field multi-select-filter ${className}`} ref={wrapRef} style={fieldStyle}>
      <span>{label}</span>
      <button type="button" className="multi-select-trigger" ref={triggerRef} onClick={handleOpen}>
        <span className="multi-select-value">{displayValue}</span>
        <ChevronDown size={14} style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform .15s" }} />
      </button>
      {dropdown}
    </div>
  );
}
