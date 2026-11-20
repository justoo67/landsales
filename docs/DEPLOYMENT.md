# Deployment

> PlotPilot runs on Vercel. This file records how it is wired so a future
> deploy does not need rediscovery.

## Project

| | |
|---|---|
| Vercel project | `landsales` (`prj_IJ3svjWIKSOtBhgI7PI9SaOV2uuJ`) |
| Team | `justoo67s-projects` (`team_VvbcpkI6m4vlflcsfAZfP2A0`) |
| Framework preset | Next.js, Node 24.x, region `iad1` |
| Git | `github.com:justoo67/landsales`, branch `master` |
| Production URL | https://landsales.vercel.app |
| Custom production domain | none yet |

Pushing to `master` triggers a production deployment through the GitHub
integration. Pull requests get preview deployments.

## Environment variables

Set in Vercel for **Production and Preview**. Names only — values live in the
Vercel dashboard, never in the repo.

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Neon pooled connection |
| `DIRECT_URL` | yes | Neon direct connection, used by migrations |
| `JWT_SECRET` | yes | 32+ chars; the app refuses to sign sessions without it |
| `ALLOWED_AGENT_EMAIL` | yes | only this address may sign in or register |
| `NEXT_PUBLIC_APP_URL` | yes | production origin, used for OAuth redirects and OG URLs |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | optional | password sign-in works without it |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `NEXT_PUBLIC_R2_PUBLIC_URL` | optional | without these, uploads fall back to `public/uploads` and vanish on redeploy |

Pull them locally when needed (writes a gitignored file, never prints values):

```bash
vercel link --project landsales --scope justoo67s-projects
vercel env pull .env.local --environment=production
```

## Database migrations

The Vercel build command is:

```
prisma generate && prisma migrate deploy && next build
```

So a deploy can never ship code that expects a schema the database does not
have. Migrations are idempotent; re-deploying the same commit is a no-op.

### One-time baseline (already done)

The production database was created with `prisma db push` before migrations
existed, so it had tables but no `_prisma_migrations` history. It was baselined
once:

1. `prisma migrate resolve --applied 0001_init` — adopt the original schema as
   migration 1 without re-creating the tables.
2. `prisma migrate deploy` — applied `0002` through `0008`.
3. `node scripts/backfill-leads.mts` — turned the existing sale into a buyer
   contact plus a `CLOSED` lead.

Any *other* pre-migration database needs the same `resolve --applied 0001_init`
step before its first `migrate deploy`, or the deploy will fail on existing
tables.

### If a migration fails in a build

The build fails and the previous deployment keeps serving traffic. Fix the
migration locally (`prisma migrate diff` against the schema), push, and let the
next build apply it. Do not run `migrate reset` against production.

## Storage

Cloudflare R2, S3-compatible. Plot photos and video upload **browser → R2**
through presigned PUTs (`/api/upload/presigned`), so they never transit Vercel.
Documents and receipts go through `/api/upload` (server proxies to R2) with a
25 MB cap.

Documents currently carry public URLs. Before real title deeds are uploaded,
move them to a private bucket and serve short-lived signed GETs — see the
`IMPLEMENTATION_PLAN.md` Phase 6 notes.

## Rollback

1. `vercel list landsales --prod` (or `list_deployments`), pick the last good
   deployment.
2. Promote it: dashboard → Deployments → ⋯ → **Promote to Production**, or
   `vercel promote <url>`.
3. Rollback the code, not the schema: migrations are forward-only and already
   applied. A rollback across a schema change requires a matching down
   migration, which this project does not maintain — prefer rolling forward.

## Post-deploy checklist

- [ ] `/p/<known-plot-id>` returns 200 and shows the plot title
- [ ] `/api/plots` returns 401 without a session
- [ ] `/dashboard` redirects to `/login?next=/dashboard`
- [ ] `prisma migrate status` reports "Database schema is up to date"
- [ ] Sign in and confirm the dashboard loads KPIs, leads, and money

## Verified deployment

| Date | Commit | Result |
|---|---|---|
| 2026-11-20 | `8184602` | READY — migrations applied, public page 200, API 401, dashboard redirect works |
