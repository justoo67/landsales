/**
 * Parse `ALLOWED_AGENT_EMAIL` into normalised addresses.
 *
 * The value is pasted into the Vercel dashboard, which happily accepts a
 * multi-line list, so newlines must separate addresses exactly like commas.
 * A newline-only value used to parse as a single unusable entry and locked
 * every account out of the app.
 */
export function parseAllowedEmails(raw: string | undefined | null): string[] {
  return (raw || '')
    .split(/[\s,]+/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}
