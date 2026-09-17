import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShieldCheck, Users, ScrollText, Database, FlaskConical, Loader2 } from 'lucide-react';
import { formatDateTime } from '@/lib/format';
import { seedDemoData } from '@/lib/demo-data';
import { useToast } from '@/hooks/use-toast';
import type { AuditLog, OrgMember } from '@/lib/types';

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  owner: 'Owner',
  manager: 'Manager',
  operator: 'Operator',
  viewer: 'Viewer',
};

export default function AdminPage() {
  const { organization, user, role } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ txns: 0, ledger: 0, recons: 0, parties: 0 });
  const [seeding, setSeeding] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!organization) return;
    (async () => {
      setLoading(true);
      const [logData, memberData, txnCount, ledgerCount, reconCount, partyCount] = await Promise.all([
        supabase.from('audit_logs').select('*').eq('org_id', organization.id).order('created_at', { ascending: false }).limit(100),
        supabase.from('organization_members').select('*').eq('org_id', organization.id),
        supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('org_id', organization.id),
        supabase.from('inventory_ledger').select('id', { count: 'exact', head: true }).eq('org_id', organization.id),
        supabase.from('reconciliations').select('id', { count: 'exact', head: true }).eq('org_id', organization.id),
        supabase.from('parties').select('id', { count: 'exact', head: true }).eq('org_id', organization.id),
      ]);
      setLogs((logData.data as AuditLog[]) ?? []);
      setMembers((memberData.data as OrgMember[]) ?? []);
      setStats({
        txns: txnCount.count ?? 0,
        ledger: ledgerCount.count ?? 0,
        recons: reconCount.count ?? 0,
        parties: partyCount.count ?? 0,
      });
      setLoading(false);
    })();
  }, [organization]);

  if (role && !['super_admin', 'owner'].includes(role)) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Admin" description="Access restricted." />
        <Card><CardContent className="py-12 text-center">
          <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <div className="text-sm text-muted-foreground">You do not have permission to access this page.</div>
        </CardContent></Card>
      </div>
    );
  }

  async function handleSeedDemo() {
    if (!organization) return;
    setSeeding(true);
    const result = await seedDemoData(organization.id, user?.id ?? null);
    if (result.success) {
      toast({ title: 'Demo data seeded', description: 'Sample purchases, sales, suppliers, and customers created. Marked as DEMO DATA.' });
      window.location.reload();
    } else {
      toast({ title: 'Failed to seed demo data', description: result.error, variant: 'destructive' });
    }
    setSeeding(false);
  }

  const statCards = [
    { label: 'Transactions', value: stats.txns, icon: ScrollText },
    { label: 'Ledger Entries', value: stats.ledger, icon: Database },
    { label: 'Reconciliations', value: stats.recons, icon: ShieldCheck },
    { label: 'Parties', value: stats.parties, icon: Users },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Admin" description="Organization administration, audit logs, and system overview." actions={
        !organization?.is_demo && stats.txns === 0 ? (
          <Button onClick={handleSeedDemo} disabled={seeding}>
            {seeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FlaskConical className="mr-2 h-4 w-4" />}
            Seed Demo Data
          </Button>
        ) : undefined
      } />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                  <div className="text-lg font-semibold">{s.value}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {organization?.is_demo && (
        <div className="mb-4 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
          <strong>DEMO DATA:</strong> This organization contains sample data for demonstration purposes only.
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Members */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Members</CardTitle>
            <CardDescription>Users in this organization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {user?.email?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{`User ${m.user_id.slice(0, 8)}`}</div>
                    <div className="text-xs text-muted-foreground">{ROLE_LABELS[m.role]}</div>
                  </div>
                </div>
                <Badge variant={m.role === 'owner' ? 'default' : 'secondary'} className="text-xs">{ROLE_LABELS[m.role]}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Audit logs */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><ScrollText className="h-4 w-4" /> Audit Log</CardTitle>
            <CardDescription>Recent important actions in this organization</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
            ) : logs.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No audit entries.</div>
            ) : (
              <div className="max-h-96 overflow-y-auto scrollbar-thin">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="font-mono text-sm">{l.action}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{l.entity_type ?? '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDateTime(l.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
