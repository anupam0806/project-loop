'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Badge } from '../ui/Badge';

interface SidebarProps {
  onCloseMobile?: () => void;
  workspaceName?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile, workspaceName: propWorkspaceName }) => {
  const pathname = usePathname();
  const { data: session } = useSession();

  const [workspaceName, setWorkspaceName] = useState<string>(propWorkspaceName || '');

  // Keep workspaceName in sync with prop or fetch dynamically from API
  useEffect(() => {
    if (propWorkspaceName) {
      setWorkspaceName(propWorkspaceName);
    } else if (session?.user) {
      fetch('/api/workspace')
        .then((res) => res.json())
        .then((data) => {
          if (data?.data?.name) {
            setWorkspaceName(data.data.name);
          }
        })
        .catch(() => {});
    }
  }, [propWorkspaceName, session]);

  const userRole = (session?.user as any)?.role || 'VIEWER';
  const userName = session?.user?.name || session?.user?.email?.split('@')[0] || 'User';
  const userEmail = session?.user?.email || '';
  const displayWorkspace = workspaceName || (session?.user as any)?.workspaceName || 'Active Workspace';

  const navItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      label: 'Feedback',
      href: '/feedback',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      ),
    },
    {
      label: 'Themes',
      href: '/themes',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
    },
    {
      label: 'Ask LOOP',
      href: '/ask',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      label: 'Reports',
      href: '/reports',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      label: 'Settings',
      href: '/settings',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  return (
    <aside className="w-56 h-full flex flex-col bg-surface border-r border-border select-none">
      {/* Sidebar Header: Brand & Real Active Workspace (No fake dropdowns or hardcoded data) */}
      <div className="h-16 px-4 border-b border-border flex flex-col justify-center">
        <Link
          href="/dashboard"
          onClick={onCloseMobile}
          className="flex items-center gap-2.5 group"
          title="Project LOOP Dashboard"
        >
          <div className="w-7 h-7 rounded-badge bg-accent text-white flex items-center justify-center font-bold text-xs shadow-sm group-hover:opacity-90 transition-opacity shrink-0">
            L
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-sm tracking-tight text-primary block truncate">
              Project LOOP
            </span>
            <span className="text-[11px] text-secondary block truncate font-medium">
              {displayWorkspace}
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-2.5 py-4 space-y-1 overflow-y-auto" aria-label="Main Navigation">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              className={`flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-badge transition-colors ${
                isActive
                  ? 'bg-accent-soft text-accent'
                  : 'text-secondary hover:text-primary hover:bg-gray-100/70'
              }`}
            >
              <span className={isActive ? 'text-accent' : 'text-secondary'}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Footer: Real Logged-in User & Role (Calm UI User Profile) */}
      <div className="p-3 border-t border-border bg-surface">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-badge bg-gray-50/70 border border-border/60">
          <div className="w-7 h-7 rounded-full bg-accent/10 text-accent font-semibold text-xs flex items-center justify-center shrink-0">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <p className="text-xs font-medium text-primary truncate leading-tight">
                {userName}
              </p>
              <Badge type="role" value={userRole} />
            </div>
            {userEmail && (
              <p className="text-[10px] text-secondary truncate mt-0.5" title={userEmail}>
                {userEmail}
              </p>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
