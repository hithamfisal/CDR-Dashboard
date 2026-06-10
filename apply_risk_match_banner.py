from pathlib import Path

root = Path('/home/ubuntu/cdr_project')
app_path = root / 'src' / 'App.tsx'
css_path = root / 'src' / 'styles.css'

app = app_path.read_text()
start = app.index('        <div className="cdr-banner-art" aria-hidden="true">')
end = app.index('        <header className="topbar followup-style-topbar cdr-navy-banner">', start)
old_art = app[start:end]

risk_art = '''          <div className="cdr-banner-art" aria-hidden="true">
            <svg className="cdr-banner-svg" viewBox="0 0 1440 132" preserveAspectRatio="none">
              <defs>
                <pattern id="cdr-risk-dot-grid" width="34" height="24" patternUnits="userSpaceOnUse">
                  <circle cx="3" cy="3" r="1.15" fill="rgba(118,178,255,0.38)" />
                </pattern>
                <filter id="cdr-risk-soft-glow" x="-80%" y="-80%" width="260%" height="260%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <radialGradient id="cdr-risk-left-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.54" />
                  <stop offset="42%" stopColor="#0ea5e9" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="cdr-risk-right-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#fb7185" stopOpacity="0.60" />
                  <stop offset="44%" stopColor="#ef4444" stopOpacity="0.34" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="cdr-risk-blue-wave" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.82" />
                  <stop offset="48%" stopColor="#0284c7" stopOpacity="0.58" />
                  <stop offset="100%" stopColor="#00ced1" stopOpacity="0.18" />
                </linearGradient>
                <linearGradient id="cdr-risk-teal-wave" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#00ced1" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.12" />
                </linearGradient>
                <linearGradient id="cdr-risk-red-wave" x1="1" y1="0" x2="0" y2="0">
                  <stop offset="0%" stopColor="#f87171" stopOpacity="0.78" />
                  <stop offset="48%" stopColor="#b91c1c" stopOpacity="0.54" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.16" />
                </linearGradient>
                <linearGradient id="cdr-risk-frame" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#00ced1" stopOpacity="0" />
                  <stop offset="14%" stopColor="#00ced1" stopOpacity="0.72" />
                  <stop offset="44%" stopColor="#38bdf8" stopOpacity="0.18" />
                  <stop offset="58%" stopColor="#38bdf8" stopOpacity="0.18" />
                  <stop offset="86%" stopColor="#ef4444" stopOpacity="0.64" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                </linearGradient>
              </defs>

              <rect x="0" y="0" width="1440" height="132" fill="url(#cdr-risk-dot-grid)" opacity="0.42" />
              <ellipse cx="74" cy="66" rx="170" ry="92" fill="url(#cdr-risk-left-glow)" opacity="0.92" />
              <ellipse cx="1366" cy="66" rx="170" ry="92" fill="url(#cdr-risk-right-glow)" opacity="0.96" />

              <g className="cdr-risk-frame-lines" filter="url(#cdr-risk-soft-glow)">
                <line x1="0" y1="25" x2="408" y2="25" stroke="url(#cdr-risk-frame)" strokeWidth="1.7" opacity="0.88" />
                <line x1="1032" y1="25" x2="1440" y2="25" stroke="url(#cdr-risk-frame)" strokeWidth="1.7" opacity="0.76" />
                <line x1="0" y1="118" x2="408" y2="118" stroke="rgba(0,206,209,0.24)" strokeWidth="1.3" opacity="0.80" />
                <line x1="1032" y1="118" x2="1440" y2="118" stroke="rgba(239,68,68,0.24)" strokeWidth="1.3" opacity="0.80" />
              </g>

              <g className="cdr-risk-blue-waves" fill="none" strokeLinecap="round" filter="url(#cdr-risk-soft-glow)">
                <path d="M-24 87 C94 54 144 101 246 70 S390 60 548 88" stroke="url(#cdr-risk-blue-wave)" strokeWidth="3" opacity="0.92" />
                <path d="M-34 105 C88 84 144 123 248 92 S414 84 548 106" stroke="url(#cdr-risk-teal-wave)" strokeWidth="2" opacity="0.82" />
                <path d="M88 66 C184 46 264 44 348 63 S450 78 536 61" stroke="#0ea5e9" strokeWidth="2.2" opacity="0.72" />
              </g>

              <g className="cdr-risk-red-waves" fill="none" strokeLinecap="round" filter="url(#cdr-risk-soft-glow)">
                <path d="M1464 87 C1346 54 1296 101 1194 70 S1050 60 892 88" stroke="url(#cdr-risk-red-wave)" strokeWidth="3" opacity="0.88" />
                <path d="M1474 105 C1352 84 1296 123 1192 92 S1026 84 892 106" stroke="#7f1d1d" strokeWidth="2" opacity="0.56" />
                <path d="M1352 66 C1256 46 1176 44 1092 63 S990 78 904 61" stroke="#ef4444" strokeWidth="2.2" opacity="0.68" />
              </g>

              <g className="cdr-risk-shield" transform="translate(710 -8)" filter="url(#cdr-risk-soft-glow)">
                <path d="M10 0 L30 8 V22 C30 38 21 48 10 55 C-1 48 -10 38 -10 22 V8 Z" fill="rgba(5,22,55,0.80)" stroke="rgba(0,206,209,0.66)" strokeWidth="1.5" />
                <path d="M3 24 l5 5 10 -14" fill="none" stroke="rgba(0,206,209,0.92)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </g>

              <g className="cdr-risk-bar-chart" transform="translate(585 104)" opacity="0.60">
                <rect x="0" y="-28" width="7" height="28" rx="2" fill="#0ea5e9" />
                <rect x="13" y="-40" width="7" height="40" rx="2" fill="#0284c7" />
                <rect x="26" y="-54" width="7" height="54" rx="2" fill="#075985" />
              </g>

              <g className="cdr-risk-donut" transform="translate(820 111)" opacity="0.48">
                <circle cx="0" cy="0" r="21" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="11" />
                <path d="M0 -21 A21 21 0 0 1 20 7" fill="none" stroke="#ef4444" strokeWidth="11" strokeLinecap="round" />
                <path d="M20 7 A21 21 0 0 1 -11 18" fill="none" stroke="#0ea5e9" strokeWidth="11" strokeLinecap="round" />
              </g>

              <g className="cdr-risk-circuit" fill="none" strokeWidth="1.4" opacity="0.70">
                <path d="M70 25 h330" stroke="rgba(0,206,209,0.42)" />
                <path d="M1040 25 h330" stroke="rgba(239,68,68,0.34)" />
                <circle cx="68" cy="25" r="5" fill="none" stroke="#00ced1" />
                <circle cx="68" cy="25" r="2" fill="#00ced1" />
                <circle cx="1372" cy="25" r="5" fill="none" stroke="#ef4444" />
                <circle cx="1372" cy="25" r="2" fill="#ef4444" />
              </g>
            </svg>
          </div>
'''
app = app[:start] + app[end:]
needle = '        <header className="topbar followup-style-topbar cdr-navy-banner">\n'
if needle not in app:
    raise SystemExit('Header opening not found')
