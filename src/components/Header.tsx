import Link from 'next/link';
import { LogoAltis } from './LogoAltis';
import { UserMenu } from './auth/UserMenu';

export function Header({ rightSlot }: { rightSlot?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/60 bg-background/95 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <Link href="/" className="flex items-center gap-3 hover:opacity-80">
        <LogoAltis size={36} />
        <span className="text-xl font-bold tracking-tight">AltisGo</span>
      </Link>
      <nav className="flex items-center gap-2">
        {rightSlot}
        <UserMenu />
      </nav>
    </header>
  );
}
