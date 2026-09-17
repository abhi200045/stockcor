import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Metal, Purity, Location, Party } from '@/lib/types';

interface OrgData {
  metals: Metal[];
  purities: Purity[];
  locations: Location[];
  customers: Party[];
  suppliers: Party[];
  loading: boolean;
  refresh: () => void;
}

export function useOrgData(): OrgData {
  const { organization } = useAuth();
  const [metals, setMetals] = useState<Metal[]>([]);
  const [purities, setPurities] = useState<Purity[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [customers, setCustomers] = useState<Party[]>([]);
  const [suppliers, setSuppliers] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!organization) return;
    setLoading(true);
    (async () => {
      const [m, p, l, parties] = await Promise.all([
        supabase.from('metals').select('*').eq('org_id', organization.id).order('sort_order'),
        supabase.from('purities').select('*').eq('org_id', organization.id).order('sort_order'),
        supabase.from('locations').select('*').eq('org_id', organization.id).order('created_at'),
        supabase.from('parties').select('*').eq('org_id', organization.id).order('created_at', { ascending: false }),
      ]);

      setMetals((m.data as Metal[]) ?? []);
      setPurities((p.data as Purity[]) ?? []);
      setLocations((l.data as Location[]) ?? []);
      const allParties = (parties.data as Party[]) ?? [];
      setCustomers(allParties.filter((x) => x.type === 'customer'));
      setSuppliers(allParties.filter((x) => x.type === 'supplier'));
      setLoading(false);
    })();
  }, [organization, refreshKey]);

  return {
    metals,
    purities,
    locations,
    customers,
    suppliers,
    loading,
    refresh: () => setRefreshKey((k) => k + 1),
  };
}
