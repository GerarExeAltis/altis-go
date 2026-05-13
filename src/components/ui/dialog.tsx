'use client';
import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface DialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open || !mounted) return null;

  // Portal para document.body — evita herdar stacking context de ancestrais
  // com filter/backdrop-blur/transform (caso do Header sticky), que fazem
  // position:fixed ficar relativo ao pai e colar o modal no topo.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm animate-in fade-in"
      onClick={(e) => e.currentTarget === e.target && onOpenChange(false)}
      onKeyDown={(e) => e.key === 'Escape' && onOpenChange(false)}
    >
      {children}
    </div>,
    document.body
  );
}

export function DialogContent({
  className, children, onClose,
}: {
  className?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className={cn(
        'relative w-full max-w-md rounded-lg border border-border/60 bg-background p-6 shadow-2xl animate-in fade-in',
        className
      )}
    >
      <button
        type="button"
        aria-label="Fechar"
        className="absolute right-4 top-4 rounded-sm text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={onClose}
      >
        <X className="h-4 w-4" />
      </button>
      {children}
    </div>
  );
}

export function DialogHeader({ children }: { children: React.ReactNode }) {
  return <div className="mb-4 flex flex-col space-y-1.5">{children}</div>;
}

export function DialogTitle({
  children, className,
}: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={cn('text-lg font-semibold leading-none tracking-tight', className)}>
      {children}
    </h2>
  );
}

export function DialogDescription({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
