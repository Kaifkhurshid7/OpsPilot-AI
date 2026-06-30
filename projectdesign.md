# DareXAI — AI Business Operations Platform
## Product Requirements Document (PRD), Technical Requirements Document (TRD), System Design & Database Design

Version 1.0 — Prepared for the 48-hour Full Stack AI Engineer Internship Challenge

---

# 1. PRD — Product Requirements Document

## 1.1 Problem Statement
Small and mid-size business owners juggle leads, customer conversations (WhatsApp, email, calls), and follow-ups across disconnected tools. They need a single AI-native workspace where they can talk to an assistant in plain language and have it actually execute business actions (find a contact, send a WhatsApp message, create a task, update a deal) rather than just answer questions.

## 1.2 Goals
- Give business owners one conversational entry point to run CRM operations.
- Unify WhatsApp, email, and call activity into one timeline per contact, with AI-generated summaries, sentiment, and intent.
- Automate a real lead-to-followup workflow end to end.
- Be secure and multi-tenant from day one (no tenant can see another tenant's data).
- Be demoable in under 10 minutes: login → onboarding → chat with agent → CRM action → workflow → dashard.

## 1.3 Non-Goals (for the 48h scope)
- Full marketing automation suite, billing, or multi-channel email sending infrastructure.
- Native mobile apps.
- Production-grade WhatsApp Business verification (sandbox/webhook simulation is acceptable).
- Horizontal scaling / Kubernetes — single deployable stack is fine.

## 1.4 Target Users / Personas
- **Business Owner (primary)**: non-technical, wants fast answers and actions, lives in the chat interface.
- **Sales Rep (secondary)**: manages contacts/opportunities directly from CRM views.
- **Admin/Tenant Owner**: handles onboarding, invites users, views audit logs.

## 1.5 User Stories (MVP scope, prioritized)
1. As an owner, I sign in with Google and land in an onboarding flow that creates my business (tenant).
2. As an owner, I chat with an AI agent that streams its answer and can call tools (search contacts, create task, update opportunity, send WhatsApp, fetch metrics).
3. As an owner, I see *why* the AI did something (explainability line under each action).
4. As a rep, I manage Contacts and Opportunities (create/update/list) in a CRM view.
5. As a rep, I open a contact and see a unified timeline of WhatsApp + email + call logs with AI summary/sentiment/intent/next action.
6. As an owner, I receive an inbound WhatsApp message via webhook, see it appear in the conversation, and let the AI draft+send a reply.
7. As an owner, I trigger (or the system auto-triggers) a Lead → AI Qualification → WhatsApp Follow-up → Task → Audit Log workflow.
8. As an owner, I view a dashboard with live KPIs (active opportunities, pipeline value, pending follow-ups, recent activity, AI alerts).
9. As any user, my session is secure (httpOnly cookies, rotated refresh tokens) and I can never query another tenant's data.
10. As an admin, every AI/automated action is recorded in an audit log.

## 1.6 Success Metrics (for the demo)
- End-to-end demo flows without manual DB edits.
- Tool-calling agent successfully executes at least 3 distinct tools in one conversation.
- Tenant isolation verified by an automated test (cross-tenant query returns 0 rows / 403).
- Workflow run produces: WhatsApp message + Task + Audit Log entries, visible in UI.

## 1.7 Out-of-Scope Risks / Assumptions
- Gemini free tier rate limits — fallback to a smaller "explain" prompt if quota hit.
- WhatsApp Cloud API requires a verified Meta Business app; if unavailable within 48h, a local webhook simulator (Postman/cURL replaying Meta's payload shape) substitutes, with the same DB/UI path so swapping to real API is just env vars + URL.

---

# 2. TRD — Technical Requirements Document

## 2.1 Tech Stack Decision

| Layer | Choice | Reason |
|---|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript | SSR for auth-gated pages, API routes for BFF, fast to ship |
| State/Data | React Query (server cache) + Zustand (UI/local state) | clear separation of server vs client state |
| Backend | Node.js + Express (separate service) | keeps AI/tool-calling, webhooks, and streaming outside Next's serverless limits |
| Primary DB | PostgreSQL + Prisma ORM | relational integrity for tenants/users/CRM/audit logs |
| Secondary store | MongoDB | flexible schema for chat messages / raw WhatsApp & email payloads |
| Cache/Queue | Redis + BullMQ | session/rate-limit cache, async workflow & webhook processing |
| Auth | Google OAuth 2.0 (PKCE) + JWT (access + rotating refresh) | secure, standard, supports multi-tenant claims |
| AI | Gemini API (`gemini-1.5-flash` or `gemini-2.0-flash`, free tier) | required by brief; streaming + function calling supported |
| Messaging | Meta WhatsApp Cloud API (webhook + send), sandboxed | matches brief; swappable via env |
| Containerization | Docker + docker-compose | one-command spin-up: postgres, mongo, redis, backend, frontend |
| Testing | Jest + Supertest (backend), Vitest + React Testing Library (frontend) | covers auth, tenant isolation, tool calling, 1 component |

## 2.2 Why two databases?
Postgres gives strong relational guarantees (foreign keys, transactions) for tenants/users/contacts/opportunities/tasks/audit logs — entities with strict referential integrity and reporting needs (KPIs via SQL aggregation). Mongo stores high-volume, semi-structured, append-only data — chat messages, WhatsApp/email raw payloads, call log transcripts — where schema flexibility (varying message types, tool-call payloads) and write throughput matter more than joins.

## 2.3 Functional Requirements Mapping
| Module | Endpoints (high level) | Notes |
|---|---|---|
| Auth | `/auth/google`, `/auth/google/callback`, `/auth/refresh`, `/auth/logout` | PKCE flow, sets httpOnly cookies `access_token`, `refresh_token` |
| Onboarding | `/onboarding/business` | creates Tenant + assigns creator as OWNER |
| AI Agent | `/ai/chat` (SSE/streaming POST) | tool-calling loop, persists to Mongo |
| CRM | `/contacts`, `/opportunities` (CRUD) | tenant-scoped via middleware |
| Inbox | `/inbox/:contactId/timeline` | merges WhatsApp + email + calls, sorted by time |
| WhatsApp | `/webhooks/whatsapp` (GET verify, POST receive), `/whatsapp/send` | writes to Mongo + triggers AI summary job |
| Workflow | `/workflows/lead-qualification/run`, BullMQ worker | orchestrates qualification → message → task → audit |
| Dashboard | `/dashboard/kpis` | aggregated SQL queries, cached in Redis (60s TTL) |
| Audit | `/audit-logs` | read-only, paginated, tenant-scoped |

## 2.4 Non-Functional Requirements
- **Security**: input validation (Zod on both frontend & backend), parameterized queries via Prisma (no raw SQL string concat), CORS allow-list per environment, helmet headers, rate limiting on `/ai/chat` and `/auth/*`, all secrets in `.env` (never committed), httpOnly+Secure+SameSite=Lax cookies.
- **Multi-tenancy**: every tenant-scoped Postgres table carries `tenant_id`; a Prisma middleware (or repository-layer guard) injects `tenant_id` from the JWT into every query — no endpoint trusts a client-supplied tenant id.
- **Performance**: dashboard KPI queries indexed and cached; AI responses streamed (perceived latency).
- **Observability**: structured logs (pino/winston), audit log table as the business-level event log.
- **Testability**: auth flow, tenant isolation, tool-calling, and one React component (e.g., ChatWindow) covered by automated tests.

## 2.5 AI Agent Design
- Gemini called with **function calling** enabled; tool schemas registered for `search_contacts`, `create_task`, `update_opportunity`, `send_whatsapp`, `fetch_business_metrics`.
- Agent loop: user message → Gemini streams text and/or emits a function call → backend executes the corresponding service method (tenant-scoped) → result fed back to Gemini → Gemini streams final natural-language answer **plus a one-line "Why" explanation** → both persisted to Mongo (`ai_messages`) and, if a CRM/WhatsApp action occurred, an `audit_logs` row is written.
- Context awareness: system prompt is built per-request from the tenant's onboarding profile (industry, business name) + last N CRM facts relevant to the message (e.g., contact lookup results) — not the entire DB, to control token usage.
- Streaming: backend exposes Server-Sent Events (`text/event-stream`); frontend consumes via `fetch` + `ReadableStream` (or `EventSource` if no auth headers needed, given cookie-based auth EventSource works directly).

## 2.6 Workflow Automation Design
Implemented as a BullMQ job (`lead-qualification`) so it's async and demonstrable independent of a live chat session:
1. **Trigger**: new Contact created with `source = "lead"` (or manual "Run Workflow" button).
2. **AI Qualification**: Gemini scores the lead 0–100 using contact + any available conversation context; score and reasoning saved.
3. **Branch**: if `score > 80` → continue; else → mark `opportunity.stage = "nurture"` and stop (still logged).
4. **Send WhatsApp**: AI drafts a follow-up message, sent via WhatsApp service (real Cloud API or sandbox), message stored.
5. **Create Task**: a follow-up Task is created and assigned to the tenant owner with a due date (+1 day).
6. **Audit Log**: every step above writes an `audit_logs` row (`actor = "AI_AGENT"`, `action`, `metadata`).

---

# 3. System Design

## 3.1 High-Level Architecture

```
                         ┌─────────────────────────┐
                         │   Browser (Next.js UI)   │
                         │  Chat / CRM / Inbox /    │
                         │  Dashboard (React Query) │
                         └────────────┬─────────────┘
                                      │ HTTPS (httpOnly cookies)
                                      ▼
                         ┌─────────────────────────┐
                         │  Next.js BFF / API edge  │  (auth pages, proxy)
                         └────────────┬─────────────┘
                                      │
                                      ▼
                 ┌───────────────────────────────────────┐
                 │           Node.js / Express API         │
                 │  Auth │ CRM │ Inbox │ AI Agent │ Webhooks│
                 │  Middleware: JWT verify → tenant scope  │
                 └───┬───────────┬───────────┬────────────┘
                     │           │           │
        ┌────────────▼──┐  ┌─────▼─────┐  ┌──▼─────────────┐
        │ PostgreSQL     │  │  MongoDB  │  │  Redis + BullMQ │
        │ tenants,users, │  │ chat msgs,│  │ sessions cache, │
        │ contacts, opps,│  │ whatsapp/ │  │ rate limits,    │
        │ tasks, audit,  │  │ email raw │  │ workflow jobs   │
        │ refresh tokens │  │ payloads  │  │                 │
        └────────────────┘  └───────────┘  └────────┬────────┘
                                                       │
                                              ┌────────▼─────────┐
                                              │  Workflow Worker  │
                                              │ (qualify→WA→task) │
                                              └────────┬──────────┘
                                                       │
                 ┌─────────────────────────────────────┼──────────────────┐
                 ▼                                     ▼                  ▼
         ┌──────────────┐                     ┌────────────────┐  ┌──────────────┐
         │ Gemini API    │                     │ WhatsApp Cloud │  │ Google OAuth  │
         │ (chat+tools)  │                     │ API (webhook)  │  │ (PKCE)        │
         └──────────────┘                     └────────────────┘  └──────────────┘
```

## 3.2 Request Flow — AI Chat with Tool Calling
1. Client POSTs message to `/ai/chat` with cookie-based JWT.
2. Express middleware verifies JWT, extracts `tenant_id`/`user_id`, attaches to `req.context`.
3. Controller loads recent conversation (Mongo) + tenant profile (Postgres), builds system prompt.
4. Calls Gemini with streaming + tool declarations.
5. If Gemini emits a `functionCall`, backend executes the matching tenant-scoped service (e.g., `ContactService.search(tenant_id, query)`), returns result to Gemini, continues the stream.
6. Final answer + explanation streamed to client via SSE; full exchange persisted to Mongo; if a mutating tool ran, an `audit_logs` row is inserted in the same transaction as the mutation.

## 3.3 Request Flow — Inbound WhatsApp
1. Meta posts to `/webhooks/whatsapp` (POST). GET is used for Meta's verification handshake (`hub.challenge`).
2. Payload validated (signature check via `X-Hub-Signature-256` using app secret) and the raw payload stored in Mongo (`whatsapp_messages`).
3. A BullMQ job enqueues "summarize+suggest" — Gemini generates summary/sentiment/intent/next-action, stored alongside the message.
4. Frontend's inbox view polls/subscribes (React Query refetch interval, or SSE channel) and shows the new message in the contact's unified timeline.

## 3.4 Multi-Tenancy & Isolation Strategy
- Single Postgres database, **shared schema with `tenant_id` discriminator column** on every tenant-owned table (simplest to implement correctly and test within 48h vs. schema-per-tenant).
- A repository-layer guard (Prisma middleware or a thin wrapper) automatically appends `WHERE tenant_id = :ctx.tenant_id` to every read/write — application code never manually passes tenant_id from client input.
- JWT access token claims: `{ sub: user_id, tenant_id, role, iat, exp }`. `tenant_id` is the single source of truth; even if a client tampers with a request body's tenant field, it's ignored.
- Mongo collections also store `tenant_id` and are queried via a similar guard.
- Automated test: create 2 tenants, attempt cross-tenant read of contact → assert empty result / 403.

## 3.5 Security Controls Summary
- PKCE OAuth (no client secret exposed to browser), state param to prevent CSRF on the OAuth redirect.
- Access token (short-lived, ~15 min) + Refresh token (7–30 days, rotated on every use, stored hashed in Postgres `refresh_tokens` table, old token invalidated on rotation to detect reuse/theft).
- Cookies: `httpOnly`, `Secure` (prod), `SameSite=Lax`.
- CORS: explicit allow-list of frontend origin(s) only, credentials: true.
- Input validation: Zod schemas at every controller boundary.
- SQL injection: Prisma parameterized queries only, no string-built SQL.
- XSS: React's default escaping + sanitize any AI-generated HTML before render (treat as plain text/markdown, not raw HTML).
- Audit logs: append-only table, written for every AI tool execution, auth event (login/logout/refresh-reuse-detected), and workflow step.

## 3.6 Deployment (Docker)
`docker-compose.yml` services: `frontend` (Next.js), `backend` (Express), `worker` (BullMQ consumer, can be same image as backend with different entrypoint), `postgres`, `mongo`, `redis`. Environment variables for Google OAuth client id/secret, Gemini API key, WhatsApp token/verify-token, JWT secrets, DB URLs — all documented in `.env.example`.

---

# 4. Database Design

## 4.1 PostgreSQL Schema (Prisma-style)

```prisma
model Tenant {
  id            String   @id @default(uuid())
  name          String
  industry      String?
  onboarded     Boolean  @default(false)
  createdAt     DateTime @default(now())
  users         User[]
  contacts      Contact[]
  opportunities Opportunity[]
  tasks         Task[]
  auditLogs     AuditLog[]
  refreshTokens RefreshToken[]
}

model User {
  id           String   @id @default(uuid())
  tenantId     String
  tenant       Tenant   @relation(fields: [tenantId], references: [id])
  email        String   @unique
  name         String
  googleId     String   @unique
  role         Role     @default(OWNER)
  createdAt    DateTime @default(now())

  @@index([tenantId])
}

enum Role {
  OWNER
  ADMIN
  REP
}

model RefreshToken {
  id          String   @id @default(uuid())
  tenantId    String
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  userId      String
  tokenHash   String   @unique
  rotatedFrom String?
  revoked     Boolean  @default(false)
  expiresAt   DateTime
  createdAt   DateTime @default(now())

  @@index([tenantId, userId])
}

model Contact {
  id            String   @id @default(uuid())
  tenantId      String
  tenant        Tenant   @relation(fields: [tenantId], references: [id])
  name          String
  phone         String?
  email         String?
  source        String?  // "lead", "referral", "manual"...
  tags          String[]
  createdAt     DateTime @default(now())
  opportunities Opportunity[]
  tasks         Task[]

  @@index([tenantId])
  @@index([tenantId, phone])
}

model Opportunity {
  id          String   @id @default(uuid())
  tenantId    String
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  contactId   String
  contact     Contact  @relation(fields: [contactId], references: [id])
  title       String
  value       Decimal  @default(0)
  stage       String   // "new","qualifying","nurture","won","lost"
  score       Int?     // AI qualification score
  nextBestAction String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([tenantId, stage])
}

model Task {
  id          String   @id @default(uuid())
  tenantId    String
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  contactId   String?
  contact     Contact? @relation(fields: [contactId], references: [id])
  title       String
  dueAt       DateTime
  status      String   @default("pending") // pending, done
  createdBy   String   // user_id or "AI_AGENT"
  createdAt   DateTime @default(now())

  @@index([tenantId, status])
}

model AuditLog {
  id        String   @id @default(uuid())
  tenantId  String
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  actor     String   // user_id or "AI_AGENT" or "SYSTEM"
  action    String   // "TOOL_CALL_SEND_WHATSAPP", "TASK_CREATED", "AUTH_REFRESH_ROTATED"...
  targetType String? // "Contact","Opportunity","Task",...
  targetId  String?
  metadata  Json?
  createdAt DateTime @default(now())

  @@index([tenantId, createdAt])
}
```

## 4.2 MongoDB Collections

```jsonc
// ai_conversations
{
  "_id": "ObjectId",
  "tenantId": "uuid",
  "userId": "uuid",
  "title": "string",
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}

// ai_messages
{
  "_id": "ObjectId",
  "tenantId": "uuid",
  "conversationId": "ObjectId",
  "role": "user | assistant | tool",
  "content": "string",
  "toolCalls": [
    { "name": "send_whatsapp", "args": {}, "result": {} }
  ],
  "explanation": "string",        // the AI's 'why' line
  "createdAt": "ISODate"
}

// whatsapp_messages
{
  "_id": "ObjectId",
  "tenantId": "uuid",
  "contactId": "uuid",
  "direction": "inbound | outbound",
  "waMessageId": "string",
  "body": "string",
  "rawPayload": {},               // original webhook payload
  "aiSummary": "string",
  "sentiment": "positive|neutral|negative",
  "intent": "string",
  "nextAction": "string",
  "createdAt": "ISODate"
}

// email_messages
{
  "_id": "ObjectId",
  "tenantId": "uuid",
  "contactId": "uuid",
  "direction": "inbound | outbound",
  "subject": "string",
  "body": "string",
  "aiSummary": "string",
  "sentiment": "string",
  "intent": "string",
  "createdAt": "ISODate"
}

// call_logs
{
  "_id": "ObjectId",
  "tenantId": "uuid",
  "contactId": "uuid",
  "direction": "inbound | outbound",
  "durationSec": "number",
  "transcript": "string",
  "aiSummary": "string",
  "sentiment": "string",
  "createdAt": "ISODate"
}
```

Each Mongo collection should have a compound index on `{ tenantId: 1, contactId: 1, createdAt: -1 }` to power the unified timeline query efficiently.

## 4.3 Unified Timeline Query Strategy
Backend fetches the three Mongo collections filtered by `tenantId + contactId`, tags each doc with its `channel` ("whatsapp"/"email"/"call"), merges and sorts by `createdAt` in application code (or via a Mongo `$unionWith` aggregation if all three collections live in the same DB), then returns a single chronological array to the frontend.

---

# 5. API Surface (Summary Table)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/auth/google` | none | redirect to Google OAuth (PKCE) |
| GET | `/auth/google/callback` | none | exchanges code, sets cookies, creates user/tenant if first login |
| POST | `/auth/refresh` | refresh cookie | rotates refresh token, issues new access token |
| POST | `/auth/logout` | access cookie | revokes refresh token, clears cookies |
| POST | `/onboarding/business` | access | creates Tenant, marks onboarded |
| POST | `/ai/chat` | access | streaming chat with tool calling |
| GET | `/contacts` / POST `/contacts` | access | list/create contacts |
| GET/PATCH | `/contacts/:id` | access | view/update contact |
| GET | `/opportunities` / POST `/opportunities` | access | list/create opportunities |
| PATCH | `/opportunities/:id` | access | update stage/value |
| GET | `/inbox/:contactId/timeline` | access | unified WhatsApp+email+call timeline |
| GET/POST | `/webhooks/whatsapp` | Meta signature | webhook verify (GET) / receive (POST) |
| POST | `/whatsapp/send` | access | AI or manual send |
| POST | `/workflows/lead-qualification/run` | access | manually trigger workflow for a contact |
| GET | `/dashboard/kpis` | access | active opps, pipeline value, pending followups, recent activity |
| GET | `/audit-logs` | access (admin/owner) | paginated audit trail |

---

# 6. Testing Plan
- **Auth**: OAuth callback creates user+tenant; refresh rotation invalidates the old token; reused old refresh token triggers revocation of the whole token family.
- **Tenant Isolation**: seed two tenants with contacts; verify Tenant A's JWT cannot read/update Tenant B's contact (expect 404/403, not data leak).
- **AI Tool Calling**: mock Gemini function-call response for `create_task`; assert the service creates the Task row, writes an AuditLog, and the SSE stream includes the explanation text.
- **Frontend component**: `ChatWindow` — renders streamed tokens incrementally and displays the explanation line under the AI's final message (Vitest + RTL with a mocked SSE source).

---

# 7. Build Order (suggested, for 48h)
1. Repo scaffold + Docker Compose + Postgres/Mongo/Redis up, Prisma schema + migration.
2. Auth (Google OAuth PKCE, JWT, refresh rotation, cookies) + Onboarding.
3. Tenant isolation middleware + Contacts/Opportunities CRUD + tests.
4. AI Agent endpoint with Gemini streaming + the 5 tools (start with `search_contacts`, `fetch_business_metrics`, then the mutating ones).
5. WhatsApp webhook (receive) + send + Mongo storage + AI summary/sentiment job.
6. Unified inbox timeline endpoint + UI.
7. Workflow automation (BullMQ job) end to end.
8. Dashboard KPIs + Audit log viewer.
9. Polish: explainability lines, error states, README with architecture + setup instructions, record demo script.