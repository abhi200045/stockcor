import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOrgData } from '@/hooks/use-org-data';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Send, Loader2, TrendingUp, AlertTriangle, Scale } from 'lucide-react';
import { formatWeight, formatNumber } from '@/lib/calc';
import { formatCurrency, formatDate } from '@/lib/format';
import type { AiConversation } from '@/lib/types';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

const SUGGESTIONS = [
  "What is my current gold stock?",
  "What is my current silver stock?",
  "Show me this month's purchases",
  "Show me this month's sales",
  "Are there any variances?",
  "What are the pending reconciliations?",
  "Supplier-wise purchases this month",
  "Customer-wise sales this month",
  "Show me unusual transactions",
  "What is my inventory valuation?",
];

export default function IntelligencePage() {
  const { organization, user } = useAuth();
  const { metals, purities, locations } = useOrgData();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [history, setHistory] = useState<AiConversation[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!organization) return;
    (async () => {
      const { data } = await supabase.from('ai_conversations').select('*').eq('org_id', organization.id).order('created_at', { ascending: true }).limit(50);
      setHistory((data as AiConversation[]) ?? []);
      setMessages((data as AiConversation[])?.map((m) => ({ role: m.role, content: m.content, created_at: m.created_at })) ?? []);
    })();
  }, [organization]);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  async function ask(question: string) {
    if (!organization || !question.trim()) return;
    setAnalyzing(true);
    const userMsg: ChatMessage = { role: 'user', content: question };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    await supabase.from('ai_conversations').insert({ org_id: organization.id, user_id: user?.id ?? null, role: 'user', content: question });

    const answer = await analyzeQuery(question, organization.id, { metals, purities, locations });

    const assistantMsg: ChatMessage = { role: 'assistant', content: answer };
    setMessages((prev) => [...prev, assistantMsg]);

    await supabase.from('ai_conversations').insert({ org_id: organization.id, user_id: user?.id ?? null, role: 'assistant', content: answer });

    setAnalyzing(false);
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="AI Intelligence"
        description="Ask questions about your operations. AI can analyze and recommend, but never modify inventory or approve transactions."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Chat */}
        <Card className="lg:col-span-2 flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4" /> Assistant</CardTitle>
            <CardDescription>Analyzes your organization data only. Read-only — no modifications.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col p-0">
            <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-4 pb-4 space-y-3">
              {messages.length === 0 && (
                <div className="flex h-full items-center justify-center text-center">
                  <div>
                    <Sparkles className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                    <div className="text-sm text-muted-foreground">Ask a question about your metal operations.</div>
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  </div>
                </div>
              ))}
              {analyzing && (
                <div className="flex justify-start">
                  <div className="rounded-lg bg-muted px-4 py-2.5 text-sm"><Loader2 className="inline h-4 w-4 animate-spin mr-2" />Analyzing...</div>
                </div>
              )}
            </div>
            <div className="border-t p-3 flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !analyzing) ask(input); }}
                placeholder="Ask about your stock, purchases, sales, variances..."
                disabled={analyzing}
              />
              <Button onClick={() => ask(input)} disabled={analyzing || !input.trim()}><Send className="h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>

        {/* Suggestions */}
        <div className="space-y-3">
          <Card>
            <CardHeader><CardTitle className="text-sm">Suggested Questions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => !analyzing && ask(s)}
                  disabled={analyzing}
                  className="block w-full rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50 disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>AI can analyze and recommend, but will never automatically modify inventory, approve transactions, delete records, or perform financial actions.</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

