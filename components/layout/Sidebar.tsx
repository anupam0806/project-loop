'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  HomeIcon,
  InboxIcon,
  TagIcon,
  SparklesIcon,
  DocumentChartBarIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
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
      icon: <HomeIcon className="w-4 h-4" aria-hidden="true" />,
    },
    {
      label: 'Feedback',
      href: '/feedback',
      icon: <InboxIcon className="w-4 h-4" aria-hidden="true" />,
    },
    {
      label: 'Themes',
      href: '/themes',
      icon: <TagIcon className="w-4 h-4" aria-hidden="true" />,
    },
    {
      label: 'Ask LOOP',
      href: '/ask',
      icon: <SparklesIcon className="w-4 h-4" aria-hidden="true" />,
    },
    {
      label: 'Reports',
      href: '/reports',
      icon: <DocumentChartBarIcon className="w-4 h-4" aria-hidden="true" />,
    },
    {
      label: 'Settings',
      href: '/settings',
      icon: <Cog6ToothIcon className="w-4 h-4" aria-hidden="true" />,
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

export default Sidebar;
