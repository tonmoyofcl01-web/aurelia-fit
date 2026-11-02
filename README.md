# AURELIA FIT — Gym & Fitness Center Management System

AURELIA FIT is a full-stack gym management application for handling the everyday operations of a fitness center from one dashboard. It brings member records, trainers, membership plans, attendance, payments, workout assignments, reports, and workspace settings into a single interface.

The project uses a dark charcoal and ruby-red visual theme and is designed as a single-gym academic/demo application.

## Dashboard Preview

![AURELIA FIT dashboard](assets/AureliaFit.png)

## Features

### Dashboard & Analytics
- Overview of total and active members.
- Active trainer and daily attendance counts.
- Memberships expiring soon.
- Monthly paid-revenue overview.
- Membership status visualization.
- Recent member activity and payment transactions.

### Member Management
- Create, view, search, edit, and manage member records.
- Generate member IDs.
- Track member status and membership information.

### Trainer Management
- Create and manage trainer records.
- Associate trainers with memberships and workout plans.

### Plans & Memberships
- Create and maintain membership plans, including duration and price.
- Assign plans to members.
- Track membership start/end dates, status, and assigned trainer.

### Attendance
- Record member check-ins and check-outs.
- Review the visit log and attendance history.
- Prevent duplicate open check-ins for the same member.
- Delete attendance records where the signed-in role has permission.

### Payments
- Record payments and associate them with members and, when applicable, memberships.
- Track paid, pending, and refunded payment statuses.
- View payment history and transaction summaries.
- Supports recording cash, bank, mobile-banking, and card payments; no online payment gateway is integrated.

### Workout Plans
- Create workout plans for members.
- Optionally assign a trainer.
- Define a weekly schedule and add notes.

### Reports
- Filter reporting data by date range.
- Review registrations, attendance, paid revenue, payment summaries, and membership status.
- Export report data as CSV.

### Settings, Authentication & Notifications
- Cookie-based staff authentication.
- Role-based access control.
- Update account profile and change password.
- Configure gym contact information, opening hours, and currency display.
- View stored notifications and mark them as read.

## Technology Stack

| Area | Technologies |
|---|---|
| Frontend | React 18, Vite 6 |
| Styling | Tailwind CSS v4, custom CSS |
| UI & charts | Lucide React, Recharts |
| HTTP client | Axios |
| Backend | Node.js, Express 4 |
| Database | MongoDB, Mongoose |
| Authentication | JSON Web Tokens, HttpOnly cookies, bcryptjs |
| Backend middleware | CORS, Helmet, cookie-parser, express-rate-limit, Morgan |

## Project Structure

```text
aurelia-fit/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── utils/
│   │   ├── bootstrap.js
│   │   └── server.js
│   ├── .env.example
│   ├── package.json
│   └── package-lock.json
├── frontend/
│   ├── src/
│   │   ├── api.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── style.css
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── package-lock.json
├── package.json
├── package-lock.json
├── .gitignore
└── README.md
```

The exact set of utility and configuration files may evolve as the project is maintained.

## Requirements

- Node.js 20 or newer
- npm
- MongoDB Atlas account or a reachable MongoDB instance
- Git (optional, for cloning and version control)

## Getting Started

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd aurelia-fit
```

If you already have the project locally, open a terminal in the project root instead.

### 2. Install dependencies

Run from the project root:

```bash
npm run install:all
```

This installs the root, backend, and frontend dependencies.

### 3. Configure environment variables

Create the backend environment file from the example.

**Windows PowerShell:**

```powershell
Copy-Item backend/.env.example backend/.env
```

**Windows Command Prompt:**

```cmd
copy backend\.env.example backend\.env
```

Open `backend/.env` and configure the values:

```env
PORT=5000
NODE_ENV=development
APP_TIMEZONE=Asia/Dhaka

MONGODB_URI=mongodb+srv://DB_USER:URL_ENCODED_PASSWORD@YOUR_CLUSTER.mongodb.net/aurelia_fit?retryWrites=true&w=majority

JWT_SECRET=replace_with_a_long_random_secret_at_least_32_characters
JWT_EXPIRES_IN=8h

CLIENT_URL=http://localhost:5173
COOKIE_SAME_SITE=lax
COOKIE_SECURE=false

