'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name || !email || !password || !workspaceName) {
      setError('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          workspaceName: workspaceName.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error?.message || 'Registration failed.');
        setLoading(false);
        return;
      }

      // Automatically authenticate after successful registration
      const authRes = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (authRes?.error) {
        router.push('/login');
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
      setError('An unexpected error occurred during signup.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md bg-surface border border-border rounded-DEFAULT p-6 shadow-card space-y-5">
        <div className="text-center space-y-1">
          <div className="inline-flex w-8 h-8 rounded-badge bg-accent text-white items-center justify-center font-bold text-sm mx-auto mb-2">
            L
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-primary">Create your Project LOOP Workspace</h1>
          <p className="mt-1 text-sm leading-6 text-secondary">You will be designated as the workspace Administrator</p>
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
            label="Full Name"
            type="text"
            placeholder="Jane Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />

          <Input
            label="Workspace Name"
            type="text"
            placeholder="Acme Corp"
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            required
          />

          <Input
            label="Work Email"
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
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            helperText="Minimum 6 characters"
          />

          <Button type="submit" variant="primary" className="w-full" loading={loading}>
            Create workspace
          </Button>
        </form>

        <div className="pt-2 text-center text-xs text-secondary border-t border-border">
          Already have an account?{' '}
          <Link href="/login" className="text-accent hover:underline font-medium">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
