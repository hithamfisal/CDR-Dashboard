# CDR V7 Dashboard — Security Audit & Cleanup Report

**Author:** Dashboard security review
**Date:** June 18, 2026

This document outlines the frontend security audit performed on the CDR V7 project, the specific vulnerabilities that were patched, and a comprehensive list of legacy files that can be safely deleted without affecting local development, web hosting, or npm packages.

## 1. Security Vulnerabilities Patched

The project was audited against standard frontend security checklists (XSS prevention, secrets management, safe storage, and configuration). The following issues were identified and fixed:

### A. Cross-Site Scripting (XSS) via `innerHTML`
- **Location:** `src/App.tsx` (Line 1749)
- **Issue:** The chart export button was dynamically creating HTML using `button.innerHTML = ...`. While the input was mostly SVG icons, using `innerHTML` directly in React/DOM manipulation is a known vector for XSS if any user-controlled data ever enters that string.
- **Fix:** Replaced `innerHTML` with safe DOM manipulation methods: `insertAdjacentHTML` for the static SVG, and `textContent` for the text label. This guarantees that no malicious script can be executed even if the chart title contains unsafe characters.

### B. Insecure Storage of Metadata
- **Location:** `src/lib/browserCache.ts`
- **Issue:** The application was storing workbook metadata in `window.localStorage`. Data in `localStorage` persists indefinitely across sessions and is vulnerable to theft if an XSS attack occurs.
- **Fix:** Migrated the storage from `localStorage` to `sessionStorage`. This ensures that the metadata is cleared as soon as the user closes the browser tab, significantly reducing the window of opportunity for data extraction.

### C. Missing Content Security Policy (CSP)
- **Location:** `index.html`
- **Issue:** The application lacked a Content Security Policy, meaning the browser would execute scripts or load resources from any origin, leaving the app vulnerable to data injection and XSS.
- **Fix:** Added a strict CSP meta tag to `index.html`. It restricts script execution, allows WebAssembly (required for the Excel parser), and restricts styles to self and Google Fonts.

### D. Missing HTTP Security Headers for Web Hosting
- **Location:** `vercel.json`
- **Issue:** When deployed to Vercel (or similar web hosts), the application was not sending security headers like `X-Frame-Options` or `X-Content-Type-Options`.
- **Fix:** Updated `vercel.json` to inject strict security headers for all routes:
  - `X-Frame-Options: DENY` (prevents clickjacking)
  - `X-Content-Type-Options: nosniff` (prevents MIME-type sniffing)
  - `X-XSS-Protection: 1; mode=block`
  - `Referrer-Policy: strict-origin-when-cross-origin`

## 2. Safe-to-Delete Files (Cleanup Guide)

During the audit, several legacy files, backups, and standalone scripts were identified. **Deleting these files will NOT affect your local development (`yarn dev`), web hosting (Vercel), or npm packages.**

You can safely delete the following files from your project root:

| File Path | Justification for Deletion |
| :--- | :--- |
| `src/styles.legacy.backup.css` | This is a 610KB backup file of old CSS. It is completely unreferenced in the source code. |
| `src/header-clean.css` | While currently imported in `main.tsx`, its contents have already been merged into the master `styles.css` during the previous V7 UI refactor. It is redundant. |
| `src/upload-clean.css` | Similar to the header CSS, this is redundant as the upload view styling is managed in the main stylesheet. |
| `remove_logo_boxes.py` | A standalone Python script used previously to patch the CSS. The CSS is already patched, so this script is no longer needed for the web app to function. |
| `STYLE_REFACTOR_REPORT.md` | A historical report from a previous styling update. It is safe to remove if you want a cleaner repository. |
| `README_DESKTOP_PATCH.md` | Historical notes regarding the Electron desktop patch. Safe to remove if no longer needed for reference. |

### How to Apply the CSS Cleanup
If you choose to delete `header-clean.css` and `upload-clean.css`, ensure you also remove their import statements from `src/main.tsx` and `src/styles/design-control.css` to prevent Vite build errors.

## Summary
The CDR V7 project is now secured against common frontend vulnerabilities. By relying on `sessionStorage`, enforcing strict CSP and HTTP headers, and removing `innerHTML` usage, the application's attack surface is drastically minimized. Cleaning up the legacy files will further streamline the codebase for future maintenance.
