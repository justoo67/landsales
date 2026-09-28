# PlotPilot (LandSales)

A mobile-first, high-converting web application tailored for real estate agents selling land parcels and plots in Kenya. Built strictly adhering to Apple Human Interface Guidelines (HIG) with Next.js, Prisma, and Neon PostgreSQL.

## Features

- **Apple HIG Mobile-First Experience:** 44pt+ touch targets, frosted glass navigation, haptic-inspired feedback, zero tap delays (`touch-action: manipulation`).
- **Interactive OpenStreetMap / Leaflet Integration:** Fast GPS location pinning, crosshairs picker, and coordinates capture without expensive Google Maps API bills.
- **Agent CRM & Deal Pipeline:** Track deals through the conveyancing process (`DEPOSIT_PAID` → `AGREEMENT_SIGNED` → `BALANCE_CLEARED` → `LCB_CONSENT` → `TITLE_ISSUED`).
- **Payment Installments:** Log deposits, track installment schedules, and view remaining balances.
- **Client-Facing Landing Pages:** Shareable short URLs (`/p/[id]`) with photo galleries, video walkthroughs, and direct WhatsApp inquiry integration.
- **Google OAuth & Secure Agent Dashboard:** Single-agent authorization via Google OAuth and JWT-based session security.
- **Serverless Database:** Powered by Neon PostgreSQL and Prisma ORM with connection pooling.

## Tech Stack

- **Framework:** Next.js 15 (App Router, React 19)
- **Styling:** Tailwind CSS, Lucide Icons, Apple HIG Design System
- **Database:** Neon PostgreSQL
- **ORM:** Prisma
- **Mapping:** Leaflet & OpenStreetMap (via `react-leaflet`)

## Getting Started

### 1. Prerequisites
- Node.js 18+ or 20+
- pnpm / npm

### 2. Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your database connection strings, Google OAuth credentials, and authorized agent email.

### 3. Database Setup
Push the schema to your Neon PostgreSQL database:
```bash
npx prisma db push
```

### 4. Run Development Server
```bash
pnpm dev
# or
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.
