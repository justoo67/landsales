import { describe, expect, it } from 'vitest';
import { isVisitStatus, VISIT_STATUS_LABELS, VISIT_STATUS_STYLES } from './visits';
import {
  documentKindLabel,
  formatFileSize,
  isDocumentKind,
  MAX_DOCUMENT_BYTES,
} from './document-types';

describe('visit statuses', () => {
  it('validates known statuses', () => {
    expect(isVisitStatus('COMPLETED')).toBe(true);
    expect(isVisitStatus('completed')).toBe(false);
    expect(isVisitStatus('PENDING')).toBe(false);
  });

  it('has a label and style for every status', () => {
    for (const status of ['SCHEDULED', 'COMPLETED', 'NO_SHOW', 'CANCELLED'] as const) {
      expect(VISIT_STATUS_LABELS[status]).toBeTruthy();
      expect(VISIT_STATUS_STYLES[status]).toBeTruthy();
    }
  });
});

describe('document metadata', () => {
  it('validates kinds', () => {
    expect(isDocumentKind('TITLE_DEED')).toBe(true);
    expect(isDocumentKind('title_deed')).toBe(false);
    expect(documentKindLabel('RECEIPT')).toBe('Receipt');
    expect(documentKindLabel('WHATEVER')).toBe('Document');
  });

  it('formats file sizes', () => {
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(2048)).toBe('2 KB');
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
    expect(formatFileSize(null)).toBe('—');
  });

  it('exposes the upload ceiling', () => {
    expect(MAX_DOCUMENT_BYTES).toBe(25 * 1024 * 1024);
  });
});
