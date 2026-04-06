import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';
import { ToastProviderWrapper } from '@/components/providers/ToastProviderWrapper';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { SWRProvider } from '@/lib/swr-config';

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
    apple: '/icons/apple-touch-icon.png',
  },
  robots: {
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
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Apple PWA meta tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Licona Realty" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />

        {/* Apple splash screens - portrait iPhones */}
        <link
          rel="apple-touch-startup-image"
          href="/splash/iphone-16-pro-max.png"
          media="(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/iphone-16-pro.png"
          media="(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/iphone-16.png"
          media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/iphone-se.png"
          media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />

        {/* Apple splash screens - iPads portrait */}
        <link
          rel="apple-touch-startup-image"
          href="/splash/ipad-pro-12.9.png"
          media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/ipad-pro-11.png"
          media="(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/ipad-air.png"
          media="(device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />

        {/* Apple splash screens - iPads landscape */}
        <link
          rel="apple-touch-startup-image"
          href="/splash/ipad-pro-12.9-landscape.png"
          media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/ipad-pro-11-landscape.png"
          media="(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/ipad-air-landscape.png"
          media="(device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)"
        />

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
          <SWRProvider>
            <ToastProviderWrapper>{children}</ToastProviderWrapper>
          </SWRProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
