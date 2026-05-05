# H12RCDG Ready Reserve Infantry Battalion — Web-Based Profiling System

A full-stack military personnel profiling system built with React + Hono.js + PostgreSQL.

---

## Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | React 18, Vite, TailwindCSS, shadcn/ui |
| Backend    | Hono.js on Bun runtime              |
| Database   | PostgreSQL 16 + Prisma ORM          |
| Auth       | better-auth (JWT + RBAC)            |
| DevOps     | Docker, Docker Compose              |

---

## Quick Start (Local Development)

### Prerequisites

Install these in order:

1. **Bun** — https://bun.sh
   ```bash
   # Windows (PowerShell as Admin)
   powershell -c "irm bun.sh/install.ps1|iex"

   # Mac / Linux
   curl -fsSL https://bun.sh/install | bash
   ```

2. **PostgreSQL 16** — https://postgresql.org/download
   - Set password to `reservist_pass` during install
   - Keep default port `5432`

3. **Node.js 20+** — https://nodejs.org (needed for some tools)

4. **Git** — https://git-scm.com

---

### Step 1 — Clone and configure

```bash
git clone <your-repo-url> reservist-system
cd reservist-system
```

### Step 2 — Configure backend environment

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your PostgreSQL credentials
```

### Step 3 — Install backend dependencies and set up database

```bash
cd backend
bun install
bunx prisma generate
bunx prisma migrate dev --name init
bunx prisma db seed
cd ..
```

### Step 4 — Install frontend dependencies

```bash
cd frontend
bun install
cd ..
```

### Step 5 — Run both servers

Open **two terminal tabs**:

**Terminal 1 — Backend:**
```bash
cd backend
bun run dev
# API running at http://localhost:3000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
bun run dev
# App running at http://localhost:5173
```

### Step 6 — Open in browser

Navigate to: **http://localhost:5173**

Default admin credentials:
- Email: `admin@h12rcdg.mil.ph`
- Password: `Admin@12345`

---

## Docker Setup (Alternative)

```bash
cp backend/.env.example backend/.env
docker compose up --build
# App at http://localhost:5173
# API at http://localhost:3000
```

---

## Project Structure

```
reservist-system/
├── frontend/               # React + Vite app
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route-level page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utilities and API client
│   │   ├── stores/         # Zustand state stores
│   │   └── types/          # TypeScript type definitions
│   └── ...
├── backend/                # Hono.js API
│   ├── src/
│   │   ├── routes/         # API route handlers
│   │   ├── middleware/      # Auth, logging, error handling
│   │   ├── lib/            # Utilities (prisma, auth, xlsx)
│   │   └── services/       # Business logic services
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema
│   │   └── seed.ts         # Initial data seed
│   └── ...
└── docker-compose.yml
```

---

## Default User Roles

| Role        | Permissions                                      |
|-------------|--------------------------------------------------|
| Admin       | Full access: users, data, config, audit log      |
| S1 Officer  | Add/edit/import/export all personnel             |
| Unit Clerk  | Add/edit within assigned company only            |
| Viewer      | Read-only access to all data                     |

---

## API Base URL

- Local: `http://localhost:3000/api`
- All endpoints require `Authorization: Bearer <token>` header

---

## Deployment

### Frontend → Vercel
```bash
cd frontend
bunx vercel --prod
```

### Backend → Any VPS (with Bun installed)
```bash
cd backend
bun run build
bun run start
```

Set `FRONTEND_URL` in backend `.env` to your Vercel deployment URL for CORS.
