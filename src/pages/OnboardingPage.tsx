import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { logAudit } from '@/lib/audit';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ShieldCheck, Loader2, ArrowRight, ArrowLeft, Check } from 'lucide-react';

const BUSINESS_TYPES = [
  { value: 'dealer', label: 'Bullion Dealer' },
  { value: 'trader', label: 'Gold/Silver Trader' },
  { value: 'wholesaler', label: 'Silver Wholesaler' },
  { value: 'manufacturer', label: 'Jewellery Manufacturer' },
  { value: 'processor', label: 'Precious Metal Processor' },
  { value: 'refinery', label: 'Refinery' },
  { value: 'retailer', label: 'Jewellery Retailer' },
  { value: 'other', label: 'Other' },
];

const DEFAULT_METALS = [
  {
    name: 'Gold',
    code: 'AU',
    purities: [
      { name: '999 (24K)', value: 999 },
      { name: '995', value: 995 },
      { name: '916 (22K)', value: 916 },
      { name: '750 (18K)', value: 750 },
      { name: '585 (14K)', value: 585 },
      { name: '375 (9K)', value: 375 },
    ],
  },
  {
    name: 'Silver',
    code: 'AG',
    purities: [
      { name: '999', value: 999 },
      { name: '990', value: 990 },
      { name: '925 (Sterling)', value: 925 },
      { name: '900', value: 900 },
      { name: '835', value: 835 },
    ],
  },
];

type Step = 'org' | 'metals' | 'location' | 'opening' | 'done';

