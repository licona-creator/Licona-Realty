'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Users, FileText, Handshake, Loader2 } from 'lucide-react';
import { BRAND } from '@/lib/brand';
import { getDisplayName } from '@/lib/format';

interface ContactResult {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
}

interface TransactionResult {
  id: string;
  property_address: string;
  status: string | null;
}

interface PartnerResult {
  id: string;
  first_name: string;
  last_name: string;
  company: string | null;
}

interface SearchResults {
  contacts: ContactResult[];
  transactions: TransactionResult[];
  partners: PartnerResult[];
}

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const open = useCallback(() => {
    setIsOpen(true);
    setQuery('');
    setResults(null);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setResults(null);
  }, []);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          close();
        } else {
          open();
        }
      }
      if (e.key === 'Escape' && isOpen) {
        close();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, open, close]);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!query.trim()) {
      setResults(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data: SearchResults = await res.json();
          setResults(data);
        }
      } catch {
        // Silently handle fetch errors
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  function navigateTo(path: string) {
    close();
    router.push(path);
  }

  const hasResults =
    results &&
    (results.contacts.length > 0 ||
      results.transactions.length > 0 ||
      results.partners.length > 0);

  const noResults = results && !hasResults && query.trim().length > 0;

  if (!isOpen) {
    return (
      <button
        onClick={open}
        aria-label="Open search"
        className="p-2 rounded-lg transition-colors hover:bg-white/10"
        style={{ color: BRAND.colors.gold }}
      >
        <Search size={20} />
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="w-full h-full flex flex-col bg-[var(--lr-depth-1)]
          min-[430px]:h-auto min-[430px]:mt-[15vh] min-[430px]:mx-4 min-[430px]:max-w-xl min-[430px]:rounded-xl min-[430px]:shadow-2xl"
      >
        {/* Search input */}
        <div
          className="flex items-center gap-3 px-4 py-3 border-b"
          style={{ borderColor: BRAND.colors.gold + '30' }}
        >
          <Search size={20} style={{ color: BRAND.colors.gold }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search contacts, deals, partners..."
            className="flex-1 text-base outline-none bg-transparent"
            style={{
              color: BRAND.colors.text,
              fontFamily: BRAND.fonts.inter,
            }}
          />
          {isLoading && (
            <Loader2
              size={18}
              className="animate-spin"
              style={{ color: BRAND.colors.gold }}
            />
          )}
          <button
            onClick={close}
            aria-label="Close search"
            className="p-1 rounded-md transition-colors hover:bg-white/10"
          >
            <X size={18} className="text-white/60" />
          </button>
        </div>

        {/* Results */}
        <div
          className="flex-1 overflow-y-auto px-2 py-2"
          style={{ maxHeight: 'calc(100vh - 60px)' }}
        >
          {/* Contacts section */}
          {results && results.contacts.length > 0 && (
            <ResultSection
              title="Contacts"
              icon={<Users size={16} style={{ color: BRAND.colors.gold }} />}
            >
              {results.contacts.map((contact) => (
                <ResultItem
                  key={contact.id}
                  onClick={() => navigateTo(`/contacts/${contact.id}`)}
                  primary={getDisplayName(contact)}
                  secondary={contact.email || contact.phone || ''}
                />
              ))}
            </ResultSection>
          )}

          {/* Transactions section */}
          {results && results.transactions.length > 0 && (
            <ResultSection
              title="Deals"
              icon={<FileText size={16} style={{ color: BRAND.colors.gold }} />}
            >
              {results.transactions.map((tx) => (
                <ResultItem
                  key={tx.id}
                  onClick={() => navigateTo(`/transactions/${tx.id}`)}
                  primary={tx.property_address}
                  secondary={tx.status || ''}
                />
              ))}
            </ResultSection>
          )}

          {/* Partners section */}
          {results && results.partners.length > 0 && (
            <ResultSection
              title="Partners"
              icon={<Handshake size={16} style={{ color: BRAND.colors.gold }} />}
            >
              {results.partners.map((partner) => (
                <ResultItem
                  key={partner.id}
                  onClick={() => navigateTo(`/partners/${partner.id}`)}
                  primary={getDisplayName(partner)}
                  secondary={partner.company || ''}
                />
              ))}
            </ResultSection>
          )}

          {/* No results */}
          {noResults && !isLoading && (
            <div className="text-center py-8" style={{ color: '#6b7280' }}>
              <Search size={32} className="mx-auto mb-2 opacity-40" />
              <p style={{ fontFamily: BRAND.fonts.inter }}>
                No results found for &quot;{query}&quot;
              </p>
            </div>
          )}

          {/* Initial state */}
          {!results && !isLoading && (
            <div
              className="text-center py-8 text-sm"
              style={{ color: '#9ca3af', fontFamily: BRAND.fonts.inter }}
            >
              <p>Start typing to search</p>
              <p className="mt-1 text-xs opacity-60">
                Tip: Use Cmd+K or Ctrl+K to open search
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-2">
      <div
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide"
        style={{
          color: BRAND.colors.gold,
          fontFamily: BRAND.fonts.montserrat,
        }}
      >
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function ResultItem({
  onClick,
  primary,
  secondary,
}: {
  onClick: () => void;
  primary: string;
  secondary: string;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2.5 rounded-lg transition-colors hover:bg-white/5 flex flex-col gap-0.5"
    >
      <span
        className="text-sm font-medium truncate text-white"
        style={{
          fontFamily: BRAND.fonts.inter,
        }}
      >
        {primary}
      </span>
      {secondary && (
        <span
          className="text-xs truncate"
          style={{ color: '#6b7280', fontFamily: BRAND.fonts.inter }}
        >
          {secondary}
        </span>
      )}
    </button>
  );
}
