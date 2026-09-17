import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOrgData } from '@/hooks/use-org-data';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatWeight, formatNumber } from '@/lib/calc';
import { formatCurrency, formatDate, todayISO } from '@/lib/format';
import { Download, FileBarChart, Loader2 } from 'lucide-react';

type ReportType = 'metal-position' | 'inventory-ledger' | 'purchase' | 'sale' | 'supplier' | 'customer' | 'fine-metal' | 'reconciliation' | 'variance' | 'valuation';

const REPORTS: { id: ReportType; label: string; description: string }[] = [
  { id: 'metal-position', label: 'Metal Position', description: 'Daily/monthly metal position summary' },
  { id: 'inventory-ledger', label: 'Inventory Ledger', description: 'All posted ledger entries' },
  { id: 'purchase', label: 'Purchase Report', description: 'All purchases with totals' },
  { id: 'sale', label: 'Sales/Issue Report', description: 'All sales and issues with totals' },
  { id: 'supplier', label: 'Supplier Report', description: 'Supplier-wise purchase summary' },
  { id: 'customer', label: 'Customer Report', description: 'Customer-wise sales summary' },
  { id: 'fine-metal', label: 'Fine Metal Report', description: 'Fine metal position by purity' },
  { id: 'reconciliation', label: 'Reconciliation Report', description: 'All reconciliations with status' },
  { id: 'variance', label: 'Variance Report', description: 'Variance analysis from reconciliations' },
  { id: 'valuation', label: 'Inventory Valuation', description: 'Stock valued at current rates' },
];

