from pathlib import Path

root = Path('/home/ubuntu/cdr_project')
app_path = root / 'src' / 'App.tsx'
css_path = root / 'src' / 'styles.css'

app = app_path.read_text()
old = '''        <div className="cdr-banner-art" aria-hidden="true">
          <svg className="cdr-banner-svg" viewBox="0 0 1440 220" preserveAspectRatio="none">
            <defs>
              <pattern id="cdr-dot-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.6" fill="rgba(255,255,255,0.26)" />
              </pattern>
              <linearGradient id="cdr-line-glow" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.34" />
                <stop offset="100%" stopColor="#00ced1" stopOpacity="0.14" />
              </linearGradient>
            </defs>
            <rect x="0" y="0" width="1440" height="220" fill="url(#cdr-dot-grid)" opacity="0.30" />
            <path d="M-40 170 C180 40 310 245 520 106 S840 22 1020 112 1260 215 1500 68" fill="none" stroke="url(#cdr-line-glow)" strokeWidth="2" />
            <path d="M80 48 C240 130 364 6 520 72 S820 180 1004 64 1250 28 1394 122" fill="none" stroke="rgba(255,255,255,0.13)" strokeWidth="1.4" strokeDasharray="10 12" />
            <g fill="none" stroke="rgba(0,206,209,0.24)" strokeWidth="2">
              <path d="M104 152 h110 v-34 h76" />
              <circle cx="104" cy="152" r="5" fill="rgba(0,206,209,0.34)" />
              <circle cx="290" cy="118" r="5" fill="rgba(0,206,209,0.34)" />
              <path d="M1138 66 h92 v42 h112" />
              <circle cx="1138" cy="66" r="5" fill="rgba(56,189,248,0.34)" />
              <circle cx="1342" cy="108" r="5" fill="rgba(56,189,248,0.34)" />
              <path d="M660 190 v-46 h58 l24-28 h76" />
              <circle cx="660" cy="190" r="4" fill="rgba(255,255,255,0.30)" />
              <circle cx="818" cy="116" r="4" fill="rgba(255,255,255,0.30)" />
            </g>
          </svg>
        </div>
'''
new = '''        <div className="cdr-banner-art" aria-hidden="true">
          <svg className="cdr-banner-svg" viewBox="0 0 1440 220" preserveAspectRatio="none">
            <defs>
              <pattern id="cdr-dot-grid" width="22" height="22" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.35" fill="rgba(255,255,255,0.30)" />
              </pattern>
              <filter id="cdr-soft-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <radialGradient id="cdr-se-logo-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#00ced1" stopOpacity="0.62" />
                <stop offset="48%" stopColor="#1d4ed8" stopOpacity="0.34" />
                <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="cdr-nasco-logo-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.54" />
                <stop offset="48%" stopColor="#dc2626" stopOpacity="0.30" />
                <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="cdr-blue-wave" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.72" />
                <stop offset="52%" stopColor="#00ced1" stopOpacity="0.48" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0.16" />
              </linearGradient>
              <linearGradient id="cdr-red-wave" x1="1" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fecaca" stopOpacity="0.70" />
                <stop offset="48%" stopColor="#ef4444" stopOpacity="0.46" />
                <stop offset="100%" stopColor="#7f1d1d" stopOpacity="0.16" />
              </linearGradient>
              <linearGradient id="cdr-frame-line" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#00ced1" stopOpacity="0" />
                <stop offset="18%" stopColor="#38bdf8" stopOpacity="0.60" />
                <stop offset="50%" stopColor="#ffffff" stopOpacity="0.34" />
                <stop offset="82%" stopColor="#ef4444" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
              </linearGradient>
            </defs>

            <rect x="0" y="0" width="1440" height="220" fill="url(#cdr-dot-grid)" opacity="0.36" />
            <ellipse cx="132" cy="92" rx="210" ry="116" fill="url(#cdr-se-logo-glow)" opacity="0.96" />
            <ellipse cx="1308" cy="92" rx="210" ry="116" fill="url(#cdr-nasco-logo-glow)" opacity="0.96" />

            <g className="cdr-blue-waves" fill="none" strokeLinecap="round" filter="url(#cdr-soft-glow)">
              <path d="M-48 164 C62 66 132 42 216 94 S374 160 486 72" stroke="url(#cdr-blue-wave)" strokeWidth="8" opacity="0.78" />
              <path d="M-62 126 C58 34 166 176 282 90 S430 42 552 130" stroke="#38bdf8" strokeWidth="3" opacity="0.46" />
              <path d="M-74 194 C72 108 152 214 288 142 S424 94 560 164" stroke="#00ced1" strokeWidth="2" opacity="0.38" />
            </g>

            <g className="cdr-red-waves" fill="none" strokeLinecap="round" filter="url(#cdr-soft-glow)">
              <path d="M1488 156 C1378 58 1308 34 1224 86 S1066 152 954 64" stroke="url(#cdr-red-wave)" strokeWidth="8" opacity="0.74" />
              <path d="M1502 118 C1382 26 1274 168 1158 82 S1010 34 888 122" stroke="#f87171" strokeWidth="3" opacity="0.46" />
              <path d="M1514 188 C1368 100 1288 206 1152 134 S1016 86 880 156" stroke="#ef4444" strokeWidth="2" opacity="0.38" />
            </g>

            <g className="cdr-glow-frame" filter="url(#cdr-soft-glow)">
              <line x1="226" y1="54" x2="1214" y2="54" stroke="url(#cdr-frame-line)" strokeWidth="2" opacity="0.70" />
              <line x1="226" y1="166" x2="1214" y2="166" stroke="url(#cdr-frame-line)" strokeWidth="2" opacity="0.62" />
              <line x1="330" y1="43" x2="498" y2="43" stroke="#00ced1" strokeWidth="1.4" opacity="0.38" />
              <line x1="942" y1="177" x2="1110" y2="177" stroke="#ef4444" strokeWidth="1.4" opacity="0.34" />
            </g>

            <g className="cdr-shield-icon" transform="translate(704 18)" filter="url(#cdr-soft-glow)">
              <path d="M16 0 L34 7 V22 C34 37 25 49 16 55 C7 49 -2 37 -2 22 V7 Z" fill="rgba(2,15,46,0.45)" stroke="rgba(255,255,255,0.58)" strokeWidth="1.8" />
              <path d="M16 8 L26 12 V23 C26 32 22 39 16 44 C10 39 6 32 6 23 V12 Z" fill="rgba(0,206,209,0.18)" stroke="rgba(0,206,209,0.62)" strokeWidth="1.2" />
              <path d="M10 25 l4 4 9 -12" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.86" />
            </g>

            <g className="cdr-mini-bar-chart" transform="translate(420 118)" opacity="0.72">
              <rect x="0" y="0" width="94" height="58" rx="14" fill="rgba(2,15,46,0.36)" stroke="rgba(125,211,252,0.30)" />
              <rect x="18" y="32" width="9" height="13" rx="3" fill="#38bdf8" />
              <rect x="36" y="22" width="9" height="23" rx="3" fill="#00ced1" />
              <rect x="54" y="14" width="9" height="31" rx="3" fill="#60a5fa" />
              <rect x="72" y="27" width="9" height="18" rx="3" fill="#93c5fd" />
              <line x1="14" y1="46" x2="84" y2="46" stroke="rgba(255,255,255,0.28)" strokeWidth="1" />
            </g>

            <g className="cdr-mini-donut-chart" transform="translate(930 114)" opacity="0.74">
              <rect x="0" y="0" width="94" height="62" rx="14" fill="rgba(2,15,46,0.36)" stroke="rgba(248,113,113,0.28)" />
              <circle cx="36" cy="31" r="17" fill="none" stroke="rgba(255,255,255,0.24)" strokeWidth="8" />
              <path d="M36 14 A17 17 0 1 1 20 36" fill="none" stroke="#ef4444" strokeWidth="8" strokeLinecap="round" />
              <path d="M20 36 A17 17 0 0 1 36 14" fill="none" stroke="#38bdf8" strokeWidth="8" strokeLinecap="round" />
              <line x1="62" y1="22" x2="78" y2="22" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
              <line x1="62" y1="39" x2="80" y2="39" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
            </g>

            <g className="cdr-circuit-nodes" fill="none" strokeWidth="1.8" opacity="0.74">
              <path d="M30 32 h92 v34 h76" stroke="rgba(0,206,209,0.36)" />
              <path d="M30 188 h74 v-32 h84" stroke="rgba(0,206,209,0.30)" />
              <path d="M1410 32 h-92 v34 h-76" stroke="rgba(248,113,113,0.36)" />
              <path d="M1410 188 h-74 v-32 h-84" stroke="rgba(248,113,113,0.30)" />
              <circle cx="30" cy="32" r="5" fill="#00ced1" stroke="rgba(255,255,255,0.38)" />
              <circle cx="198" cy="66" r="4" fill="#38bdf8" stroke="rgba(255,255,255,0.32)" />
              <circle cx="30" cy="188" r="5" fill="#00ced1" stroke="rgba(255,255,255,0.34)" />
              <circle cx="188" cy="156" r="4" fill="#38bdf8" stroke="rgba(255,255,255,0.28)" />
              <circle cx="1410" cy="32" r="5" fill="#ef4444" stroke="rgba(255,255,255,0.38)" />
              <circle cx="1242" cy="66" r="4" fill="#f87171" stroke="rgba(255,255,255,0.32)" />
              <circle cx="1410" cy="188" r="5" fill="#ef4444" stroke="rgba(255,255,255,0.34)" />
              <circle cx="1252" cy="156" r="4" fill="#f87171" stroke="rgba(255,255,255,0.28)" />
            </g>
          </svg>
        </div>
'''
if old not in app:
    raise SystemExit('Current SVG block not found; no changes applied.')
