import Image from 'next/image';
import { cn } from '@/lib/utils';

export function LogoAltis({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/logo.svg"
      alt="Altis Sistemas"
      width={size}
      height={size}
      className={cn('select-none', className)}
      priority
    />
  );
}