export default function ReportsPage() {
  const { organization } = useAuth();
  const { metals, purities, locations, loading } = useOrgData();
  const [reportType, setReportType] = useState<ReportType>('metal-position');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState(todayISO());
  const [data, setData] = useState<any[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);

  useEffect(() => { generateReport(); }, [reportType, organization]);

  async function generateReport() {
    if (!organization) return;
    setLoadingReport(true);

    let rows: any[] = [];
    const orgId = organization.id;

    if (reportType === 'inventory-ledger') {
      const { data: ledger } = await supabase.from('inventory_ledger').select('*').eq('org_id', orgId).order('entry_date', { ascending: false }).limit(500);
      rows = (ledger ?? []).map((e: any) => {
        const metal = metals.find((m) => m.id === e.metal_id);
        const purity = purities.find((p) => p.id === e.purity_id);
        const loc = locations.find((l) => l.id === e.location_id);
        return { Date: formatDate(e.entry_date), Type: e.entry_type, Metal: metal?.name ?? '—', Purity: purity?.name ?? '—', Location: loc?.name ?? '—', 'Gross Δ': e.gross_weight_delta, 'Fine Δ': e.fine_weight_delta, Ref: e.ref_no ?? '—' };
      });
    } else if (reportType === 'purchase' || reportType === 'sale') {
      const txnType = reportType === 'purchase' ? 'purchase' : 'sale';
      const { data: txns } = await supabase.from('transactions').select('*, party:parties(name), items:transaction_items(*)').eq('org_id', orgId).eq('txn_type', txnType).order('txn_date', { ascending: false });
      rows = ((txns as any[]) ?? []).map((t) => {
        const gross = (t.items ?? []).reduce((s: number, i: any) => s + i.gross_weight, 0);
        const fine = (t.items ?? []).reduce((s: number, i: any) => s + i.fine_weight, 0);
        const amt = (t.items ?? []).reduce((s: number, i: any) => s + i.amount, 0);
        return { Date: formatDate(t.txn_date), Ref: t.ref_no ?? '—', Party: t.party?.name ?? '—', 'Gross (g)': gross, 'Fine (g)': fine, Amount: amt, Status: t.status };
      });
    } else if (reportType === 'supplier' || reportType === 'customer') {
      const pType = reportType === 'supplier' ? 'supplier' : 'customer';
      const txnType = reportType === 'supplier' ? 'purchase' : 'sale';
      const { data: parties } = await supabase.from('parties').select('*').eq('org_id', orgId).eq('type', pType);
      const { data: txns } = await supabase.from('transactions').select('*, party:parties(name), items:transaction_items(*)').eq('org_id', orgId).eq('txn_type', txnType).eq('status', 'posted');
      for (const p of parties ?? []) {
        const pTxns = (txns as any[])?.filter((t) => t.party_id === p.id) ?? [];
        const gross = pTxns.reduce((s, t) => s + (t.items ?? []).reduce((ss: number, i: any) => ss + i.gross_weight, 0), 0);
        const fine = pTxns.reduce((s, t) => s + (t.items ?? []).reduce((ss: number, i: any) => ss + i.fine_weight, 0), 0);
        const amt = pTxns.reduce((s, t) => s + (t.items ?? []).reduce((ss: number, i: any) => ss + i.amount, 0), 0);
        rows.push({ Name: p.name, Code: p.code ?? '—', Transactions: pTxns.length, 'Gross (g)': gross, 'Fine (g)': fine, Amount: amt });
      }
    } else if (reportType === 'metal-position' || reportType === 'fine-metal' || reportType === 'valuation') {
      const { data: ledger } = await supabase.from('inventory_ledger').select('*').eq('org_id', orgId);
      const map = new Map<string, { gross: number; fine: number }>();
      (ledger ?? []).forEach((e: any) => {
        const key = `${e.metal_id}-${e.purity_id}`;
        const cur = map.get(key) ?? { gross: 0, fine: 0 };
        cur.gross += e.gross_weight_delta ?? 0;
        cur.fine += e.fine_weight_delta ?? 0;
        map.set(key, cur);
      });
      for (const [key, val] of map.entries()) {
        const [mId, pId] = key.split('-');
        const metal = metals.find((m) => m.id === mId);
        const purity = purities.find((p) => p.id === pId);
        rows.push({ Metal: metal?.name ?? '—', Purity: purity?.name ?? '—', 'Gross (g)': val.gross, 'Fine (g)': val.fine, 'Purity %': purity ? purity.value / 10 : '—' });
      }
    } else if (reportType === 'reconciliation' || reportType === 'variance') {
      const { data: recons } = await supabase.from('reconciliations').select('*, location:locations(name), lines:reconciliation_lines(*)').eq('org_id', orgId).order('created_at', { ascending: false });
      for (const r of (recons as any[]) ?? []) {
        const lines = r.lines ?? [];
        const totalVar = lines.reduce((s: number, l: any) => s + Math.abs(l.fine_variance), 0);
        const maxVar = lines.length > 0 ? Math.max(...lines.map((l: any) => Math.abs(l.fine_variance))) : 0;
        if (reportType === 'reconciliation') {
          rows.push({ Ref: r.recon_no ?? '—', Date: formatDate(r.recon_date), Location: r.location?.name ?? '—', Lines: lines.length, 'Total Variance': totalVar, Status: r.status });
        } else {
          for (const l of lines) {
            if (l.fine_variance !== 0) {
              const metal = metals.find((m) => m.id === l.metal_id);
              const purity = purities.find((p) => p.id === l.purity_id);
              rows.push({ Ref: r.recon_no ?? '—', Date: formatDate(r.recon_date), Metal: metal?.name ?? '—', Purity: purity?.name ?? '—', 'Gross Var': l.gross_variance, 'Fine Var': l.fine_variance, 'Var %': l.variance_pct, Reason: l.reason ?? '—' });
            }
          }
        }
      }
    }

    setData(rows);
    setLoadingReport(false);
  }

  function exportCSV() {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map((row) => headers.map((h) => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metalops-${reportType}-${todayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPDF() {
    window.print();
  }

  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Reports"
        description="Generate operational reports with CSV export."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCSV} disabled={data.length === 0}><Download className="mr-2 h-4 w-4" /> CSV</Button>
            <Button variant="outline" onClick={exportPDF} disabled={data.length === 0}><FileBarChart className="mr-2 h-4 w-4" /> PDF</Button>
          </div>
        }
      />

      <div className="mb-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {REPORTS.map((r) => (
            <button
              key={r.id}
              onClick={() => setReportType(r.id)}
              className={`rounded-lg border p-3 text-left transition-colors ${reportType === r.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
            >
              <div className="text-sm font-medium">{r.label}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{r.description}</div>
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{REPORTS.find((r) => r.id === reportType)?.label}</CardTitle>
          <CardDescription>{data.length} record(s)</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loadingReport || loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />Generating report...</div>
          ) : data.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No data for this report.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((c) => <TableHead key={c} className="whitespace-nowrap">{c}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row, i) => (
                    <TableRow key={i}>
                      {columns.map((c) => {
                        const val = row[c];
                        const isNum = typeof val === 'number';
                        return (
                          <TableCell key={c} className={`whitespace-nowrap text-sm ${isNum ? 'text-right font-mono' : ''}`}>
                            {isNum && c.includes('Amount') ? formatCurrency(val, organization?.currency) :
                             isNum && (c.includes('Gross') || c.includes('Fine') || c.includes('Var')) ? formatWeight(val) :
                             isNum ? formatNumber(val) :
                             String(val ?? '—')}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
