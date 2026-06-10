from pathlib import Path

app_path = Path('/home/ubuntu/cdr_project/src/App.tsx')
css_path = Path('/home/ubuntu/cdr_project/src/styles.css')

app = app_path.read_text()
app = app.replace('<h1>CDR TRAFFIC DASHBOARD</h1>\n            <p>CALL DETAIL RECORD ANALYTICS</p>', '<h1>CDR Traffic Dashboard</h1>\n            <p>CALL DETAIL RECORD ANALYTICS</p>')
app_path.write_text(app)

css = css_path.read_text()
marker = '/* FINAL EXACT RISK BANNER CLONE FOR CDR */'
if marker in css:
    css = css[:css.index(marker)].rstrip() + '\n'

css += r'''

/* FINAL EXACT RISK BANNER CLONE FOR CDR */
.app-shell .cdr-command-shell,
.app-shell.active-tab-overview .cdr-command-shell,
.app-shell.dark-background-theme .cdr-command-shell,
.app-shell.light-background-theme .cdr-command-shell,
.app-shell.se-theme .cdr-command-shell,
.app-shell.se-theme.light-background-theme .cdr-command-shell {
  min-height: auto !important;
  padding: 0 !important;
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
  overflow: visible !important;
}

.app-shell .cdr-command-shell::before,
.app-shell.light-background-theme .cdr-command-shell::before,
.app-shell.se-theme.light-background-theme .cdr-command-shell::before {
  display: none !important;
  content: none !important;
}

.app-shell .cdr-command-shell > .topbar.followup-style-topbar.cdr-navy-banner,
.app-shell.dark-background-theme .cdr-command-shell > .topbar.followup-style-topbar.cdr-navy-banner,
.app-shell.light-background-theme .cdr-command-shell > .topbar.followup-style-topbar.cdr-navy-banner,
.app-shell.se-theme .cdr-command-shell > .topbar.followup-style-topbar.cdr-navy-banner,
.app-shell.se-theme.light-background-theme .cdr-command-shell > .topbar.followup-style-topbar.cdr-navy-banner {
  position: relative !important;
  isolation: isolate !important;
  display: grid !important;
  grid-template-columns: 128px minmax(420px, 1fr) 88px !important;
  grid-template-rows: 132px !important;
  align-items: center !important;
  gap: 0 !important;
  width: 100% !important;
  min-height: 132px !important;
  height: 132px !important;
  margin: 0 !important;
  padding: 0 30px !important;
  border-radius: 0 !important;
  overflow: hidden !important;
  border: 0 !important;
  outline: 0 !important;
  background: linear-gradient(135deg, #020f2e 0%, #041a4a 40%, #0a1f5c 60%, #0d0a1e 100%) !important;
  background-color: #020f2e !important;
  box-shadow: none !important;
}

.app-shell .cdr-command-shell > .topbar.followup-style-topbar.cdr-navy-banner::before,
.app-shell .cdr-command-shell > .topbar.followup-style-topbar.cdr-navy-banner::after,
.app-shell.dark-background-theme .cdr-command-shell > .topbar.followup-style-topbar.cdr-navy-banner::before,
.app-shell.dark-background-theme .cdr-command-shell > .topbar.followup-style-topbar.cdr-navy-banner::after,
.app-shell.light-background-theme .cdr-command-shell > .topbar.followup-style-topbar.cdr-navy-banner::before,
.app-shell.light-background-theme .cdr-command-shell > .topbar.followup-style-topbar.cdr-navy-banner::after,
.app-shell.se-theme .cdr-command-shell > .topbar.followup-style-topbar.cdr-navy-banner::before,
.app-shell.se-theme .cdr-command-shell > .topbar.followup-style-topbar.cdr-navy-banner::after {
  display: none !important;
  content: none !important;
}

.app-shell .cdr-command-shell > .topbar.followup-style-topbar.cdr-navy-banner > .cdr-banner-art {
  position: absolute !important;
  inset: 0 !important;
  z-index: 0 !important;
  width: 100% !important;
  height: 100% !important;
  pointer-events: none !important;
  overflow: hidden !important;
  opacity: 1 !important;
}

.app-shell .cdr-command-shell > .topbar.followup-style-topbar.cdr-navy-banner > .cdr-banner-art .cdr-banner-svg {
  display: block !important;
  width: 100% !important;
  height: 100% !important;
  min-height: 132px !important;
  overflow: visible !important;
}

.app-shell .cdr-command-shell > .topbar.followup-style-topbar.cdr-navy-banner > *:not(.cdr-banner-art) {
  position: relative !important;
  z-index: 2 !important;
}

.app-shell .cdr-command-shell .followup-dashboard-title,
.app-shell.light-background-theme .cdr-command-shell .followup-dashboard-title,
.app-shell.se-theme.light-background-theme .cdr-command-shell .followup-dashboard-title {
  grid-column: 2 !important;
  grid-row: 1 !important;
  justify-self: center !important;
  align-self: center !important;
  width: auto !important;
  min-width: 0 !important;
  max-width: none !important;
  min-height: 0 !important;
  height: auto !important;
  padding: 0 !important;
  margin: 0 !important;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 8px !important;
  text-align: center !important;
}

.app-shell .cdr-command-shell .followup-dashboard-title h1,
.app-shell.light-background-theme .cdr-command-shell .followup-dashboard-title h1,
.app-shell.se-theme.light-background-theme .cdr-command-shell .followup-dashboard-title h1 {
  margin: 0 !important;
  padding: 0 !important;
  font-family: 'DM Sans', Arial, system-ui, sans-serif !important;
  font-size: 26px !important;
  line-height: 1.08 !important;
  font-weight: 900 !important;
  letter-spacing: -0.015em !important;
  font-style: normal !important;
  text-transform: none !important;
  white-space: nowrap !important;
  color: #ffffff !important;
  text-align: center !important;
  text-shadow:
    0 0 4px rgba(96, 165, 250, 1),
    0 0 13px rgba(37, 99, 235, 0.92),
    0 2px 7px rgba(0, 0, 0, 0.82) !important;
}

.app-shell .cdr-command-shell .followup-dashboard-title p,
.app-shell.light-background-theme .cdr-command-shell .followup-dashboard-title p,
.app-shell.se-theme.light-background-theme .cdr-command-shell .followup-dashboard-title p {
  display: block !important;
  margin: 0 !important;
  padding: 0 !important;
  font-family: 'DM Sans', Arial, system-ui, sans-serif !important;
  font-size: 13px !important;
  line-height: 1 !important;
  font-weight: 900 !important;
  letter-spacing: 0.26em !important;
  text-transform: uppercase !important;
  color: rgba(0, 206, 209, 0.9) !important;
  text-align: center !important;
  text-shadow: 0 0 10px rgba(0, 206, 209, 0.48) !important;
}

.app-shell .cdr-command-shell .followup-header-badge,
.app-shell .cdr-command-shell .followup-header-badge-left,
.app-shell .cdr-command-shell .followup-header-badge-right,
.app-shell.light-background-theme .cdr-command-shell .followup-header-badge,
.app-shell.light-background-theme .cdr-command-shell .followup-header-badge-left,
.app-shell.light-background-theme .cdr-command-shell .followup-header-badge-right,
.app-shell.se-theme.light-background-theme .cdr-command-shell .followup-header-badge,
.app-shell.se-theme.light-background-theme .cdr-command-shell .followup-header-badge-left,
.app-shell.se-theme.light-background-theme .cdr-command-shell .followup-header-badge-right {
  position: relative !important;
  top: auto !important;
  right: auto !important;
  bottom: auto !important;
  left: auto !important;
  transform: none !important;
  margin: 0 !important;
  display: grid !important;
  place-items: center !important;
  padding: 8px !important;
  border-radius: 12px !important;
  background: rgba(255, 255, 255, 0.97) !important;
  border: 1px solid rgba(255, 255, 255, 0.86) !important;
  overflow: visible !important;
  pointer-events: auto !important;
  box-shadow:
    0 12px 26px rgba(0, 0, 0, 0.26),
    inset 0 1px 0 rgba(255, 255, 255, 0.96) !important;
}

.app-shell .cdr-command-shell .followup-header-badge-left,
.app-shell.light-background-theme .cdr-command-shell .followup-header-badge-left,
.app-shell.se-theme.light-background-theme .cdr-command-shell .followup-header-badge-left {
  grid-column: 1 !important;
  grid-row: 1 !important;
  justify-self: start !important;
  align-self: center !important;
  width: 88px !important;
  height: 68px !important;
}

.app-shell .cdr-command-shell .followup-header-badge-right,
.app-shell.light-background-theme .cdr-command-shell .followup-header-badge-right,
.app-shell.se-theme.light-background-theme .cdr-command-shell .followup-header-badge-right {
  grid-column: 3 !important;
  grid-row: 1 !important;
  justify-self: end !important;
  align-self: center !important;
  width: 68px !important;
  height: 68px !important;
}

.app-shell .cdr-command-shell .followup-header-badge img,
.app-shell .cdr-command-shell .followup-header-badge-left img,
.app-shell .cdr-command-shell .followup-header-badge-right img,
.app-shell.light-background-theme .cdr-command-shell .followup-header-badge img,
.app-shell.light-background-theme .cdr-command-shell .followup-header-badge-left img,
.app-shell.light-background-theme .cdr-command-shell .followup-header-badge-right img,
.app-shell.se-theme.light-background-theme .cdr-command-shell .followup-header-badge img,
.app-shell.se-theme.light-background-theme .cdr-command-shell .followup-header-badge-left img,
.app-shell.se-theme.light-background-theme .cdr-command-shell .followup-header-badge-right img {
  display: block !important;
  width: 100% !important;
  height: 100% !important;
  max-width: 100% !important;
  max-height: 100% !important;
  object-fit: contain !important;
  object-position: center center !important;
  filter: none !important;
  transform: none !important;
}

.app-shell .cdr-command-shell .followup-header-badge-left::before,
.app-shell .cdr-command-shell .followup-header-badge-right::before {
  content: '' !important;
  position: absolute !important;
  z-index: -1 !important;
  pointer-events: none !important;
  border-radius: 999px !important;
  filter: blur(9px) !important;
  opacity: 0.86 !important;
}

.app-shell .cdr-command-shell .followup-header-badge-left::before {
  inset: -38px !important;
  background: radial-gradient(circle, rgba(96, 165, 250, 0.58) 0%, rgba(14, 165, 233, 0.32) 45%, rgba(14, 165, 233, 0) 75%) !important;
}

.app-shell .cdr-command-shell .followup-header-badge-right::before {
  inset: -34px !important;
  background: radial-gradient(circle, rgba(248, 113, 113, 0.54) 0%, rgba(220, 38, 38, 0.30) 45%, rgba(220, 38, 38, 0) 76%) !important;
}

.app-shell .cdr-command-shell > .cdr-banner-control-bar,
.app-shell.light-background-theme .cdr-command-shell > .cdr-banner-control-bar,
.app-shell.se-theme.light-background-theme .cdr-command-shell > .cdr-banner-control-bar {
  min-height: 40px !important;
  height: 40px !important;
  margin: 0 !important;
  padding: 0 24px !important;
  display: flex !important;
  justify-content: flex-end !important;
  align-items: center !important;
  border-radius: 0 !important;
  border: 0 !important;
  border-top: 1px solid rgba(148, 163, 184, 0.18) !important;
  background: rgba(2, 10, 28, 0.92) !important;
  box-shadow: none !important;
}

.app-shell.light-background-theme .cdr-command-shell > .cdr-banner-control-bar,
.app-shell.se-theme.light-background-theme .cdr-command-shell > .cdr-banner-control-bar {
  background: rgba(248, 250, 252, 0.94) !important;
  border-top-color: rgba(15, 23, 42, 0.12) !important;
}

@media (max-width: 900px) {
  .app-shell .cdr-command-shell > .topbar.followup-style-topbar.cdr-navy-banner,
  .app-shell.dark-background-theme .cdr-command-shell > .topbar.followup-style-topbar.cdr-navy-banner,
  .app-shell.light-background-theme .cdr-command-shell > .topbar.followup-style-topbar.cdr-navy-banner,
  .app-shell.se-theme .cdr-command-shell > .topbar.followup-style-topbar.cdr-navy-banner {
    grid-template-columns: 1fr !important;
    grid-template-rows: auto auto auto !important;
    height: auto !important;
    min-height: 220px !important;
    padding: 18px 20px !important;
    row-gap: 14px !important;
  }

  .app-shell .cdr-command-shell .followup-header-badge-left,
  .app-shell .cdr-command-shell .followup-header-badge-right {
    grid-column: 1 !important;
    justify-self: center !important;
  }

  .app-shell .cdr-command-shell .followup-header-badge-left { grid-row: 1 !important; }
  .app-shell .cdr-command-shell .followup-dashboard-title { grid-column: 1 !important; grid-row: 2 !important; }
  .app-shell .cdr-command-shell .followup-header-badge-right { grid-row: 3 !important; }

  .app-shell .cdr-command-shell .followup-dashboard-title h1 {
    white-space: normal !important;
    font-size: 24px !important;
  }
}
'''
css_path.write_text(css)
print('Exact Risk-clone CDR banner overrides applied.')
