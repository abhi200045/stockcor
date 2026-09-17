import { useEffect, useState } from 'react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Plus, Coins, Pencil, Trash2, Loader2 } from 'lucide-react';
import type { Metal, Purity } from '@/lib/types';

export default function MetalsPage() {
  const { organization, user } = useAuth();
  const { metals, purities, loading, refresh } = useOrgData();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMetal, setEditingMetal] = useState<Metal | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [purityName, setPurityName] = useState('');
  const [purityValue, setPurityValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function openAdd() {
    setEditingMetal(null);
    setName('');
    setCode('');
    setDialogOpen(true);
  }

  function openEdit(m: Metal) {
    setEditingMetal(m);
    setName(m.name);
    setCode(m.code);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!organization || !name.trim()) return;
    setSubmitting(true);
    if (editingMetal) {
      const { error } = await supabase.from('metals').update({ name: name.trim(), code: code.trim() || name.slice(0, 2).toUpperCase() }).eq('id', editingMetal.id);
      if (error) toast({ title: 'Failed to update metal', description: error.message, variant: 'destructive' });
      else {
        toast({ title: 'Metal updated' });
        await logAudit({ org_id: organization.id, user_id: user?.id ?? null, action: 'metal.updated', entity_type: 'metal', entity_id: editingMetal.id, details: { name } });
      }
    } else {
      const { data, error } = await supabase.from('metals').insert({
        org_id: organization.id,
        name: name.trim(),
        code: code.trim() || name.slice(0, 2).toUpperCase(),
        unit: 'g',
        sort_order: metals.length,
      }).select().maybeSingle();
      if (error) toast({ title: 'Failed to create metal', description: error.message, variant: 'destructive' });
      else {
        toast({ title: 'Metal created' });
        await logAudit({ org_id: organization.id, user_id: user?.id ?? null, action: 'metal.created', entity_type: 'metal', entity_id: data?.id, details: { name } });
      }
    }
    setSubmitting(false);
    setDialogOpen(false);
    refresh();
  }

  async function handleToggleActive(m: Metal) {
    const { error } = await supabase.from('metals').update({ is_active: !m.is_active }).eq('id', m.id);
    if (error) toast({ title: 'Failed to update', description: error.message, variant: 'destructive' });
    else refresh();
  }

  async function handleAddPurity(metalId: string) {
    if (!organization || !purityName.trim() || !purityValue) return;
    const val = parseInt(purityValue);
    if (isNaN(val) || val < 1 || val > 1000) {
      toast({ title: 'Purity must be 1-1000', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('purities').insert({
      org_id: organization.id,
      metal_id: metalId,
      name: purityName.trim(),
      value: val,
      sort_order: purities.filter((p) => p.metal_id === metalId).length,
    });
    if (error) toast({ title: 'Failed to add purity', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'Purity added' });
      setPurityName('');
      setPurityValue('');
      refresh();
    }
  }

  async function handleDeletePurity(p: Purity) {
    const { error } = await supabase.from('purities').delete().eq('id', p.id);
    if (error) toast({ title: 'Failed to delete purity', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Purity deleted' }); refresh(); }
  }

  async function handleDeleteMetal(m: Metal) {
    const { error } = await supabase.from('metals').delete().eq('id', m.id);
    if (error) toast({ title: 'Cannot delete metal — it may have transactions', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Metal deleted' }); refresh(); }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Metals & Purities"
        description="Manage the metals and purity standards your organization tracks."
        actions={
          <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> Add Metal</Button>
        }
      />

      {loading && <div className="text-sm text-muted-foreground">Loading...</div>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {metals.map((m) => {
          const metalPurities = purities.filter((p) => p.metal_id === m.id);
          return (
            <Card key={m.id}>
              <CardContent className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                      <Coins className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <div className="font-semibold">{m.name}</div>
                      <div className="text-xs text-muted-foreground">Code: {m.code}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <Switch checked={m.is_active} onCheckedChange={() => handleToggleActive(m)} />
                      <span className="text-xs text-muted-foreground">{m.is_active ? 'Active' : 'Inactive'}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(m)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteMetal(m)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {metalPurities.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-md border px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono">{p.value}</Badge>
                        <span className="text-sm">{p.name}</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => handleDeletePurity(p)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex gap-2">
                  <Input placeholder="Purity name (e.g. 916)" value={purityName} onChange={(e) => setPurityName(e.target.value)} className="h-8 text-sm" />
                  <Input placeholder="Value" type="number" value={purityValue} onChange={(e) => setPurityValue(e.target.value)} className="h-8 text-sm w-20" />
                  <Button variant="outline" size="sm" onClick={() => handleAddPurity(m.id)} disabled={!purityName || !purityValue}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!loading && metals.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Coins className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">No metals configured yet. Add your first metal to begin.</div>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMetal ? 'Edit Metal' : 'Add Metal'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Metal Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Platinum" />
            </div>
            <div className="space-y-2">
              <Label>Code</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. PT" maxLength={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={submitting || !name.trim()}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingMetal ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
