import Image from 'next/image';
import { LoginForm } from '@/components/auth/LoginForm';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Image
            src="/altis-bet-logo.png"
            alt="Altis Bet"
            width={240}
            height={80}
            priority
            className="h-auto w-auto max-w-[240px]"
          />
          <p className="text-sm text-muted-foreground">Entre com sua conta de operador</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
