import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useAuthActions } from '@/hooks/use-auth-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, Loader2 } from 'lucide-react';

export default function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { signIn, signUp } = useAuthActions();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  useEffect(() => {
    if (user) navigate('/app', { replace: true });
  }, [user, navigate]);

  if (user) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    if (mode === 'signin') {
      const ok = await signIn(email, password);
      if (ok) navigate('/app');
    } else {
      const ok = await signUp(email, password);
      if (ok) navigate('/app');
    }
    setSubmitting(false);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Left brand panel */}
        <div className="relative hidden flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <span className="text-xl font-semibold tracking-tight">METALOPS</span>
          </div>
          <div className="space-y-6">
            <h1 className="text-4xl font-semibold leading-tight text-balance">
              Control your metal position.
              <br />
              Reconcile your stock.
              <br />
              Understand your operations.
            </h1>
            <p className="max-w-md text-primary-foreground/70">
              The operations platform for bullion dealers, gold and silver traders, wholesalers,
              jewellery manufacturers, and precious-metal processors.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-4">
              {[
                ['Immutable ledger', 'Every posted entry is permanent'],
                ['Fine-weight engine', 'Decimal-precise purity conversion'],
                ['Multi-tenant', 'Organizations never cross-access'],
                ['Reconciliation', 'Book vs physical variance workflow'],
              ].map(([title, desc]) => (
                <div key={title} className="rounded-lg border border-primary-foreground/15 p-4">
                  <div className="text-sm font-medium">{title}</div>
                  <div className="mt-1 text-xs text-primary-foreground/60">{desc}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="text-xs text-primary-foreground/50">
            Precious Metal Operations &amp; Intelligence
          </div>
        </div>

        {/* Right form panel */}
        <div className="flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-sm space-y-6">
            <div className="flex items-center gap-2.5 lg:hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <ShieldCheck className="h-4.5 w-4.5" />
              </div>
              <span className="text-lg font-semibold tracking-tight">METALOPS</span>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{mode === 'signin' ? 'Sign in' : 'Create account'}</CardTitle>
                <CardDescription>
                  {mode === 'signin'
                    ? 'Access your organization workspace.'
                    : 'Start managing your precious metal operations.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {mode === 'signin' ? 'Sign in' : 'Create account'}
                  </Button>
                </form>
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                  <button
                    type="button"
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                    onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                  >
                    {mode === 'signin' ? 'Create one' : 'Sign in'}
                  </button>
                </div>
              </CardContent>
            </Card>
            <p className="text-center text-xs text-muted-foreground">
              By continuing you agree to maintain accurate records of all precious metal transactions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
