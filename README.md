# OpsPilot-AI

AI Business Operations Platform — a single conversational workspace for managing CRM, WhatsApp messaging, and automated workflows powered by Gemini AI.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Setup Instructions](#setup-instructions)
- [Running the Application](#running-the-application)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [Testing](#testing)
- [Features](#features)

---

## Tech Stack

| Layer         | Technology                              |
|---------------|----------------------------------------|
| Frontend      | Next.js 14 (App Router), TypeScript    |
| State         | React Query, Zustand                   |
| Backend       | Node.js, Express                       |
| Primary DB    | PostgreSQL, Prisma ORM                 |
| Secondary DB  | MongoDB (chat, messages, payloads)     |
| Cache/Queue   | Redis, BullMQ                          |
| Auth          | Google OAuth 2.0 (PKCE), JWT           |
| AI            | Google Gemini API (gemini-2.0-flash)   |
| Messaging     | Meta WhatsApp Cloud API                |
| Testing       | Jest, Supertest, Vitest                |

---

## Architecture

```
Browser (Next.js 14)
    |
    | HTTPS (httpOnly cookies)
    v
Express API (Node.js)
    |--- Auth (Google OAuth PKCE + JWT)
    |--- CRM (Contacts, Opportunities, Tasks)
    |--- AI Agent (Gemini + Tool Calling, SSE streaming)
    |--- WhatsApp (Webhook receive + send)
    |--- Dashboard (KPIs, cached via Redis)
    |--- Audit Logs
    |
    |---> PostgreSQL (tenants, users, CRM, audit logs)
    |---> MongoDB (chat messages, WhatsApp/email payloads)
    |---> Redis + BullMQ (queue, rate limiting, caching)
              |
              v
       Worker (BullMQ consumer)
         - Lead qualification workflow
         - WhatsApp message AI summarization
```

---

## Project Structure

```
OpsPilot-AI/
|-- apps/
|   |-- backend/           Express API server
|   |   |-- src/
|   |   |   |-- config/    Database, Redis, env config
|   |   |   |-- middleware/ Auth, tenant scope, validation, rate limit
|   |   |   |-- modules/   Auth, CRM, AI agent, WhatsApp, workflows, dashboard
|   |   |-- tests/         Jest test suites
|   |
|   |-- frontend/          Next.js 14 application
|   |   |-- src/
|   |   |   |-- app/       Pages (login, chat, CRM, inbox, workflows, dashboard)
|   |   |   |-- components/ Chat, CRM, inbox UI components
|   |   |   |-- lib/       API client, SSE helper
|   |
|   |-- worker/            BullMQ job consumer
|       |-- src/jobs/      Lead qualification, WhatsApp summarize
|
|-- packages/
|   |-- prisma/            Shared Prisma schema, migrations, seed
|   |-- shared-types/      DTOs and interfaces shared across apps
|   |-- config/            Shared tsconfig base
|
|-- docker/                Dockerfiles (backend, frontend, worker)
|-- docker-compose.yml     (Deprecated - use local services instead)
|-- turbo.json             Turborepo task pipeline
|-- package.json           Root workspace config
```

---

## Prerequisites

- Node.js 18 or higher
- PostgreSQL 15+ (local installation)
- MongoDB 7+ (local installation)
- Redis 7+ (local installation)
- A Google Cloud project with OAuth 2.0 credentials
- A Google Gemini API key
- Git

---

## Setup Instructions

1. Clone the repository:

```bash
git clone https://github.com/Kaifkhurshid7/OpsPilot-AI.git
cd OpsPilot-AI
```

2. Install all dependencies (monorepo handles all workspaces):

```bash
npm install
```

3. Generate Prisma client:

```bash
npx prisma generate --schema=packages/prisma/schema.prisma
```

4. Set up local databases (PostgreSQL, MongoDB, Redis):

See SETUP_NO_DOCKER.md for detailed installation instructions for each service.

5. Create the `.env` file in the project root:

```bash
copy .env.example .env
```

Fill in your credentials (see Environment Variables section below).

6. Run database migrations:

```bash
npx prisma migrate dev --schema=packages/prisma/schema.prisma --name init
```

7. Seed the database with demo data (optional):

```bash
npx ts-node packages/prisma/seed.ts
```

---

## Running the Application

Start all services in development mode:

```bash
# Terminal 1 - Backend API (port 4000)
cd apps/backend
npx ts-node-dev --respawn --transpile-only src/server.ts

# Terminal 2 - Frontend (port 3000)
cd apps/frontend
npx next dev

# Terminal 3 - Worker (BullMQ consumer)
cd apps/worker
npx ts-node-dev --respawn --transpile-only src/worker.ts
```

Or using Turborepo from the root (if all workspaces have dev scripts configured):

```bash
npx turbo run dev
```

---

## Environment Variables

Create a `.env` file in the project root with these values:

```
NODE_ENV=development
PORT=4000

# PostgreSQL
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opspilot?schema=public

# MongoDB
MONGODB_URI=mongodb://localhost:27017/opspilot

# Redis
REDIS_URL=redis://localhost:6379

# Google OAuth
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
GOOGLE_CALLBACK_URL=http://localhost:4000/auth/google/callback

# JWT Secrets
JWT_ACCESS_SECRET=<generate-a-random-string>
JWT_REFRESH_SECRET=<generate-a-different-random-string>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Gemini AI
GEMINI_API_KEY=<your-gemini-api-key>

# WhatsApp (optional for sandbox mode)
WHATSAPP_TOKEN=<your-whatsapp-token>
WHATSAPP_VERIFY_TOKEN=opspilot-verify
WHATSAPP_PHONE_NUMBER_ID=<your-phone-number-id>
WHATSAPP_APP_SECRET=<your-app-secret>

# Frontend URL (CORS)
CORS_ORIGIN=http://localhost:3000
```

---

## API Endpoints

| Method | Path                              | Auth     | Description                          |
|--------|-----------------------------------|----------|--------------------------------------|
| GET    | /auth/google                      | none     | Redirect to Google OAuth             |
| GET    | /auth/google/callback             | none     | OAuth callback, sets cookies         |
| POST   | /auth/refresh                     | cookie   | Rotate refresh token                 |
| POST   | /auth/logout                      | cookie   | Revoke tokens, clear cookies         |
| GET    | /auth/me                          | cookie   | Current user info                    |
| POST   | /onboarding/business              | cookie   | Create/update tenant business info   |
| POST   | /ai/chat                          | cookie   | Streaming AI chat (SSE)              |
| GET    | /ai/conversations                 | cookie   | List conversations                   |
| GET    | /contacts                         | cookie   | List contacts                        |
| POST   | /contacts                         | cookie   | Create contact                       |
| GET    | /contacts/:id                     | cookie   | Get contact detail                   |
| PATCH  | /contacts/:id                     | cookie   | Update contact                       |
| GET    | /opportunities                    | cookie   | List opportunities                   |
| POST   | /opportunities                    | cookie   | Create opportunity                   |
| PATCH  | /opportunities/:id                | cookie   | Update opportunity                   |
| GET    | /tasks                            | cookie   | List tasks                           |
| POST   | /tasks                            | cookie   | Create task                          |
| GET    | /inbox/:contactId/timeline        | cookie   | Unified timeline (WhatsApp+email+call)|
| GET    | /webhooks/whatsapp                | none     | Meta webhook verification            |
| POST   | /webhooks/whatsapp                | Meta sig | Receive inbound WhatsApp message     |
| POST   | /whatsapp/send                    | cookie   | Send WhatsApp message                |
| POST   | /workflows/lead-qualification/run | cookie   | Trigger lead qualification workflow  |
| GET    | /dashboard/kpis                   | cookie   | Business KPI metrics                 |
| GET    | /audit-logs                       | cookie   | Paginated audit trail                |

---

## Testing

Run all backend tests:

```bash
npx jest --config apps/backend/jest.config.js --forceExit
```

Test suites included:
- auth.test.ts — JWT generation, verification, expiry, wrong-secret rejection
- tenantIsolation.test.ts — Verifies cross-tenant data access is impossible via JWT claims
- aiToolCalling.test.ts — Tool registry completeness, context injection, error handling

---

## Features

- AI Agent with tool calling (search contacts, create tasks, update deals, send WhatsApp, fetch metrics)
- Real-time streaming responses via Server-Sent Events
- Explainability tags showing why the AI took each action
- Multi-tenant data isolation enforced at middleware and repository layers
- Google OAuth with PKCE flow, httpOnly cookie sessions, refresh token rotation
- Unified inbox merging WhatsApp, email, and call logs per contact with AI summaries
- Automated lead qualification workflow (AI scoring, WhatsApp follow-up, task creation)
- Dashboard with cached KPI aggregations
- Append-only audit log tracking all AI and user actions
- Rate limiting on auth and AI endpoints
- Input validation via Zod schemas on all endpoints

---

## License

MIT
