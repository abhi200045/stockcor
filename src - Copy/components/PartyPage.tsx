import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { logAudit } from '@/lib/audit';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, Loader2, Phone, Mail, MapPin } from 'lucide-react';
import type { Party, PartyType } from '@/lib/types';
import { formatDate } from '@/lib/format';

interface Props {
  partyType: PartyType;
  title: string;
  description: string;
  parties: Party[];
  loading: boolean;
  refresh: () => void;
}

export default function PartyPage({ partyType, title, description, parties, loading, refresh }: Props) {
  const { organization, user } = useAuth();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Party | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filtered = parties.filter((p) => p.type === partyType);

  function openAdd() { setEditing(null); setName(''); setCode(''); setPhone(''); setEmail(''); setAddress(''); setGstin(''); setNotes(''); setDialogOpen(true); }
  function openEdit(p: Party) { setEditing(p); setName(p.name); setCode(p.code ?? ''); setPhone(p.phone ?? ''); setEmail(p.email ?? ''); setAddress(p.address ?? ''); setGstin(p.gstin ?? ''); setNotes(p.notes ?? ''); setDialogOpen(true); }

  async function handleSave() {
    if (!organization || !name.trim()) return;
    setSubmitting(true);
    if (editing) {
      const { error } = await supabase.from('parties').update({ name: name.trim(), code: code.trim() || null, phone: phone.trim() || null, email: email.trim() || null, address: address.trim() || null, gstin: gstin.trim() || null, notes: notes.trim() || null }).eq('id', editing.id);
      if (error) toast({ title: 'Failed', description: error.message, variant: 'destructive' });
      else { toast({ title: 'Updated' }); await logAudit({ org_id: organization.id, user_id: user?.id ?? null, action: `${partyType}.updated`, entity_type: 'party', entity_id: editing.id }); }
    } else {
      const { data, error } = await supabase.from('parties').insert({ org_id: organization.id, type: partyType, name: name.trim(), code: code.trim() || null, phone: phone.trim() || null, email: email.trim() || null, address: address.trim() || null, gstin: gstin.trim() || null, notes: notes.trim() || null }).select().maybeSingle();
      if (error) toast({ title: 'Failed', description: error.message, variant: 'destructive' });
      else { toast({ title: 'Created' }); await logAudit({ org_id: organization.id, user_id: user?.id ?? null, action: `${partyType}.created`, entity_type: 'party', entity_id: data?.id }); }
    }
    setSubmitting(false); setDialogOpen(false); refresh();
  }

  async function handleToggle(p: Party) {
    const { error } = await supabase.from('parties').update({ is_active: !p.is_active }).eq('id', p.id);
    if (error) toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    else refresh();
  }

  async function handleDelete(p: Party) {
    const { error } = await supabase.from('parties').delete().eq('id', p.id);
    if (error) toast({ title: 'Cannot delete — may have transactions', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Deleted' }); refresh(); }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title={title} description={description} actions={<Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> Add {partyType === 'customer' ? 'Customer' : 'Supplier'}</Button>} />

      {loading && <div className="text-sm text-muted-foreground">Loading...</div>}

      {!loading && filtered.length === 0 && (
        <Card><CardContent className="py-12 text-center"><div className="text-sm text-muted-foreground">No {partyType}s yet.</div></CardContent></Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <Card key={p.id}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold">{p.name}</div>
                  {p.code && <Badge variant="secondary" className="mt-0.5 font-mono text-xs">{p.code}</Badge>}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(p)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
              <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                {p.phone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{p.phone}</div>}
                {p.email && <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" />{p.email}</div>}
                {p.address && <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" />{p.address}</div>}
                {p.gstin && <div className="font-mono text-xs">GSTIN: {p.gstin}</div>}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Switch checked={p.is_active} onCheckedChange={() => handleToggle(p)} />
                  <span className="text-xs text-muted-foreground">{p.is_active ? 'Active' : 'Inactive'}</span>
                </div>
                <span className="text-xs text-muted-foreground">{formatDate(p.created_at)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? `Edit ${partyType === 'customer' ? 'Customer' : 'Supplier'}` : `Add ${partyType === 'customer' ? 'Customer' : 'Supplier'}`}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Business or person name" /></div>
              <div className="space-y-2"><Label>Code</Label><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Optional code" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" /></div>
              <div className="space-y-2"><Label>Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" /></div>
            </div>
            <div className="space-y-2"><Label>Address</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address" /></div>
            <div className="space-y-2"><Label>GSTIN</Label><Input value={gstin} onChange={(e) => setGstin(e.target.value)} placeholder="GSTIN (optional)" /></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes" rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={submitting || !name.trim()}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editing ? 'Save' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
