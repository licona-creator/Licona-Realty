import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';
import { ToastProviderWrapper } from '@/components/providers/ToastProviderWrapper';
import { ThemeProvider } from '@/components/providers/ThemeProvider';

export const metadata: Metadata = {
  title: 'Licona Realty Platform',
  description:
    'Smart Moves. Simple Decisions. Real estate CRM and business operating system for Anthony Licona, North Texas Realtor\u00AE.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Licona Realty',
  },
  icons: {
    icon: '/icons/icon-192x192.png',
    apple: '/icons/icon-192x192.png',
  },
  robots: {
    // CRM pages are never indexed
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#132236',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* PWA meta tags for iPhone home screen install */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Licona Realty" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />

        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </head>
      <body className="font-inter antialiased">
        <ThemeProvider>
          <ToastProviderWrapper>{children}</ToastProviderWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
