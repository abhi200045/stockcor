import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { logAudit } from '@/lib/audit';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, Building2, Sliders } from 'lucide-react';

export default function SettingsPage() {
  const { organization, user, refreshOrg } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState(organization?.name ?? '');
  const [businessType, setBusinessType] = useState(organization?.business_type ?? 'dealer');
  const [currency, setCurrency] = useState(organization?.currency ?? 'INR');
  const [weightUnit, setWeightUnit] = useState(organization?.weight_unit ?? 'g');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!organization) return;
    setSaving(true);
    const { error } = await supabase
      .from('organizations')
      .update({ name: name.trim(), business_type: businessType, currency, weight_unit: weightUnit })
      .eq('id', organization.id);
    if (error) {
      toast({ title: 'Failed to save', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Settings saved' });
      await logAudit({ org_id: organization.id, user_id: user?.id ?? null, action: 'settings.updated', entity_type: 'organization', entity_id: organization.id });
      await refreshOrg();
    }
    setSaving(false);
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Settings" description="Configure your organization preferences." />

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" /> Organization</CardTitle>
            <CardDescription>Basic information about your business.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Organization Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Business Type</Label>
                <Select value={businessType} onValueChange={setBusinessType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dealer">Bullion Dealer</SelectItem>
                    <SelectItem value="trader">Gold/Silver Trader</SelectItem>
                    <SelectItem value="wholesaler">Silver Wholesaler</SelectItem>
                    <SelectItem value="manufacturer">Jewellery Manufacturer</SelectItem>
                    <SelectItem value="processor">Precious Metal Processor</SelectItem>
                    <SelectItem value="refinery">Refinery</SelectItem>
                    <SelectItem value="retailer">Jewellery Retailer</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Sliders className="h-4 w-4" /> Preferences</CardTitle>
            <CardDescription>Default measurement units for calculations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Default Weight Unit</Label>
              <Select value={weightUnit} onValueChange={setWeightUnit}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="g">Gram (g)</SelectItem>
                  <SelectItem value="kg">Kilogram (kg)</SelectItem>
                  <SelectItem value="mg">Milligram (mg)</SelectItem>
                  <SelectItem value="tola">Tola</SelectItem>
                  <SelectItem value="oz">Troy Ounce (oz)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saving || !name.trim()}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" /> Save Changes
        </Button>
      </div>
    </div>
  );
}
