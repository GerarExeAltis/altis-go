import Link from 'next/link';
import { LogoAltis } from './LogoAltis';
import { ThemeToggle } from './theme/ThemeToggle';

export function Header({ rightSlot }: { rightSlot?: React.ReactNode }) {
  return (
    <header className="flex items-center justify-between border-b bg-background px-6 py-3">
      <Link href="/" className="flex items-center gap-3 hover:opacity-80">
        <LogoAltis size={36} />
        <span className="text-xl font-bold tracking-tight">Altis Bet</span>
      </Link>
      <nav className="flex items-center gap-2">
        {rightSlot}
        <ThemeToggle />
      </nav>
    </header>
  );
}
