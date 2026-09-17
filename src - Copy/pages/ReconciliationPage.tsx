import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOrgData } from '@/hooks/use-org-data';
import { supabase } from '@/lib/supabase';
import { logAudit, notify } from '@/lib/audit';
import { postReconciliationAdjustment } from '@/lib/inventory';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Scale, Loader2, ChevronRight, Check, X } from 'lucide-react';
import { formatWeight, formatNumber, variancePct } from '@/lib/calc';
import { formatDate, todayISO } from '@/lib/format';
import type { Reconciliation, ReconciliationLine, ReconStatus } from '@/lib/types';

const STATUS_FLOW: ReconStatus[] = ['draft', 'submitted', 'reviewed', 'approved', 'closed'];
const STATUS_VARIANT: Record<ReconStatus, 'secondary' | 'default' | 'outline' | 'destructive'> = {
  draft: 'secondary', submitted: 'default', reviewed: 'default', approved: 'default', rejected: 'destructive', closed: 'outline',
};

const ROLE_CAN: Record<string, ReconStatus[]> = {
  super_admin: ['draft', 'submitted', 'reviewed', 'approved', 'closed'],
  owner: ['draft', 'submitted', 'reviewed', 'approved', 'closed'],
  manager: ['draft', 'submitted', 'reviewed'],
  operator: ['draft', 'submitted'],
  viewer: [],
};