app = app.replace(old, new, 1)
app_path.write_text(app)

css = css_path.read_text()
append = r'''

/* Rich branded SVG refinements: stronger logo glow, frame visibility, and layered decorative art. */
.app-shell .cdr-command-shell > .cdr-banner-art {
  height: 220px !important;
  z-index: 2 !important;
}

.app-shell .cdr-command-shell > .cdr-banner-art .cdr-banner-svg {
  opacity: 1 !important;
  mix-blend-mode: screen !important;
}

.app-shell .cdr-command-shell > .topbar.followup-style-topbar.cdr-navy-banner,
.app-shell.dark-background-theme .cdr-command-shell > .topbar.followup-style-topbar.cdr-navy-banner,
.app-shell.light-background-theme .cdr-command-shell > .topbar.followup-style-topbar.cdr-navy-banner,
.app-shell.se-theme .cdr-command-shell > .topbar.followup-style-topbar.cdr-navy-banner {
  min-height: 220px !important;
  isolation: isolate !important;
}

.app-shell .cdr-command-shell .followup-header-badge-left,
.app-shell .cdr-command-shell .followup-header-badge-right {
  position: relative !important;
  overflow: visible !important;
}

.app-shell .cdr-command-shell .followup-header-badge-left::before,
.app-shell .cdr-command-shell .followup-header-badge-right::before {
  content: "" !important;
  position: absolute !important;
  inset: -38px !important;
  z-index: -1 !important;
  border-radius: 999px !important;
  filter: blur(8px) !important;
  pointer-events: none !important;
}

.app-shell .cdr-command-shell .followup-header-badge-left::before {
  background: radial-gradient(circle, rgba(0, 206, 209, 0.72) 0%, rgba(37, 99, 235, 0.36) 42%, rgba(37, 99, 235, 0) 72%) !important;
}

.app-shell .cdr-command-shell .followup-header-badge-right::before {
  background: radial-gradient(circle, rgba(239, 68, 68, 0.66) 0%, rgba(220, 38, 38, 0.36) 42%, rgba(220, 38, 38, 0) 72%) !important;
}

.app-shell .cdr-command-shell .followup-header-badge,
.app-shell .cdr-command-shell .followup-header-badge-left,
.app-shell .cdr-command-shell .followup-header-badge-right {
  box-shadow:
    0 18px 42px rgba(0, 0, 0, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.98) !important;
}
'''
marker = '/* Rich branded SVG refinements: stronger logo glow, frame visibility, and layered decorative art. */'
if marker in css:
    css = css[:css.index(marker)] + append
else:
    css += append
css_path.write_text(css)

print('Rich banner SVG update applied successfully.')
