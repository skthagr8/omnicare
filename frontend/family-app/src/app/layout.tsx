import type { Metadata } from 'next';
import { Fraunces, Quicksand } from 'next/font/google';
import './globals.css';

const display = Fraunces({ subsets: ['latin'], variable: '--font-display', style: ['normal', 'italic'] });
const body = Quicksand({ subsets: ['latin'], variable: '--font-body' });

export const metadata: Metadata = {
  title: 'OmniCare Family',
  description: 'Care plans, health updates and visit reports for families.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
