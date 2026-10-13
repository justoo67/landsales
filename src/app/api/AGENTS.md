# src/app/api — Backend Route Handlers

Next.js 16 App Router route handlers. One `route.ts` per path; export `GET`/`POST`/`PATCH`/`DELETE`.

## STRUCTURE
```
api/
├── auth/             # login, register, logout, google (OAuth callback)
├── plots/            # list + create; [id]/ = get/update/delete
│   └── [id]/deal/    # pipeline: route.ts, milestone, payments, review
├── deals/            # cross-plot deals listing
├── upload/           # multipart upload + presigned (R2)
├── resolve-location/ # lat/lng → place label
└── settings/         # agent profile
```

## CONVENTIONS
- Signature: `export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> })`; then `const { id } = await params` — **params is a Promise in Next 16**.
- Guard private routes FIRST: `const session = await getSession(); if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });`
- Public by design: `GET /api/plots/[id]` (client share page needs it). Every mutating handler requires a session.
- Wrap the body in `try/catch`; on failure `console.error('<Context> error:', err)` and return `NextResponse.json({ error: 'Internal server error' }, { status: 500 })`.
- Validation failures → 400/401 with a specific `error` string (e.g. `'Title, latitude, and longitude are required'`).
- Response shapes: `{ plots }` / `{ plot }` / `{ success: true }` or `{ error }`. No extra envelope.
- Pipeline stages: DEPOSIT_PAID → AGREEMENT_SIGNED → BALANCE_CLEARED → LCB_CONSENT → TITLE_ISSUED.

## ANTI-PATTERNS
- Do NOT return raw Prisma errors to the client.
- Do NOT add an auth middleware layer — guard inline per handler with `getSession()`.
- Do NOT use Decimal/BigInt for money — fields are Prisma `Float`; `parseFloat` request strings.

## SEE
- `src/lib/AGENTS.md` for `prisma`, `getSession`, and R2 helpers.
- `src/app/api/upload/presigned/route.ts` — the `{ directFallback: true }` local-storage fallback contract.
