'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState<string>('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetch('/api/workspace')
        .then((res) => res.json())
        .then((data) => {
          if (data?.data?.name) {
            setWorkspaceName(data.data.name);
          }
        })
        .catch(() => {});
    }
  }, [session]);

  const userRole = (session?.user as any)?.role || 'VIEWER';
  const userName = session?.user?.name || session?.user?.email || 'User';

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Persistent Sidebar */}
      <div className="hidden lg:block h-full">
        <Sidebar workspaceName={workspaceName} />
      </div>

      {/* Mobile Drawer Navigation Backdrop */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transform lg:hidden transition-transform duration-150 ease-out ${
          mobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar workspaceName={workspaceName} onCloseMobile={() => setMobileDrawerOpen(false)} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 bg-surface/95 border-b border-border flex items-center justify-between px-4 lg:px-8 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="lg:hidden p-1.5 -ml-1 text-secondary hover:text-primary rounded-badge focus:outline-none focus:ring-2 focus:ring-accent"
              onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
              aria-label="Toggle navigation menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            {workspaceName && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-secondary">{workspaceName}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-right">
              <span className="text-xs font-medium text-primary">{userName}</span>
              <Badge type="role" value={userRole} />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-xs"
            >
              Sign out
            </Button>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 overflow-y-auto p-5 sm:p-7 lg:p-10">
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
};
