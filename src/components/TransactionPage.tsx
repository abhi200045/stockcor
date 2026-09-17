import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOrgData } from '@/hooks/use-org-data';
import { supabase } from '@/lib/supabase';
import { logAudit, notify } from '@/lib/audit';
import { postTransaction, cancelTransaction } from '@/lib/inventory';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Loader2, ShoppingCart, TrendingDown, Check, X, Eye } from 'lucide-react';
import { fineWeight, formatWeight, formatNumber } from '@/lib/calc';
import { formatCurrency, formatDate, todayISO } from '@/lib/format';
import type { Transaction, TransactionItem, TxnType, Party } from '@/lib/types';

interface Props {
  txnType: TxnType;
  title: string;
  description: string;
  partyType: 'customer' | 'supplier';
  icon: typeof ShoppingCart;
}

interface DraftItem {
  metal_id: string;
  purity_id: string;
  gross_weight: string;
  fine_weight: string;
  rate: string;
  amount: string;
  notes: string;
}

export default function TransactionPage({ txnType, title, description, partyType, icon: Icon }: Props) {
  const { organization, user } = useAuth();
  const { metals, purities, locations, customers, suppliers, loading, refresh } = useOrgData();
  const { toast } = useToast();
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [txnItems, setTxnItems] = useState<Record<string, TransactionItem[]>>({});
  const [loadingTxns, setLoadingTxns] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewing, setViewing] = useState<Transaction | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [refNo, setRefNo] = useState('');
  const [txnDate, setTxnDate] = useState(todayISO());
  const [partyId, setPartyId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<DraftItem[]>([{ metal_id: '', purity_id: '', gross_weight: '', fine_weight: '', rate: '', amount: '', notes: '' }]);

  const parties = partyType === 'customer' ? customers : suppliers;

  useEffect(() => { loadTxns(); }, [organization]);

  async function loadTxns() {
    if (!organization) return;
    setLoadingTxns(true);
    const { data } = await supabase
      .from('transactions')
      .select('*, party:parties(name), items:transaction_items(*)')
      .eq('org_id', organization.id)
      .eq('txn_type', txnType)
      .order('created_at', { ascending: false });
    const tData = (data as any[]) ?? [];
    setTxns(tData.map((t) => ({ ...t, party: t.party, items: t.items })));
    const itemsMap: Record<string, TransactionItem[]> = {};
    tData.forEach((t) => { itemsMap[t.id] = t.items ?? []; });
    setTxnItems(itemsMap);
    setLoadingTxns(false);
  }

  function updateItem(idx: number, field: keyof DraftItem, value: string) {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value };
    const purity = purities.find((p) => p.id === updated[idx].purity_id);
    const pVal = purity?.value ?? 999;
    if (field === 'gross_weight' || field === 'purity_id') {
      const gw = updated[idx].gross_weight;
      updated[idx].fine_weight = gw ? fineWeight(gw, pVal) : '';
    }
    if (field === 'fine_weight' || field === 'rate' || field === 'gross_weight' || field === 'purity_id') {
      const fw = updated[idx].fine_weight;
      const r = updated[idx].rate;
      updated[idx].amount = fw && r ? formatNumber(parseFloat(fw) * parseFloat(r), 2) : '';
    }
    setItems(updated);
  }

  function addItem() { setItems([...items, { metal_id: '', purity_id: '', gross_weight: '', fine_weight: '', rate: '', amount: '', notes: '' }]); }
  function removeItem(idx: number) { setItems(items.filter((_, i) => i !== idx)); }

  function openAdd() {
    setRefNo(`TXN-${Date.now().toString().slice(-6)}`);
    setTxnDate(todayISO());
    setPartyId('');
    setLocationId(locations[0]?.id ?? '');
    setNotes('');
    setItems([{ metal_id: '', purity_id: '', gross_weight: '', fine_weight: '', rate: '', amount: '', notes: '' }]);
    setDialogOpen(true);
  }

  async function handleSave(postNow: boolean) {
    if (!organization) return;
    const validItems = items.filter((i) => i.metal_id && i.purity_id && parseFloat(i.gross_weight) > 0);
    if (validItems.length === 0) {
      toast({ title: 'Add at least one valid line item', variant: 'destructive' });
      return;
    }
    setSubmitting(true);

    const { data: txn, error: txnError } = await supabase.from('transactions').insert({
      org_id: organization.id,
      txn_type: txnType,
      ref_no: refNo.trim() || null,
      txn_date: txnDate,
      party_id: partyId || null,
      location_id: locationId || null,
      status: 'draft',
      created_by: user?.id ?? null,
      notes: notes.trim() || null,
    }).select().maybeSingle();

    if (txnError || !txn) {
      toast({ title: 'Failed to create transaction', description: txnError?.message, variant: 'destructive' });
      setSubmitting(false);
      return;
    }

    const itemRows = validItems.map((i) => ({
      org_id: organization.id,
      transaction_id: txn.id,
      metal_id: i.metal_id,
      purity_id: i.purity_id,
      gross_weight: parseFloat(i.gross_weight),
      fine_weight: parseFloat(i.fine_weight),
      rate: parseFloat(i.rate) || 0,
      amount: parseFloat(i.amount) || 0,
      notes: i.notes || null,
    }));

    const { data: insertedItems, error: itemError } = await supabase.from('transaction_items').insert(itemRows).select();
    if (itemError) {
      toast({ title: 'Failed to add items', description: itemError.message, variant: 'destructive' });
      setSubmitting(false);
      return;
    }

    await logAudit({ org_id: organization.id, user_id: user?.id ?? null, action: 'transaction.created', entity_type: 'transaction', entity_id: txn.id, details: { txn_type: txnType, ref_no: refNo } });

    if (postNow) {
      const result = await postTransaction(txn as Transaction, (insertedItems as TransactionItem[]) ?? [], user?.id ?? null, organization.id);
      if (!result.success) {
        toast({ title: 'Created but failed to post', description: result.error, variant: 'destructive' });
      } else {
        toast({ title: 'Transaction posted', description: 'Inventory has been updated.' });
        await notify({ org_id: organization.id, user_id: user?.id ?? null, title: `${txnType} posted`, body: `Ref: ${refNo}`, type: 'success', link: '/app/inventory' });
      }
    } else {
      toast({ title: 'Transaction saved as draft' });
    }

    setSubmitting(false);
    setDialogOpen(false);
    loadTxns();
    refresh();
  }

  async function handlePost(t: Transaction) {
    if (!organization) return;
    setSubmitting(true);
    const its = txnItems[t.id] ?? [];
    const result = await postTransaction(t, its, user?.id ?? null, organization.id);
    if (result.success) {
      toast({ title: 'Posted to inventory' });
      loadTxns();
      refresh();
    } else {
      toast({ title: 'Failed to post', description: result.error, variant: 'destructive' });
    }
    setSubmitting(false);
  }

  async function handleCancel(t: Transaction) {
    if (!organization) return;
    setSubmitting(true);
    const its = txnItems[t.id] ?? [];
    const result = await cancelTransaction(t, its, user?.id ?? null, organization.id);
    if (result.success) {
      toast({ title: 'Transaction cancelled' });
      loadTxns();
      refresh();
    } else {
      toast({ title: 'Failed', description: result.error, variant: 'destructive' });
    }
    setSubmitting(false);
  }

  const totalAmount = items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const totalGross = items.reduce((s, i) => s + (parseFloat(i.gross_weight) || 0), 0);
  const totalFine = items.reduce((s, i) => s + (parseFloat(i.fine_weight) || 0), 0);

  return (
    <div className="animate-fade-in">
      <PageHeader title={title} description={description} actions={<Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> New {title.replace(/s$/, '')}</Button>} />

      {loadingTxns && <div className="text-sm text-muted-foreground">Loading...</div>}

      {!loadingTxns && txns.length === 0 && (
        <Card><CardContent className="py-12 text-center">
          <Icon className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <div className="text-sm text-muted-foreground">No {title.toLowerCase()} yet. Create your first one.</div>
        </CardContent></Card>
      )}

      <div className="space-y-2">
        {txns.map((t) => {
          const its = txnItems[t.id] ?? [];
          const amt = its.reduce((s, i) => s + (i.amount ?? 0), 0);
          const gross = its.reduce((s, i) => s + (i.gross_weight ?? 0), 0);
          const fine = its.reduce((s, i) => s + (i.fine_weight ?? 0), 0);
          return (
            <Card key={t.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-md ${txnType === 'purchase' ? 'bg-success/10' : 'bg-destructive/10'}`}>
                    <Icon className={`h-4 w-4 ${txnType === 'purchase' ? 'text-success' : 'text-destructive'}`} />
                  </div>
                  <div>
                    <div className="font-medium">{t.ref_no ?? '—'}</div>
                    <div className="text-xs text-muted-foreground">
                      {(t as any).party?.name ?? '—'} · {formatDate(t.txn_date)} · {its.length} item(s) · {formatWeight(gross)} g gross · {formatWeight(fine)} g fine
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">{formatCurrency(amt, organization?.currency)}</span>
                  <Badge variant={t.status === 'posted' ? 'default' : t.status === 'cancelled' ? 'destructive' : 'secondary'} className="text-xs">{t.status}</Badge>
                  <Button variant="ghost" size="sm" onClick={() => setViewing(t)}><Eye className="h-3.5 w-3.5" /></Button>
                  {t.status === 'draft' && (
                    <Button size="sm" onClick={() => handlePost(t)} disabled={submitting}><Check className="mr-1 h-3.5 w-3.5" /> Post</Button>
                  )}
                  {t.status !== 'cancelled' && (
                    <Button variant="outline" size="sm" onClick={() => handleCancel(t)} disabled={submitting}><X className="h-3.5 w-3.5" /></Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New {title.replace(/s$/, '')}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="space-y-2"><Label>Ref No</Label><Input value={refNo} onChange={(e) => setRefNo(e.target.value)} /></div>
              <div className="space-y-2"><Label>Date</Label><Input type="date" value={txnDate} onChange={(e) => setTxnDate(e.target.value)} /></div>
              <div className="space-y-2"><Label>{partyType === 'customer' ? 'Customer' : 'Supplier'}</Label>
                <Select value={partyId} onValueChange={setPartyId}>
                  <SelectTrigger><SelectValue placeholder={`Select ${partyType}`} /></SelectTrigger>
                  <SelectContent>
                    {parties.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Location</Label>
                <Select value={locationId} onValueChange={setLocationId}>
                  <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                  <SelectContent>
                    {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Line items */}
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">Metal</TableHead>
                    <TableHead className="w-28">Purity</TableHead>
                    <TableHead className="w-24">Gross (g)</TableHead>
                    <TableHead className="w-24">Fine (g)</TableHead>
                    <TableHead className="w-24">Rate</TableHead>
                    <TableHead className="w-28">Amount</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Select value={item.metal_id} onValueChange={(v) => updateItem(idx, 'metal_id', v)}>
                          <SelectTrigger className="h-8"><SelectValue placeholder="—" /></SelectTrigger>
                          <SelectContent>{metals.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select value={item.purity_id} onValueChange={(v) => updateItem(idx, 'purity_id', v)} disabled={!item.metal_id}>
                          <SelectTrigger className="h-8"><SelectValue placeholder="—" /></SelectTrigger>
                          <SelectContent>
                            {purities.filter((p) => p.metal_id === item.metal_id).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><Input type="number" step="0.001" className="h-8" value={item.gross_weight} onChange={(e) => updateItem(idx, 'gross_weight', e.target.value)} /></TableCell>
                      <TableCell><Input type="number" step="0.001" className="h-8 font-mono" value={item.fine_weight} onChange={(e) => updateItem(idx, 'fine_weight', e.target.value)} /></TableCell>
                      <TableCell><Input type="number" step="0.01" className="h-8" value={item.rate} onChange={(e) => updateItem(idx, 'rate', e.target.value)} /></TableCell>
                      <TableCell><Input type="number" step="0.01" className="h-8 font-mono" value={item.amount} readOnly /></TableCell>
                      <TableCell><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(idx)} disabled={items.length === 1}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Button variant="outline" size="sm" onClick={addItem}><Plus className="mr-2 h-3.5 w-3.5" /> Add Line</Button>

            <div className="flex justify-end">
              <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm w-56">
                <div className="flex justify-between"><span className="text-muted-foreground">Total Gross</span><span className="font-mono">{formatWeight(totalGross)} g</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total Fine</span><span className="font-mono">{formatWeight(totalFine)} g</span></div>
                <div className="flex justify-between border-t pt-1"><span className="font-medium">Total Amount</span><span className="font-mono font-bold">{formatCurrency(totalAmount, organization?.currency)}</span></div>
              </div>
            </div>

            <div className="space-y-2"><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Optional notes" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="secondary" onClick={() => handleSave(false)} disabled={submitting}>Save Draft</Button>
            <Button onClick={() => handleSave(true)} disabled={submitting}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save & Post</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Transaction Details</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Ref:</span> {viewing.ref_no ?? '—'}</div>
                <div><span className="text-muted-foreground">Date:</span> {formatDate(viewing.txn_date)}</div>
                <div><span className="text-muted-foreground">Status:</span> <Badge variant="secondary">{viewing.status}</Badge></div>
                <div><span className="text-muted-foreground">Type:</span> {viewing.txn_type}</div>
              </div>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader><TableRow><TableHead>Metal</TableHead><TableHead>Purity</TableHead><TableHead className="text-right">Gross</TableHead><TableHead className="text-right">Fine</TableHead><TableHead className="text-right">Rate</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(txnItems[viewing.id] ?? []).map((it) => {
                      const metal = metals.find((m) => m.id === it.metal_id);
                      const purity = purities.find((p) => p.id === it.purity_id);
                      return (
                        <TableRow key={it.id}>
                          <TableCell>{metal?.name ?? '—'}</TableCell>
                          <TableCell>{purity?.name ?? '—'}</TableCell>
                          <TableCell className="text-right font-mono">{formatWeight(it.gross_weight)}</TableCell>
                          <TableCell className="text-right font-mono">{formatWeight(it.fine_weight)}</TableCell>
                          <TableCell className="text-right font-mono">{formatNumber(it.rate)}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(it.amount, organization?.currency)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {viewing.notes && <div className="text-sm"><span className="text-muted-foreground">Notes: </span>{viewing.notes}</div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
