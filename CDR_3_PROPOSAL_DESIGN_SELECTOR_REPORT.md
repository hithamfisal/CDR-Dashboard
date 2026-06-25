# CDR 3-Proposal Design Selector Implementation Report

## Implemented

Applied the attached CDR UI/UX proposal set as a new proposal-based design system.

### Design selector
- Added a header/control dropdown named **Design**.
- Added 3 proposal options:
  1. Proposal 1 – Dark Blue Command Center
  2. Proposal 2 – Light Executive SaaS
  3. Proposal 3 – Dark Emerald Operations
- The selected design is saved in localStorage using:
  - `cdr-selected-design-proposal`
- Old saved theme/layout keys are migrated/cleared.
- Selection applies instantly without page reload.

### Theme/design architecture
- Added centralized files:
  - `src/theme/designProposals.ts`
  - `src/theme/useDesignProposal.ts`
  - `src/styles/design-proposals.css`
- Design is applied using:
  - `html[data-design="proposal1"]`
  - `html[data-design="proposal2"]`
  - `html[data-design="proposal3"]`
  - `.design-proposal-1`
  - `.design-proposal-2`
  - `.design-proposal-3`

### UI areas covered
- Login page
- Customer View / Upload page
- Main dashboard shell
- Header/top controls
- Navigation tabs
- Filter boxes/dropdowns
- KPI cards
- Chart cards
- Table cards and rows
- Report/export buttons
- Upload buttons
- Status badges and chips
- Scrollbars
- Recharts text/grid/tooltip visibility
- Local Settings modal

### Preserved functionality
- MySQL user login and role detection
- System Admin / Customer Admin / Customer permissions
- Excel upload
- Sample data loading
- Continue previous workbook
- Master Fleetmap and Fixed Fleetmap upload/cache
- Existing KPI cards and analytics
- Existing dashboard tabs
- Existing reports/export actions

### Proposal image assets
The attached proposal reference images were copied into:
- `public/assets/design-proposals/`
- `dist/assets/design-proposals/`

These files are included for project reference and future visual matching.

## Validation performed in this workspace

Because the extracted project package does not include `node_modules`, full build/type-check cannot complete here. The following checks were performed:

- Static dist JS syntax check:
  - `node --check dist/assets/index-BFb2d_NV.js`
- Backend API syntax check:
  - `node --check server/index.cjs`
- ZIP integrity check after packaging

Run full validation locally after `yarn install`:

```powershell
yarn check
yarn build
```