async function analyzeQuery(query: string, orgId: string, ctx: { metals: any[]; purities: any[]; locations: any[] }): Promise<string> {
  const q = query.toLowerCase();
  const { metals, purities } = ctx;

  const { data: ledger } = await supabase.from('inventory_ledger').select('*').eq('org_id', orgId);
  const ledgerData = (ledger as any[]) ?? [];

  // Compute stock positions
  const stockMap = new Map<string, { gross: number; fine: number }>();
  for (const e of ledgerData) {
    const key = `${e.metal_id}-${e.purity_id}`;
    const cur = stockMap.get(key) ?? { gross: 0, fine: 0 };
    cur.gross += e.gross_weight_delta ?? 0;
    cur.fine += e.fine_weight_delta ?? 0;
    stockMap.set(key, cur);
  }

  // Gold stock
  if (q.includes('gold') && (q.includes('stock') || q.includes('position') || q.includes('how much'))) {
    let totalFine = 0, totalGross = 0;
    const lines: string[] = [];
    for (const [key, val] of stockMap.entries()) {
      const [mId, pId] = key.split('-');
      const metal = metals.find((m) => m.id === mId);
      if (metal?.name.toLowerCase().includes('gold')) {
        const purity = purities.find((p) => p.id === pId);
        totalFine += val.fine;
        totalGross += val.gross;
        if (val.fine !== 0) lines.push(`  ${purity?.name}: ${formatWeight(val.gross)} g gross, ${formatWeight(val.fine)} g fine`);
      }
    }
    return `Current Gold Position:\n${lines.length > 0 ? lines.join('\n') : '  No gold stock recorded.'}\n\nTotal: ${formatWeight(totalGross)} g gross, ${formatWeight(totalFine)} g fine`;
  }

  // Silver stock
  if (q.includes('silver') && (q.includes('stock') || q.includes('position') || q.includes('how much'))) {
    let totalFine = 0, totalGross = 0;
    const lines: string[] = [];
    for (const [key, val] of stockMap.entries()) {
      const [mId, pId] = key.split('-');
      const metal = metals.find((m) => m.id === mId);
      if (metal?.name.toLowerCase().includes('silver')) {
        const purity = purities.find((p) => p.id === pId);
        totalFine += val.fine;
        totalGross += val.gross;
        if (val.fine !== 0) lines.push(`  ${purity?.name}: ${formatWeight(val.gross)} g gross, ${formatWeight(val.fine)} g fine`);
      }
    }
    return `Current Silver Position:\n${lines.length > 0 ? lines.join('\n') : '  No silver stock recorded.'}\n\nTotal: ${formatWeight(totalGross)} g gross, ${formatWeight(totalFine)} g fine`;
  }

  // Purchases
  if (q.includes('purchase') && (q.includes('month') || q.includes('show'))) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const { data: txns } = await supabase.from('transactions').select('*, party:parties(name), items:transaction_items(*)').eq('org_id', orgId).eq('txn_type', 'purchase').gte('txn_date', monthStart);
    const tData = (txns as any[]) ?? [];
    if (tData.length === 0) return 'No purchases recorded this month.';
    const totalAmt = tData.reduce((s, t) => s + (t.items ?? []).reduce((ss: number, i: any) => ss + i.amount, 0), 0);
    const totalGross = tData.reduce((s, t) => s + (t.items ?? []).reduce((ss: number, i: any) => ss + i.gross_weight, 0), 0);
    const totalFine = tData.reduce((s, t) => s + (t.items ?? []).reduce((ss: number, i: any) => ss + i.fine_weight, 0), 0);
    return `Purchases this month (${tData.length} transactions):\n  Total Gross: ${formatWeight(totalGross)} g\n  Total Fine: ${formatWeight(totalFine)} g\n  Total Amount: ${formatCurrency(totalAmt)}\n\nRecent:\n${tData.slice(0, 5).map((t) => `  ${formatDate(t.txn_date)} — ${t.party?.name ?? '—'} — ${formatCurrency((t.items ?? []).reduce((ss: number, i: any) => ss + i.amount, 0))}`).join('\n')}`;
  }

  // Sales
  if ((q.includes('sale') || q.includes('issue')) && (q.includes('month') || q.includes('show'))) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const { data: txns } = await supabase.from('transactions').select('*, party:parties(name), items:transaction_items(*)').eq('org_id', orgId).in('txn_type', ['sale', 'issue']).gte('txn_date', monthStart);
    const tData = (txns as any[]) ?? [];
    if (tData.length === 0) return 'No sales/issues recorded this month.';
    const totalAmt = tData.reduce((s, t) => s + (t.items ?? []).reduce((ss: number, i: any) => ss + i.amount, 0), 0);
    const totalGross = tData.reduce((s, t) => s + (t.items ?? []).reduce((ss: number, i: any) => ss + i.gross_weight, 0), 0);
    const totalFine = tData.reduce((s, t) => s + (t.items ?? []).reduce((ss: number, i: any) => ss + i.fine_weight, 0), 0);
    return `Sales/Issues this month (${tData.length} transactions):\n  Total Gross: ${formatWeight(totalGross)} g\n  Total Fine: ${formatWeight(totalFine)} g\n  Total Amount: ${formatCurrency(totalAmt)}\n\nRecent:\n${tData.slice(0, 5).map((t) => `  ${formatDate(t.txn_date)} — ${t.party?.name ?? '—'} — ${formatCurrency((t.items ?? []).reduce((ss: number, i: any) => ss + i.amount, 0))}`).join('\n')}`;
  }

  // Supplier-wise purchases
  if (q.includes('supplier') && q.includes('purchase')) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const { data: txns } = await supabase.from('transactions').select('*, party:parties(name), items:transaction_items(*)').eq('org_id', orgId).eq('txn_type', 'purchase').eq('status', 'posted').gte('txn_date', monthStart);
    const tData = (txns as any[]) ?? [];
    const bySupplier = new Map<string, { count: number; amount: number; gross: number }>();
    for (const t of tData) {
      const name = t.party?.name ?? 'Unknown';
      const cur = bySupplier.get(name) ?? { count: 0, amount: 0, gross: 0 };
      cur.count++;
      cur.amount += (t.items ?? []).reduce((ss: number, i: any) => ss + i.amount, 0);
      cur.gross += (t.items ?? []).reduce((ss: number, i: any) => ss + i.gross_weight, 0);
      bySupplier.set(name, cur);
    }
    if (bySupplier.size === 0) return 'No supplier purchases this month.';
    const lines = Array.from(bySupplier.entries()).sort((a, b) => b[1].amount - a[1].amount).map(([name, v]) => `  ${name}: ${v.count} txn(s), ${formatWeight(v.gross)} g, ${formatCurrency(v.amount)}`);
    return `Supplier-wise purchases this month:\n${lines.join('\n')}`;
  }

  // Customer-wise sales
  if (q.includes('customer') && (q.includes('sale') || q.includes('sales'))) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const { data: txns } = await supabase.from('transactions').select('*, party:parties(name), items:transaction_items(*)').eq('org_id', orgId).in('txn_type', ['sale', 'issue']).eq('status', 'posted').gte('txn_date', monthStart);
    const tData = (txns as any[]) ?? [];
    const byCustomer = new Map<string, { count: number; amount: number; gross: number }>();
    for (const t of tData) {
      const name = t.party?.name ?? 'Unknown';
      const cur = byCustomer.get(name) ?? { count: 0, amount: 0, gross: 0 };
      cur.count++;
      cur.amount += (t.items ?? []).reduce((ss: number, i: any) => ss + i.amount, 0);
      cur.gross += (t.items ?? []).reduce((ss: number, i: any) => ss + i.gross_weight, 0);
      byCustomer.set(name, cur);
    }
    if (byCustomer.size === 0) return 'No customer sales this month.';
    const lines = Array.from(byCustomer.entries()).sort((a, b) => b[1].amount - a[1].amount).map(([name, v]) => `  ${name}: ${v.count} txn(s), ${formatWeight(v.gross)} g, ${formatCurrency(v.amount)}`);
    return `Customer-wise sales this month:\n${lines.join('\n')}`;
  }

  // Variances
  if (q.includes('variance')) {
    const { data: recons } = await supabase.from('reconciliations').select('*, lines:reconciliation_lines(*)').eq('org_id', orgId).in('status', ['approved', 'closed']);
    const rData = (recons as any[]) ?? [];
    const varLines: string[] = [];
    for (const r of rData) {
      for (const l of (r.lines ?? [])) {
        if (l.fine_variance !== 0) {
          const metal = metals.find((m) => m.id === l.metal_id);
          const purity = purities.find((p) => p.id === l.purity_id);
          varLines.push(`  ${r.recon_no} — ${metal?.name ?? '—'} ${purity?.name ?? '—'}: ${l.fine_variance > 0 ? '+' : ''}${formatWeight(l.fine_variance)} g (${formatNumber(l.variance_pct, 2)}%)`);
        }
      }
    }
    return varLines.length > 0 ? `Variances found (${varLines.length}):\n${varLines.join('\n')}` : 'No variances recorded in approved/closed reconciliations.';
  }

  // Pending reconciliations
  if (q.includes('pending') && q.includes('recon')) {
    const { data: recons } = await supabase.from('reconciliations').select('*').eq('org_id', orgId).in('status', ['draft', 'submitted', 'reviewed']);
    const rData = (recons as any[]) ?? [];
    if (rData.length === 0) return 'No pending reconciliations.';
    return `Pending reconciliations (${rData.length}):\n${rData.map((r) => `  ${r.recon_no} — ${formatDate(r.recon_date)} — ${r.status}`).join('\n')}`;
  }

  // Unusual transactions
  if (q.includes('unusual') || q.includes('anomal')) {
    const { data: txns } = await supabase.from('transactions').select('*, party:parties(name), items:transaction_items(*)').eq('org_id', orgId).eq('status', 'posted').order('created_at', { ascending: false }).limit(100);
    const tData = (txns as any[]) ?? [];
    const unusual: string[] = [];
    for (const t of tData) {
      const items = t.items ?? [];
      const totalGross = items.reduce((s: number, i: any) => s + i.gross_weight, 0);
      const totalAmt = items.reduce((s: number, i: any) => s + i.amount, 0);
      if (totalGross > 1000) unusual.push(`  Large ${t.txn_type}: ${t.ref_no} — ${formatWeight(totalGross)} g — ${formatCurrency(totalAmt)}`);
      if (items.some((i: any) => i.rate > 100000)) unusual.push(`  High rate in ${t.ref_no}: ${t.party?.name ?? '—'}`);
    }
    return unusual.length > 0 ? `Potentially unusual transactions:\n${unusual.slice(0, 10).join('\n')}` : 'No unusual transactions detected in recent data.';
  }

  // Inventory valuation
  if (q.includes('valuation') || q.includes('value')) {
    let totalGross = 0, totalFine = 0;
    const lines: string[] = [];
    for (const [key, val] of stockMap.entries()) {
      const [mId] = key.split('-');
      const metal = metals.find((m) => m.id === mId);
      totalGross += val.gross;
      totalFine += val.fine;
      if (val.fine > 0) lines.push(`  ${metal?.name ?? '—'}: ${formatWeight(val.gross)} g gross, ${formatWeight(val.fine)} g fine`);
    }
    return `Inventory Valuation:\n${lines.length > 0 ? lines.join('\n') : '  No stock recorded.'}\n\nTotal: ${formatWeight(totalGross)} g gross, ${formatWeight(totalFine)} g fine\n\nNote: Set metal rates in Settings to enable monetary valuation.`;
  }

  // General stock
  if (q.includes('stock') || q.includes('inventory') || q.includes('position')) {
    const lines: string[] = [];
    for (const [key, val] of stockMap.entries()) {
      const [mId, pId] = key.split('-');
      const metal = metals.find((m) => m.id === mId);
      const purity = purities.find((p) => p.id === pId);
      if (val.fine !== 0) lines.push(`  ${metal?.name ?? '—'} ${purity?.name ?? '—'}: ${formatWeight(val.gross)} g gross, ${formatWeight(val.fine)} g fine`);
    }
    return `Current Stock Position:\n${lines.length > 0 ? lines.join('\n') : '  No stock recorded.'}`;
  }

  return `I can help you analyze your operations. Try asking about:\n  • Current gold/silver stock\n  • This month's purchases or sales\n  • Supplier-wise or customer-wise summaries\n  • Variances and reconciliations\n  • Unusual transactions\n  • Inventory valuation\n\nYour question was: "${query}"`;
}
