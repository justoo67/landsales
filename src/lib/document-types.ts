/** Document vocabulary, safe to import from client components. */

export const DOCUMENT_KINDS = [
  { value: 'TITLE_DEED', label: 'Title deed' },
  { value: 'AGREEMENT', label: 'Sale agreement' },
  { value: 'RECEIPT', label: 'Receipt' },
  { value: 'ID_COPY', label: 'ID copy' },
  { value: 'MAP', label: 'Map' },
  { value: 'SURVEY', label: 'Survey' },
  { value: 'CONSENT', label: 'Consent' },
  { value: 'OTHER', label: 'Other' },
] as const;

export type DocumentKind = (typeof DOCUMENT_KINDS)[number]['value'];

export function isDocumentKind(value: string): value is DocumentKind {
  return DOCUMENT_KINDS.some((kind) => kind.value === value);
}

export function documentKindLabel(value: string): string {
  return DOCUMENT_KINDS.find((kind) => kind.value === value)?.label ?? 'Document';
}

export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;

export const DOCUMENT_ACCEPT =
  'application/pdf,image/*,.doc,.docx,.xls,.xlsx';

export interface DocumentItem {
  id: string;
  kind: string;
  name: string;
  url: string;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
