'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  getDocumentChecklist,
  calculateProgress,
  DOCUMENT_CATEGORIES,
} from '@/lib/documents/texas-checklist';
import type { DocumentRequirement, TransactionDocument } from '@/lib/documents/texas-checklist';
import {
  Upload, Download, Trash2, ChevronDown, ChevronRight,
  FileText, DollarSign, AlertCircle, Search, Shield, CheckSquare, UserCheck,
  Loader2, AlertTriangle, CheckCircle, Archive, Briefcase,
} from 'lucide-react';

const CATEGORY_ICONS: Record<string, typeof FileText> = {
  Briefcase, FileText, DollarSign, AlertCircle, Search, Shield, CheckSquare, UserCheck,
};

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-amber-500/10', text: 'text-amber-600', label: 'Pending' },
  received: { bg: 'bg-blue-500/10', text: 'text-blue-600', label: 'Received' },
  reviewed: { bg: 'bg-purple-500/10', text: 'text-purple-600', label: 'Reviewed' },
  signed: { bg: 'bg-green-500/10', text: 'text-green-600', label: 'Signed' },
  complete: { bg: 'bg-green-500/10', text: 'text-green-600', label: 'Complete' },
};

const STATUS_ORDER = ['pending', 'received', 'reviewed', 'signed', 'complete'];

interface DocumentVaultProps {
  transactionId: string;
  trackType: string;
  transactionType?: string;
}

