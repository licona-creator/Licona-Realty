/**
 * Database Setup Page
 *
 * Guides the user through setting up their Supabase database.
 * Shows migration SQL that needs to be pasted into the Supabase SQL Editor.
 */

'use client';

import { useState, useEffect } from 'react';
import { BRAND } from '@/lib/brand';

type SetupStatus = 'checking' | 'not_setup' | 'ready' | 'error';

export default function SetupPage() {
  const [status, setStatus] = useState<SetupStatus>('checking');
  const [migrationSQL, setMigrationSQL] = useState('');
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    checkStatus();
    loadMigration();
  }, []);

  async function checkStatus() {
    try {
      const res = await fetch('/api/setup');
      const data = await res.json();
      setStatus(data.status as SetupStatus);
    } catch {
      setStatus('error');
    }
  }

  async function loadMigration() {
    try {
      const res = await fetch('/api/setup/migration-sql');
      if (res.ok) {
        const data = await res.json();
        setMigrationSQL(data.sql);
      }
    } catch {
      // Will show manual instructions instead
    }
  }

  async function copyToClipboard() {
    if (migrationSQL) {
      await navigator.clipboard.writeText(migrationSQL);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  }

  if (status === 'ready') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4" style={{ fontFamily: BRAND.fonts.montserrat }}>
        <div className="max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: BRAND.fonts.playfair, color: BRAND.colors.navy }}>
            Database Ready!
          </h1>
          <p className="text-gray-600 mb-6" style={{ fontFamily: BRAND.fonts.inter }}>
            Your Licona Realty platform database is set up and ready to go.
          </p>
          <a
            href="/auth/register"
            className="inline-block px-6 py-3 rounded-lg text-white font-medium transition-colors"
            style={{ backgroundColor: BRAND.colors.navy }}
          >
            Create Your Account →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: BRAND.fonts.montserrat }}>
      <div className="max-w-3xl mx-auto p-6 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1
            className="text-3xl font-bold mb-2"
            style={{ fontFamily: BRAND.fonts.playfair, color: BRAND.colors.navy }}
          >
            Licona Realty Platform Setup
          </h1>
          <p className="text-gray-500" style={{ fontFamily: BRAND.fonts.inter }}>
            One-time database setup - takes about 2 minutes
          </p>
        </div>

        {/* Status Banner */}
        {status === 'checking' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-center">
            <p className="text-blue-700" style={{ fontFamily: BRAND.fonts.inter }}>
              Checking database status...
            </p>
          </div>
        )}
        {status === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700 font-medium">Cannot connect to Supabase</p>
            <p className="text-red-600 text-sm mt-1" style={{ fontFamily: BRAND.fonts.inter }}>
              Check that your .env.local file has the correct Supabase URL and keys.
            </p>
          </div>
        )}

        {/* Steps */}
        <div className="space-y-4">
          {/* Step 1 */}
          <div
            className={`bg-white rounded-xl border-2 p-6 transition-colors ${
              step === 1 ? 'border-[#d3a971]' : 'border-gray-100'
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                style={{ backgroundColor: step >= 1 ? BRAND.colors.gold : '#ddd' }}
              >
                1
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg" style={{ color: BRAND.colors.navy }}>
                  Open Supabase SQL Editor
                </h3>
                <p className="text-gray-500 text-sm mt-1" style={{ fontFamily: BRAND.fonts.inter }}>
                  Go to your Supabase project dashboard and click <strong>"SQL Editor"</strong> in the left sidebar.
                </p>
                <a
                  href="https://supabase.com/dashboard/project/raoksgahyqoaxdudsiux/sql"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-3 px-4 py-2 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90"
                  style={{ backgroundColor: BRAND.colors.navy }}
                  onClick={() => setStep(2)}
                >
                  Open SQL Editor →
                </a>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div
            className={`bg-white rounded-xl border-2 p-6 transition-colors ${
              step === 2 ? 'border-[#d3a971]' : 'border-gray-100'
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                style={{ backgroundColor: step >= 2 ? BRAND.colors.gold : '#ddd' }}
              >
                2
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg" style={{ color: BRAND.colors.navy }}>
                  Copy & Run the Migration SQL
                </h3>
                <p className="text-gray-500 text-sm mt-1 mb-3" style={{ fontFamily: BRAND.fonts.inter }}>
                  Click the button below to copy the SQL, then paste it into the Supabase SQL Editor and click <strong>"Run"</strong>.
                </p>
                {migrationSQL ? (
                  <div>
                    <button
                      onClick={() => { copyToClipboard(); setStep(3); }}
                      className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90"
                      style={{ backgroundColor: copied ? '#22c55e' : BRAND.colors.gold }}
                    >
                      {copied ? '✓ Copied to Clipboard!' : 'Copy All Migration SQL'}
                    </button>
                    <details className="mt-3">
                      <summary className="text-xs text-gray-400 cursor-pointer" style={{ fontFamily: BRAND.fonts.inter }}>
                        Preview SQL ({migrationSQL.split('\n').length} lines)
                      </summary>
                      <pre className="mt-2 p-3 bg-gray-900 text-green-400 text-xs rounded-lg overflow-auto max-h-64" style={{ fontFamily: 'monospace' }}>
                        {migrationSQL}
                      </pre>
                    </details>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500" style={{ fontFamily: BRAND.fonts.inter }}>
                    <p>Open these files and copy their contents into the SQL Editor (run them one at a time):</p>
                    <ol className="list-decimal ml-5 mt-2 space-y-1">
                      <li><code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">supabase/migrations/001_initial_schema.sql</code></li>
                      <li><code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">supabase/migrations/002_storage_buckets.sql</code></li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div
            className={`bg-white rounded-xl border-2 p-6 transition-colors ${
              step === 3 ? 'border-[#d3a971]' : 'border-gray-100'
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                style={{ backgroundColor: step >= 3 ? BRAND.colors.gold : '#ddd' }}
              >
                3
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg" style={{ color: BRAND.colors.navy }}>
                  Verify & Create Account
                </h3>
                <p className="text-gray-500 text-sm mt-1 mb-3" style={{ fontFamily: BRAND.fonts.inter }}>
                  After running the SQL successfully, click below to check and continue.
                </p>
                <button
                  onClick={() => { checkStatus(); }}
                  className="px-4 py-2 rounded-lg text-sm font-medium border-2 transition-colors hover:bg-gray-50"
                  style={{ borderColor: BRAND.colors.navy, color: BRAND.colors.navy }}
                >
                  Check Database Status
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400" style={{ fontFamily: BRAND.fonts.inter }}>
            This setup only needs to be done once. After completion, this page will redirect to account creation.
          </p>
        </div>
      </div>
    </div>
  );
}
