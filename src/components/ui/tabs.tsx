'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';

interface TabsCtx {
  value: string;
  onChange: (v: string) => void;
}
const TabsContext = React.createContext<TabsCtx | null>(null);

export function Tabs({
  value, onValueChange, children, className,
}: {
  value: string;
  onValueChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <TabsContext.Provider value={{ value, onChange: onValueChange }}>
      <div className={cn('flex flex-col gap-4', className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex h-10 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground',
        className
      )}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value, children, className,
}: { value: string; children: React.ReactNode; className?: string }) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error('TabsTrigger deve estar dentro de <Tabs>');
  const isActive = ctx.value === value;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => ctx.onChange(value)}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isActive ? 'bg-background text-foreground shadow-sm' : 'hover:bg-background/50',
        className
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value, children, className,
}: { value: string; children: React.ReactNode; className?: string }) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) return null;
  if (ctx.value !== value) return null;
  return <div className={cn('mt-2', className)}>{children}</div>;
}
