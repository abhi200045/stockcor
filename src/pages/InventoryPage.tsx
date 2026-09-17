import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOrgData } from '@/hooks/use-org-data';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatWeight, formatNumber } from '@/lib/calc';
import { formatDate } from '@/lib/format';
import { Package, ArrowDownCircle, ArrowUpCircle, Lock } from 'lucide-react';
import type { InventoryLedgerEntry } from '@/lib/types';

export default function InventoryPage() {
  const { organization } = useAuth();
  const { metals, purities, locations, loading } = useOrgData();
  const [ledger, setLedger] = useState<InventoryLedgerEntry[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(true);
  const [filterMetal, setFilterMetal] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');

  useEffect(() => {
    if (!organization) return;
    (async () => {
      setLoadingLedger(true);
      const { data } = await supabase
        .from('inventory_ledger')
        .select('*')
        .eq('org_id', organization.id)
        .order('created_at', { ascending: false })
        .limit(200);
      setLedger((data as InventoryLedgerEntry[]) ?? []);
      setLoadingLedger(false);
    })();
  }, [organization]);

  // Compute current stock positions
  const stockByMetalPurity = new Map<string, { gross: number; fine: number }>();
  for (const entry of ledger) {
    const key = `${entry.metal_id}-${entry.purity_id}-${entry.location_id ?? 'none'}`;
    const cur = stockByMetalPurity.get(key) ?? { gross: 0, fine: 0 };
    cur.gross += entry.gross_weight_delta;
    cur.fine += entry.fine_weight_delta;
    stockByMetalPurity.set(key, cur);
  }

  const stockRows = Array.from(stockByMetalPurity.entries())
    .map(([key, val]) => {
      const [metalId, purityId, locId] = key.split('-');
      const metal = metals.find((m) => m.id === metalId);
      const purity = purities.find((p) => p.id === purityId);
      const location = locations.find((l) => l.id === locId);
      return { ...val, metal, purity, location, metalId, purityId, locId };
    })
    .filter((r) => (filterMetal === 'all' || r.metalId === filterMetal) && (filterLocation === 'all' || r.locId === filterLocation))
    .sort((a, b) => (a.metal?.name ?? '').localeCompare(b.metal?.name ?? ''));

  const filteredLedger = ledger.filter((e) =>
    (filterMetal === 'all' || e.metal_id === filterMetal) &&
    (filterLocation === 'all' || (e.location_id ?? 'none') === filterLocation)
  );

  const totalFine = stockRows.reduce((s, r) => s + r.fine, 0);
  const totalGross = stockRows.reduce((s, r) => s + r.gross, 0);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Inventory"
        description="Current stock position and immutable movement ledger."
        actions={
          <div className="flex items-center gap-2">
            <Select value={filterMetal} onValueChange={setFilterMetal}>
              <SelectTrigger className="w-36"><SelectValue placeholder="All metals" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All metals</SelectItem>
                {metals.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterLocation} onValueChange={setFilterLocation}>
              <SelectTrigger className="w-36"><SelectValue placeholder="All locations" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All locations</SelectItem>
                {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <Tabs defaultValue="position">
        <TabsList>
          <TabsTrigger value="position">Stock Position</TabsTrigger>
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
        </TabsList>

        <TabsContent value="position">
          <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total Gross</div><div className="text-lg font-semibold font-mono">{formatWeight(totalGross)} g</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total Fine</div><div className="text-lg font-semibold font-mono">{formatWeight(totalFine)} g</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Positions</div><div className="text-lg font-semibold">{stockRows.length}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Ledger Entries</div><div className="text-lg font-semibold">{ledger.length}</div></CardContent></Card>
          </div>

          {loading || loadingLedger ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : stockRows.length === 0 ? (
            <Card><CardContent className="py-12 text-center"><Package className="mx-auto mb-3 h-10 w-10 text-muted-foreground" /><div className="text-sm text-muted-foreground">No stock positions yet. Post a purchase or opening stock to begin.</div></CardContent></Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Metal</TableHead>
                      <TableHead>Purity</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Gross (g)</TableHead>
                      <TableHead className="text-right">Fine (g)</TableHead>
                      <TableHead className="text-right">Purity %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockRows.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{r.metal?.name ?? '—'}</TableCell>
                        <TableCell><Badge variant="secondary" className="font-mono">{r.purity?.name ?? '—'}</Badge></TableCell>
                        <TableCell>{r.location?.name ?? '—'}</TableCell>
                        <TableCell className="text-right font-mono">{formatWeight(r.gross)}</TableCell>
                        <TableCell className="text-right font-mono">{formatWeight(r.fine)}</TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">{r.purity ? formatNumber(r.purity.value / 10, 1) : '—'}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="ledger">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Lock className="h-4 w-4 text-muted-foreground" /> Immutable Ledger</CardTitle>
              <CardDescription>Every posted entry is permanent. Reversals are recorded as new entries, not edits.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loadingLedger ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
              ) : filteredLedger.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">No ledger entries.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Metal</TableHead>
                      <TableHead>Purity</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Gross Δ</TableHead>
                      <TableHead className="text-right">Fine Δ</TableHead>
                      <TableHead>Ref</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLedger.map((e) => {
                      const metal = metals.find((m) => m.id === e.metal_id);
                      const purity = purities.find((p) => p.id === e.purity_id);
                      const location = locations.find((l) => l.id === e.location_id);
                      const isPositive = e.gross_weight_delta >= 0;
                      return (
                        <TableRow key={e.id} className={e.is_reversal ? 'opacity-60' : ''}>
                          <TableCell className="text-sm">{formatDate(e.entry_date)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {isPositive ? <ArrowDownCircle className="h-3.5 w-3.5 text-success" /> : <ArrowUpCircle className="h-3.5 w-3.5 text-destructive" />}
                              <span className="text-sm capitalize">{e.entry_type.replace('_', ' ')}</span>
                              {e.is_reversal && <Badge variant="outline" className="text-xs">reversal</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>{metal?.name ?? '—'}</TableCell>
                          <TableCell><Badge variant="secondary" className="font-mono text-xs">{purity?.name ?? '—'}</Badge></TableCell>
                          <TableCell className="text-sm">{location?.name ?? '—'}</TableCell>
                          <TableCell className={`text-right font-mono text-sm ${isPositive ? 'text-success' : 'text-destructive'}`}>{isPositive ? '+' : ''}{formatWeight(e.gross_weight_delta)}</TableCell>
                          <TableCell className={`text-right font-mono text-sm ${isPositive ? 'text-success' : 'text-destructive'}`}>{isPositive ? '+' : ''}{formatWeight(e.fine_weight_delta)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{e.ref_no ?? '—'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