export default function OnboardingPage() {
  const { user, refreshOrg } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('org');
  const [submitting, setSubmitting] = useState(false);

  const [orgName, setOrgName] = useState('');
  const [businessType, setBusinessType] = useState('dealer');
  const [currency, setCurrency] = useState('INR');

  const [selectedMetals, setSelectedMetals] = useState<number[]>([0, 1]);
  const [customMetalName, setCustomMetalName] = useState('');
  const [customMetalCode, setCustomMetalCode] = useState('');

  const [locationName, setLocationName] = useState('');
  const [locationCode, setLocationCode] = useState('');
  const [locationAddress, setLocationAddress] = useState('');

  const [openingStock, setOpeningStock] = useState<Record<string, string>>({});

  const { organization } = useAuth();

  useEffect(() => {
    if (!user) navigate('/', { replace: true });
  }, [user, navigate]);

  if (!user) return null;

  const steps: Step[] = ['org', 'metals', 'location', 'opening', 'done'];
  const currentIdx = steps.indexOf(step);

  async function handleOrgNext() {
    if (!orgName.trim()) {
      toast({ title: 'Organization name required', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: orgName.trim(),
        business_type: businessType,
        currency,
        weight_unit: 'g',
        onboarding_complete: false,
      })
      .select()
      .maybeSingle();

    if (orgError || !orgData) {
      toast({ title: 'Failed to create organization', description: orgError?.message, variant: 'destructive' });
      setSubmitting(false);
      return;
    }

    const { error: memberError } = await supabase.from('organization_members').insert({
      org_id: orgData.id,
      user_id: user!.id,
      role: 'owner',
    });

    if (memberError) {
      toast({ title: 'Failed to link account', description: memberError.message, variant: 'destructive' });
      setSubmitting(false);
      return;
    }

    await refreshOrg();
    await logAudit({
      org_id: orgData.id,
      user_id: user!.id,
      action: 'organization.created',
      entity_type: 'organization',
      entity_id: orgData.id,
      details: { name: orgName, business_type: businessType },
    });
    setSubmitting(false);
    setStep('metals');
  }

  async function handleMetalsNext() {
    if (!organization) return;
    setSubmitting(true);

    const metalsToCreate = selectedMetals.map((i) => DEFAULT_METALS[i]);
    if (customMetalName.trim()) {
      metalsToCreate.push({
        name: customMetalName.trim(),
        code: customMetalCode.trim() || customMetalName.slice(0, 2).toUpperCase(),
        purities: [{ name: '999', value: 999 }],
      });
    }

    for (let idx = 0; idx < metalsToCreate.length; idx++) {
      const m = metalsToCreate[idx];
      const { data: metalData, error: metalError } = await supabase
        .from('metals')
        .insert({
          org_id: organization!.id,
          name: m.name,
          code: m.code,
          unit: 'g',
          sort_order: idx,
        })
        .select()
        .maybeSingle();

      if (metalError || !metalData) {
        toast({ title: `Failed to create metal ${m.name}`, description: metalError?.message, variant: 'destructive' });
        setSubmitting(false);
        return;
      }

      const purityRows = m.purities.map((p, pIdx) => ({
        org_id: organization!.id,
        metal_id: metalData.id,
        name: p.name,
        value: p.value,
        sort_order: pIdx,
      }));
      const { error: purityError } = await supabase.from('purities').insert(purityRows);
      if (purityError) {
        toast({ title: `Failed to create purities for ${m.name}`, description: purityError.message, variant: 'destructive' });
        setSubmitting(false);
        return;
      }
    }

    setSubmitting(false);
    setStep('location');
  }

  async function handleLocationNext() {
    if (!organization) return;
    if (!locationName.trim()) {
      toast({ title: 'Location name required', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('locations').insert({
      org_id: organization.id,
      name: locationName.trim(),
      code: locationCode.trim() || locationName.slice(0, 3).toUpperCase(),
      address: locationAddress.trim() || null,
    });
    if (error) {
      toast({ title: 'Failed to create location', description: error.message, variant: 'destructive' });
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    setStep('opening');
  }

  async function handleOpeningComplete() {
    if (!organization) return;
    setSubmitting(true);

    const { data: metals } = await supabase
      .from('metals')
      .select('*, purities(*)')
      .eq('org_id', organization.id)
      .order('sort_order');

    const { data: location } = await supabase
      .from('locations')
      .select('*')
      .eq('org_id', organization.id)
      .order('created_at')
      .limit(1)
      .maybeSingle();

    if (metals && location) {
      for (const metal of metals) {
        for (const purity of metal.purities ?? []) {
          const key = `${metal.id}-${purity.id}`;
          const gross = parseFloat(openingStock[key] ?? '0');
          if (gross > 0) {
            const fine = (gross * purity.value) / 1000;
            const { data: txn } = await supabase
              .from('transactions')
              .insert({
                org_id: organization.id,
                txn_type: 'opening',
                ref_no: `OPENING-${purity.name}`,
                txn_date: new Date().toISOString().split('T')[0],
                location_id: location.id,
                status: 'posted',
                created_by: user!.id,
                notes: 'Opening stock from onboarding',
              })
              .select()
              .maybeSingle();

            if (txn) {
              await supabase.from('transaction_items').insert({
                org_id: organization.id,
                transaction_id: txn.id,
                metal_id: metal.id,
                purity_id: purity.id,
                gross_weight: gross,
                fine_weight: fine,
                rate: 0,
                amount: 0,
              });

              await supabase.from('inventory_ledger').insert({
                org_id: organization.id,
                transaction_id: txn.id,
                metal_id: metal.id,
                purity_id: purity.id,
                location_id: location.id,
                entry_type: 'opening',
                gross_weight_delta: gross,
                fine_weight_delta: fine,
                ref_no: `OPENING-${purity.name}`,
                entry_date: new Date().toISOString().split('T')[0],
                posted_by: user!.id,
              });
            }
          }
        }
      }
    }

    await supabase
      .from('organizations')
      .update({ onboarding_complete: true })
      .eq('id', organization.id);

    await refreshOrg();
    await logAudit({
      org_id: organization.id,
      user_id: user!.id,
      action: 'onboarding.completed',
      entity_type: 'organization',
      entity_id: organization.id,
    });

    setSubmitting(false);
    setStep('done');
  }

  if (step === 'done') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <Card className="max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
              <Check className="h-7 w-7 text-success" />
            </div>
            <CardTitle className="text-2xl">You're all set</CardTitle>
            <CardDescription>Your StockCor workspace is ready.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/app')} className="w-full" size="lg">
              Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-6 py-12">
        {/* Header */}
        <div className="mb-8 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="h-4.5 w-4.5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">STOCKCOR</span>
        </div>

        {/* Stepper */}
        <div className="mb-8 flex items-center gap-2">
          {steps.slice(0, 4).map((s, i) => (
            <div key={s} className="flex flex-1 items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                  i <= currentIdx
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {i < currentIdx ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              {i < 3 && <div className={`h-px flex-1 ${i < currentIdx ? 'bg-primary' : 'bg-border'}`} />}
            </div>
          ))}
        </div>

        {step === 'org' && (
          <Card>
            <CardHeader>
              <CardTitle>Set up your organization</CardTitle>
              <CardDescription>Tell us about your business to configure your workspace.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orgName">Organization name</Label>
                <Input
                  id="orgName"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. Acme Bullion Pvt Ltd"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Business type</Label>
                  <Select value={businessType} onValueChange={setBusinessType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_TYPES.map((b) => (
                        <SelectItem key={b.value} value={b.value}>
                          {b.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR (₹)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="AED">AED (د.إ)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleOrgNext} className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'metals' && (
          <Card>
            <CardHeader>
              <CardTitle>Select your metals</CardTitle>
              <CardDescription>Choose the metals and standard purities to track.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {DEFAULT_METALS.map((m, i) => (
                  <label
                    key={m.name}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={selectedMetals.includes(i)}
                      onCheckedChange={(checked) => {
                        if (checked) setSelectedMetals([...selectedMetals, i]);
                        else setSelectedMetals(selectedMetals.filter((x) => x !== i));
                      }}
                    />
                    <div className="flex-1">
                      <div className="font-medium">
                        {m.name} <span className="text-muted-foreground">({m.code})</span>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        Purities: {m.purities.map((p) => p.name).join(', ')}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              <div className="rounded-lg border border-dashed p-4">
                <div className="mb-2 text-sm font-medium">Add a custom metal (optional)</div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Name (e.g. Platinum)"
                    value={customMetalName}
                    onChange={(e) => setCustomMetalName(e.target.value)}
                  />
                  <Input
                    placeholder="Code (e.g. PT)"
                    value={customMetalCode}
                    onChange={(e) => setCustomMetalCode(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('org')}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button onClick={handleMetalsNext} className="flex-1" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'location' && (
          <Card>
            <CardHeader>
              <CardTitle>Add a location</CardTitle>
              <CardDescription>Where is your primary stock stored?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="locName">Location name</Label>
                <Input
                  id="locName"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="e.g. Main Vault"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="locCode">Location code</Label>
                <Input
                  id="locCode"
                  value={locationCode}
                  onChange={(e) => setLocationCode(e.target.value)}
                  placeholder="e.g. MVLT"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="locAddr">Address (optional)</Label>
                <Input
                  id="locAddr"
                  value={locationAddress}
                  onChange={(e) => setLocationAddress(e.target.value)}
                  placeholder="Address line"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('metals')}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button onClick={handleLocationNext} className="flex-1" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'opening' && (
          <OpeningStockStep
            openingStock={openingStock}
            setOpeningStock={setOpeningStock}
            onBack={() => setStep('location')}
            onComplete={handleOpeningComplete}
            submitting={submitting}
          />
        )}
      </div>
    </div>
  );
}

function OpeningStockStep({
  openingStock,
  setOpeningStock,
  onBack,
  onComplete,
  submitting,
}: {
  openingStock: Record<string, string>;
  setOpeningStock: (v: Record<string, string>) => void;
  onBack: () => void;
  onComplete: () => void;
  submitting: boolean;
}) {
  const { organization } = useAuth();
  const [metals, setMetals] = useState<Array<{ id: string; name: string; purities: Array<{ id: string; name: string; value: number }> }>>([]);

  useEffect(() => {
    if (!organization) return;
    supabase
      .from('metals')
      .select('*, purities(*)')
      .eq('org_id', organization.id)
      .order('sort_order')
      .then(({ data }) => {
        if (data) setMetals(data as never);
      });
  }, [organization]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Opening stock</CardTitle>
        <CardDescription>
          Enter your current stock position. Leave blank if zero. You can adjust later.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {metals.length === 0 && (
          <div className="text-sm text-muted-foreground">Loading metals...</div>
        )}
        {metals.map((m) => (
          <div key={m.id} className="space-y-2">
            <div className="text-sm font-medium">{m.name}</div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {m.purities.map((p) => {
                const key = `${m.id}-${p.id}`;
                return (
                  <div key={p.id} className="flex items-center gap-2">
                    <Label className="w-24 text-muted-foreground">{p.name}</Label>
                    <Input
                      type="number"
                      step="0.001"
                      placeholder="0.000"
                      value={openingStock[key] ?? ''}
                      onChange={(e) => setOpeningStock({ ...openingStock, [key]: e.target.value })}
                    />
                    <span className="text-xs text-muted-foreground">g</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button onClick={onComplete} className="flex-1" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Complete Setup <Check className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