export function DocumentVault({ transactionId, trackType, transactionType }: DocumentVaultProps) {
  const toast = useToast();
  const [documents, setDocuments] = useState<TransactionDocument[]>([]);
  const [checklist, setChecklist] = useState<DocumentRequirement[]>([]);
  const [progress, setProgress] = useState<{ cmr: { total: number; uploaded: number; percent: number }; good: { total: number; uploaded: number; percent: number }; overall: { total: number; uploaded: number; percent: number } }>({
    cmr: { total: 0, uploaded: 0, percent: 0 },
    good: { total: 0, uploaded: 0, percent: 0 },
    overall: { total: 0, uploaded: 0, percent: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [goodToSaveExpanded, setGoodToSaveExpanded] = useState(false);
  const [statusDropdown, setStatusDropdown] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const effectiveType = transactionType || trackType;
  const MAX_RETRIES = 3;

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setFetchError(false);

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const res = await fetch(`/api/transactions/${transactionId}/documents`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        const docs = data.documents || [];
        const cl = data.checklist || getDocumentChecklist(effectiveType);
        const uploadedTypes = docs.map((d: TransactionDocument) => d.document_type);
        const prog = data.progress?.cmr ? data.progress : calculateProgress(cl, uploadedTypes);
        setDocuments(docs);
        setChecklist(cl);
        setProgress(prog);
        setLoading(false);
        return;
      } catch {
        if (attempt < MAX_RETRIES - 1) {
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
        }
      }
    }

    setFetchError(true);
    setLoading(false);
    toastRef.current.error('Error', 'Could not load document vault. Tap Retry to try again.');
  }, [transactionId, effectiveType]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const handleUpload = useCallback(async (documentType: string, file: File) => {
    setUploading(prev => ({ ...prev, [documentType]: true }));

    // Optimistic UI: show the file immediately
    const optimisticDoc: TransactionDocument = {
      id: `temp-${Date.now()}`,
      transaction_id: transactionId,
      user_id: '',
      document_type: documentType,
      document_name: file.name,
      file_url: null,
      file_path: '',
      file_size: file.size,
      mime_type: file.type,
      status: 'received',
      notes: null,
      signed_at: null,
      uploaded_at: new Date().toISOString(),
      metadata: {},
    };
    setDocuments(prev => [...prev, optimisticDoc]);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', documentType);

      const res = await fetch(`/api/transactions/${transactionId}/documents`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Upload failed');
      }

      toastRef.current.success('Uploaded', `${file.name} uploaded successfully.`);
      await fetchDocuments();
    } catch (err) {
      // Remove optimistic doc on failure
      setDocuments(prev => prev.filter(d => d.id !== optimisticDoc.id));
      toastRef.current.error('Upload Failed', err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setUploading(prev => ({ ...prev, [documentType]: false }));
    }
  }, [transactionId, fetchDocuments]);

  const handleStatusChange = useCallback(async (docId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/transactions/${transactionId}/documents/${docId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update');
      setStatusDropdown(null);
      await fetchDocuments();
    } catch {
      toastRef.current.error('Error', 'Failed to update status.');
    }
  }, [transactionId, fetchDocuments]);

  const handleDownload = useCallback(async (docId: string) => {
    try {
      const res = await fetch(`/api/transactions/${transactionId}/documents/${docId}/download`);
      if (!res.ok) throw new Error('Failed to get download URL');
      const data = await res.json();
      window.open(data.url, '_blank');
    } catch {
      toastRef.current.error('Error', 'Failed to download file.');
    }
  }, [transactionId]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/transactions/${transactionId}/documents/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
      toastRef.current.success('Deleted', 'Document removed.');
      setDeleteTarget(null);
      await fetchDocuments();
    } catch {
      toastRef.current.error('Error', 'Failed to delete document.');
      setDeleteTarget(null);
    }
  }, [transactionId, deleteTarget, fetchDocuments]);

  const toggleCategory = useCallback((cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  // Split checklist by tier
  const cmrDocs = checklist.filter(d => d.tier === 'cmr_required');
  const goodDocs = checklist.filter(d => d.tier === 'good_to_save');
  const hasSaleTransaction = effectiveType === 'buyers_agent_sale' || effectiveType === 'listing_agent_sale' ||
    effectiveType === 'buyer' || effectiveType === 'seller';
  const cmrAllDone = progress.cmr.percent === 100;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={20} className="animate-spin text-gold" />
        <span className="ml-2 text-sm text-navy/50 dark:text-white/50 font-inter">Loading documents...</span>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-navy/50 dark:text-white/50 font-inter mb-4">
          Unable to load documents. Please check your connection and try again.
        </p>
        <button
          type="button"
          onClick={fetchDocuments}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[8px] text-xs font-montserrat font-medium transition-colors min-h-[44px]"
          style={{ backgroundColor: '#d3a971', color: '#132236' }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ===== SECTION 1: CMR Required by Broker ===== */}
      <div>
        {/* Header */}
        <div
          className="flex items-center gap-3 p-3 rounded-t-[8px]"
          style={{
            backgroundColor: cmrAllDone ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.08)',
            borderBottom: `1px solid ${cmrAllDone ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.15)'}`,
          }}
        >
          {cmrAllDone ? (
            <CheckCircle size={18} className="text-green-600 flex-shrink-0" />
          ) : (
            <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <h3 className={`text-sm font-montserrat font-bold ${cmrAllDone ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {cmrAllDone ? 'Broker Documents Complete' : 'Required by Broker'}
            </h3>
            <p className="text-[10px] text-navy/50 dark:text-white/50 font-inter">
              Email completed documents to da@centralmetro.com
            </p>
          </div>
          <span className={`text-xs font-montserrat font-bold ${cmrAllDone ? 'text-green-600' : 'text-red-500'}`}>
            {progress.cmr.uploaded}/{progress.cmr.total}
          </span>
        </div>

        {/* CMR Progress Bar */}
        <div className="px-3 pt-3 pb-2">
          <div className="w-full h-2.5 bg-navy/10 dark:bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress.cmr.percent}%`,
                backgroundColor: cmrAllDone ? '#22c55e' : '#ef4444',
              }}
            />
          </div>
          <p className="text-[10px] text-navy/40 dark:text-white/40 font-inter mt-1">
            {progress.cmr.uploaded} of {progress.cmr.total} required documents collected ({progress.cmr.percent}%)
          </p>
        </div>

        {/* CMR Document Categories */}
        <div className="space-y-1 px-1">
          {renderDocumentsByCategory(cmrDocs, documents, uploading, expandedCategories, toggleCategory, statusDropdown, setStatusDropdown, handleStatusChange, handleDownload, setDeleteTarget, handleUpload, fileInputRefs)}
        </div>
      </div>

      {/* ===== SECTION 2: Good to Save ===== */}
      {hasSaleTransaction && goodDocs.length > 0 && (
        <div>
          {/* Collapsible Header */}
          <button
            type="button"
            onClick={() => setGoodToSaveExpanded(!goodToSaveExpanded)}
            className="w-full flex items-center gap-3 p-3 rounded-[8px] bg-navy/5 dark:bg-white/5 hover:bg-navy/8 dark:hover:bg-white/8 transition-colors min-h-[44px]"
          >
            <Archive size={16} className="text-navy/40 dark:text-white/40 flex-shrink-0" />
            <div className="flex-1 min-w-0 text-left">
              <h3 className="text-sm font-montserrat font-semibold text-navy/60 dark:text-white/60">
                Good to Save
              </h3>
              <p className="text-[10px] text-navy/40 dark:text-white/40 font-inter">
                Not required by CMR but protects you and your client
              </p>
            </div>
            <span className="text-xs text-navy/40 dark:text-white/40 font-inter mr-2">
              {progress.good.uploaded}/{progress.good.total}
            </span>
            {goodToSaveExpanded ? (
              <ChevronDown size={14} className="text-navy/30 dark:text-white/30" />
            ) : (
              <ChevronRight size={14} className="text-navy/30 dark:text-white/30" />
            )}
          </button>

          {goodToSaveExpanded && (
            <div className="mt-1 space-y-1 px-1">
              {renderDocumentsByCategory(goodDocs, documents, uploading, expandedCategories, toggleCategory, statusDropdown, setStatusDropdown, handleStatusChange, handleDownload, setDeleteTarget, handleUpload, fileInputRefs)}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Document?"
        message={`Are you sure you want to delete "${deleteTarget?.name || ''}"? The file will be permanently removed.`}
        variant="danger"
      />
    </div>
  );
}

// ============================================
// RENDER HELPERS
// ============================================

function renderDocumentsByCategory(
  items: DocumentRequirement[],
  documents: TransactionDocument[],
  uploading: Record<string, boolean>,
  expandedCategories: Set<string>,
  toggleCategory: (cat: string) => void,
  statusDropdown: string | null,
  setStatusDropdown: (id: string | null) => void,
  handleStatusChange: (docId: string, status: string) => void,
  handleDownload: (docId: string) => void,
  setDeleteTarget: (target: { id: string; name: string } | null) => void,
  handleUpload: (docType: string, file: File) => void,
  fileInputRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>,
) {
  // Group by category
  const categories = items.reduce<Record<string, DocumentRequirement[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return Object.entries(DOCUMENT_CATEGORIES).map(([catKey, catMeta]) => {
    const catItems = categories[catKey];
    if (!catItems || catItems.length === 0) return null;

    const isExpanded = expandedCategories.has(catKey);
    const IconComp = CATEGORY_ICONS[catMeta.icon] || FileText;
    const catUploaded = catItems.filter(item => documents.some(d => d.document_type === item.type)).length;

    return (
      <div key={catKey} className="border border-gold/10 rounded-[8px] overflow-hidden">
        <button
          type="button"
          onClick={() => toggleCategory(catKey)}
          className="w-full flex items-center gap-3 p-3 hover:bg-surface dark:hover:bg-navy/30 transition-colors min-h-[44px]"
        >
          <IconComp size={14} className="text-gold flex-shrink-0" />
          <span className="text-sm font-montserrat font-medium text-navy dark:text-white flex-1 text-left">
            {catMeta.label}
          </span>
          <span className="text-xs text-navy/40 dark:text-white/40 font-inter mr-2">
            {catUploaded}/{catItems.length}
          </span>
          {isExpanded ? (
            <ChevronDown size={14} className="text-navy/30 dark:text-white/30" />
          ) : (
            <ChevronRight size={14} className="text-navy/30 dark:text-white/30" />
          )}
        </button>

        {isExpanded && (
          <div className="border-t border-gold/10">
            {catItems.map(item => (
              <DocumentRow
                key={item.type}
                item={item}
                doc={documents.find(d => d.document_type === item.type)}
                isUploading={uploading[item.type] || false}
                statusDropdown={statusDropdown}
                setStatusDropdown={setStatusDropdown}
                handleStatusChange={handleStatusChange}
                handleDownload={handleDownload}
                setDeleteTarget={setDeleteTarget}
                handleUpload={handleUpload}
                fileInputRefs={fileInputRefs}
              />
            ))}
          </div>
        )}
      </div>
    );
  });
}

function DocumentRow({
  item,
  doc,
  isUploading,
  statusDropdown,
  setStatusDropdown,
  handleStatusChange,
  handleDownload,
  setDeleteTarget,
  handleUpload,
  fileInputRefs,
}: {
  item: DocumentRequirement;
  doc: TransactionDocument | undefined;
  isUploading: boolean;
  statusDropdown: string | null;
  setStatusDropdown: (id: string | null) => void;
  handleStatusChange: (docId: string, status: string) => void;
  handleDownload: (docId: string) => void;
  setDeleteTarget: (target: { id: string; name: string } | null) => void;
  handleUpload: (docType: string, file: File) => void;
  fileInputRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
}) {
  const labelWithForm = item.formNumber ? `${item.label} (${item.formNumber})` : item.label;

  return (
    <div className="p-3 border-b border-gold/5 last:border-b-0">
      {doc ? (
        /* Uploaded Document Row */
        <div>
          <div className="flex items-start gap-2 flex-wrap">
            <div className="flex-1 min-w-0">
              <span className="text-sm font-inter text-navy dark:text-white">
                {labelWithForm}
              </span>
              {item.conditional && (
                <span className="text-[10px] italic text-navy/40 dark:text-white/40 font-inter ml-1">
                  ({item.conditional})
                </span>
              )}
            </div>
            {/* Status Badge */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setStatusDropdown(statusDropdown === doc.id ? null : doc.id)}
                className={`text-[10px] font-montserrat font-semibold px-2 py-0.5 rounded-full min-h-[28px] flex items-center ${STATUS_STYLES[doc.status]?.bg || ''} ${STATUS_STYLES[doc.status]?.text || ''}`}
              >
                {STATUS_STYLES[doc.status]?.label || doc.status}
              </button>
              {statusDropdown === doc.id && (
                <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-dark-card border border-gold/15 rounded-[8px] shadow-lg py-1 min-w-[120px]">
                  {STATUS_ORDER.map(s => (
                    <button
                      type="button"
                      key={s}
                      onClick={() => handleStatusChange(doc.id, s)}
                      className={`w-full text-left px-3 py-2 text-xs font-inter hover:bg-surface dark:hover:bg-navy/30 transition-colors min-h-[36px] ${doc.status === s ? 'text-gold font-semibold' : 'text-navy dark:text-white'}`}
                    >
                      {STATUS_STYLES[s]?.label || s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* File Details */}
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="text-xs text-navy/40 dark:text-white/40 font-inter truncate max-w-[200px]">
              {doc.document_name}
            </span>
            <span className="text-[10px] text-navy/30 dark:text-white/30 font-inter">
              {formatFileSize(doc.file_size)}
            </span>
            <span className="text-[10px] text-navy/30 dark:text-white/30 font-inter">
              {new Date(doc.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
          {/* Actions */}
          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              onClick={() => handleDownload(doc.id)}
              className="p-2 rounded-[8px] bg-gold/10 text-gold hover:bg-gold/20 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Download"
            >
              <Download size={14} />
            </button>
            <button
              type="button"
              onClick={() => setDeleteTarget({ id: doc.id, name: doc.document_name })}
              className="p-2 rounded-[8px] bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
            <button
              type="button"
              onClick={() => fileInputRefs.current[item.type]?.click()}
              className="p-2 rounded-[8px] bg-navy/5 dark:bg-white/5 text-navy/50 dark:text-white/50 hover:bg-navy/10 dark:hover:bg-white/10 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Replace"
            >
              <Upload size={14} />
            </button>
            <input
              ref={el => { fileInputRefs.current[item.type] = el; }}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.heic"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) handleUpload(item.type, f);
                e.target.value = '';
              }}
            />
          </div>
        </div>
      ) : (
        /* Empty Document Row */
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex-1 min-w-0">
              <span className="text-sm font-inter text-navy dark:text-white">
                {labelWithForm}
              </span>
            </div>
            {item.required ? (
              <span className="text-[10px] font-montserrat font-semibold px-2 py-0.5 rounded-full bg-red-500/10 text-red-500">
                Required
              </span>
            ) : item.conditional ? (
              <span className="text-[10px] font-montserrat font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600" title={item.conditional}>
                {item.conditional}
              </span>
            ) : (
              <span className="text-[10px] font-montserrat font-semibold px-2 py-0.5 rounded-full bg-navy/5 dark:bg-white/5 text-navy/40 dark:text-white/40">
                Optional
              </span>
            )}
          </div>
          <p className="text-xs text-navy/40 dark:text-white/40 font-inter mt-0.5">
            {item.description}
          </p>
          <button
            type="button"
            onClick={() => fileInputRefs.current[item.type]?.click()}
            disabled={isUploading}
            className="mt-2 flex items-center gap-2 px-4 py-2.5 rounded-[8px] text-xs font-montserrat font-medium transition-colors disabled:opacity-50 min-h-[44px] w-full sm:w-auto justify-center"
            style={{ backgroundColor: '#d3a971', color: '#132236' }}
          >
            {isUploading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload size={14} />
                Upload
              </>
            )}
          </button>
          <input
            ref={el => { fileInputRefs.current[item.type] = el; }}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.heic"
            capture="environment"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) handleUpload(item.type, f);
              e.target.value = '';
            }}
          />
        </div>
      )}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
