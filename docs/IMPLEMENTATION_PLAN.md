# PlotPilot — Implementation Plan

> **Status:** Active. This document is the single source of reference for what is built,
> what is next, and why. Update the phase checkboxes as work lands.
>
> **Last updated:** 2026-11-20
> **Related:** [`SPECIFICATION.md`](../SPECIFICATION.md) (MVP product spec, still authoritative
> for the plot/share-link experience), [`AGENTS.md`](../AGENTS.md) (UI/HIG rules).

---

## 1. Context

PlotPilot serves one user: an independent land/plot sales agent in Kenya selling vacant
parcels. The agent works from a phone, in the field, on intermittent data. Buyers are
reached over WhatsApp and receive a single link.

The MVP (already built) covers **inventory and conversion**:

- 60-second field capture of a plot (GPS pin, photos, video, specs, price)
- Live status (`AVAILABLE` / `PENDING` / `SOLD`) reflected on the shared link
- Public 1-to-1 showcase page `/p/[id]` with a real Open Graph card for WhatsApp
- Conveyancing ledger per sold plot (deposit → title issued) and installments

What was missing was the **day-to-day working surface**: who to call, what to do next,
what a plot is worth, and what the agent has earned. This plan adds exactly that, and
nothing else.

### 1.1 Reference project

[`/atomic-crm`](../../atomic-crm) (Marmelab, MIT) was cloned as a design reference. It is
**not** a fork target and not a dependency.

- Its runtime (Vite SPA + Supabase + React-Admin) cannot server-render the WhatsApp preview
  card, which is PlotPilot's core conversion mechanism.
- Its domain model (`companies`, `contacts`, `deals`, `tasks`, `notes`) is the right *shape*
  for the missing half of this product.

We borrow **patterns, not code**: pipeline stages driving a board, task types with due dates,
an aggregation view for list counts, an append-only activity feed, CSV import/export, and a
single `configuration` row for user-editable presets.

| atomic-crm | PlotPilot |
|---|---|
| `contacts` | `Contact` |
| `deals` (stage + `index`) | `Lead` (stage + `index`) |
| `deals.amount`, `expected_closing_date` | `Lead.budget*`, `SaleRecord.agreedPriceKes` |
| `tasks` | `Task` |
| `contact_notes` / `deal_notes` / `activity_log` | `Activity` (one table) |
| `companies` | *not adopted* — seller side is out of scope |
| `contacts_summary` view | server-side aggregation in route handlers |

---

## 2. Decisions

| # | Decision | Rationale |
|---|---|---|
| D1 | **No seller/owner side.** No owner outreach, mandates, or sourcing pipeline. | Single-agent resale focus; halves the surface area. |
| D2 | **Commission tracking only.** No buyer invoicing, tax lines, or PDF invoices. | The agent's own earnings are the need; buyer sides already exist in the closing ledger. |
| D3 | **Money is `Decimal(14,2)`.** | KES amounts reach 8–9 figures; `Float` drifts and silently rounds at boundaries. |
| D4 | **No offline writes.** Read cache via PWA only, later. | Sync/conflict resolution is not worth it at this stage. |
| D5 | **WhatsApp deep links only.** No Business Cloud API. | Free, no number approval, no template restrictions. Every CTA prefills the message. |
| D6 | Keep **Next.js + Prisma + Postgres**. | SSR for OG cards, single deploy target, already working. |
| D7 | Single agent is explicit, but add `deletedAt`/timestamps so data is recoverable. | Cheap insurance; no multi-tenant plumbing yet. |

### 2.1 Non-goals

Public marketplace/search, polygon boundary drawing, multi-agent teams/RBAC, online payments,
SMS gateway, AI pricing, full offline sync, buyer invoicing, document e-signature.

---

## 3. Phase status

| Phase | Scope | Est. | Status |
|---|---|---|---|
| 0 | Foundations: migrations, money, soft delete, auth, tests | 1–2 d | **done** |
| 1 | Contacts, leads, inquiry capture, pipeline | 3–5 d | **done** |
| 2 | Tasks, today view, follow-up logging | 2–4 d | next |
| 3 | Site visits, documents | 2–3 d | planned |
| 4 | Comparables & price guidance | 3–4 d | planned |
| 5 | Payments, commission, statements | 4–6 d | planned |
| 6 | Test coverage, CI, export, launch polish | 2–3 d | planned |

