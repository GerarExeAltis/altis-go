import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Altis Bet',
  description: 'Plataforma de jogos com premiação — Altis Sistemas',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
