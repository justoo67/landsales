/** Small presentation helpers shared by client components. */

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/** "3m ago", "2h ago", "Yesterday", "12 Nov". */
export function timeAgo(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (Number.isNaN(seconds)) return '';
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 172800) return 'Yesterday';
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return date.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
}

export function isOverdue(value: string | Date | null | undefined): boolean {
  if (!value) return false;
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.getTime() < Date.now();
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** "Overdue · 12 Nov", "Today · 14:30", "Tomorrow · 09:00", "Fri 22 Nov". */
export function dueLabel(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const today = startOfDay(now);
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (date.getTime() < today) {
    return `Overdue · ${date.toLocaleDateString('en-KE', {
      day: 'numeric',
      month: 'short',
    })}`;
  }
  if (date.getTime() < today + 86_400_000) return `Today · ${time}`;
  if (date.getTime() < today + 172_800_000) return `Tomorrow · ${time}`;

  return date.toLocaleDateString('en-KE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

/** `datetime-local` value for a date, in the browser's timezone. */
export function toDateTimeInput(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

/** Default follow-up slot: tomorrow at 09:00. */
export function defaultFollowUpSlot(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  return toDateTimeInput(date);
}
