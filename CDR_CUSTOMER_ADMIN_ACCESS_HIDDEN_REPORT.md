# CDR Customer Admin Access Hidden Patch

## Change Applied

The **Admin Access** badge/action is now rendered only for users with the `admin` role.

## Customer Behavior

For Customer users:

- **Admin Access** no longer appears.
- The button/badge is not shown as disabled.
- Dashboard tabs remain visible.
- `Upload Sheet` remains available.
- `Local Settings` remains hidden.

## Files Updated

- `src/App.tsx`
- `src/components/UploadView.tsx`

## Notes

This patch keeps the unified interface and role-based permissions intact while removing the admin access indicator from the customer UI.
