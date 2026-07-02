import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getLatestVersion } from '@/lib/github';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'NexoralDNS - Technical Documentation',
  description: 'Advanced DNS Management & Surveillance System — Complete documentation for installation, usage, and API reference.',
  keywords: ['DNS', 'NexoralDNS', 'DNS Management', 'Network Security', 'Documentation'],
  icons: {
    icon: [
      { url: '/nexoral-icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: '/nexoral-icon.svg',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const version = await getLatestVersion();
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <div style={{ minHeight: '100vh', background: 'radial-gradient(1000px 560px at 82% -8%,rgba(91,140,255,.11),transparent 60%),radial-gradient(760px 520px at -8% 6%,rgba(52,225,212,.07),transparent 56%),#07090e', color: '#e7eef6' }}>
          <Sidebar />
          <div style={{ marginLeft: 272 }} className="main-content">
            <Header version={version} />
            <main style={{ flex: 1 }}>
              {children}
            </main>
            <Footer />
          </div>
        </div>
        <style>{`
          @media (max-width: 1023px) {
            .main-content { margin-left: 0 !important; padding-top: 60px; }
          }
        `}</style>
      </body>
    </html>
  );
}