Roughly 17–27 focused days. Phase 1 is the highest-value increment: it turns the app from a
catalogue into a working day.

---

## 4. Phase 0 — Foundations

Goal: make the existing MVP safe to put real buyer data into, without changing behaviour.

### 4.1 Versioned migrations

- [x] Baseline the current schema as `prisma/migrations/0001_init/`.
- [x] Replace `db:push` with `db:migrate` (`prisma migrate dev` locally, `migrate deploy` in prod).
- [x] Document the one-time production baseline (`prisma migrate resolve --applied 0001_init`).

Rationale: `db push` has no history and cannot be rolled back. Once `SaleRecord`s carry real
money, silent schema drift is unacceptable.

### 4.2 Money

- [x] `priceKes`, `agreedPriceKes`, `depositKes`, `balanceKes`, `PaymentInstallment.amountKes`
      → `Decimal @db.Decimal(14,2)`.
- [x] `src/lib/money.ts`: `toDecimal`, `parseKes` (accepts `"1,500,000"`, `"KES 1500000"`,
      `1_500_000`), `formatKes`, `serializeMoney` (Decimal → number at the API boundary),
      `sumKes`, `pct`.
- [x] Every route handler and server component serializes explicitly; no `JSON.stringify` on a
      raw Decimal (`src/lib/serialize.ts`).
- [x] Unit tests for parsing, rounding, and balance math.

### 4.3 Data-loss guards

- [x] `Plot.deletedAt` — soft delete. `DELETE /api/plots/:id` sets it.
- [x] Refuse a hard delete when a `SaleRecord` exists; require `?confirm=true` and still soft-delete.
- [x] All list/detail queries filter `deletedAt: null`; the public page 404s on deleted plots.
- [x] Never cascade-delete payment history — `SaleRecord.plotId` is `ON DELETE RESTRICT`.

### 4.4 Auth hardening

- [x] No hardcoded `JWT_SECRET` fallback in production — fail closed at boot.
- [x] No `admin123` default password; `ensureDefaultAgent` removed in favour of
      `ensureAgentForSession`, seed password comes from `SEED_AGENT_PASSWORD`.
- [x] `ALLOWED_AGENT_EMAIL` required in production (empty = allow nobody).
- [x] `src/proxy.ts` (Next 16 middleware convention) protects `/dashboard/*`.
- [x] `GET /api/plots/:id` requires a session (it previously returned the full record publicly).
- [x] Rate-limit `/api/auth/*` (in-memory token bucket; Redis later).

### 4.5 Tooling

- [x] `vitest` + `vitest.config.mts`, `npm test`.
- [x] `package.json` name → `plotpilot`, scripts: `db:migrate`, `db:studio`, `test`, `typecheck`.
- [x] `.env.example` documents every variable, including which ones are required in production.

**Exit criteria:** `npm run build` passes; `npm test` passes; migrations replay cleanly on an
empty database; deleting a sold plot does not destroy its payments.

### 4.6 Phase 0 implementation notes

| Area | Files |
|---|---|
| Money | `src/lib/money.ts` (client-safe), `src/lib/money.server.ts`, `src/lib/serialize.ts` |
| Auth | `src/lib/auth.ts`, `src/lib/jwt-secret.ts`, `src/proxy.ts`, `src/lib/rate-limit.ts` |
| Migrations | `prisma/migrations/0001_init`, `0002_money_and_soft_delete`, `0003_protect_sale_records` |
| Tests | `src/lib/money.test.ts`, `src/lib/money.server.test.ts` |

Three migrations were used rather than one squashed initial migration so an existing database
created with `prisma db push` can be baselined:

```bash
npx prisma migrate resolve --applied 0001_init
npm run db:deploy   # applies 0002 and 0003
```

Soft deletes keep `SaleRecord` reachable; `SaleRecord.plotId` uses `ON DELETE RESTRICT` so a raw
`DELETE` on a sold plot fails rather than destroying payments.

Lint: React Compiler rules added by `eslint-config-next` 16 (`set-state-in-effect`, `purity`,
`refs`, `static-components`) are warnings for now. The MVP predates them; fix per screen as it is
touched. `npm run lint` must stay at zero errors.

---

## 5. Phase 1 — Contacts, leads, inquiry capture

Goal: every buyer who ever shows interest exists in the system, attributed to a plot, with a
next step.

### 5.1 Data