app = app.replace(needle, needle + risk_art, 1)
app_path.write_text(app)

css = css_path.read_text()
append = r'''

/* Risk-dashboard matched CDR banner: compact height, visible SVG inside the header, and matching card/logo composition. */
.app-shell .cdr-command-shell,
.app-shell.active-tab-overview .cdr-command-shell,
.app-shell.light-background-theme .cdr-command-shell,
.app-shell.se-theme.light-background-theme .cdr-command-shell {
  border-radius: 0 !important;
  border: 0 !important;
  box-shadow: none !important;
  padding: 0 0 16px !important;
}

.app-shell .cdr-command-shell > .topbar.followup-style-topbar.cdr-navy-banner,
.app-shell.dark-background-theme .cdr-command-shell > .topbar.followup-style-topbar.cdr-navy-banner,
.app-shell.light-background-theme .cdr-command-shell > .topbar.followup-style-topbar.cdr-navy-banner,
.app-shell.se-theme .cdr-command-shell > .topbar.followup-style-topbar.cdr-navy-banner {
  min-height: 132px !important;
  height: 132px !important;
  padding: 0 30px !important;
  grid-template-columns: 120px minmax(420px, 1fr) 120px !important;
  background: linear-gradient(135deg, #020f2e 0%, #041a4a 40%, #0a1f5c 60%, #0d0a1e 100%) !important;
  overflow: hidden !important;
  isolation: isolate !important;
}

.app-shell .cdr-command-shell > .topbar.followup-style-topbar.cdr-navy-banner > .cdr-banner-art {
  position: absolute !important;
  inset: 0 !important;
  width: 100% !important;
  height: 132px !important;
  z-index: 1 !important;
  pointer-events: none !important;
  overflow: hidden !important;
}

.app-shell .cdr-command-shell > .topbar.followup-style-topbar.cdr-navy-banner > .cdr-banner-art .cdr-banner-svg {
  width: 100% !important;
  height: 100% !important;
  display: block !important;
  opacity: 1 !important;
  mix-blend-mode: screen !important;
}

.app-shell .cdr-command-shell > .topbar.followup-style-topbar.cdr-navy-banner > *:not(.cdr-banner-art) {
  position: relative !important;
  z-index: 3 !important;
}

.app-shell .cdr-command-shell .followup-header-badge,
.app-shell .cdr-command-shell .followup-header-badge-left,
.app-shell .cdr-command-shell .followup-header-badge-right,
.app-shell.light-background-theme .cdr-command-shell .followup-header-badge,
.app-shell.se-theme.light-background-theme .cdr-command-shell .followup-header-badge {
  width: 82px !important;
  height: 68px !important;
  padding: 8px 10px !important;
  border-radius: 12px !important;
  background: rgba(255, 255, 255, 0.96) !important;
  box-shadow:
    0 14px 34px rgba(0, 0, 0, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 1) !important;
}

.app-shell .cdr-command-shell .followup-header-badge-left {
  justify-self: start !important;
  align-self: center !important;
}

.app-shell .cdr-command-shell .followup-header-badge-right {
  justify-self: end !important;
  align-self: center !important;
}

.app-shell .cdr-command-shell .followup-header-badge-left::before,
.app-shell .cdr-command-shell .followup-header-badge-right::before {
  inset: -44px !important;
  filter: blur(7px) !important;
}

.app-shell .cdr-command-shell .followup-header-badge-left::before {
  background: radial-gradient(circle, rgba(125, 211, 252, 0.58) 0%, rgba(14, 165, 233, 0.28) 45%, rgba(14, 165, 233, 0) 74%) !important;
}

.app-shell .cdr-command-shell .followup-header-badge-right::before {
  background: radial-gradient(circle, rgba(251, 113, 133, 0.70) 0%, rgba(239, 68, 68, 0.36) 45%, rgba(239, 68, 68, 0) 74%) !important;
}

.app-shell .cdr-command-shell .followup-header-badge img,
.app-shell .cdr-command-shell .followup-header-badge-left img,
.app-shell .cdr-command-shell .followup-header-badge-right img {
  max-width: 64px !important;
  max-height: 50px !important;
}

.app-shell .cdr-command-shell .followup-dashboard-title {
  transform: translateY(-2px) !important;
  gap: 8px !important;
}

.app-shell .cdr-command-shell .followup-dashboard-title h1,
.app-shell.light-background-theme .cdr-command-shell .followup-dashboard-title h1,
.app-shell.se-theme.light-background-theme .cdr-command-shell .followup-dashboard-title h1 {
  font-size: 26px !important;
  letter-spacing: 0.01em !important;
  text-shadow:
    0 2px 0 rgba(37, 99, 235, 0.96),
    0 0 14px rgba(56, 189, 248, 0.78),
    0 0 2px rgba(255, 255, 255, 0.90) !important;
}

.app-shell .cdr-command-shell .followup-dashboard-title p,
.app-shell.light-background-theme .cdr-command-shell .followup-dashboard-title p,
.app-shell.se-theme.light-background-theme .cdr-command-shell .followup-dashboard-title p {
  color: rgba(0, 206, 209, 0.95) !important;
  font-size: 13px !important;
  letter-spacing: 0.22em !important;
}

@media (max-width: 900px) {
  .app-shell .cdr-command-shell > .topbar.followup-style-topbar.cdr-navy-banner,
  .app-shell.dark-background-theme .cdr-command-shell > .topbar.followup-style-topbar.cdr-navy-banner,
  .app-shell.light-background-theme .cdr-command-shell > .topbar.followup-style-topbar.cdr-navy-banner,
  .app-shell.se-theme .cdr-command-shell > .topbar.followup-style-topbar.cdr-navy-banner {
    height: auto !important;
    min-height: 230px !important;
    padding: 22px 18px !important;
    grid-template-columns: 1fr !important;
  }
}
'''
marker = '/* Risk-dashboard matched CDR banner: compact height, visible SVG inside the header, and matching card/logo composition. */'
if marker in css:
    css = css[:css.index(marker)] + append
else:
    css += append
css_path.write_text(css)
print('Risk-matched CDR banner applied successfully.')
