import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import { AdminProvider } from '@/contexts/AdminContext';
import { TotemKioskGuard } from '@/components/totem/TotemKioskGuard';
import '@/sentry.client.config';
import './globals.css';

export const metadata: Metadata = {
  title: 'AltisGo',
  description: 'Plataforma de jogos com premiação — Altis Sistemas',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <ThemeProvider>
          <AuthProvider>
            <AdminProvider>
              <TotemKioskGuard />
              {children}
            </AdminProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
