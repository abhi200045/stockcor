import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import AppLayout from '@/components/AppLayout';
import DashboardPage from '@/pages/DashboardPage';
import CalculatorPage from '@/pages/CalculatorPage';
import InventoryPage from '@/pages/InventoryPage';
import PurchasesPage from '@/pages/PurchasesPage';
import SalesPage from '@/pages/SalesPage';
import ReconciliationPage from '@/pages/ReconciliationPage';
import CustomersPage from '@/pages/CustomersPage';
import SuppliersPage from '@/pages/SuppliersPage';
import MetalsPage from '@/pages/MetalsPage';
import LocationsPage from '@/pages/LocationsPage';
import ReportsPage from '@/pages/ReportsPage';
import DocumentsPage from '@/pages/DocumentsPage';
import IntelligencePage from '@/pages/IntelligencePage';
import NotificationsPage from '@/pages/NotificationsPage';
import SettingsPage from '@/pages/SettingsPage';
import AdminPage from '@/pages/AdminPage';

function AppGate({ children }: { children: React.ReactNode }) {
  const { loading, organization } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md text-center">
          <p className="text-sm text-muted-foreground">
            No organization found. Please run the database seed to create demo data.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/app"
            element={
              <AppGate>
                <AppLayout />
              </AppGate>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="calculator" element={<CalculatorPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="purchases" element={<PurchasesPage />} />
            <Route path="sales" element={<SalesPage />} />
            <Route path="reconciliation" element={<ReconciliationPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="suppliers" element={<SuppliersPage />} />
            <Route path="metals" element={<MetalsPage />} />
            <Route path="locations" element={<LocationsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="intelligence" element={<IntelligencePage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="admin" element={<AdminPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
        <Toaster />
      </BrowserRouter>
    </AuthProvider>
  );
}
