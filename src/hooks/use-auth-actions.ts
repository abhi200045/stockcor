import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export function useAuthActions() {
  const { toast } = useToast();

  async function signIn(email: string, password: string): Promise<boolean> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: 'Sign in failed', description: error.message, variant: 'destructive' });
      return false;
    }
    return true;
  }

  async function signUp(email: string, password: string): Promise<boolean> {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      if (error.message.includes('already been registered') || error.message.includes('already registered')) {
        toast({ title: 'Account exists', description: 'This email is already registered. Try signing in instead.' });
      } else if (error.message.includes('Database error')) {
        toast({ title: 'Sign up failed', description: 'A server error occurred. Please try again or sign in if you already have an account.', variant: 'destructive' });
      } else {
        toast({ title: 'Sign up failed', description: error.message, variant: 'destructive' });
      }
      return false;
    }
    if (data.user) {
      toast({ title: 'Account created', description: 'Welcome to StockCor. Complete onboarding to begin.' });
      return true;
    }
    return false;
  }

  async function signOut(): Promise<void> {
    await supabase.auth.signOut();
  }

  return { signIn, signUp, signOut };
}
