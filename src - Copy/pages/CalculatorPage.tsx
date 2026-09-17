import { useState, useMemo } from 'react';
import { useOrgData } from '@/hooks/use-org-data';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { fineWeight, grossWeight, amount, formatWeight, formatNumber, convertWeight, WEIGHT_UNITS, type WeightUnit } from '@/lib/calc';
import { formatCurrency } from '@/lib/format';
import { useAuth } from '@/context/AuthContext';
import { Calculator, ArrowLeftRight, Coins } from 'lucide-react';

export default function CalculatorPage() {
  const { organization } = useAuth();
  const { metals, purities, loading } = useOrgData();
  const [metalId, setMetalId] = useState('');
  const [purityId, setPurityId] = useState('');
  const [grossInput, setGrossInput] = useState('');
  const [fineInput, setFineInput] = useState('');
  const [rate, setRate] = useState('');
  const [unit, setUnit] = useState<WeightUnit>('g');
  const [convertFrom, setConvertFrom] = useState<WeightUnit>('g');
  const [convertTo, setConvertTo] = useState<WeightUnit>('tola');
  const [convertValue, setConvertValue] = useState('');

  const selectedPurity = purities.find((p) => p.id === purityId);
  const purityValue = selectedPurity?.value ?? 999;

  const computedFine = useMemo(() => {
    if (!grossInput) return '';
    const grams = parseFloat(convertWeight(grossInput, unit, 'g'));
    return fineWeight(grams, purityValue);
  }, [grossInput, unit, purityValue]);

  const computedGross = useMemo(() => {
    if (!fineInput) return '';
    const grams = parseFloat(convertWeight(fineInput, unit, 'g'));
    return grossWeight(grams, purityValue);
  }, [fineInput, unit, purityValue]);

  const computedAmount = useMemo(() => {
    const fw = grossInput ? computedFine : fineInput;
    if (!fw || !rate) return '';
    const grams = parseFloat(convertWeight(fw, unit, 'g'));
    return amount(grams, rate);
  }, [computedFine, fineInput, rate, unit]);

  const convertResult = useMemo(() => {
    if (!convertValue) return '';
    return convertWeight(convertValue, convertFrom, convertTo);
  }, [convertValue, convertFrom, convertTo]);

  const metalPurities = purities.filter((p) => p.metal_id === metalId);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Metal Calculator"
        description="Precise fine-weight, purity conversion, and value calculations using decimal arithmetic."
      />

      <Tabs defaultValue="fine">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="fine">Fine Weight</TabsTrigger>
          <TabsTrigger value="value">Value</TabsTrigger>
          <TabsTrigger value="convert">Unit Convert</TabsTrigger>
        </TabsList>

        {/* Fine Weight Tab */}
        <TabsContent value="fine">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calculator className="h-4 w-4" /> Gross → Fine
                </CardTitle>
                <CardDescription>Calculate fine weight from gross weight and purity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading && <div className="text-sm text-muted-foreground">Loading metals...</div>}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Metal</Label>
                    <Select value={metalId} onValueChange={(v) => { setMetalId(v); setPurityId(''); }}>
                      <SelectTrigger><SelectValue placeholder="Select metal" /></SelectTrigger>
                      <SelectContent>
                        {metals.map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Purity</Label>
                    <Select value={purityId} onValueChange={setPurityId} disabled={!metalId}>
                      <SelectTrigger><SelectValue placeholder="Select purity" /></SelectTrigger>
                      <SelectContent>
                        {metalPurities.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name} ({p.value})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Gross Weight</Label>
                    <div className="flex gap-2">
                      <Input type="number" step="0.001" placeholder="0.000" value={grossInput} onChange={(e) => setGrossInput(e.target.value)} />
                      <Select value={unit} onValueChange={(v) => setUnit(v as WeightUnit)}>
                        <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {WEIGHT_UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Rate (per gram)</Label>
                    <Input type="number" step="0.01" placeholder="0.00" value={rate} onChange={(e) => setRate(e.target.value)} />
                  </div>
                </div>
                <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Fine Weight</span>
                    <span className="font-mono font-semibold">{formatWeight(computedFine)} {unit}</span>
                  </div>
                  {rate && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Amount</span>
                      <span className="font-mono font-semibold">{formatCurrency(computedAmount, organization?.currency)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowLeftRight className="h-4 w-4" /> Fine → Gross
                </CardTitle>
                <CardDescription>Calculate gross weight from fine weight and purity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Metal</Label>
                    <Select value={metalId} onValueChange={(v) => { setMetalId(v); setPurityId(''); }}>
                      <SelectTrigger><SelectValue placeholder="Select metal" /></SelectTrigger>
                      <SelectContent>
                        {metals.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Purity</Label>
                    <Select value={purityId} onValueChange={setPurityId} disabled={!metalId}>
                      <SelectTrigger><SelectValue placeholder="Select purity" /></SelectTrigger>
                      <SelectContent>
                        {metalPurities.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.value})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Fine Weight</Label>
                  <div className="flex gap-2">
                    <Input type="number" step="0.001" placeholder="0.000" value={fineInput} onChange={(e) => setFineInput(e.target.value)} />
                    <Select value={unit} onValueChange={(v) => setUnit(v as WeightUnit)}>
                      <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {WEIGHT_UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Gross Weight</span>
                    <span className="font-mono font-semibold">{formatWeight(computedGross)} {unit}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Purity</span>
                    <span className="font-mono">{purityValue} / 1000</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Value Tab */}
        <TabsContent value="value">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Coins className="h-4 w-4" /> Value Calculator
              </CardTitle>
              <CardDescription>Calculate the monetary value of metal at a given rate</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Metal</Label>
                  <Select value={metalId} onValueChange={(v) => { setMetalId(v); setPurityId(''); }}>
                    <SelectTrigger><SelectValue placeholder="Select metal" /></SelectTrigger>
                    <SelectContent>
                      {metals.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Purity</Label>
                  <Select value={purityId} onValueChange={setPurityId} disabled={!metalId}>
                    <SelectTrigger><SelectValue placeholder="Select purity" /></SelectTrigger>
                    <SelectContent>
                      {metalPurities.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.value})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Gross Weight ({unit})</Label>
                  <Input type="number" step="0.001" placeholder="0.000" value={grossInput} onChange={(e) => setGrossInput(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Rate (per gram, {organization?.currency})</Label>
                  <Input type="number" step="0.01" placeholder="0.00" value={rate} onChange={(e) => setRate(e.target.value)} />
                </div>
              </div>
              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fine Weight</span>
                  <span className="font-mono font-semibold">{formatWeight(computedFine)} g</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Gross Weight</span>
                  <span className="font-mono">{formatWeight(grossInput || '0')} {unit}</span>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <span className="font-medium">Total Value</span>
                  <span className="font-mono text-lg font-bold">{formatCurrency(computedAmount, organization?.currency)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Unit Convert Tab */}
        <TabsContent value="convert">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowLeftRight className="h-4 w-4" /> Unit Converter
              </CardTitle>
              <CardDescription>Convert between mg, g, kg, tola, and troy oz</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>From</Label>
                  <Select value={convertFrom} onValueChange={(v) => setConvertFrom(v as WeightUnit)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {WEIGHT_UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input type="number" step="0.001" placeholder="0.000" value={convertValue} onChange={(e) => setConvertValue(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>To</Label>
                  <Select value={convertTo} onValueChange={(v) => setConvertTo(v as WeightUnit)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {WEIGHT_UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="flex h-10 items-center rounded-md border bg-muted/50 px-3 font-mono text-sm font-semibold">
                    {convertValue ? formatNumber(convertResult, 6) : '—'}
                  </div>
                </div>
              </div>
              <div className="rounded-lg bg-muted/50 p-4 text-sm">
                <div className="font-medium mb-2">Conversion factors (to grams):</div>
                <div className="grid grid-cols-2 gap-1 font-mono text-xs text-muted-foreground sm:grid-cols-3">
                  <div>1 mg = 0.001 g</div>
                  <div>1 g = 1 g</div>
                  <div>1 kg = 1000 g</div>
                  <div>1 tola = 11.664 g</div>
                  <div>1 oz = 31.103 g</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
