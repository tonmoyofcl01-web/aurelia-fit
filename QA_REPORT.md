# AURELIA FIT — source audit and repair notes

## Fixes made

- Added an explicit **Sign out** action in the top bar and profile area. Logout clears the matching HttpOnly cookie path and returns the interface to the login screen even if the API is temporarily unreachable.
- Added a working notification dropdown that loads notifications and marks them as read.
- Replaced the dark-green palette with deep oxblood/charcoal surfaces, ruby-red actions, rose highlights, and warm ivory text.
- Improved mobile navigation with a dismissible backdrop and a scrollable sidebar.
- Added reference selectors for members, plans, trainers, and related memberships. Users no longer need to copy MongoDB ObjectIds into membership, payment, and workout forms.
- Restricted status dropdowns to values valid for the resource being edited. New payments default to `paid` instead of the invalid `active` status.
- Added a simple weekly workout schedule editor using one readable line per day and converted it to the schema's `days[].exercises[]` structure.
- Fixed the dashboard API response so membership status statistics are returned to the dashboard UI.
- Added dashboard loading/retry and empty-chart states.
- Added report date-range filters and expanded CSV export to include the selected reporting period and report totals.
- Added backend field allow-lists for updates/settings, validation for membership and workout references, duplicate check-in responses, and delete guards for records with dependent history.
- Uses Asia/Dhaka for attendance-day grouping, dashboard monthly revenue boundaries, report date filters, and monthly grouping by default (`APP_TIMEZONE`).
- Added clearer 400/409 responses for invalid MongoDB IDs, validation failures, duplicate keys, and malformed JSON.
- Tightened role-based navigation and read permissions needed by receptionist/trainer reference selectors.
- Added startup validation for the database URI and JWT secret.
- Removed the uploaded live `backend/.env` from the deliverable archive. Only `.env.example` is included.

## Checks performed in this environment

- Backend JavaScript files pass `node --check`.
- Express API route module imports successfully.
- Frontend `App.jsx` and `main.jsx` pass a TypeScript/JSX parser check with no diagnostics.
- Frontend API client passes `node --check`.
- Resource controller, auth controller, and API route modules import successfully.
- The original uploaded `node_modules` directory was Windows-specific and did not contain the Linux Rollup optional binary; dependency reinstall in this environment timed out. The final ZIP therefore excludes all `node_modules` folders and lockfiles are retained for clean installation on the user's machine.

## Remaining limitations

- No live MongoDB integration test was run because the uploaded `.env` is intentionally excluded from the working audit copy.
- No automated browser/E2E test suite exists in the source project.
- Member self-service portal, staff-account invitations, printable receipts, online payments, and automatic notification generation remain outside this current build.