```prisma
model Contact {
  id        String   @id @default(cuid())
  name      String
  phone     String
  altPhone  String?
  email     String?
  source    String   @default("FIELD") // WHATSAPP|REFERRAL|WALK_IN|SIGN|SOCIAL|REPEAT|INQUIRY
  tags      String[]
  notes     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  leads     Lead[]
  sales     SaleRecord[]
  tasks     Task[]
  activities Activity[]
  @@unique([phone])
  @@index([name])
}

model Lead {
  id           String    @id @default(cuid())
  contactId    String
  plotId       String?
  stage        String    @default("INQUIRY")
  // INQUIRY|CONTACTED|SITE_VISIT|OFFER|DEPOSIT|CLOSED|LOST
  index        Int       @default(0)
  source       String
  budgetMinKes Decimal?  @db.Decimal(14, 2)
  budgetMaxKes Decimal?  @db.Decimal(14, 2)
  lostReason   String?
  nextActionAt DateTime?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  @@index([stage, index])
  @@index([nextActionAt])
}

model Activity {          // append-only; replaces separate note tables
  id        String   @id @default(cuid())
  type      String   // INQUIRY|LEAD_CREATED|STAGE_CHANGED|NOTE|CALL|WHATSAPP|PAYMENT|DOCUMENT|STATUS
  body      String?
  metadata  Json?
  contactId String?
  leadId    String?
  plotId    String?
  saleId    String?
  createdAt DateTime @default(now())
  @@index([createdAt])
}
```

### 5.2 Inquiry capture

- [x] `POST /api/inquiries` — public, rate-limited, **no session**. Body: `{plotId, name, phone}`.
      In one transaction: upsert `Contact` by phone; create `Lead` (stage `INQUIRY`, source
      `INQUIRY`); write `Activity`. Returns the agent's WhatsApp deep link.
- [x] Public page CTA calls this before redirecting to `wa.me`, so the funnel is measurable.
      Fire-and-forget — the WhatsApp redirect must never be blocked by a failed POST.
- [x] Dedupe: same phone + same plot within 24h does not create a second lead, only an activity.

### 5.3 Agent surfaces

- [x] `/dashboard/leads` — list + stage filter chips; mobile is a list, `sm+` is a board
      (drag between columns, persisted via `index`).
- [x] Lead detail sheet — contact, plot, budget, stage stepper, timeline, quick actions.
- [x] Stage rules enforced server-side: `DEPOSIT` requires a `SaleRecord`; `LOST` requires
      `lostReason`; `CLOSED` sets `SaleRecord`.
- [x] Creating a lead from a plot pre-fills the plot and price.
- [x] Backfill: existing `SaleRecord` buyers → `Contact` + `CLOSED` lead (idempotent script).

**Exit:** a buyer taps *Inquire*, and the lead is in the dashboard with plot attribution before
the WhatsApp message is even sent.

### 5.4 Phase 1 implementation notes

- The public CTA opens a compact optional sheet (name + phone) with a one-tap
  "Skip and open WhatsApp". Skipping still records an anonymous `INQUIRY` activity on the plot,
  so the agent sees demand without junk contacts.
- Deviation from §5.3: `DEPOSIT` is allowed without a `SaleRecord` (verbal bookings happen) and
  the lead card/detail flag it with a link to the plot ledger. `CLOSED` remains strict and
  auto-links the sale. Tighten in Phase 5.
- Leads are created from the board's "New lead" sheet, or from a plot card
  (`/dashboard/leads?plot=<id>` scopes the board and prefills the form).
- Buyer details are edited inside the lead sheet (`PATCH /api/contacts/:id`); a standalone
  contacts screen is not needed for a single agent yet.
- Files: `src/lib/{lead-stages,leads,lead-types,phone,activity,format}.ts`,
  `src/app/api/{inquiries,leads,contacts}` routes,
  `src/components/leads/*`, `src/components/client/InquireCta.tsx`,
  `scripts/backfill-leads.mts`.

---

## 6. Phase 2 — Tasks & follow-up

```prisma
model Task {
  id        String    @id @default(cuid())
  title     String
  type      String    @default("FOLLOW_UP") // CALL|WHATSAPP|SMS|SITE_VISIT|DOCUMENT|PAYMENT
  dueAt     DateTime
  doneAt    DateTime?
  priority  String    @default("NORMAL")     // LOW|NORMAL|HIGH
  contactId String?
  leadId    String?
  plotId    String?
  saleId    String?
  notes     String?
  @@index([doneAt, dueAt])
}
```

