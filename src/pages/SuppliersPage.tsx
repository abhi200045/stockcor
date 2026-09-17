import { useOrgData } from '@/hooks/use-org-data';
import PartyPage from '@/components/PartyPage';

export default function SuppliersPage() {
  const { customers, suppliers, loading, refresh } = useOrgData();
  return (
    <PartyPage
      partyType="supplier"
      title="Suppliers"
      description="Manage your supplier directory."
      parties={[...customers, ...suppliers]}
      loading={loading}
      refresh={refresh}
    />
  );
}
