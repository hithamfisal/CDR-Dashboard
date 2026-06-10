from pathlib import Path

root = Path('/home/ubuntu/cdr_project')
app_path = root / 'src' / 'App.tsx'
css_path = root / 'src' / 'styles.css'
index_path = root / 'index.html'

app = app_path.read_text()

old = 'type ThemeName = "dark" | "light";\n\nfunction themeClass(theme: ThemeName) { return theme === "light" ? "light-background-theme" : "dark-background-theme"; }\n'
new = '''type ThemeName = "dark" | "light";\n\nfunction themeClass(theme: ThemeName) { return theme === "light" ? "light-background-theme" : "dark-background-theme"; }\n\nfunction useTheme() {\n  const [theme, setTheme] = useState<ThemeName>("light");\n  const isDark = theme === "dark";\n  const toggleTheme = useCallback(() => setTheme((current) => (current === "light" ? "dark" : "light")), []);\n\n  return { theme, isDark, toggleTheme };\n}\n'''
if old not in app:
    raise SystemExit('theme insertion point not found')
app = app.replace(old, new, 1)

old = '''  const [fixedFleetmap, setFixedFleetmap]   = useState<FleetmapState>({ records: [], meta: null, isParsing: false });\n  const [page, setPage] = useState(1);\n  const [theme, setTheme] = useState<ThemeName>("light");\n  const [activeSection, setActiveSection] = useState(SECTION_NAV_ITEMS[0]?.id ?? "kpi");\n'''
new = '''  const [fixedFleetmap, setFixedFleetmap]   = useState<FleetmapState>({ records: [], meta: null, isParsing: false });\n  const [page, setPage] = useState(1);\n  const { theme, isDark, toggleTheme } = useTheme();\n  const [activeSection, setActiveSection] = useState(SECTION_NAV_ITEMS[0]?.id ?? "kpi");\n'''
if old not in app:
    raise SystemExit('theme state block not found')
app = app.replace(old, new, 1)

old = '  const toggleTheme = useCallback(() => setTheme((c) => (c === "light" ? "dark" : "light")), []);\n'
if old not in app:
    raise SystemExit('old toggle line not found')
app = app.replace(old, '', 1)