- [ ] `Task` CRUD + `/api/tasks`, `/api/tasks/:id/complete`.
- [ ] `/dashboard/today` — overdue → due today → next 7 days (atomic-crm's
      `nb_tasks` pending-count pattern).
- [ ] Task creation from lead/plot/sale detail; completing writes an `Activity`.
- [ ] One-tap log: call or WhatsApp opens the deep link and logs the touch on return.
- [ ] Rule: a `Lead` cannot advance stage with `nextActionAt` empty (prompt for a task).
- [ ] Badge count in the nav.

**Exit:** no lead exists without a next action, and every logged call appears in its timeline.

---

## 7. Phase 3 — Site visits & documents

```prisma
model SiteVisit {
  id          String   @id @default(cuid())
  leadId      String
  plotId      String?
  scheduledAt DateTime
  status      String   @default("SCHEDULED") // SCHEDULED|COMPLETED|NO_SHOW|CANCELLED
  feedback    String?
  rating      Int?
}

model Document {
  id        String   @id @default(cuid())
  kind      String   // TITLE_DEED|AGREEMENT|RECEIPT|ID_COPY|MAP|SURVEY|CONSENT|OTHER
  name      String
  url       String
  key       String?
  mimeType  String?
  sizeBytes Int?
  plotId    String?
  saleId    String?
  contactId String?
  createdAt DateTime @default(now())
}
```

- [ ] Schedule/complete a visit from a lead; day view at `/dashboard/visits`.
- [ ] Completed visit with rating offers "move lead to OFFER".
- [ ] Document upload reuses the existing presigned R2 path; attached to plot/sale/contact.
- [ ] Documents are **never** exposed on `/p/[id]`.

**Exit:** a visit is scheduled, completed, and reflected in the lead timeline.

---

## 8. Phase 4 — Comparables & price guidance

```prisma
model Comparable {
  id           String   @id @default(cuid())
  county       String
  ward         String?
  locationName String
  latitude     Float?
  longitude    Float?
  sizeAcres    Decimal  @db.Decimal(10, 4)
  priceKes     Decimal  @db.Decimal(14, 2)
  pricePerAcre Decimal  @db.Decimal(14, 2)
  kind         String   @default("SALE")     // SALE|LISTING
  source       String   // AGENT|PORTAL|PUBLIC_RECORD|HEARD
  sourceUrl    String?
  observedAt   DateTime
  verified     Boolean  @default(false)
  notes        String?
  @@index([county, ward, observedAt])
}
```

- [ ] Fast-entry form (location, acres, price, kind, source, date) — price/acre computed on write.
- [ ] `src/lib/pricing.ts`: median price/acre over same county+ward and a ±40% size band;
      returns `{ low, mid, high, compsUsed[] }`. Deterministic and explainable — the UI always
      shows which comps produced the number.
- [ ] Plot detail "Price guidance" card; flags an asking price >25% off the comp median.
- [ ] Printable offer sheet (print CSS; no PDF service).
- [ ] `Acres` normalisation for `sq m` / `ha` / ft-dimension presets.

**Exit:** adding a comps set produces a suggested range and the comps used are visible.

---

## 9. Phase 5 — Payments, commission, statements

```prisma
model Commission {
  id          String    @id @default(cuid())
  saleId      String
  basis       String    @default("PERCENT") // PERCENT|FIXED
  ratePercent Decimal?  @db.Decimal(5, 2)
  amountKes   Decimal   @db.Decimal(14, 2)
  status      String    @default("PENDING") // PENDING|INVOICED|PARTIAL|PAID
  dueDate     DateTime?
  paidAt      DateTime?
}
```

- [ ] `PaymentInstallment` → add `method` (MPESA/BANK/CASH/CHEQUE), `receiptUrl`.
- [ ] `SaleRecord.buyerContactId`, `leadId`, `commission`.
- [ ] Payment entry updates `balanceKes`, `nextDueDate`, `titleStatus` where appropriate.
- [ ] Statement of account per sale, printable.
- [ ] Commission derived from agreed price (percent or fixed), editable, status transitions.
- [ ] Dashboard finance block extends `dealsMetrics` with receivables aging (0–30 / 31–60 / 60+).
- [ ] WhatsApp overdue-payment reminder template (deep link).

**Exit:** deposit → balance → commission → statement is correct end to end.

---

## 10. Phase 6 — Quality & launch

