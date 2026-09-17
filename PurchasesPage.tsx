import TransactionPage from '@/components/TransactionPage';
import { ShoppingCart } from 'lucide-react';

export default function PurchasesPage() {
  return (
    <TransactionPage
      txnType="purchase"
      title="Purchases"
      description="Record metal purchases from suppliers. Only posted transactions affect inventory."
      partyType="supplier"
      icon={ShoppingCart}
    />
  );
}
