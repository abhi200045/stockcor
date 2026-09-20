import { supabase } from '@/lib/supabase';
import { fineWeight } from '@/lib/calc';
import { logAudit } from '@/lib/audit';

export async function seedDemoData(orgId: string, userId: string | null): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if demo data already exists
    const { count } = await supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('org_id', orgId);
    if ((count ?? 0) > 0) {
      return { success: false, error: 'Demo data already exists for this organization.' };
    }

    // Fetch existing metals, purities, locations
    const { data: metals } = await supabase.from('metals').select('*').eq('org_id', orgId).order('sort_order');
    const { data: purities } = await supabase.from('purities').select('*').eq('org_id', orgId).order('sort_order');
    const { data: locations } = await supabase.from('locations').select('*').eq('org_id', orgId).order('created_at');

    if (!metals || metals.length === 0 || !purities || purities.length === 0 || !locations || locations.length === 0) {
      return { success: false, error: 'Organization must have metals, purities, and locations configured first.' };
    }

    const goldMetal = metals.find((m: any) => m.name.toLowerCase().includes('gold'));
    const silverMetal = metals.find((m: any) => m.name.toLowerCase().includes('silver'));
    const location = locations[0];

    if (!goldMetal || !silverMetal) {
      return { success: false, error: 'Gold and Silver metals are required for demo data.' };
    }

    const goldPurities = purities.filter((p: any) => p.metal_id === goldMetal.id);
    const silverPurities = purities.filter((p: any) => p.metal_id === silverMetal.id);

    // Create demo suppliers
    const demoSuppliers = [
      { name: 'Swiss Refinery Corp', code: 'SRC', phone: '+41 22 555 0100', email: 'contact@swissref.demo', address: 'Zurich, Switzerland', gstin: null },
      { name: 'Mumbai Gold Exchange', code: 'MGE', phone: '+91 22 5555 0100', email: 'trade@mgoldex.demo', address: 'Zaveri Bazaar, Mumbai', gstin: '27AAAAA0000A1Z5' },
      { name: 'Ahmedabad Silver House', code: 'ASH', phone: '+91 79 5555 0100', email: 'info@ahmsilver.demo', address: 'Ratanpole, Ahmedabad', gstin: '24BBBBB0000B1Z2' },
    ];

    const supplierIds: string[] = [];
    for (const s of demoSuppliers) {
      const { data, error } = await supabase.from('parties').insert({
        org_id: orgId, type: 'supplier', name: s.name, code: s.code, phone: s.phone, email: s.email, address: s.address, gstin: s.gstin, is_active: true,
      }).select().maybeSingle();
      if (!error && data) supplierIds.push(data.id);
    }

    // Create demo customers
    const demoCustomers = [
      { name: 'Tanishq Jewellers', code: 'TAN', phone: '+91 80 5555 0100', email: 'purchase@tanishq.demo', address: 'Bangalore', gstin: '29AAACC0000C1Z3' },
      { name: 'Kalyan Jewellers', code: 'KAL', phone: '+91 484 555 0100', email: 'buy@kalyan.demo', address: 'Kochi', gstin: '32AAADK0000D1Z4' },
      { name: 'PC Jewellers', code: 'PCJ', phone: '+91 11 5555 0100', email: 'procurement@pcj.demo', address: 'New Delhi', gstin: '07AAAEPC0000E1Z5' },
      { name: 'Local Jeweller - Sharma Sons', code: 'SHM', phone: '+91 141 555 0100', email: 'sharma@jewellers.demo', address: 'Jaipur', gstin: '08AAAAS0000F1Z6' },
    ];

    const customerIds: string[] = [];
    for (const c of demoCustomers) {
      const { data, error } = await supabase.from('parties').insert({
        org_id: orgId, type: 'customer', name: c.name, code: c.code, phone: c.phone, email: c.email, address: c.address, gstin: c.gstin, is_active: true,
      }).select().maybeSingle();
      if (!error && data) customerIds.push(data.id);
    }

    // Opening stock
    const openingStocks = [
      { metal: goldMetal, purity: goldPurities.find((p: any) => p.value === 999), gross: 500 },
      { metal: goldMetal, purity: goldPurities.find((p: any) => p.value === 916), gross: 1200 },
      { metal: goldMetal, purity: goldPurities.find((p: any) => p.value === 750), gross: 350 },
      { metal: silverMetal, purity: silverPurities.find((p: any) => p.value === 999), gross: 15000 },
      { metal: silverMetal, purity: silverPurities.find((p: any) => p.value === 925), gross: 8000 },
    ];

    for (const os of openingStocks) {
      if (!os.purity) continue;
      const fw = parseFloat(fineWeight(os.gross, os.purity.value));
      const { data: txn } = await supabase.from('transactions').insert({
        org_id: orgId, txn_type: 'opening', ref_no: `OPENING-${os.purity.name}`, txn_date: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
        location_id: location.id, status: 'posted', created_by: userId, notes: 'DEMO DATA — NOT REAL TRANSACTIONS',
      }).select().maybeSingle();
      if (txn) {
        await supabase.from('transaction_items').insert({
          org_id: orgId, transaction_id: txn.id, metal_id: os.metal.id, purity_id: os.purity.id,
          gross_weight: os.gross, fine_weight: fw, rate: 0, amount: 0,
        });
        await supabase.from('inventory_ledger').insert({
          org_id: orgId, transaction_id: txn.id, metal_id: os.metal.id, purity_id: os.purity.id, location_id: location.id,
          entry_type: 'opening', gross_weight_delta: os.gross, fine_weight_delta: fw, ref_no: `OPENING-${os.purity.name}`,
          entry_date: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0], posted_by: userId,
        });
      }
    }

    // Demo purchases (last 15 days)
    const goldRate = 7200; // per gram
    const silverRate = 92;
    const purchases = [
      { daysAgo: 14, supplierIdx: 0, metal: goldMetal, purity: goldPurities.find((p: any) => p.value === 999), gross: 250, rate: goldRate },
      { daysAgo: 12, supplierIdx: 1, metal: goldMetal, purity: goldPurities.find((p: any) => p.value === 916), gross: 800, rate: goldRate * 0.916 },
      { daysAgo: 10, supplierIdx: 2, metal: silverMetal, purity: silverPurities.find((p: any) => p.value === 999), gross: 5000, rate: silverRate },
      { daysAgo: 7, supplierIdx: 0, metal: goldMetal, purity: goldPurities.find((p: any) => p.value === 995), gross: 150, rate: goldRate * 0.995 },
      { daysAgo: 5, supplierIdx: 2, metal: silverMetal, purity: silverPurities.find((p: any) => p.value === 925), gross: 3000, rate: silverRate * 0.925 },
      { daysAgo: 2, supplierIdx: 1, metal: goldMetal, purity: goldPurities.find((p: any) => p.value === 750), gross: 200, rate: goldRate * 0.75 },
      { daysAgo: 1, supplierIdx: 2, metal: silverMetal, purity: silverPurities.find((p: any) => p.value === 990), gross: 2000, rate: silverRate * 0.99 },
    ];

    for (const p of purchases) {
      if (!p.purity || !supplierIds[p.supplierIdx]) continue;
      const fw = parseFloat(fineWeight(p.gross, p.purity.value));
      const amt = fw * p.rate;
      const dateStr = new Date(Date.now() - p.daysAgo * 86400000).toISOString().split('T')[0];
      const { data: txn } = await supabase.from('transactions').insert({
        org_id: orgId, txn_type: 'purchase', ref_no: `PUR-${p.daysAgo}-${p.purity.name}`, txn_date: dateStr,
        party_id: supplierIds[p.supplierIdx], location_id: location.id, status: 'posted', created_by: userId, notes: 'DEMO DATA',
      }).select().maybeSingle();
      if (txn) {
        await supabase.from('transaction_items').insert({
          org_id: orgId, transaction_id: txn.id, metal_id: p.metal.id, purity_id: p.purity.id,
          gross_weight: p.gross, fine_weight: fw, rate: p.rate, amount: amt,
        });
        await supabase.from('inventory_ledger').insert({
          org_id: orgId, transaction_id: txn.id, metal_id: p.metal.id, purity_id: p.purity.id, location_id: location.id,
          entry_type: 'purchase', gross_weight_delta: p.gross, fine_weight_delta: fw, ref_no: `PUR-${p.daysAgo}`,
          entry_date: dateStr, posted_by: userId,
        });
      }
    }

    // Demo sales (last 10 days)
    const sales = [
      { daysAgo: 9, custIdx: 0, metal: goldMetal, purity: goldPurities.find((p: any) => p.value === 999), gross: 100, rate: goldRate + 50 },
      { daysAgo: 7, custIdx: 1, metal: goldMetal, purity: goldPurities.find((p: any) => p.value === 916), gross: 400, rate: (goldRate * 0.916) + 30 },
      { daysAgo: 5, custIdx: 3, metal: silverMetal, purity: silverPurities.find((p: any) => p.value === 925), gross: 2000, rate: silverRate * 0.925 + 5 },
      { daysAgo: 3, custIdx: 2, metal: goldMetal, purity: goldPurities.find((p: any) => p.value === 750), gross: 150, rate: (goldRate * 0.75) + 20 },
      { daysAgo: 1, custIdx: 0, metal: silverMetal, purity: silverPurities.find((p: any) => p.value === 999), gross: 3000, rate: silverRate + 3 },
      { daysAgo: 0, custIdx: 1, metal: goldMetal, purity: goldPurities.find((p: any) => p.value === 585), gross: 80, rate: (goldRate * 0.585) + 10 },
    ];

    for (const s of sales) {
      if (!s.purity || !customerIds[s.custIdx]) continue;
      const fw = parseFloat(fineWeight(s.gross, s.purity.value));
      const amt = fw * s.rate;
      const dateStr = new Date(Date.now() - s.daysAgo * 86400000).toISOString().split('T')[0];
      const { data: txn } = await supabase.from('transactions').insert({
        org_id: orgId, txn_type: 'sale', ref_no: `SAL-${s.daysAgo}-${s.purity.name}`, txn_date: dateStr,
        party_id: customerIds[s.custIdx], location_id: location.id, status: 'posted', created_by: userId, notes: 'DEMO DATA',
      }).select().maybeSingle();
      if (txn) {
        await supabase.from('transaction_items').insert({
          org_id: orgId, transaction_id: txn.id, metal_id: s.metal.id, purity_id: s.purity.id,
          gross_weight: s.gross, fine_weight: fw, rate: s.rate, amount: amt,
        });
        await supabase.from('inventory_ledger').insert({
          org_id: orgId, transaction_id: txn.id, metal_id: s.metal.id, purity_id: s.purity.id, location_id: location.id,
          entry_type: 'sale', gross_weight_delta: -s.gross, fine_weight_delta: -fw, ref_no: `SAL-${s.daysAgo}`,
          entry_date: dateStr, posted_by: userId,
        });
      }
    }

    // Mark org as demo
    await supabase.from('organizations').update({ is_demo: true }).eq('id', orgId);

    // Create a demo reconciliation with small variance
    const { data: recon } = await supabase.from('reconciliations').insert({
      org_id: orgId, recon_no: `RECON-DEMO-${Date.now().toString().slice(-6)}`,
      recon_date: new Date().toISOString().split('T')[0], location_id: location.id, status: 'draft',
    }).select().maybeSingle();

    if (recon) {
      // Fetch current book stock
      const { data: ledger } = await supabase.from('inventory_ledger').select('*').eq('org_id', orgId).eq('location_id', location.id);
      const bookMap = new Map<string, { gross: number; fine: number }>();
      (ledger ?? []).forEach((e: any) => {
        const key = `${e.metal_id}-${e.purity_id}`;
        const cur = bookMap.get(key) ?? { gross: 0, fine: 0 };
        cur.gross += e.gross_weight_delta ?? 0;
        cur.fine += e.fine_weight_delta ?? 0;
        bookMap.set(key, cur);
      });

      const reconLines: any[] = [];
      for (const [key, book] of bookMap.entries()) {
        const [mId, pId] = key.split('-');
        // Simulate small variance: physical is 99.8% of book
        const physGross = book.gross * 0.998;
        const purity = purities.find((p: any) => p.id === pId);
        const physFine = physGross * (purity?.value ?? 999) / 1000;
        reconLines.push({
          org_id: orgId, reconciliation_id: recon.id, metal_id: mId, purity_id: pId,
          book_gross: book.gross, book_fine: book.fine, physical_gross: physGross, physical_fine: physFine,
        });
      }
      if (reconLines.length > 0) {
        await supabase.from('reconciliation_lines').insert(reconLines);
      }
    }

    await logAudit({ org_id: orgId, user_id: userId, action: 'demo.data_seeded', entity_type: 'organization', entity_id: orgId, details: { note: 'DEMO DATA — NOT REAL TRANSACTIONS' } });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
