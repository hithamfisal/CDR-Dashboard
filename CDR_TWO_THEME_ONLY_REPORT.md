# CDR Two Theme Only Patch

## Request
Keep only the first two proposed dashboard themes and remove the third Neon Futuristic option.

## Implemented
- Removed Proposal 3 - Neon Futuristic from all theme dropdown options.
- Theme dropdown now shows only:
  1. Proposal 1 - Dark Command Center
  2. Proposal 2 - Light Modern Analytics
- Updated source `ThemeName` type to only allow `dark` and `light`.
- Updated source and static `dist` runtime so any previously saved `neon` value is automatically migrated back to `dark`.
- Kept the fixed layout and restored upload hero picture unchanged.
- Kept role permissions unchanged.

## Notes
The old third-theme CSS can remain unused safely, but it is no longer reachable from the UI or saved settings. Existing browsers that had selected Neon will automatically return to Proposal 1.
