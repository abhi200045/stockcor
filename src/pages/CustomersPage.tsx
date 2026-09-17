import { useOrgData } from '@/hooks/use-org-data';
import PartyPage from '@/components/PartyPage';

export default function CustomersPage() {
  const { customers, suppliers, loading, refresh } = useOrgData();
  return (
    <PartyPage
      partyType="customer"
      title="Customers"
      description="Manage your customer directory."
      parties={[...customers, ...suppliers]}
      loading={loading}
      refresh={refresh}
    />
  );
}
