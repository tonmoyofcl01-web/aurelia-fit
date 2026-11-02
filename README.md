# AURELIA FIT

AURELIA FIT is a dark, ruby-red gym management dashboard built with React, Vite, Tailwind CSS v4, Express, and MongoDB/Mongoose. It is designed as a single-gym academic/demo application.

## Requirements

- Node.js 20 or newer
- npm
- MongoDB Atlas or a local MongoDB instance

## Configure the backend

1. Copy `backend/.env.example` to `backend/.env` (overwrite the sanitized `.env` placeholder if it exists).
2. Set `MONGODB_URI` to your MongoDB connection string. Use `aurelia_fit` as the database name.
3. Set `JWT_SECRET` to a random value at least 32 characters long. The backend intentionally refuses to start when it is missing.
4. Set `OWNER_NAME`, `OWNER_EMAIL`, and a unique `OWNER_PASSWORD` for the first owner account.
5. Keep your configured `backend/.env` private. Never commit or share your real credentials. The `.env` included in this audit ZIP has been sanitized and contains no working connection string or credentials.

For MongoDB Atlas, create a database user and allow the backend machine's IP in Network Access. If the password contains reserved URI characters, URL-encode it before inserting it into the connection string.

Mongoose creates the collections and indexes when the application connects and writes its first records. No manual collection creation is required.

## Install and run

From the project root:

```bash
npm run install:all
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend health check: `http://localhost:5000/api/health`

The backend creates the first owner account at startup when the owner environment variables are present and that email does not already exist. After your first login, change the password from **Settings → Change password**.

## Current modules

- **Authentication:** owner/admin/receptionist/trainer staff access, HttpOnly cookie session, logout, and password change.
- **Dashboard:** member/trainer counts, active and expiring memberships, attendance, monthly paid revenue, recent registrations, recent payments, and membership status.
- **Members and trainers:** create, search, edit, and guarded delete; members receive generated member IDs.
- **Plans and memberships:** maintain membership plans, assign a plan to a member, calculate the membership end date from its duration, and track expiry.
- **Attendance:** member check-in, check-out, visit log, duplicate open check-in prevention, and Dhaka-local attendance date.
- **Payments:** manual cash/bank/mobile-banking/card payment records, optional linked membership selection, paid/pending/refunded statuses, and transaction reporting. No online payment gateway is connected.
- **Workout plans:** assign a plan to a member and optionally a trainer. Enter one schedule line per day using this format in the schedule field:

  `Monday | Upper body | Bench press (3x10); Push-ups (3x12)`

- **Reports:** selectable Bangladesh-local date range, monthly paid revenue, registration and attendance totals, payment/membership summaries, CSV export.
- **Settings:** staff can update their own profile and password; owners/admins can also manage gym contact details, opening hours, and currency display.
- **Notifications:** notification list and read state. The app currently displays notifications saved in MongoDB; it does not yet generate operational alerts automatically.

## Roles and access

- `owner`: full staff dashboard access.
- `admin`: management and reporting access.
- `receptionist`: members, memberships, attendance, payments, and personal profile/password settings.
- `trainer`: attendance and workout-plan operations; can select active members for assigned plans and manage personal profile/password settings.
- `member`: reserved in the user schema, but a member self-service portal is not included in this staff dashboard build. A member login receives an explanatory access message and can sign out.

## Deployment

- Deploy the `frontend` folder to Vercel. Set `VITE_API_URL` to your deployed backend's API root, for example `https://your-api.example.com/api`.
- Deploy the `backend` folder to a Node.js host that supports Express processes. Set the variables from `backend/.env.example` on that host.
- Set `CLIENT_URL` to the exact deployed frontend origin.
- For cross-site cookie authentication over HTTPS, use `COOKIE_SAME_SITE=none` and `COOKIE_SECURE=true`.
- Keep MongoDB Atlas Network Access limited to the backend host's required IP/network configuration.

This repository deploys the frontend to Vercel; it does not configure the Express API as a Vercel serverless function.

## Known scope limits

This is a student/demo application, not a production-certified SaaS. It does not include member self-registration, staff-account administration/invitations, a full member portal, printable payment receipts, online payment processing, automated notification generation, multi-gym tenancy, or automated end-to-end tests. Review authentication, authorization, backups, monitoring, privacy, and deployment security before real commercial use.
