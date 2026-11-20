'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FileText,
  Loader2,
  Paperclip,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';
import { timeAgo } from '@/lib/format';
import {
  DOCUMENT_ACCEPT,
  DOCUMENT_KINDS,
  documentKindLabel,
  formatFileSize,
  MAX_DOCUMENT_BYTES,
  type DocumentItem,
} from '@/lib/document-types';

interface DocumentsSectionProps {
  plotId?: string;
  saleId?: string;
  contactId?: string;
  title?: string;
  compact?: boolean;
}

export default function DocumentsSection({
  plotId,
  saleId,
  contactId,
  title = 'Documents',
  compact = false,
}: DocumentsSectionProps) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [kind, setKind] = useState('TITLE_DEED');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const query = plotId
    ? `plotId=${encodeURIComponent(plotId)}`
    : saleId
    ? `saleId=${encodeURIComponent(saleId)}`
    : contactId
    ? `contactId=${encodeURIComponent(contactId)}`
    : '';

  const load = useCallback(async () => {
    if (!query) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/documents?${query}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  const upload = async () => {
    if (!file) {
      setError('Choose a file first');
      return;
    }

    if (file.size > MAX_DOCUMENT_BYTES) {
      setError('File is larger than 25 MB');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();

      if (!uploadRes.ok || !uploadData.url) {
        setError(uploadData.error || 'Upload failed');
        return;
      }

      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          name: file.name,
          url: uploadData.url,
          key: uploadData.key || null,
          mimeType: file.type || null,
          sizeBytes: file.size,
          plotId,
          saleId,
          contactId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not save the document');
        return;
      }

      setDocuments((current) => [data.document, ...current]);
      setFile(null);
      setSheetOpen(false);
      triggerHaptic('success');
    } catch {
      setError('Network error while uploading');
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id: string) => {
    const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setDocuments((current) => current.filter((document) => document.id !== id));
      triggerHaptic('warning');
    }
  };

  return (
    <section
      className={`bg-white border border-slate-200 rounded-2xl shadow-sm ${
        compact ? 'p-3.5' : 'p-4 sm:p-5'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Paperclip className="w-3.5 h-3.5" />
          {title}
        </h3>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-sky-700 bg-sky-50 border border-sky-200 min-h-[34px] touch-manipulation active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>
      </div>

      {loading ? (
        <div className="py-4 flex justify-center text-slate-300">
          <Loader2 className="w-4 h-4 animate-spin" />
        </div>
      ) : documents.length === 0 ? (
        <p className="text-xs text-slate-400 py-2">
          No documents yet. Title deeds, agreements, and receipts live here — never on the
          public page.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {documents.map((document) => (
            <li key={document.id} className="flex items-center gap-2.5 py-2.5">
              <span className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-slate-500" />
              </span>
              <div className="min-w-0 flex-1">
                <a
                  href={document.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs font-semibold text-slate-800 truncate hover:text-sky-700"
                >
                  {document.name}
                </a>
                <p className="text-[10px] text-slate-400">
                  {documentKindLabel(document.kind)} · {formatFileSize(document.sizeBytes)} ·{' '}
                  {timeAgo(document.createdAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove(document.id)}
                aria-label={`Delete ${document.name}`}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-300 hover:text-rose-600 flex-shrink-0 touch-manipulation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {sheetOpen && (
        <div className="fixed inset-0 z-[1200] bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl pb-safe">
            <div className="flex items-center justify-between px-5 pt-5">
              <h2 className="text-base font-bold text-slate-900">Add document</h2>
              <button
                type="button"
                onClick={() => {
                  setSheetOpen(false);
                  setFile(null);
                  setError(null);
                }}
                aria-label="Close"
                className="w-10 h-10 -mr-2 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500 touch-manipulation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 pb-5 pt-4 space-y-3">
              <div>
                <label htmlFor="doc-kind" className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Document type
                </label>
                <select
                  id="doc-kind"
                  value={kind}
                  onChange={(event) => setKind(event.target.value)}
                  className="w-full px-3 py-3 rounded-xl border border-slate-200 bg-slate-50 text-base text-slate-900 focus:outline-none"
                >
                  {DOCUMENT_KINDS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-500 text-sm font-medium touch-manipulation"
              >
                <Upload className="w-4 h-4" />
                {file ? file.name : 'Choose a file (PDF, image, Office)'}
              </button>
              <input
                ref={inputRef}
                type="file"
                accept={DOCUMENT_ACCEPT}
                className="hidden"
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null);
                  setError(null);
                }}
              />

              {file && (
                <p className="text-[11px] text-slate-500">
                  {formatFileSize(file.size)} · max 25 MB
                </p>
              )}

              {error && (
                <p className="text-xs font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={upload}
                disabled={uploading || !file}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm rounded-2xl min-h-[48px] disabled:opacity-50 touch-manipulation"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {uploading ? 'Uploading…' : 'Save document'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
