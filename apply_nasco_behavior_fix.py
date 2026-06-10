from pathlib import Path

css_path = Path('/home/ubuntu/cdr_project/src/styles.css')
css = css_path.read_text()

append = r'''

/* NASCO logo behavior fix: match Risk banner right-logo card proportions and containment. */
.app-shell .cdr-command-shell > .topbar.followup-style-topbar.cdr-navy-banner {
  grid-template-columns: 120px minmax(420px, 1fr) 136px !important;
}

.app-shell .cdr-command-shell .followup-header-badge-right,
.app-shell.light-background-theme .cdr-command-shell .followup-header-badge-right,
.app-shell.se-theme.light-background-theme .cdr-command-shell .followup-header-badge-right {
  grid-column: 3 !important;
  grid-row: 1 !important;
  justify-self: end !important;
  align-self: center !important;
  position: relative !important;
  top: auto !important;
  right: auto !important;
  left: auto !important;
  width: 104px !important;
  height: 68px !important;
  padding: 8px 10px !important;
  display: grid !important;
  place-items: center !important;
  border-radius: 12px !important;
  background: rgba(255, 255, 255, 0.96) !important;
  border: 1px solid rgba(255, 255, 255, 0.92) !important;
  overflow: visible !important;
  transform: none !important;
  box-shadow:
    0 14px 34px rgba(0, 0, 0, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 1) !important;
}

.app-shell .cdr-command-shell .followup-header-badge-right img {
  width: 100% !important;
  height: 100% !important;
  max-width: 86px !important;
  max-height: 50px !important;
  object-fit: contain !important;
  object-position: center center !important;
  display: block !important;
  filter: none !important;
  transform: none !important;
}

.app-shell .cdr-command-shell .followup-header-badge-right::before {
  inset: -48px !important;
  z-index: -1 !important;
  background: radial-gradient(circle, rgba(251, 113, 133, 0.72) 0%, rgba(239, 68, 68, 0.38) 44%, rgba(239, 68, 68, 0) 74%) !important;
  filter: blur(7px) !important;
}

@media (max-width: 900px) {
  .app-shell .cdr-command-shell .followup-header-badge-right,
  .app-shell.light-background-theme .cdr-command-shell .followup-header-badge-right,
  .app-shell.se-theme.light-background-theme .cdr-command-shell .followup-header-badge-right {
    grid-column: 1 !important;
    grid-row: 3 !important;
    justify-self: center !important;
    width: 104px !important;
    height: 68px !important;
  }
}
'''
marker = '/* NASCO logo behavior fix: match Risk banner right-logo card proportions and containment. */'
if marker in css:
    css = css[:css.index(marker)] + append
else:
    css += append
css_path.write_text(css)
print('NASCO behavior fix appended successfully.')
