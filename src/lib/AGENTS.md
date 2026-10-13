# src/lib — Core Singletons & Helpers

Small, high-leverage modules imported across the whole app. An edit here ripples everywhere.

## FILES
| File | Exports | Notes |
|------|---------|-------|
| `prisma.ts` | `prisma` | Global singleton `PrismaClient`; dev-guarded via `globalThis` |
| `auth.ts` | `createSession`, `getSession`, `deleteSession`, `ensureDefaultAgent`, `SessionPayload` | jose JWT (HS256) in `agent_session` httpOnly cookie, 30d |
| `r2.ts` | `r2Client`, `isR2Configured`, `getPresignedUploadUrl`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` | Cloudflare R2 via AWS SDK; 1h presigned PUT |
| `theme.ts` | `getStoredTheme`, `applyTheme`, `ThemeMode` | `data-theme` attr + `.dark` class, key `plotpilot-theme` |
| `haptics.ts` | `triggerHaptic` | `navigator.vibrate`; silent no-op when unsupported |

## CONVENTIONS
- `auth.ts` is server-only (`next/headers` cookies) — import only in route handlers / server components.
- `getSession()` returns `null` on missing/invalid token; it never throws.
- `prisma.ts` MUST keep the `globalThis` guard — Next hot-reload otherwise leaks clients.
- `theme.ts` / `haptics.ts` guard `typeof window|navigator === 'undefined'` for SSR safety.
- `SessionPayload = { email, agentId, name, avatarUrl? }`.

## ANTI-PATTERNS
- Do NOT instantiate `new PrismaClient()` outside `prisma.ts`.
- Do NOT hardcode the JWT secret — the in-file fallback is dev-only; prod sets `JWT_SECRET`.
- Do NOT import `auth.ts` into `'use client'` components.

## SEE
- Upload flow: `src/app/api/upload/` + `src/lib/r2.ts`; falls back to local `public/uploads/` when `isR2Configured` is false.
