import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Organization, OrgMember, Role } from '@/lib/types';
import { supabase } from '@/lib/supabase';

interface AppUser {
  id: string | null;
  email?: string;
}

interface AuthContextValue {
  user: AppUser | null;
  session: null;
  loading: boolean;
  member: OrgMember | null;
  organization: Organization | null;
  role: Role;
  refreshOrg: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: { id: null },
  session: null,
  loading: true,
  member: null,
  organization: null,
  role: 'owner',
  refreshOrg: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<OrgMember | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);

  async function loadOrg() {
    const { data: orgData } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    setOrganization(orgData as Organization | null);

    if (orgData) {
      const { data: memberData } = await supabase
        .from('organization_members')
        .select('*')
        .eq('org_id', (orgData as Organization).id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      setMember(memberData as OrgMember | null);
    }
  }

  async function refreshOrg() {
    await loadOrg();
  }

  async function signOut() {}

  useEffect(() => {
    loadOrg().finally(() => setLoading(false));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: { id: null },
        session: null,
        loading,
        member,
        organization,
        role: 'owner',
        refreshOrg,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
