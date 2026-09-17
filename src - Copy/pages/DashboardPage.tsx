import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatWeight, formatNumber } from '@/lib/calc';
import { formatCurrency } from '@/lib/format';
import { formatDate, relativeTime } from '@/lib/format';
import { Coins, TrendingUp, TrendingDown, Scale, Package, AlertTriangle, ArrowRightLeft } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import type { Metal, Purity, Location } from '@/lib/types';

interface DashboardData {
  fineGold: number;
  fineSilver: number;
  inventoryValue: number;
  todayPurchases: number;
  todaySales: number;
  pendingRecons: number;
  varianceCount: number;
  recentTxns: Array<{ id: string; ref_no: string | null; txn_type: string; txn_date: string; status: string; amount: number }>;
  movements: Array<{ date: string; purchases: number; sales: number }>;
  metalBreakdown: Array<{ name: string; value: number; color: string }>;
  alerts: Array<{ id: string; title: string; severity: string; created_at: string }>;
}

export default function DashboardPage() {
  const { organization, user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organization) return;
    (async () => {
      const orgId = organization.id;
      const today = new Date().toISOString().split('T')[0];

      const [ledger, txns, recons, todayTxns, parties] = await Promise.all([
        supabase.from('inventory_ledger').select('*').eq('org_id', orgId),
        supabase.from('transactions').select('*, party:parties(name)').eq('org_id', orgId).order('created_at', { ascending: false }).limit(8),
        supabase.from('reconciliations').select('*').eq('org_id', orgId),
        supabase.from('transactions').select('*, items:transaction_items(amount)').eq('org_id', orgId).eq('txn_date', today),
        supabase.from('parties').select('id, type').eq('org_id', orgId),
      ]);

      const metals = (await supabase.from('metals').select('*').eq('org_id', orgId)).data as Metal[] | null;
      const purities = (await supabase.from('purities').select('*').eq('org_id', orgId)).data as Purity[] | null;
      const locations = (await supabase.from('locations').select('*').eq('org_id', orgId)).data as Location[] | null;

      const ledgerData = ledger.data ?? [];
      const purityMap = new Map((purities ?? []).map((p) => [p.id, p]));
      const metalMap = new Map((metals ?? []).map((m) => [m.id, m]));

      let fineGold = 0, fineSilver = 0, invGross = 0;
      const metalTotals = new Map<string, number>();

      for (const entry of ledgerData as any[]) {
        const metal = metalMap.get(entry.metal_id);
        if (!metal) continue;
        const cur = metalTotals.get(metal.name) ?? 0;
        metalTotals.set(metal.name, cur + (entry.fine_weight_delta ?? 0));
        invGross += entry.gross_weight_delta ?? 0;
        if (metal.name.toLowerCase().includes('gold')) fineGold += entry.fine_weight_delta ?? 0;
        if (metal.name.toLowerCase().includes('silver')) fineSilver += entry.fine_weight_delta ?? 0;
      }

      const todayTxnsData = (todayTxns.data as any[]) ?? [];
      let todayPurchases = 0, todaySales = 0;
      for (const t of todayTxnsData) {
        const amt = (t.items ?? []).reduce((s: number, i: any) => s + (i.amount ?? 0), 0);
        if (t.txn_type === 'purchase') todayPurchases += amt;
        if (t.txn_type === 'sale' || t.txn_type === 'issue') todaySales += amt;
      }

      const reconData = (recons.data as any[]) ?? [];
      const pendingRecons = reconData.filter((r) => ['draft', 'submitted', 'reviewed'].includes(r.status)).length;
      const varianceCount = 0;

      const recentTxns = ((txns.data as any[]) ?? []).map((t) => ({
        id: t.id,
        ref_no: t.ref_no,
        txn_type: t.txn_type,
        txn_date: t.txn_date,
        status: t.status,
        amount: (t.items ?? []).reduce((s: number, i: any) => s + (i.amount ?? 0), 0),
      }));

      const movements: Array<{ date: string; purchases: number; sales: number }> = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayTxns = ledgerData.filter((e: any) => e.entry_date === dateStr);
        const dayPurchases = dayTxns.filter((e: any) => e.entry_type === 'purchase').reduce((s: number, e: any) => s + Math.abs(e.gross_weight_delta ?? 0), 0);
        const daySales = dayTxns.filter((e: any) => ['sale', 'issue'].includes(e.entry_type)).reduce((s: number, e: any) => s + Math.abs(e.gross_weight_delta ?? 0), 0);
        movements.push({ date: dateStr.slice(5), purchases: Number(dayPurchases.toFixed(3)), sales: Number(daySales.toFixed(3)) });
      }

      const colors = ['hsl(43 62% 52%)', 'hsl(215 28% 45%)', 'hsl(142 60% 45%)', 'hsl(199 80% 50%)', 'hsl(0 65% 55%)'];
      const metalBreakdown = Array.from(metalTotals.entries())
        .filter(([, v]) => v > 0)
        .map(([name, value], i) => ({ name, value: Number(value.toFixed(3)), color: colors[i % colors.length] }));

      const alerts: Array<{ id: string; title: string; severity: string; created_at: string }> = [];
      if (pendingRecons > 0) alerts.push({ id: 'recon', title: `${pendingRecons} reconciliation(s) pending review`, severity: 'warning', created_at: new Date().toISOString() });
      if (fineGold < 0) alerts.push({ id: 'neg-gold', title: 'Negative fine gold position detected', severity: 'destructive', created_at: new Date().toISOString() });
      if (fineSilver < 0) alerts.push({ id: 'neg-silver', title: 'Negative fine silver position detected', severity: 'destructive', created_at: new Date().toISOString() });

      setData({
        fineGold,
        fineSilver,
        inventoryValue: invGross,
        todayPurchases,
        todaySales,
        pendingRecons,
        varianceCount,
        recentTxns,
        movements,
        metalBreakdown,
        alerts,
      });
      setLoading(false);
    })();
  }, [organization]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  if (!data) return null;

  const stats = [
    { label: 'Fine Gold', value: formatWeight(data.fineGold), unit: 'g', icon: Coins, color: 'text-accent', bg: 'bg-accent/10' },
    { label: 'Fine Silver', value: formatWeight(data.fineSilver), unit: 'g', icon: Coins, color: 'text-chart-2', bg: 'bg-chart-2/10' },
    { label: "Today's Purchases", value: formatCurrency(data.todayPurchases, organization?.currency), icon: TrendingUp, color: 'text-success', bg: 'bg-success/10' },
    { label: "Today's Sales/Issues", value: formatCurrency(data.todaySales, organization?.currency), icon: TrendingDown, color: 'text-destructive', bg: 'bg-destructive/10' },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Dashboard"
        description={`Welcome back. ${organization?.is_demo ? 'DEMO DATA — NOT REAL TRANSACTIONS.' : 'Overview of your metal position and operations.'}`}
      />

      {organization?.is_demo && (
        <div className="mb-6 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
          <strong>DEMO MODE:</strong> This organization contains sample data for demonstration purposes only.
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${s.bg}`}>
                  <Icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <div>
                  <div className="text-xs font-medium text-muted-foreground">{s.label}</div>
                  <div className="mt-0.5 text-xl font-semibold">
                    {s.value}
                    {s.unit && <span className="ml-1 text-sm font-normal text-muted-foreground">{s.unit}</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Movement chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Inventory Movement</CardTitle>
            <CardDescription>Gross weight moved (purchases vs sales) — last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.movements}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="purchases" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="Purchases (g)" />
                <Bar dataKey="sales" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} name="Sales (g)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Metal breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Metal Position</CardTitle>
            <CardDescription>Fine weight by metal</CardDescription>
          </CardHeader>
          <CardContent>
            {data.metalBreakdown.length === 0 ? (
              <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
                No stock data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={data.metalBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(e: any) => `${e.name}: ${formatWeight(e.value)}`}>
                    {data.metalBreakdown.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Recent transactions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentTxns.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No transactions yet</div>
            ) : (
              <div className="space-y-1">
                {data.recentTxns.map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-md ${t.txn_type === 'purchase' ? 'bg-success/10' : 'bg-destructive/10'}`}>
                        {t.txn_type === 'purchase' ? <TrendingUp className="h-4 w-4 text-success" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
                      </div>
                      <div>
                        <div className="text-sm font-medium capitalize">{t.txn_type.replace('_', ' ')}</div>
                        <div className="text-xs text-muted-foreground">{t.ref_no ?? '—'} · {formatDate(t.txn_date)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">{formatCurrency(t.amount, organization?.currency)}</span>
                      <Badge variant={t.status === 'posted' ? 'default' : t.status === 'cancelled' ? 'destructive' : 'secondary'} className="text-xs">
                        {t.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {data.alerts.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                <div className="text-center">
                  <div className="mb-1">All clear</div>
                  <div className="text-xs">No active alerts</div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {data.alerts.map((a) => (
                  <div key={a.id} className={`flex items-start gap-3 rounded-lg border p-3 ${a.severity === 'destructive' ? 'border-destructive/30 bg-destructive/5' : 'border-warning/30 bg-warning/5'}`}>
                    <AlertTriangle className={`h-4 w-4 shrink-0 mt-0.5 ${a.severity === 'destructive' ? 'text-destructive' : 'text-warning'}`} />
                    <div>
                      <div className="text-sm font-medium">{a.title}</div>
                      <div className="text-xs text-muted-foreground">{relativeTime(a.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick stats row */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <Scale className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Pending Reconciliations</div>
                <div className="text-lg font-semibold">{data.pendingRecons}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Inventory Gross (all metals)</div>
                <div className="text-lg font-semibold">{formatWeight(data.inventoryValue)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">7-Day Movement</div>
                <div className="text-lg font-semibold">{formatWeight(data.movements.reduce((s, m) => s + m.purchases + m.sales, 0))}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
