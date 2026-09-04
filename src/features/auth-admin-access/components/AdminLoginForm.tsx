'use client';

import { type FormEvent, useState } from 'react';

import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signInAdmin } from '@/infrastructure/supabase/auth/browser';

export function AdminLoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await signInAdmin(email, password);

    if (!result.ok) {
      setError(
        result.reason === 'configuration'
          ? 'Supabase is not configured for this environment.'
          : result.reason === 'network'
            ? 'The authentication service could not be reached. Check the connection and try again.'
            : result.reason === 'not-admin'
              ? 'This account does not have active Admin access.'
              : 'The email or password is not valid.',
      );
      setIsSubmitting(false);
      return;
    }

    router.replace(nextPath.startsWith('/') ? nextPath : '/en/admin');
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      <div className="space-y-2">
        <Label htmlFor="admin-email">Email</Label>
        <Input
          autoComplete="email"
          id="admin-email"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="admin-password">Password</Label>
        <Input
          autoComplete="current-password"
          id="admin-password"
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </div>
      {error ? (
        <p
          className="border-destructive border-l-2 bg-destructive/10 px-3 py-2 text-destructive text-sm"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? 'Signing in…' : 'Sign in to Admin'}
      </Button>
    </form>
  );
}
