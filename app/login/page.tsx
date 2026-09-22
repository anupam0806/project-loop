'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError('Invalid email or password.');
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm bg-surface border border-border rounded-DEFAULT p-6 shadow-card space-y-5">
        <div className="text-center space-y-1">
          <div className="inline-flex w-8 h-8 rounded-badge bg-accent text-white items-center justify-center font-bold text-sm mx-auto mb-2">
            L
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-primary">Sign in to Project LOOP</h1>
          <p className="mt-1 text-sm leading-6 text-secondary">Enter your credentials to access your workspace</p>
        </div>

        {error && (
          <div
            className="p-3 text-xs bg-red-50 border border-red-200 text-negative rounded-badge flex items-center gap-2"
            role="alert"
          >
            <ExclamationCircleIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          <Button type="submit" variant="primary" className="w-full" loading={loading}>
            Sign in
          </Button>
        </form>

        <div className="p-3 bg-surface-muted border border-border rounded-DEFAULT space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-primary">Demo access</span>
            <button
              type="button"
              onClick={() => {
                setEmail('admin@example.com');
                setPassword('password123');
                setError(null);
              }}
              className="text-accent hover:underline font-medium focus:outline-none"
            >
              Use admin demo
            </button>
          </div>

          <div className="space-y-1.5">
            {[
              { role: 'Admin', email: 'admin@example.com', password: 'password123' },
              { role: 'Analyst', email: 'analyst@example.com', password: 'password123' },
              { role: 'Viewer', email: 'viewer@example.com', password: 'password123' },
            ].map((acc) => (
              <button
                key={acc.role}
                type="button"
                onClick={() => {
                  setEmail(acc.email);
                  setPassword(acc.password);
                  setError(null);
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-badge bg-surface border border-border hover:border-accent/40 text-left transition-colors focus:outline-none focus:ring-1 focus:ring-accent"
                title={`Click to fill ${acc.role} credentials`}
              >
                <span className="text-secondary">
                  <span className="font-medium text-primary">{acc.role}:</span> {acc.email}
                </span>
                <span className="font-mono text-secondary/70 text-[11px]">{acc.password}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2 text-center text-xs text-secondary border-t border-border">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-accent hover:underline font-medium">
            Create workspace
          </Link>
        </div>
      </div>
    </div>
  );
}
