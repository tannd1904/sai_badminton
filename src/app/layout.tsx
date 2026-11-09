import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { Navbar } from '@/components/Navbar';
import { AnnouncementBanner } from '@/components/AnnouncementBanner';

export const metadata: Metadata = {
  title: 'SAI Badminton Championship 2024 | Management System',
  description: 'Enterprise Badminton Tournament Live Scoring & Conflict-Free Schedule Management for SAI Digital',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="court-bg min-h-screen text-slate-100 antialiased selection:bg-sai-cyan selection:text-slate-950">
        <Providers>
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <AnnouncementBanner />
            <main className="flex-1 pb-16">{children}</main>
            <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
              <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
                <span>© 2024 SAI Digital - Badminton Championship System (SAI-BCS)</span>
                <span className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  Realtime Core powered by Redis Pub/Sub & WebSocket
                </span>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