export default function ReconciliationPage() {
  const { organization, user, role } = useAuth();
  const { metals, purities, locations, loading } = useOrgData();
  const { toast } = useToast();
  const [recons, setRecons] = useState<Reconciliation[]>([]);
  const [reconLines, setReconLines] = useState<Record<string, ReconciliationLine[]>>({});
  const [loadingRecons, setLoadingRecons] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewing, setViewing] = useState<Reconciliation | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [reconDate, setReconDate] = useState(todayISO());
  const [locationId, setLocationId] = useState('');
  const [physicalStock, setPhysicalStock] = useState<Record<string, string>>({});

  useEffect(() => { loadRecons(); }, [organization]);

  async function loadRecons() {
    if (!organization) return;
    setLoadingRecons(true);
    const { data } = await supabase
      .from('reconciliations')
      .select('*, location:locations(name), lines:reconciliation_lines(*)')
      .eq('org_id', organization.id)
      .order('created_at', { ascending: false });
    const rData = (data as any[]) ?? [];
    setRecons(rData.map((r) => ({ ...r, location: r.location, lines: r.lines })));
    const linesMap: Record<string, ReconciliationLine[]> = {};
    rData.forEach((r) => { linesMap[r.id] = r.lines ?? []; });
    setReconLines(linesMap);
    setLoadingRecons(false);
  }

  async function fetchBookStock(orgId: string, locId: string) {
    const { data } = await supabase
      .from('inventory_ledger')
      .select('*')
      .eq('org_id', orgId)
      .eq('location_id', locId);
    const map = new Map<string, { gross: number; fine: number }>();
    (data ?? []).forEach((e: any) => {
      const key = `${e.metal_id}-${e.purity_id}`;
      const cur = map.get(key) ?? { gross: 0, fine: 0 };
      cur.gross += e.gross_weight_delta ?? 0;
      cur.fine += e.fine_weight_delta ?? 0;
      map.set(key, cur);
    });
    return map;
  }

  async function handleCreate() {
    if (!organization || !locationId) return;
    setSubmitting(true);

    const bookStock = await fetchBookStock(organization.id, locationId);
    const reconNo = `RECON-${Date.now().toString().slice(-6)}`;

    const { data: recon, error } = await supabase.from('reconciliations').insert({
      org_id: organization.id,
      recon_no: reconNo,
      recon_date: reconDate,
      location_id: locationId,
      status: 'draft',
    }).select().maybeSingle();

    if (error || !recon) {
      toast({ title: 'Failed to create reconciliation', description: error?.message, variant: 'destructive' });
      setSubmitting(false);
      return;
    }

    // Create lines for all metal/purity combos that have book stock or physical input
    const lineRows: Array<Record<string, unknown>> = [];
    for (const metal of metals) {
      for (const purity of purities.filter((p) => p.metal_id === metal.id)) {
        const key = `${metal.id}-${purity.id}`;
        const book = bookStock.get(key) ?? { gross: 0, fine: 0 };
        const physGross = parseFloat(physicalStock[`${key}-gross`] ?? '') || 0;
        const physFine = parseFloat(physicalStock[`${key}-fine`] ?? '') || (physGross * purity.value / 1000);
        if (book.gross !== 0 || book.fine !== 0 || physGross > 0) {
          lineRows.push({
            org_id: organization.id,
            reconciliation_id: recon.id,
            metal_id: metal.id,
            purity_id: purity.id,
            book_gross: book.gross,
            book_fine: book.fine,
            physical_gross: physGross,
            physical_fine: physFine,
          });
        }
      }
    }

    if (lineRows.length > 0) {
      const { error: lineError } = await supabase.from('reconciliation_lines').insert(lineRows);
      if (lineError) toast({ title: 'Failed to create some lines', description: lineError.message, variant: 'destructive' });
    }

    await logAudit({ org_id: organization.id, user_id: user?.id ?? null, action: 'reconciliation.created', entity_type: 'reconciliation', entity_id: recon.id });
    toast({ title: 'Reconciliation created', description: `${lineRows.length} line(s) added.` });
    setSubmitting(false);
    setDialogOpen(false);
    setPhysicalStock({});
    loadRecons();
  }

  async function updateStatus(recon: Reconciliation, newStatus: ReconStatus) {
    if (!organization) return;
    setSubmitting(true);
    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'submitted') updates.submitted_by = user?.id ?? null;
    if (newStatus === 'reviewed') updates.reviewed_by = user?.id ?? null;
    if (newStatus === 'approved') updates.approved_by = user?.id ?? null;

    const { error } = await supabase.from('reconciliations').update(updates).eq('id', recon.id);
    if (error) { toast({ title: 'Failed', description: error.message, variant: 'destructive' }); setSubmitting(false); return; }

    await logAudit({ org_id: organization.id, user_id: user?.id ?? null, action: `reconciliation.${newStatus}`, entity_type: 'reconciliation', entity_id: recon.id });

    // If approved, post adjustment to ledger
    if (newStatus === 'approved') {
      const lines = reconLines[recon.id] ?? [];
      const adjustmentLines = lines.map((l) => ({
        metal_id: l.metal_id,
        purity_id: l.purity_id,
        location_id: recon.location_id,
        fine_variance: l.fine_variance,
        gross_variance: l.gross_variance,
        reason: l.reason,
      })).filter((l) => l.fine_variance !== 0);
      const result = await postReconciliationAdjustment(recon.id, organization.id, user?.id ?? null, adjustmentLines);
      if (!result.success) toast({ title: 'Status updated but adjustment failed', description: result.error, variant: 'destructive' });
      else toast({ title: 'Approved & adjustment posted', description: `${result.postedCount} adjustment(s) posted to ledger.` });
    } else if (newStatus === 'rejected') {
      toast({ title: 'Reconciliation rejected' });
    } else {
      toast({ title: `Status: ${newStatus}` });
    }

    setSubmitting(false);
    loadRecons();
  }

  function canTransition(recon: Reconciliation, toStatus: ReconStatus): boolean {
    if (!role) return false;
    const allowed = ROLE_CAN[role] ?? [];
    if (!allowed.includes(toStatus)) return false;
    const idx = STATUS_FLOW.indexOf(recon.status as ReconStatus);
    const toIdx = STATUS_FLOW.indexOf(toStatus);
    return toIdx === idx + 1;
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Reconciliation"
        description="Compare book stock vs physical stock and manage variance resolution."
        actions={<Button onClick={() => { setLocationId(locations[0]?.id ?? ''); setReconDate(todayISO()); setDialogOpen(true); }}><Plus className="mr-2 h-4 w-4" /> New Reconciliation</Button>}
      />

      {loadingRecons && <div className="text-sm text-muted-foreground">Loading...</div>}

      {!loadingRecons && recons.length === 0 && (
        <Card><CardContent className="py-12 text-center"><Scale className="mx-auto mb-3 h-10 w-10 text-muted-foreground" /><div className="text-sm text-muted-foreground">No reconciliations yet.</div></CardContent></Card>
      )}

      <div className="space-y-2">
        {recons.map((r) => {
          const lines = reconLines[r.id] ?? [];
          const totalVariance = lines.reduce((s, l) => s + Math.abs(l.fine_variance), 0);
          const hasVariance = lines.some((l) => l.fine_variance !== 0);
          return (
            <Card key={r.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted"><Scale className="h-4 w-4 text-muted-foreground" /></div>
                  <div>
                    <div className="font-medium">{r.recon_no ?? '—'}</div>
                    <div className="text-xs text-muted-foreground">
                      {(r as any).location?.name ?? '—'} · {formatDate(r.recon_date)} · {lines.length} line(s)
                      {hasVariance && <span className="ml-2 text-warning">· variance: {formatWeight(totalVariance)} g fine</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_VARIANT[r.status as ReconStatus]} className="text-xs">{r.status}</Badge>
                  <Button variant="ghost" size="sm" onClick={() => setViewing(r)}>View <ChevronRight className="ml-1 h-3.5 w-3.5" /></Button>
                  {canTransition(r, 'submitted') && <Button size="sm" onClick={() => updateStatus(r, 'submitted')} disabled={submitting}>Submit</Button>}
                  {canTransition(r, 'reviewed') && <Button size="sm" onClick={() => updateStatus(r, 'reviewed')} disabled={submitting}>Review</Button>}
                  {canTransition(r, 'approved') && <Button size="sm" onClick={() => updateStatus(r, 'approved')} disabled={submitting}><Check className="mr-1 h-3.5 w-3.5" /> Approve</Button>}
                  {canTransition(r, 'closed') && <Button size="sm" variant="outline" onClick={() => updateStatus(r, 'closed')} disabled={submitting}>Close</Button>}
                  {r.status === 'submitted' && role && ['owner', 'super_admin', 'manager'].includes(role) && (
                    <Button size="sm" variant="destructive" onClick={() => updateStatus(r, 'rejected')} disabled={submitting}><X className="mr-1 h-3.5 w-3.5" /> Reject</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Reconciliation</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Date</Label><Input type="date" value={reconDate} onChange={(e) => setReconDate(e.target.value)} /></div>
              <div className="space-y-2"><Label>Location</Label>
                <Select value={locationId} onValueChange={setLocationId}>
                  <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                  <SelectContent>{locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">Enter physical stock counts. Book stock will be fetched automatically. Leave blank for zero.</div>
            <div className="rounded-lg border max-h-60 overflow-y-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Metal</TableHead><TableHead>Purity</TableHead><TableHead className="text-right">Physical Gross (g)</TableHead></TableRow></TableHeader>
                <TableBody>
                  {metals.map((m) => purities.filter((p) => p.metal_id === m.id).map((p) => (
                    <TableRow key={`${m.id}-${p.id}`}>
                      <TableCell className="text-sm">{m.name}</TableCell>
                      <TableCell><Badge variant="secondary" className="font-mono text-xs">{p.name}</Badge></TableCell>
                      <TableCell><Input type="number" step="0.001" className="h-8 text-sm" placeholder="0.000" value={physicalStock[`${m.id}-${p.id}-gross`] ?? ''} onChange={(e) => setPhysicalStock({ ...physicalStock, [`${m.id}-${p.id}-gross`]: e.target.value })} /></TableCell>
                    </TableRow>
                  )))}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting || !locationId}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create Reconciliation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View dialog */}
      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Reconciliation Details</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div><span className="text-muted-foreground">Ref: </span>{viewing.recon_no ?? '—'}</div>
                <div><span className="text-muted-foreground">Date: </span>{formatDate(viewing.recon_date)}</div>
                <div><span className="text-muted-foreground">Status: </span><Badge variant={STATUS_VARIANT[viewing.status as ReconStatus]}>{viewing.status}</Badge></div>
              </div>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Metal</TableHead><TableHead>Purity</TableHead>
                      <TableHead className="text-right">Book Gross</TableHead><TableHead className="text-right">Book Fine</TableHead>
                      <TableHead className="text-right">Phys Gross</TableHead><TableHead className="text-right">Phys Fine</TableHead>
                      <TableHead className="text-right">Var Fine</TableHead><TableHead className="text-right">Var %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(reconLines[viewing.id] ?? []).map((l) => {
                      const metal = metals.find((m) => m.id === l.metal_id);
                      const purity = purities.find((p) => p.id === l.purity_id);
                      return (
                        <TableRow key={l.id}>
                          <TableCell className="text-sm">{metal?.name ?? '—'}</TableCell>
                          <TableCell><Badge variant="secondary" className="font-mono text-xs">{purity?.name ?? '—'}</Badge></TableCell>
                          <TableCell className="text-right font-mono text-sm">{formatWeight(l.book_gross)}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{formatWeight(l.book_fine)}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{formatWeight(l.physical_gross)}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{formatWeight(l.physical_fine)}</TableCell>
                          <TableCell className={`text-right font-mono text-sm ${l.fine_variance > 0 ? 'text-success' : l.fine_variance < 0 ? 'text-destructive' : ''}`}>{l.fine_variance > 0 ? '+' : ''}{formatWeight(l.fine_variance)}</TableCell>
                          <TableCell className={`text-right font-mono text-sm ${l.variance_pct > 0 ? 'text-warning' : ''}`}>{formatNumber(l.variance_pct, 2)}%</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