- [ ] Unit tests: money, balance, stage transitions, pricing median, phone normalisation.
- [ ] Playwright: new plot → share link; inquiry → lead → WhatsApp; deposit → installment → stage.
- [ ] GitHub Actions: typecheck, lint, test, build.
- [ ] Error monitoring (Sentry) and structured request logging.
- [ ] Full JSON/CSV export of all agent data (also the Kenya DPA portability answer).
- [ ] PWA offline *read* cache; performance pass on simulated 3G.
- [ ] Accessibility pass against `AGENTS.md` HIG rules.

---

## 11. API surface (target)

| Route | Methods | Auth |
|---|---|---|
| `/api/plots` | GET, POST | session |
| `/api/plots/:id` | GET, PATCH, DELETE | session |
| `/api/plots/:id/deal` | GET, POST | session |
| `/api/plots/:id/deal/payments` | POST | session |
| `/api/plots/:id/deal/milestone` | PATCH | session |
| `/api/plots/:id/deal/review` | POST | session |
| `/api/deals` | GET | session |
| `/api/inquiries` | POST | **public, rate-limited** |
| `/api/contacts` | — (not needed yet) | session |
| `/api/contacts/:id` | GET, PATCH | session |
| `/api/leads` | GET, POST | session |
| `/api/leads/:id` | GET, PATCH, DELETE | session |
| `/api/leads/:id/stage` | PATCH | session |
| `/api/tasks` | GET, POST | session |
| `/api/tasks/:id` | PATCH, DELETE | session |
| `/api/visits` | GET, POST | session |
| `/api/comps` | GET, POST | session |
| `/api/comps/:id` | PATCH, DELETE | session |
| `/api/documents` | GET, POST | session |
| `/api/documents/:id` | DELETE | session |
| `/api/commission` | GET, PATCH | session |
| `/api/export` | GET | session |

---

## 12. UX rules

- Mobile bottom tab bar: **Plots · Leads · Today · Money**. 44pt minimum, safe-area padding.
- Kanban is drag-and-drop on `sm+` only; phones get stage chips + list. Never require drag on touch.
- All inputs ≥16px font size; `inputmode="tel"` for phones, `numeric` for money.
- Reuse the existing language: `rounded-3xl` cards, `backdrop-blur-xl` headers, `min-h-dvh`,
  sky/teal accent, lucide icons, `data-theme` dark tokens.
- Entry-speed budgets: new lead from a call = 3 taps; log a call = 1 tap; deposit = <20s.
- Money is always formatted `KSh 1,500,000` via `formatKes`; never raw numbers in UI.

---

## 13. Cross-cutting

**Money.** Decimal in the database, Decimal in server code, `number` only at the React boundary
via `serializeMoney`. Never `parseFloat` a KES string.

**Migrations.** Every schema change ships as a migration. No `db push` outside throwaway branches.

**Auth.** Fail closed. A missing secret is a boot error, not a default. Session cookie is
`httpOnly`, `sameSite=lax`, 30 days, rotated on login.

**Privacy (Kenya DPA 2019).** Buyer phone numbers and national IDs are personal data. Minimum:
export-all and delete-contact actions, no public API returning contact data, and a documented
retention decision before real buyer data is loaded.

**Backups.** Daily database backup plus an R2 lifecycle rule; the export endpoint is the
agent-facing safety net.

---

## 14. Risks

| Risk | Mitigation |
|---|---|
| Scope grows past the five needs | Phase gates; anything not listed in §2.1 gets its own doc first |
| WhatsApp automation expectations | Deep links only; document the limitation in the UI copy |
| Money rounding regressions | Decimal everywhere + tests at the boundary |
| Single-agent assumptions harden into the model | Add `agentId` when a second agent appears, not before; keep tables narrow |
| Phone numbers as identity | Normalise to E.164 on write, dedupe on the normalised value |
| Losing payment history | Soft delete; no cascade from `Plot` to `SaleRecord` |

---

## 15. Change log

| Date | Change |
|---|---|
| 2026-11-20 | Plan created. Decisions D1–D7 recorded. Phase 0 started. |
| 2026-11-20 | Phase 0 complete: Decimal money, soft delete + RESTRICT FK, versioned migrations, auth fail-closed, rate limiting, proxy guard, Vitest, lint at zero errors. |
| 2026-11-20 | Phase 1 complete: Contacts/Leads/Activity, public inquiry capture with optional buyer details, lead board + detail timeline, stage rules, phone normalisation, sale backfill. |
