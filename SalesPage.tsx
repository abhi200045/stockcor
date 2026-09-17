import TransactionPage from '@/components/TransactionPage';
import { TrendingDown } from 'lucide-react';

export default function SalesPage() {
  return (
    <TransactionPage
      txnType="sale"
      title="Sales / Issues"
      description="Record metal sales and issues to customers. Only posted transactions affect inventory."
      partyType="customer"
      icon={TrendingDown}
    />
  );
}
