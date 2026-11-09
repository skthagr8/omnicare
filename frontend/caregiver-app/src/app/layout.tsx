import type { Metadata, Viewport } from 'next';
import { Fraunces, Quicksand } from 'next/font/google';
import './globals.css';
import { MobileLayout, OfflineBanner } from '../components/layout/Layout';

const display = Fraunces({ subsets: ['latin'], variable: '--font-display', style: ['normal', 'italic'] });
const body = Quicksand({ subsets: ['latin'], variable: '--font-body' });

export const metadata: Metadata = {
  title: 'OmniCare Caregiver',
  description: 'Caregiver app for OmniCare elderly care management',
  manifest: '/manifest.json',
  themeColor: '#f47b4f',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'OmniCare',
  },
  icons: {
    apple: '/icons/icon-192x192.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="format-detection" content="telephone=yes" />
      </head>
      <body className="bg-cream font-sans antialiased">
        <OfflineBanner />
        <MobileLayout>{children}</MobileLayout>
      </body>
    </html>
  );
}

