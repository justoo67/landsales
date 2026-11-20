/**
 * Phone normalisation.
 *
 * Kenyan numbers arrive from WhatsApp, business cards, and the agent's memory in
 * every shape: `0712 345 678`, `+254712345678`, `254712345678`, `712345678`.
 * Contacts are deduped on the normalised E.164 value, so this must be stable.
 */

const KENYA_PREFIX = '+254';

export function normalizePhone(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  // Explicit international format: trust the caller's country code.
  if (raw.startsWith('+')) {
    return isPlausible(digits) ? `+${digits}` : null;
  }

  if (digits.startsWith('00') && digits.length > 2) {
    const rest = digits.slice(2);
    return isPlausible(rest) ? `+${rest}` : null;
  }

  // Kenya: country code supplied without `+`
  if (digits.startsWith('254') && digits.length >= 12) {
    return `+${digits}`;
  }

  // Kenya: local trunk prefix `07...` / `01...`
  if (digits.length === 10 && (digits.startsWith('07') || digits.startsWith('01'))) {
    return `${KENYA_PREFIX}${digits.slice(1)}`;
  }

  // Kenya: 9-digit subscriber number `712...` / `112...`
  if (digits.length === 9 && (digits.startsWith('7') || digits.startsWith('1'))) {
    return `${KENYA_PREFIX}${digits}`;
  }

  // Unknown shape: keep the digits rather than reject a legitimate buyer.
  return isPlausible(digits) ? `+${digits}` : null;
}

function isPlausible(digits: string): boolean {
  return digits.length >= 9 && digits.length <= 15;
}

/** `+254712345678` -> `0712 345 678`; other numbers are returned as-is. */
export function formatPhone(input: string): string {
  const normalized = normalizePhone(input);
  if (!normalized) return input;
  if (normalized.startsWith(KENYA_PREFIX) && normalized.length === 13) {
    const local = normalized.slice(KENYA_PREFIX.length);
    return `0${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
  }
  return normalized;
}

/** Digits only, for `wa.me` deep links. */
export function whatsappNumber(input: string): string {
  const normalized = normalizePhone(input);
  return (normalized || input).replace(/\D/g, '');
}