old = '''    <main className={`app-shell ${themeClass(theme)} active-tab-${activeTab}`}>\n      <section className="cdr-command-shell">\n        <img className="cdr-command-theme-image" src={theme === "light" ? "/assets/light-bg.png" : "/assets/dark-bg.png"} alt="" aria-hidden="true" />\n      <header className="topbar followup-style-topbar">\n        <div className="followup-header-badge followup-header-badge-left">\n          <img src="/assets/nascologo.png" alt="NASCO" />\n        </div>\n\n        <div className="followup-dashboard-title">\n          <h1>CDR TRAFFIC DASHBOARD</h1>\n        </div>\n\n        <div className="followup-header-badge followup-header-badge-right">\n          <img src="/assets/se.png" alt="Saudi Energy" />\n        </div>\n\n        <div className="followup-header-actions">\n          <button className="button small theme-toggle" type="button" onClick={toggleTheme}>\n            <Palette size={18} /> {theme === "light" ? "Dark Theme" : "Light Theme"}\n          </button>\n\n          <button className="button small" type="button" onClick={() => { setData(null); setError(""); window.scrollTo({ top: 0, behavior: "smooth" }); }}>\n            <Home size={19} /> Home\n          </button>\n\n          <label className="button small add-region-button" title="Upload another region's CDR and merge into current view">\n            <UploadCloud size={19} />\n            {isAddingMoreCdr ? "Merging..." : `Add Region${data.cdrSources.length > 1 ? ` (${data.cdrSources.length})` : ""}`}\n            <input type="file" accept=".xlsx,.xls,.xlsm,.xlsb" multiple onChange={handleAddMoreCdr} />\n          </label>\n\n          <label className="button small">\n            <RefreshCw size={19} /> New workbook(s)\n            <input type="file" accept=".xlsx,.xls,.xlsm,.xlsb" multiple onChange={handleUpload} />\n          </label>\n\n          <button className="button small followup-pdf-button" onClick={exportRowsPdfPage}>\n            <FileText size={19} /> Dashboard PDF\n          </button>\n        </div>\n      </header>\n'''
new = '''    <main className={`app-shell ${themeClass(theme)} active-tab-${activeTab}`}>\n      <section className="cdr-command-shell">\n        <div className="cdr-banner-art" aria-hidden="true">\n          <svg className="cdr-banner-svg" viewBox="0 0 1440 220" preserveAspectRatio="none">\n            <defs>\n              <pattern id="cdr-dot-grid" width="24" height="24" patternUnits="userSpaceOnUse">\n                <circle cx="2" cy="2" r="1.6" fill="rgba(255,255,255,0.26)" />\n              </pattern>\n              <linearGradient id="cdr-line-glow" x1="0" y1="0" x2="1" y2="1">\n                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.34" />\n                <stop offset="100%" stopColor="#00ced1" stopOpacity="0.14" />\n              </linearGradient>\n            </defs>\n            <rect x="0" y="0" width="1440" height="220" fill="url(#cdr-dot-grid)" opacity="0.30" />\n            <path d="M-40 170 C180 40 310 245 520 106 S840 22 1020 112 1260 215 1500 68" fill="none" stroke="url(#cdr-line-glow)" strokeWidth="2" />\n            <path d="M80 48 C240 130 364 6 520 72 S820 180 1004 64 1250 28 1394 122" fill="none" stroke="rgba(255,255,255,0.13)" strokeWidth="1.4" strokeDasharray="10 12" />\n            <g fill="none" stroke="rgba(0,206,209,0.24)" strokeWidth="2">\n              <path d="M104 152 h110 v-34 h76" />\n              <circle cx="104" cy="152" r="5" fill="rgba(0,206,209,0.34)" />\n              <circle cx="290" cy="118" r="5" fill="rgba(0,206,209,0.34)" />\n              <path d="M1138 66 h92 v42 h112" />\n              <circle cx="1138" cy="66" r="5" fill="rgba(56,189,248,0.34)" />\n              <circle cx="1342" cy="108" r="5" fill="rgba(56,189,248,0.34)" />\n              <path d="M660 190 v-46 h58 l24-28 h76" />\n              <circle cx="660" cy="190" r="4" fill="rgba(255,255,255,0.30)" />\n              <circle cx="818" cy="116" r="4" fill="rgba(255,255,255,0.30)" />\n            </g>\n          </svg>\n        </div>\n\n        <header className="topbar followup-style-topbar cdr-navy-banner">\n          <div className="followup-header-badge followup-header-badge-left">\n            <img src="/assets/se-logo.png" alt="Saudi Energy" />\n          </div>\n\n          <div className="followup-dashboard-title">\n            <h1>CDR TRAFFIC DASHBOARD</h1>\n            <p>CALL DETAIL RECORD ANALYTICS</p>\n          </div>\n\n          <div className="followup-header-badge followup-header-badge-right">\n            <img src="/assets/nasco-logo.png" alt="NASCO" />\n          </div>\n        </header>\n\n        <div className="cdr-banner-control-bar">\n          <button className="button small theme-toggle" type="button" onClick={toggleTheme}>\n            <Palette size={18} /> {isDark ? "Light Theme" : "Dark Theme"}\n          </button>\n        </div>\n'''
if old not in app:
    raise SystemExit('dashboard header block not found')
app = app.replace(old, new, 1)
app_path.write_text(app)

index = index_path.read_text()
old = '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Roboto+Condensed:wght@500;600;700&display=swap" rel="stylesheet" />'
new = '<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@700;800;900&family=Inter:wght@400;500;600;700;800&family=Roboto+Condensed:wght@500;600;700&display=swap" rel="stylesheet" />'
if old not in index:
    raise SystemExit('font import not found')
index = index.replace(old, new, 1)
index_path.write_text(index)

