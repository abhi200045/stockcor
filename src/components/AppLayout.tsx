import { useState, useEffect } from 'react';
import { NavLink, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { NAV_SECTIONS } from '@/lib/nav';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Menu } from 'lucide-react';
import type { Role } from '@/lib/types';

const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Admin',
  owner: 'Owner',
  manager: 'Manager',
  operator: 'Operator',
  viewer: 'Viewer',
};

export default function AppLayout() {
  const { organization, role } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const SidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <span className="text-base font-semibold tracking-tight">STOCKCOR</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4">
        {NAV_SECTIONS.map((section) => {
          const items = section.items.filter(
            (item) => !item.roles || (role && item.roles.includes(role))
          );
          if (items.length === 0) return null;
          return (
            <div key={section.title} className="mb-5">
              <div className="mb-1.5 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {section.title}
              </div>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/app'}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )
                      }
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Org info */}
      <div className="border-t p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{organization?.name}</div>
            <div className="flex items-center gap-1.5">
              {role && (
                <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                  {ROLE_LABELS[role]}
                </Badge>
              )}
              {organization?.is_demo && (
                <Badge variant="outline" className="h-4 px-1 text-[10px] text-warning border-warning/40">
                  DEMO
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r bg-card lg:block">
        {SidebarContent}
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0">
          {SidebarContent}
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex h-16 items-center gap-3 border-b bg-card px-4 lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} className="h-9 w-9">
              <Menu className="h-5 w-5" />
            </Button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
            </div>
            <span className="font-semibold tracking-tight">STOCKCOR</span>
          </div>
          {organization?.is_demo && (
            <Badge variant="outline" className="ml-auto text-warning border-warning/40">
              DEMO
            </Badge>
          )}
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
