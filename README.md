# OpsPilot-AI

## DareXAI — AI Business Operations Platform

An AI-native workspace for small and mid-size business owners to manage CRM operations through conversational AI. Unifies WhatsApp, email, and call activity into one timeline per contact with AI-generated summaries, sentiment analysis, and automated workflows.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) + TypeScript |
| State | React Query + Zustand |
| Backend | Node.js + Express |
| Primary DB | PostgreSQL + Prisma ORM |
| Secondary DB | MongoDB |
| Cache/Queue | Redis + BullMQ |
| Auth | Google OAuth 2.0 (PKCE) + JWT |
| AI | Gemini API (gemini-2.0-flash) |
| Messaging | Meta WhatsApp Cloud API |
| Containerization | Docker + docker-compose |

---

## Architecture

```
Browser (Next.js) → Next.js BFF → Express API → PostgreSQL / MongoDB / Redis
                                        ↓
                              Gemini AI + WhatsApp Cloud API
                                        ↓
                              BullMQ Worker (Workflows)
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Google Cloud OAuth credentials
- Gemini API key

### Quick Start

```bash
# Clone the repo
git clone https://github.com/Kaifkhurshid7/OpsPilot-AI.git
cd OpsPilot-AI

# Copy environment variables
cp .env.example .env

# Start infrastructure (Postgres, Mongo, Redis)
docker-compose up -d postgres mongo redis

# Install dependencies
npm install

# Run database migrations
npm run db:migrate

# Start development
npm run dev
```

---

## Project Structure

```
OpsPilot-AI/
├── apps/
│   ├── frontend/          # Next.js 14 (App Router)
│   ├── backend/           # Node.js + Express API
│   └── worker/            # BullMQ consumer
├── packages/
│   ├── prisma/            # Shared Prisma schema/client
│   ├── shared-types/      # DTOs/interfaces shared FE<->BE
│   └── config/            # Shared eslint/tsconfig base
├── docker/                # Dockerfiles
├── docs/                  # Documentation
└── docker-compose.yml
```

---

## Key Features
- 🤖 AI Agent with tool-calling (search contacts, create tasks, send WhatsApp, etc.)
- 📱 WhatsApp integration with webhook support
- 📊 CRM (Contacts, Opportunities, Tasks)
- 📬 Unified inbox with AI summaries & sentiment
- ⚡ Automated lead qualification workflow
- 🔒 Multi-tenant with strict data isolation
- 📈 Real-time dashboard with KPIs

---

## License
MIT