css_append = r'''

/* Final CDR navy banner implementation shared with Upload/Dashboard visual language. */
.app-shell .cdr-command-shell,
.app-shell.active-tab-overview .cdr-command-shell,
.app-shell.light-background-theme .cdr-command-shell,
.app-shell.se-theme.light-background-theme .cdr-command-shell {
  padding: 0 0 16px !important;
  border-radius: 28px !important;
  overflow: hidden !important;
  background: transparent !important;
  border: 1px solid rgba(34, 211, 238, 0.22) !important;
  box-shadow: 0 24px 72px rgba(0, 0, 0, 0.24) !important;
}

.app-shell .cdr-command-shell::before,
.app-shell.light-background-theme .cdr-command-shell::before,
.app-shell.se-theme.light-background-theme .cdr-command-shell::before {
  display: none !important;
  content: none !important;
}

.app-shell .cdr-command-shell > .cdr-banner-art {
  position: absolute !important;
  inset: 0 0 auto 0 !important;
  height: 170px !important;
  z-index: 1 !important;
  pointer-events: none !important;
  overflow: hidden !important;
}

.app-shell .cdr-command-shell > .cdr-banner-art .cdr-banner-svg {
  width: 100% !important;
  height: 100% !important;
  display: block !important;
  opacity: 0.95 !important;
  mix-blend-mode: screen !important;
}

.app-shell .cdr-command-shell > .topbar.followup-style-topbar.cdr-navy-banner,
.app-shell.dark-background-theme .cdr-command-shell > .topbar.followup-style-topbar.cdr-navy-banner,
.app-shell.light-background-theme .cdr-command-shell > .topbar.followup-style-topbar.cdr-navy-banner,
.app-shell.se-theme .cdr-command-shell > .topbar.followup-style-topbar.cdr-navy-banner {
  position: relative !important;
  z-index: 2 !important;
  display: grid !important;
  grid-template-columns: minmax(140px, 1fr) minmax(360px, auto) minmax(140px, 1fr) !important;
  grid-template-rows: auto !important;
  align-items: center !important;
  width: 100% !important;
  min-height: 170px !important;
  margin: 0 !important;
  padding: 28px 42px !important;
  border: 0 !important;
  border-radius: 0 !important;
  background: linear-gradient(135deg, #020f2e 0%, #041a4a 40%, #0a1f5c 60%, #0d0a1e 100%) !important;
  box-shadow: none !important;
  overflow: hidden !important;
}

.app-shell .cdr-command-shell > .topbar.followup-style-topbar.cdr-navy-banner::before,
.app-shell .cdr-command-shell > .topbar.followup-style-topbar.cdr-navy-banner::after {
  display: block !important;
  content: "" !important;
  position: absolute !important;
  inset: 0 !important;
  pointer-events: none !important;
  background:
    radial-gradient(circle at 16% 22%, rgba(0, 206, 209, 0.16), transparent 28%),
    radial-gradient(circle at 84% 72%, rgba(56, 189, 248, 0.12), transparent 30%) !important;
  z-index: 0 !important;
}

.app-shell .cdr-command-shell > .topbar.followup-style-topbar.cdr-navy-banner > * {
  position: relative !important;
  z-index: 3 !important;
}

.app-shell .cdr-command-shell .followup-header-badge,
.app-shell .cdr-command-shell .followup-header-badge-left,
.app-shell .cdr-command-shell .followup-header-badge-right,
.app-shell.light-background-theme .cdr-command-shell .followup-header-badge,
.app-shell.se-theme.light-background-theme .cdr-command-shell .followup-header-badge {
  width: 112px !important;
  height: 78px !important;
  padding: 10px 14px !important;
  display: grid !important;
  place-items: center !important;
  border-radius: 18px !important;
  background: #ffffff !important;
  border: 1px solid rgba(255, 255, 255, 0.92) !important;
  box-shadow: 0 18px 38px rgba(0, 0, 0, 0.22) !important;
}

.app-shell .cdr-command-shell .followup-header-badge-left {
  grid-column: 1 !important;
  grid-row: 1 !important;
  justify-self: start !important;
}

.app-shell .cdr-command-shell .followup-header-badge-right {
  grid-column: 3 !important;
  grid-row: 1 !important;
  justify-self: end !important;
}

.app-shell .cdr-command-shell .followup-header-badge img,
.app-shell .cdr-command-shell .followup-header-badge-left img,
.app-shell .cdr-command-shell .followup-header-badge-right img {
  width: 100% !important;
  height: 100% !important;
  max-width: 92px !important;
  max-height: 58px !important;
  object-fit: contain !important;
}

.app-shell .cdr-command-shell .followup-dashboard-title,
.app-shell.light-background-theme .cdr-command-shell .followup-dashboard-title,
.app-shell.se-theme.light-background-theme .cdr-command-shell .followup-dashboard-title {
  grid-column: 2 !important;
  grid-row: 1 !important;
  justify-self: center !important;
  align-self: center !important;
  width: auto !important;
  min-height: 0 !important;
  padding: 0 18px !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 7px !important;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  text-align: center !important;
}

.app-shell .cdr-command-shell .followup-dashboard-title h1,
.app-shell.light-background-theme .cdr-command-shell .followup-dashboard-title h1,
.app-shell.se-theme.light-background-theme .cdr-command-shell .followup-dashboard-title h1 {
  margin: 0 !important;
  color: #ffffff !important;
  font-family: "DM Sans", Inter, system-ui, sans-serif !important;
  font-size: 26px !important;
  line-height: 1.1 !important;
  font-weight: 900 !important;
  letter-spacing: 0.035em !important;
  font-style: normal !important;
  text-align: center !important;
  white-space: nowrap !important;
  text-shadow: 0 2px 0 rgba(37, 99, 235, 0.92), 0 0 18px rgba(56, 189, 248, 0.46) !important;
}

.app-shell .cdr-command-shell .followup-dashboard-title p,
.app-shell.light-background-theme .cdr-command-shell .followup-dashboard-title p,
.app-shell.se-theme.light-background-theme .cdr-command-shell .followup-dashboard-title p {
  margin: 0 !important;
  color: rgba(0, 206, 209, 0.9) !important;
  font-size: 13px !important;
  font-weight: 800 !important;
  line-height: 1.2 !important;
  letter-spacing: 0.18em !important;
  text-transform: uppercase !important;
}

.app-shell .cdr-banner-control-bar {
  position: relative !important;
  z-index: 3 !important;
  display: flex !important;
  justify-content: flex-end !important;
  align-items: center !important;
  min-height: 46px !important;
  padding: 6px 20px !important;
  margin: 0 !important;
  border-top: 1px solid rgba(34, 211, 238, 0.18) !important;
  border-bottom: 1px solid rgba(34, 211, 238, 0.16) !important;
  background: rgba(2, 13, 28, 0.88) !important;
  backdrop-filter: blur(14px) !important;
}

.app-shell.light-background-theme .cdr-banner-control-bar,
.app-shell.se-theme.light-background-theme .cdr-banner-control-bar {
  background: rgba(255, 255, 255, 0.82) !important;
  border-top-color: rgba(0, 120, 212, 0.14) !important;
  border-bottom-color: rgba(0, 120, 212, 0.12) !important;
}

.app-shell .cdr-banner-control-bar .theme-toggle {
  min-height: 34px !important;
  padding: 7px 13px !important;
  font-size: 12px !important;
  font-weight: 800 !important;
  border-radius: 999px !important;
}

.app-shell .cdr-command-shell .dashboard-tabs {
  margin: 14px 18px 0 !important;
}

.app-shell .cdr-command-shell .filters-panel {
  margin: 12px 18px 0 !important;
}

.app-shell .cdr-command-shell .hero-panel {
  margin: 12px 18px 0 !important;
}

@media (max-width: 900px) {
  .app-shell .cdr-command-shell > .topbar.followup-style-topbar.cdr-navy-banner,
  .app-shell.dark-background-theme .cdr-command-shell > .topbar.followup-style-topbar.cdr-navy-banner,
  .app-shell.light-background-theme .cdr-command-shell > .topbar.followup-style-topbar.cdr-navy-banner,
  .app-shell.se-theme .cdr-command-shell > .topbar.followup-style-topbar.cdr-navy-banner {
    grid-template-columns: 1fr !important;
    gap: 16px !important;
    padding: 24px 18px !important;
  }

  .app-shell .cdr-command-shell .followup-header-badge-left,
  .app-shell .cdr-command-shell .followup-header-badge-right,
  .app-shell .cdr-command-shell .followup-dashboard-title {
    grid-column: 1 !important;
    justify-self: center !important;
  }

  .app-shell .cdr-command-shell .followup-header-badge-left { grid-row: 1 !important; }
  .app-shell .cdr-command-shell .followup-dashboard-title { grid-row: 2 !important; }
  .app-shell .cdr-command-shell .followup-header-badge-right { grid-row: 3 !important; }

  .app-shell .cdr-command-shell .followup-dashboard-title h1 {
    white-space: normal !important;
  }
}
'''
css = css_path.read_text()
marker = '/* Final CDR navy banner implementation shared with Upload/Dashboard visual language. */'
if marker not in css:
    css += css_append
else:
    css = css[:css.index(marker)] + css_append
css_path.write_text(css)

# Ensure the exact user-mandated asset paths exist while preserving the current project assets.
assets = root / 'public' / 'assets'
for source, dest in [('se.png', 'se-logo.png'), ('nascologo.png', 'nasco-logo.png')]:
    src = assets / source
    dst = assets / dest
    if src.exists() and not dst.exists():
        dst.write_bytes(src.read_bytes())

print('Banner update applied successfully.')
