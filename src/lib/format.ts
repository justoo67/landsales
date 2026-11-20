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
