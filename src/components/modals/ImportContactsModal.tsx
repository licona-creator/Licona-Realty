'use client';

import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from 'react';
import { Upload, FileSpreadsheet, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

interface ImportContactsModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
  return lines.map((line) => line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, '')));
}

export function ImportContactsModal({ open, onClose, onSuccess }: ImportContactsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][] | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleFile = useCallback((selected: File) => {
    setFile(selected);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        const rows = parseCSV(text);
        setPreview(rows.slice(0, 4)); // header + first 3 data rows
      }
    };
    reader.readAsText(selected);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);

      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFile(dropped);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) handleFile(selected);
    },
    [handleFile]
  );

  const clearFile = useCallback(() => {
    setFile(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const handleImport = useCallback(async () => {
    if (!file) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/contacts/import', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || 'Import failed');
      }

      const data = await res.json();
      const count = data.count ?? 0;

      toast.success('Import Successful', `${count} contact${count !== 1 ? 's' : ''} imported.`);
      onSuccess?.();
      onClose();
      clearFile();
    } catch (err) {
      toast.error('Import Failed', err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }, [file, toast, onSuccess, onClose, clearFile]);

  return (
    <Modal open={open} onClose={onClose} title="Import Contacts" size="lg">
      <div className="space-y-4">
        {/* File Upload Zone */}
        {!file ? (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => inputRef.current?.click()}
            className={`
              flex flex-col items-center justify-center gap-3 p-8 cursor-pointer
              border-2 border-dashed rounded-[8px] transition-colors duration-200
              ${
                dragOver
                  ? 'border-gold/60 bg-gold/5'
                  : 'border-gold/30 hover:border-gold/60'
              }
            `}
          >
            <Upload size={32} className="text-gold/60" />
            <div className="text-center">
              <p className="font-montserrat font-semibold text-sm text-navy dark:text-white">
                Drop your file here or click to browse
              </p>
              <p className="font-inter text-xs text-navy/50 dark:text-white/50 mt-1">
                Supports CSV and XLSX files
              </p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx"
              onChange={handleInputChange}
              className="hidden"
            />
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 p-3 bg-gold/5 border border-gold/15 rounded-[8px]">
            <div className="flex items-center gap-2 min-w-0">
              <FileSpreadsheet size={20} className="text-gold flex-shrink-0" />
              <span className="font-inter text-sm text-navy dark:text-white truncate">
                {file.name}
              </span>
            </div>
            <button
              onClick={clearFile}
              className="p-1 rounded-md text-navy/30 dark:text-white/30 hover:text-navy/60 dark:hover:text-white/60 hover:bg-gold/10 transition-colors flex-shrink-0"
              aria-label="Remove file"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Preview Table */}
        {preview && preview.length > 0 && (
          <div className="space-y-2">
            <p className="font-montserrat font-semibold text-xs text-navy dark:text-white">
              Preview
            </p>
            <div className="overflow-x-auto rounded-[8px] border border-gold/15">
              <table className="w-full text-xs font-inter">
                <thead>
                  <tr className="bg-navy/5 dark:bg-white/5">
                    {preview[0].map((header, i) => (
                      <th
                        key={i}
                        className="px-3 py-2 text-left font-semibold text-navy dark:text-white whitespace-nowrap"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(1).map((row, rowIdx) => (
                    <tr
                      key={rowIdx}
                      className="border-t border-gold/10"
                    >
                      {row.map((cell, cellIdx) => (
                        <td
                          key={cellIdx}
                          className="px-3 py-1.5 text-navy/70 dark:text-white/70 whitespace-nowrap"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="accent"
            size="sm"
            onClick={handleImport}
            loading={loading}
            disabled={!file}
          >
            Import Contacts
          </Button>
        </div>
      </div>
    </Modal>
  );
}
