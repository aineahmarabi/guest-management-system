# Dualpix GMS — Guest Management System

Internal guest management platform for **Dualpix Communications Ltd**. Manages events, guest lists, check-in scanning, ticket generation, and attendance reporting.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router, TypeScript) |
| Database & Backend | [Convex](https://convex.dev) |
| Authentication | `@convex-dev/auth` v0.0.94 (Password provider) |
| Styling | Tailwind CSS |
| Email | Nodemailer (Gmail SMTP) |
| PDF Generation | `pdf-lib` |
| QR Scanning | `html5-qrcode` |
| Deployment | Vercel (frontend) + Convex Cloud (backend) |

---

## Features

- **Events** — Create, edit, and manage events with date, venue, capacity, and status
- **Guest Lists** — Add guests individually or bulk-import via CSV
- **QR Tickets** — Auto-generate PDF tickets with unique QR codes per guest
- **Check-in** — Scan QR codes via camera or manual entry; real-time check-in status
- **Email** — Send individual or bulk invitation emails with ticket attachments
- **Reports** — Attendance reports filterable by period, event, and status; export to PDF
- **User Management** — Super admin can create/deactivate event manager accounts
- **Organisation Settings** — Configure org name, logo, email, and contact info

---

## Project Structure

```
dualpix-gms/
├── app/
│   ├── (dashboard)/        # Protected routes (layout guards auth)
│   │   ├── dashboard/      # Overview stats
│   │   ├── events/         # Event list, create, detail, guests, check-in, report
│   │   ├── reports/        # Global reports with filters
│   │   ├── settings/       # Profile, password, org settings, user management
│   │   └── checkin/        # Global camera check-in page
│   ├── api/                # Next.js API routes
│   │   ├── admin/          # create-user, deactivate-user, org-settings, resend-invite
│   │   ├── email/          # send, send-bulk
│   │   ├── guests/         # bulk-import
│   │   ├── profile/        # update, change-password
│   │   ├── reports/        # export (PDF)
│   │   ├── tickets/        # generate (PDF)
│   │   └── checkin/        # scan, stats
│   ├── login/              # Login page
│   └── update-password/    # Password reset page
├── convex/                 # Convex backend (DB + functions)
│   ├── schema.ts           # Database schema
│   ├── auth.ts             # Auth config (Password provider)
│   ├── auth.config.ts      # JWT issuer config
│   ├── events.ts           # Event queries & mutations
│   ├── guests.ts           # Guest queries & mutations
│   ├── profiles.ts         # User profile queries & mutations
│   ├── adminUsers.ts       # Admin user management (internal)
│   ├── adminUsersActions.ts # Admin actions (Node.js — Scrypt hashing)
│   ├── orgSettings.ts      # Organisation settings
│   ├── emailLogs.ts        # Email send log
│   ├── escorts.ts          # Escort/plus-one management
│   └── http.ts             # HTTP routes (auth endpoints)
├── components/
│   ├── ConvexClientProvider.tsx
│   ├── Header.tsx
│   └── Sidebar.tsx
├── middleware.ts            # Route protection + auth redirects
└── types/index.ts
```

---

## Local Setup

### 1. Clone & install

```bash
git clone https://github.com/aineahmarabi/guest-management-system.git
cd guest-management-system
npm install
```

### 2. Environment variables

Create `.env.local` in the project root:

```env
# Convex
NEXT_PUBLIC_CONVEX_URL=https://steady-leopard-511.convex.cloud
CONVEX_DEPLOY_KEY=dev:steady-leopard-511|<your-deploy-key>

# Convex Auth
CONVEX_AUTH_SECRET=<long-random-string>

# Email (Gmail SMTP)
GMAIL_USER=your-gmail@gmail.com
GMAIL_APP_PASSWORD=<gmail-app-password>
EMAIL_FROM_ADDRESS=noreply@yourdomain.com
EMAIL_FROM_NAME=Your Org Name

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Convex environment variables

These must be set in your Convex deployment (not just `.env.local`):

```bash
npx convex env set CONVEX_AUTH_SECRET "<same value as above>"
npx convex env set JWT_PRIVATE_KEY "<RSA private key PEM>"
npx convex env set JWKS "<matching public key JWKS JSON>"
```

To generate a matching RSA key pair:

```bash
node -e "
const { generateKeyPairSync, createPublicKey } = require('crypto');
const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } });
const jwk = createPublicKey(privateKey).export({ format: 'jwk' });
const jwks = JSON.stringify({ keys: [{ ...jwk, use: 'sig', alg: 'RS256', kid: '1' }] });
console.log('PRIVATE KEY:', privateKey);
console.log('JWKS:', jwks);
"
```

### 4. Run dev

```bash
# Terminal 1 — Next.js
npm run dev

# Terminal 2 — Convex (keeps schema & functions in sync)
npx convex dev
```

### 5. Seed the admin user

```bash
npx convex run adminUsersActions:createUser '{
  "full_name": "Your Name",
  "email": "admin@example.com",
  "role": "super_admin",
  "password": "yourpassword"
}'
```

---

## Vercel Deployment

The app auto-deploys from the `master` branch via Vercel's GitHub integration.

**Required environment variables in Vercel dashboard (Settings → Environment Variables):**

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | Convex deployment URL |
| `CONVEX_AUTH_SECRET` | Auth JWT signing secret |
| `GMAIL_USER` | Gmail address for sending emails |
| `GMAIL_APP_PASSWORD` | Gmail App Password (not account password) |
| `EMAIL_FROM_ADDRESS` | From address in sent emails |
| `EMAIL_FROM_NAME` | From name in sent emails |
| `NEXT_PUBLIC_APP_URL` | Production URL (e.g. `https://yourdomain.com`) |

After adding env vars, trigger a redeploy from the Vercel dashboard.

---

## Database Schema (Convex)

| Table | Description |
|---|---|
| `users` | Auth users (managed by `@convex-dev/auth`) |
| `authAccounts` | Auth account credentials |
| `profiles` | User profiles with role (`super_admin` / `event_manager`) |
| `events` | Events with name, date, venue, capacity, status |
| `guests` | Guests linked to events; ticket ID, check-in status |
| `escorts` | Guest plus-ones |
| `orgSettings` | Single-row organisation configuration |
| `emailLogs` | Log of all emails sent |

---

## Roles

| Role | Permissions |
|---|---|
| `super_admin` | Full access — events, guests, reports, settings, user management |
| `event_manager` | Events and guests only — no settings or user management |

---

## Default Admin Credentials

Set during initial seed. Change the password immediately after first login via **Settings → Change Password**.
