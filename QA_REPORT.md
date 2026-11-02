# AURELIA FIT — Full ZIP audit and repair report

## Scope

The complete uploaded project archive was inspected, including React/Vite frontend source, Express/Mongoose backend source, lockfiles, the existing `node_modules` trees, root metadata, and Git metadata. The delivered archive retains all original archive entries and adds this report. The existing `backend/.env` path is retained but its live credential values have been replaced with blank/safe placeholders.

## Bugs and repairs

1. **Attendance check-in payload was discarded.** `createResource('attendance')` used an allow-list that had no `attendance` entry, so `req.body.member` was removed before member validation. The POST handler now explicitly accepts only the `member` field for check-in creation.
2. **Member IDs could be omitted by a crafted request.** Member creation checked the raw request body for `memberId`, although the field is not client-editable. It now generates the ID whenever the server-side allow-listed payload has no ID.
3. **Staff Settings access was inconsistent.** The UI let receptionists/trainers open Settings, but the profile update route was owner/admin-only and the page attempted to load owner/admin gym settings. Settings is now available to staff roles for personal profile/password changes; gym-wide settings remain owner/admin-only in both UI and API.
4. **Notification popover behavior was incomplete.** Notification and profile menus now close on outside pointer interaction and Escape, and opening one closes the other. Notification dialog semantics, explicit button types, focus styles, and constrained scrolling were added.
5. **Payment history could be orphaned.** Membership deletion now returns HTTP 409 when a payment references that membership.
6. **MongoDB DNS was overridden globally.** Removed the hard-coded Google DNS resolver so MongoDB uses the host's normal DNS configuration.
7. **Unsafe sample credentials.** The example and included `.env` now leave the database URI, JWT secret, and owner password blank so setup fails safely until the owner configures them. The `.env` file path remains present to avoid silently omitting a file from the archive.

## Checks executed

- ZIP integrity test: **PASS** (`unzip -t` reported no archive errors).
- Backend syntax: **PASS** (`node --check` for every `backend/src/**/*.js` file).
- Backend API route import: **PASS**.
- Frontend JSX/JavaScript transpile parse: **PASS** for `App.jsx` and `main.jsx` using the TypeScript compiler parser/transpiler.
- Stylesheet parse: **PASS** using PostCSS.
- Isolated attendance check-in controller smoke test with mocked Mongoose methods: **PASS**.
- Server-side member ID generation smoke test: **PASS**.
- Membership payment-history delete-guard smoke test: **PASS**.

## Checks not completed / limitations

- **Vite production build: NOT VERIFIED.** The bundled `node_modules` came from a Windows environment and lacks the Linux Rollup optional binary (`@rollup/rollup-linux-x64-gnu`). A clean frontend `npm ci` attempt did not finish in this environment, so no build-success claim is made. On the Windows development machine, run `npm ci --prefix frontend` (or `npm install --prefix frontend`) and then `npm run build --prefix frontend` if the existing install is inconsistent.
- No live MongoDB integration test was possible because the archive's real database URI and credentials were removed from the output copy. Configure your own `backend/.env` before running the API.
- No real-browser interaction/E2E run was completed. There is no automated browser test suite in the source project.
- The project remains a student/demo application; this audit does not certify it for production use.

## Files changed

- `frontend/src/App.jsx`
- `frontend/src/style.css`
- `backend/src/controllers/resourceController.js`
- `backend/src/routes/api.js`
- `backend/src/config/db.js`
- `backend/.env.example`
- `backend/.env` (credentials sanitized; path retained)
- `README.md`
- `QA_REPORT.md`

## Important credential note

The uploaded ZIP contained a populated `backend/.env`. Treat credentials that were present there as exposed: rotate the MongoDB database-user password and change the owner's password, and use a fresh random JWT secret of at least 32 characters. Do not copy real secrets into source control or a shared ZIP.