OWNER_NAME=Gym Owner
OWNER_EMAIL=owner@example.com
OWNER_PASSWORD=ChangeThisImmediately123!
```

Replace all example credentials and connection details with your own values. Use a long, random JWT secret and a strong owner password.

For MongoDB Atlas:
1. Create a database user.
2. Allow the development machine's IP address in Atlas Network Access.
3. Use the Atlas driver connection string for `MONGODB_URI`.
4. URL-encode reserved characters in the database username/password before placing them in the URI.

> **Windows DNS note:** If Node.js reports `querySrv ECONNREFUSED` for a MongoDB Atlas `mongodb+srv://` URI while `nslookup` works, this project includes a DNS bootstrap workaround. Configure `NODE_DNS_SERVERS=1.1.1.1,8.8.8.8` in `backend/.env` when using that bootstrap. Do not add this setting unless it is needed in your environment.

### 4. Start the application

From the project root:

```bash
npm run dev
```

The root script starts the backend and frontend together.

Default local addresses:

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API health check | http://localhost:5000/api/health |

Vite automatically selects another port (for example, `5174`) if the default port is already occupied. When that happens, set `CLIENT_URL` in `backend/.env` to the exact frontend origin shown in the Vite terminal, then restart the backend. Credentialed cookie requests require the origin to match.

### 5. Sign in

On startup, the backend creates the initial owner account from `OWNER_NAME`, `OWNER_EMAIL`, and `OWNER_PASSWORD` only when an account with that email does not already exist.

After the first sign-in, change the initial password from **Settings → Change password**.

Changing `OWNER_PASSWORD` in `.env` does not reset the password of an owner account that already exists in MongoDB.

## Available Scripts

Run these commands from the project root:

| Command | Description |
|---|---|
| `npm run install:all` | Install root, backend, and frontend dependencies |
| `npm run dev` | Run backend and frontend in development mode |
| `npm run build` | Build the frontend for production |
| `npm start` | Start the backend |

You can also run frontend/backend scripts from their respective folders using the scripts in each package.

## Roles & Access

The application includes role-based access for staff workflows:

- **Owner:** full staff-dashboard access.
- **Admin:** management and reporting access.
- **Receptionist:** member, membership, attendance, and payment workflows.
- **Trainer:** attendance and workout-plan workflows.
- **Member:** reserved in the user model; a member self-service portal is not part of this staff-dashboard build.

Access is enforced by backend route permissions as well as the frontend navigation.

## Manual Testing

The following essential workflows were manually exercised during development:

- Staff sign-in and sign-out.
- Member creation and lookup.
- Trainer creation.
- Membership plan creation and membership assignment.
- Attendance check-in.
- Payment recording with a paid status.
- Dashboard and report revenue display after the revenue-date fix.
- Settings page access and protected-page behavior after logout.

This is a manual smoke-test record, not a claim of complete automated or production testing.

## Deployment Notes

A typical deployment separates the frontend and Express API:

1. Deploy the `frontend` directory to a static frontend host such as Vercel.
2. Deploy the `backend` directory to a Node.js host that supports a persistent Express process.
3. Set `VITE_API_URL` in the frontend build environment to the deployed API root, for example `https://your-api.example.com/api`.
4. Configure the backend environment variables in the hosting provider.
5. Set `CLIENT_URL` to the exact deployed frontend origin.
6. For cross-site cookie authentication over HTTPS, configure `COOKIE_SAME_SITE=none` and `COOKIE_SECURE=true`.
7. Restrict MongoDB Atlas Network Access to the backend host's required network/IP range.

The Express API is not configured as a Vercel serverless function by this project.

## Security & Repository Hygiene

- Never commit `backend/.env` or other files containing credentials.
- Keep `admin_account.txt` out of version control.
- Use `.env.example` only for placeholder values.
- Rotate credentials if a real secret is accidentally committed or shared.
- Do not publish database connection strings, JWT secrets, owner passwords, or private account information.

## Current Scope & Limitations

AURELIA FIT is an academic/demo application and is not a production-certified SaaS platform. Current scope limitations include:

- Single-gym workspace; multi-gym tenancy is not implemented.
- No online payment gateway integration.
- No member self-registration or member self-service portal.
- No staff invitation/account-administration workflow.
- Notifications can be viewed and marked as read, but operational alerts are not automatically generated.
- No automated end-to-end test suite is included.

Before using the application for real commercial operations, add appropriate automated tests and review authorization, data backups, audit logging, monitoring, privacy, and deployment security.

## License

No license has been specified. Add a `LICENSE` file before redistributing the project under an open-source license.
