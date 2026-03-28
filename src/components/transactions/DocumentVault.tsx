'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  getDocumentChecklist,
  calculateDocumentProgress,
  DOCUMENT_CATEGORIES,
} from '@/lib/documents/texas-checklist';
import type { DocumentRequirement, TransactionDocument, DocumentProgress } from '@/lib/documents/texas-checklist';
import {
  FileArchive, Upload, Download, Trash2, ChevronDown, ChevronRight,
  FileText, DollarSign, AlertCircle, Search, Shield, CheckSquare, UserCheck,
  Loader2,
} from 'lucide-react';

const CATEGORY_ICONS: Record<string, typeof FileText> = {
  FileText, DollarSign, AlertCircle, Search, Shield, CheckSquare, UserCheck,
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
}

export function DocumentVault({ transactionId, trackType }: DocumentVaultProps) {
  const toast = useToast();
  const [documents, setDocuments] = useState<TransactionDocument[]>([]);
  const [checklist, setChecklist] = useState<DocumentRequirement[]>([]);
  const [progress, setProgress] = useState<DocumentProgress>({ total: 0, uploaded: 0, signed: 0, pending: 0, missing: 0, percentComplete: 0 });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [statusDropdown, setStatusDropdown] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch(`/api/transactions/${transactionId}/documents`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setDocuments(data.documents || []);
      setChecklist(data.checklist || getDocumentChecklist(trackType));
      setProgress(data.progress || calculateDocumentProgress(data.documents || [], data.checklist || []));
    } catch {
      toast.error('Error', 'Failed to load documents.');
    } finally {
      setLoading(false);
    }
  }, [transactionId, trackType, toast]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const handleUpload = useCallback(async (documentType: string, file: File) => {
    setUploading(prev => ({ ...prev, [documentType]: true }));
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

      toast.success('Uploaded', `${file.name} uploaded successfully.`);
      await fetchDocuments();
    } catch (err) {
      toast.error('Upload Failed', err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setUploading(prev => ({ ...prev, [documentType]: false }));
    }
  }, [transactionId, fetchDocuments, toast]);

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
      toast.error('Error', 'Failed to update status.');
    }
  }, [transactionId, fetchDocuments, toast]);

  const handleDownload = useCallback(async (docId: string) => {
    try {
      const res = await fetch(`/api/transactions/${transactionId}/documents/${docId}/download`);
      if (!res.ok) throw new Error('Failed to get download URL');
      const data = await res.json();
      window.open(data.url, '_blank');
    } catch {
      toast.error('Error', 'Failed to download file.');
    }
  }, [transactionId, toast]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/transactions/${transactionId}/documents/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Deleted', 'Document removed.');
      setDeleteTarget(null);
      await fetchDocuments();
    } catch {
      toast.error('Error', 'Failed to delete document.');
      setDeleteTarget(null);
    }
  }, [transactionId, deleteTarget, fetchDocuments, toast]);

  // Group checklist by category
  const categories = checklist.reduce<Record<string, DocumentRequirement[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const requiredCount = checklist.filter(c => c.required).length;
  const optionalCount = checklist.length - requiredCount;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={20} className="animate-spin text-gold" />
        <span className="ml-2 text-sm text-navy/50 dark:text-white/50 font-inter">Loading documents...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          <FileArchive size={16} className="text-gold" />
          <h3 className="text-sm font-montserrat font-semibold text-navy/70 dark:text-white/70">
            Document Vault
          </h3>
        </div>

        {/* Progress bar */}
        <div className="w-full h-3 bg-navy/10 dark:bg-white/10 rounded-full overflow-hidden mb-2">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress.percentComplete}%`, backgroundColor: '#d3a971' }}
          />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-navy/60 dark:text-white/60 font-inter">
            {progress.uploaded} of {progress.total} documents collected ({progress.percentComplete}%)
          </p>
          <p className="text-[10px] text-navy/40 dark:text-white/40 font-inter">
            {requiredCount} required, {optionalCount} optional
          </p>
        </div>
      </div>

      {/* Category Sections */}
      <div className="space-y-2">
        {Object.entries(DOCUMENT_CATEGORIES).map(([catKey, catMeta]) => {
          const items = categories[catKey];
          if (!items || items.length === 0) return null;

          const isExpanded = expandedCategory === catKey;
          const IconComp = CATEGORY_ICONS[catMeta.icon] || FileText;
          const catUploaded = items.filter(item => documents.some(d => d.document_type === item.type)).length;

          return (
            <div key={catKey} className="border border-gold/10 rounded-[8px] overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => setExpandedCategory(isExpanded ? null : catKey)}
                className="w-full flex items-center gap-3 p-3 hover:bg-surface dark:hover:bg-navy/30 transition-colors min-h-[44px]"
              >
                <IconComp size={14} className="text-gold flex-shrink-0" />
                <span className="text-sm font-montserrat font-medium text-navy dark:text-white flex-1 text-left">
                  {catMeta.label}
                </span>
                <span className="text-xs text-navy/40 dark:text-white/40 font-inter mr-2">
                  {catUploaded}/{items.length}
                </span>
                {isExpanded ? (
                  <ChevronDown size={14} className="text-navy/30 dark:text-white/30" />
                ) : (
                  <ChevronRight size={14} className="text-navy/30 dark:text-white/30" />
                )}
              </button>

              {/* Category Items */}
              {isExpanded && (
                <div className="border-t border-gold/10">
                  {items.map(item => {
                    const doc = documents.find(d => d.document_type === item.type);
                    const isUploading = uploading[item.type];

                    return (
                      <div
                        key={item.type}
                        className="p-3 border-b border-gold/5 last:border-b-0"
                      >
                        {doc ? (
                          /* Uploaded Document Row */
                          <div>
                            <div className="flex items-start gap-2 flex-wrap">
                              <span className="text-sm font-inter text-navy dark:text-white flex-1 min-w-0">
                                {item.label}
                              </span>
                              {/* Status Badge */}
                              <div className="relative">
                                <button
                                  onClick={() => setStatusDropdown(statusDropdown === doc.id ? null : doc.id)}
                                  className={`text-[10px] font-montserrat font-semibold px-2 py-0.5 rounded-full min-h-[28px] flex items-center ${STATUS_STYLES[doc.status]?.bg || ''} ${STATUS_STYLES[doc.status]?.text || ''}`}
                                >
                                  {STATUS_STYLES[doc.status]?.label || doc.status}
                                </button>
                                {statusDropdown === doc.id && (
                                  <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-dark-card border border-gold/15 rounded-[8px] shadow-lg py-1 min-w-[120px]">
                                    {STATUS_ORDER.map(s => (
                                      <button
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
                                {new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                              {doc.signed_at && (
                                <span className="text-[10px] text-green-600 font-inter">
                                  Signed {new Date(doc.signed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                            </div>
                            {/* Actions */}
                            <div className="flex items-center gap-2 mt-2">
                              <button
                                onClick={() => handleDownload(doc.id)}
                                className="p-2 rounded-[8px] bg-gold/10 text-gold hover:bg-gold/20 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                                title="Download"
                              >
                                <Download size={14} />
                              </button>
                              <button
                                onClick={() => setDeleteTarget({ id: doc.id, name: doc.document_name })}
                                className="p-2 rounded-[8px] bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                              {/* Re-upload button */}
                              <button
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
                              <span className="text-sm font-inter text-navy dark:text-white flex-1 min-w-0">
                                {item.label}
                              </span>
                              <span className={`text-[10px] font-montserrat font-semibold px-2 py-0.5 rounded-full ${item.required ? 'bg-red-500/10 text-red-500' : 'bg-navy/5 dark:bg-white/5 text-navy/40 dark:text-white/40'}`}>
                                {item.required ? 'Required' : 'Optional'}
                              </span>
                            </div>
                            <p className="text-xs text-navy/40 dark:text-white/40 font-inter mt-0.5">
                              {item.description}
                            </p>
                            <button
                              onClick={() => fileInputRefs.current[item.type]?.click()}
                              disabled={isUploading}
                              className="mt-2 flex items-center gap-2 px-4 py-2.5 rounded-[8px] border border-gold/30 text-gold font-montserrat text-xs font-medium hover:bg-gold/5 transition-colors disabled:opacity-50 min-h-[44px] w-full sm:w-auto justify-center"
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
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
