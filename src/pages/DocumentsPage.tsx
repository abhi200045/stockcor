import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Upload, Loader2 } from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/format';
import type { Document } from '@/lib/types';

export default function DocumentsPage() {
  const { organization, user } = useAuth();
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [docType, setDocType] = useState('invoice');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadDocs(); }, [organization]);

  async function loadDocs() {
    if (!organization) return;
    setLoading(true);
    const { data } = await supabase.from('documents').select('*').eq('org_id', organization.id).order('created_at', { ascending: false });
    setDocs((data as Document[]) ?? []);
    setLoading(false);
  }

  async function handleSave() {
    if (!organization || !name.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from('documents').insert({
      org_id: organization.id,
      name: name.trim(),
      doc_type: docType,
      uploaded_by: user?.id ?? null,
    });
    if (error) {
      // toast error
    } else {
      setName('');
      setDialogOpen(false);
      loadDocs();
    }
    setSubmitting(false);
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Documents"
        description="Store and organize transaction documents, invoices, and certificates."
        actions={<Button onClick={() => setDialogOpen(true)}><Upload className="mr-2 h-4 w-4" /> Add Document</Button>}
      />

      {loading && <div className="text-sm text-muted-foreground">Loading...</div>}

      {!loading && docs.length === 0 && (
        <Card><CardContent className="py-12 text-center"><FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground" /><div className="text-sm text-muted-foreground">No documents yet.</div></CardContent></Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {docs.map((d) => (
          <Card key={d.id}>
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted"><FileText className="h-5 w-5 text-muted-foreground" /></div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{d.name}</div>
                  <Badge variant="secondary" className="mt-0.5 text-xs capitalize">{d.doc_type}</Badge>
                  <div className="mt-1 text-xs text-muted-foreground">{formatDateTime(d.created_at)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Document</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Document Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Purchase Invoice #12345" /></div>
            <div className="space-y-2"><Label>Type</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="invoice">Invoice</SelectItem>
                  <SelectItem value="receipt">Receipt</SelectItem>
                  <SelectItem value="certificate">Certificate</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={submitting || !name.trim()}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
