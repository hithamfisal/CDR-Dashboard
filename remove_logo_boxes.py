from pathlib import Path

css_path = Path('/home/ubuntu/cdr_project/src/styles.css')
css = css_path.read_text()
marker = '/* FINAL DIRECT LOGOS WITHOUT BOXES */'
if marker in css:
    css = css[:css.index(marker)].rstrip() + '\n'

css += r'''

/* FINAL DIRECT LOGOS WITHOUT BOXES */
.app-shell .cdr-command-shell .followup-header-badge,
.app-shell .cdr-command-shell .followup-header-badge-left,
.app-shell .cdr-command-shell .followup-header-badge-right,
.app-shell.light-background-theme .cdr-command-shell .followup-header-badge,
.app-shell.light-background-theme .cdr-command-shell .followup-header-badge-left,
.app-shell.light-background-theme .cdr-command-shell .followup-header-badge-right,
.app-shell.se-theme.light-background-theme .cdr-command-shell .followup-header-badge,
.app-shell.se-theme.light-background-theme .cdr-command-shell .followup-header-badge-left,
.app-shell.se-theme.light-background-theme .cdr-command-shell .followup-header-badge-right {
  background: transparent !important;
  background-color: transparent !important;
  border: 0 !important;
  outline: 0 !important;
  box-shadow: none !important;
  border-radius: 0 !important;
  padding: 0 !important;
  overflow: visible !important;
}

.app-shell .cdr-command-shell .followup-header-badge-left,
.app-shell.light-background-theme .cdr-command-shell .followup-header-badge-left,
.app-shell.se-theme.light-background-theme .cdr-command-shell .followup-header-badge-left {
  width: 88px !important;
  height: 68px !important;
}

.app-shell .cdr-command-shell .followup-header-badge-right,
.app-shell.light-background-theme .cdr-command-shell .followup-header-badge-right,
.app-shell.se-theme.light-background-theme .cdr-command-shell .followup-header-badge-right {
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
  width: 100% !important;
  height: 100% !important;
  object-fit: contain !important;
  object-position: center center !important;
  filter: drop-shadow(0 10px 22px rgba(0, 0, 0, 0.42)) !important;
}
'''
css_path.write_text(css)
print('Logo boxes removed; logos now sit directly on the banner background.')
