import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOrgData } from '@/hooks/use-org-data';
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
import { Plus, MapPin, Pencil, Trash2, Loader2 } from 'lucide-react';
import type { Location } from '@/lib/types';

export default function LocationsPage() {
  const { organization, user } = useAuth();
  const { locations, loading, refresh } = useOrgData();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function openAdd() { setEditing(null); setName(''); setCode(''); setAddress(''); setDialogOpen(true); }
  function openEdit(l: Location) { setEditing(l); setName(l.name); setCode(l.code); setAddress(l.address ?? ''); setDialogOpen(true); }

  async function handleSave() {
    if (!organization || !name.trim()) return;
    setSubmitting(true);
    if (editing) {
      const { error } = await supabase.from('locations').update({ name: name.trim(), code: code.trim() || name.slice(0, 3).toUpperCase(), address: address.trim() || null }).eq('id', editing.id);
      if (error) toast({ title: 'Failed', description: error.message, variant: 'destructive' });
      else { toast({ title: 'Location updated' }); await logAudit({ org_id: organization.id, user_id: user?.id ?? null, action: 'location.updated', entity_type: 'location', entity_id: editing.id }); }
    } else {
      const { data, error } = await supabase.from('locations').insert({ org_id: organization.id, name: name.trim(), code: code.trim() || name.slice(0, 3).toUpperCase(), address: address.trim() || null }).select().maybeSingle();
      if (error) toast({ title: 'Failed', description: error.message, variant: 'destructive' });
      else { toast({ title: 'Location created' }); await logAudit({ org_id: organization.id, user_id: user?.id ?? null, action: 'location.created', entity_type: 'location', entity_id: data?.id }); }
    }
    setSubmitting(false); setDialogOpen(false); refresh();
  }

  async function handleToggle(l: Location) {
    const { error } = await supabase.from('locations').update({ is_active: !l.is_active }).eq('id', l.id);
    if (error) toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    else refresh();
  }

  async function handleDelete(l: Location) {
    const { error } = await supabase.from('locations').delete().eq('id', l.id);
    if (error) toast({ title: 'Cannot delete — may have transactions', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Location deleted' }); refresh(); }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Locations" description="Manage physical storage locations and branches." actions={<Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> Add Location</Button>} />

      {loading && <div className="text-sm text-muted-foreground">Loading...</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {locations.map((l) => (
          <Card key={l.id}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="font-semibold">{l.name}</div>
                    <Badge variant="secondary" className="mt-0.5 font-mono text-xs">{l.code}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(l)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(l)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
              {l.address && <div className="mt-3 text-sm text-muted-foreground">{l.address}</div>}
              <div className="mt-3 flex items-center gap-1.5">
                <Switch checked={l.is_active} onCheckedChange={() => handleToggle(l)} />
                <span className="text-xs text-muted-foreground">{l.is_active ? 'Active' : 'Inactive'}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!loading && locations.length === 0 && (
        <Card><CardContent className="py-12 text-center"><MapPin className="mx-auto mb-3 h-10 w-10 text-muted-foreground" /><div className="text-sm text-muted-foreground">No locations yet.</div></CardContent></Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Location' : 'Add Location'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Location Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Main Vault" /></div>
            <div className="space-y-2"><Label>Code</Label><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. MVLT" maxLength={6} /></div>
            <div className="space-y-2"><Label>Address</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address (optional)" /></div>
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
