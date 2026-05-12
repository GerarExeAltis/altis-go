'use client';
import * as React from 'react';
import { AdminSidebar, type AbaAdmin } from './AdminSidebar';

interface Props {
  abaAtiva: AbaAdmin;
  onAbaChange: (v: AbaAdmin) => void;
  children: React.ReactNode;
}

export function AdminLayout({ abaAtiva, onAbaChange, children }: Props) {
  return (
    <div className="flex min-h-[calc(100vh-65px)]">
      <AdminSidebar abaAtiva={abaAtiva} onChange={onAbaChange} />
      <div className="flex-1 overflow-auto bg-background p-6">{children}</div>
    </div>
  );
}
