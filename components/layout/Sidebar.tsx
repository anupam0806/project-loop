'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps { onCloseMobile?: () => void; }

const navItems = [
  ['Dashboard', '/dashboard', '▦'],
  ['Feedback', '/feedback', '◌'],
  ['Themes', '/themes', '#'],
  ['Ask LOOP', '/ask', '✦'],
  ['Reports', '/reports', '▤'],
];

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile }) => {
  const pathname = usePathname();
  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-surface">
      <div className="flex h-16 items-center border-b border-border px-5">
        <Link href="/dashboard" className="flex items-center gap-3" onClick={onCloseMobile}>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white shadow-sm">L</span>
          <span className="text-[15px] font-semibold tracking-tight text-primary">Project LOOP</span>
        </Link>
      </div>
      <div className="border-b border-border px-4 py-4">
        <p className="eyebrow mb-2">Workspace</p>
        <button className="flex w-full items-center justify-between rounded-badge border border-border bg-surface-muted px-3 py-2 text-left text-sm font-medium text-primary hover:border-accent/40" type="button">
          <span>Acme Product</span><span className="text-secondary">⌄</span>
        </button>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-5" aria-label="Main navigation">
        <p className="eyebrow px-3 pb-2">Workspace</p>
        {navItems.map(([label, href, icon]) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return <Link key={href} href={href} onClick={onCloseMobile} className={`transition-ui flex items-center gap-3 rounded-badge px-3 py-2.5 text-sm font-medium ${active ? 'bg-accent-soft text-accent' : 'text-secondary hover:bg-surface-muted hover:text-primary'}`}><span className="w-5 text-center text-base">{icon}</span><span>{label}</span>{label === 'Ask LOOP' && <span className="ml-auto rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-bold text-white">AI</span>}</Link>;
        })}
        <p className="eyebrow px-3 pb-2 pt-7">Manage</p>
        <Link href="/settings" onClick={onCloseMobile} className={`transition-ui flex items-center gap-3 rounded-badge px-3 py-2.5 text-sm font-medium ${pathname.startsWith('/settings') ? 'bg-accent-soft text-accent' : 'text-secondary hover:bg-surface-muted hover:text-primary'}`}><span className="w-5 text-center text-base">⚙</span><span>Settings</span></Link>
      </nav>
      <div className="border-t border-border p-4"><div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">AP</div><div className="min-w-0"><p className="truncate text-sm font-medium text-primary">Alex Patel</p><p className="text-xs text-secondary">Product team</p></div></div></div>
    </aside>
  );
};

export default Sidebar;
