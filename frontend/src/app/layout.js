import type { Metadata } from 'next';
import { Syne, Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import './globals.css';

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700', '800'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
});

export const metadata: Metadata = {
  title: 'Cricket Platform — Local Tournament Management',
  description: 'Manage local and gully cricket tournaments with live scoring, stats, and leaderboards.',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${syne.variable} ${inter.variable} font-body bg-ink-900 text-white antialiased`}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: '#1a2232',
              color: '#e2e8f0',
              border: '1px solid #2d3a50',
              borderRadius: '10px',
              fontSize: '14px',
            },
            success: {
              iconTheme: { primary: '#00d45a', secondary: '#1a2232' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#1a2232' },
            },
          }}
        />
      </body>
    </html>
  );
}
