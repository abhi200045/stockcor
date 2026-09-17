import {
  LayoutDashboard,
  Calculator,
  Package,
  ShoppingCart,
  TrendingDown,
  Scale,
  Users,
  Truck,
  Coins,
  MapPin,
  FileBarChart,
  FileText,
  Sparkles,
  Bell,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import type { Role } from '@/lib/types';

export interface NavItem {
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
  roles?: Role[];
}

export const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', path: '/app', icon: LayoutDashboard },
      { label: 'Metal Calculator', path: '/app/calculator', icon: Calculator },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Inventory', path: '/app/inventory', icon: Package },
      { label: 'Purchases', path: '/app/purchases', icon: ShoppingCart },
      { label: 'Sales / Issues', path: '/app/sales', icon: TrendingDown },
      { label: 'Reconciliation', path: '/app/reconciliation', icon: Scale },
    ],
  },
  {
    title: 'Directory',
    items: [
      { label: 'Customers', path: '/app/customers', icon: Users },
      { label: 'Suppliers', path: '/app/suppliers', icon: Truck },
      { label: 'Metals & Purities', path: '/app/metals', icon: Coins },
      { label: 'Locations', path: '/app/locations', icon: MapPin },
    ],
  },
  {
    title: 'Insights',
    items: [
      { label: 'Reports', path: '/app/reports', icon: FileBarChart },
      { label: 'Documents', path: '/app/documents', icon: FileText },
      { label: 'AI Intelligence', path: '/app/intelligence', icon: Sparkles },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Notifications', path: '/app/notifications', icon: Bell },
      { label: 'Settings', path: '/app/settings', icon: Settings },
      { label: 'Admin', path: '/app/admin', icon: ShieldCheck, roles: ['super_admin', 'owner'] },
    ],
  },
];
