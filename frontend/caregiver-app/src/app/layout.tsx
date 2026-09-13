import type { Metadata, Viewport } from 'next';
import './globals.css';
import MobileLayout from '@/components/layout/MobileLayout';
import OfflineBanner from '@/components/layout/OfflineBanner';

export const metadata: Metadata = {
  title: 'OmniCare Caregiver',
  description: 'Caregiver app for OmniCare elderly care management',
  manifest: '/manifest.json',
  themeColor: '#4F46E5',
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
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="format-detection" content="telephone=yes" />
      </head>
      <body className="bg-gray-50">
        <OfflineBanner />
        <MobileLayout>{children}</MobileLayout>
      </body>
    </html>
  );
}