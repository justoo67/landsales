# PlotPilot (LandSales)

A mobile-first, high-converting web application tailored for real estate agents selling land parcels and plots in Kenya. Built strictly adhering to Apple Human Interface Guidelines (HIG) with Next.js, Prisma, and PostgreSQL.

## Features

- **Apple HIG Mobile-First Experience:** 44pt+ touch targets, frosted glass navigation, haptic-inspired feedback, zero tap delays (`touch-action: manipulation`).
- **Interactive OpenStreetMap / Leaflet Integration:** Fast GPS location pinning, crosshairs picker, and coordinates capture without expensive Google Maps API bills.
- **Agent CRM & Deal Pipeline:** Track deals through the conveyancing process (`DEPOSIT_PAID` → `AGREEMENT_SIGNED` → `BALANCE_CLEARED` → `LCB_CONSENT` → `TITLE_ISSUED`).
- **Payment Installments:** Log deposits, track installment schedules, and view remaining balances.
- **Client-Facing Landing Pages:** Shareable short URLs (`/p/[id]`) with photo galleries, video walkthroughs, and direct WhatsApp inquiry integration.
- **Google OAuth or Email/Password:** Open registration capped by `MAX_AGENT_ACCOUNTS` (default 5). Every plot, buyer, lead, task, visit, document, comp and deal is scoped to the agent who owns it.
- **Serverless Database:** PostgreSQL via Prisma, with versioned migrations.

## Tech Stack

- **Framework:** Next.js 16 (App Router, React 19)
- **Styling:** Tailwind CSS 4, Lucide Icons, Apple HIG Design System
- **Database:** PostgreSQL (Neon/Supabase) with Prisma ORM and versioned migrations
- **Mapping:** Leaflet & OpenStreetMap

## Getting Started

### 1. Prerequisites

- Node.js 20+ (24 recommended)
- A PostgreSQL database

### 2. Environment Variables

```bash
cp .env.example .env
```

Fill in `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET` (32+ chars), and `ALLOWED_AGENT_EMAIL`.

### 3. Database Setup

```bash
npm install
npx prisma generate

# Development: create/apply migrations
npm run db:migrate

# Existing database created with `db push`? Baseline once, then migrate:
# npx prisma migrate resolve --applied 0001_init
# npm run db:migrate

# Production / CI
npm run db:deploy

# Optional sample data (prints a generated password unless SEED_AGENT_PASSWORD is set)
npm run db:seed
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Quality checks

```bash
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm test            # Vitest unit tests
npm run build       # Production build
```

## Money handling

All money is `Decimal(14,2)` in PostgreSQL and `Prisma.Decimal` in server code. It is
converted to a plain `number` only at the JSON boundary (`src/lib/money.server.ts`,
`src/lib/serialize.ts`). Never `parseFloat` a money string.

## Deleting plots

Deletes are soft. A plot with a sale record is hidden, never removed, so the payment
ledger and buyer review survive.

## Roadmap

See [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) for the phased plan
(leads, tasks, site visits, comparables, commission).

## Deployment

Production runs on Vercel from `master`. See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)
for the project IDs, environment variables, migration procedure, and rollback steps.
