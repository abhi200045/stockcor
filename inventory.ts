import { supabase } from '@/lib/supabase';
import type { Transaction, TransactionItem, TxnType, Purity } from '@/lib/types';
import { fineWeight as calcFineWeight } from '@/lib/calc';
import { logAudit } from '@/lib/audit';

interface PostResult {
  success: boolean;
  error?: string;
  postedCount?: number;
}

const SIGN_MAP: Record<TxnType, number> = {
  purchase: 1,
  opening: 1,
  transfer_in: 1,
  adjustment_in: 1,
  return_in: 1,
  sale: -1,
  issue: -1,
  transfer_out: -1,
  adjustment_out: -1,
  return_out: -1,
};

export async function fetchPurityMap(orgId: string): Promise<Record<string, Purity>> {
  const { data } = await supabase.from('purities').select('*').eq('org_id', orgId);
  const map: Record<string, Purity> = {};
  (data as Purity[] | null)?.forEach((p) => {
    map[p.id] = p;
  });
  return map;
}

export async function postTransaction(
  txn: Transaction,
  items: TransactionItem[],
  userId: string | null,
  orgId: string
): Promise<PostResult> {
  if (txn.status === 'posted') {
    return { success: false, error: 'Transaction is already posted' };
  }
  if (!items || items.length === 0) {
    return { success: false, error: 'Cannot post a transaction with no line items' };
  }

  const purityMap = await fetchPurityMap(orgId);
  const sign = SIGN_MAP[txn.txn_type] ?? 0;

  const ledgerRows = items.map((item) => {
    const purityValue = purityMap[item.purity_id]?.value ?? 999;
    const fw = parseFloat(calcFineWeight(item.gross_weight, purityValue) || '0');
    return {
      org_id: orgId,
      transaction_id: txn.id,
      transaction_item_id: item.id,
      metal_id: item.metal_id,
      purity_id: item.purity_id,
      location_id: txn.location_id,
      entry_type: txn.txn_type,
      gross_weight_delta: sign * item.gross_weight,
      fine_weight_delta: sign * fw,
      ref_no: txn.ref_no,
      entry_date: txn.txn_date,
      posted_by: userId,
      is_reversal: false,
    };
  });

  const { error: ledgerError } = await supabase.from('inventory_ledger').insert(ledgerRows);
  if (ledgerError) {
    return { success: false, error: ledgerError.message };
  }

  const { error: txnError } = await supabase
    .from('transactions')
    .update({ status: 'posted', updated_at: new Date().toISOString() })
    .eq('id', txn.id);
  if (txnError) {
    return { success: false, error: txnError.message };
  }

  await logAudit({
    org_id: orgId,
    user_id: userId,
    action: 'transaction.posted',
    entity_type: 'transaction',
    entity_id: txn.id,
    details: { txn_type: txn.txn_type, ref_no: txn.ref_no, item_count: items.length },
  });

  return { success: true, postedCount: ledgerRows.length };
}

export async function cancelTransaction(
  txn: Transaction,
  items: TransactionItem[],
  userId: string | null,
  orgId: string
): Promise<PostResult> {
  if (txn.status === 'cancelled') {
    return { success: false, error: 'Transaction is already cancelled' };
  }

  const sign = SIGN_MAP[txn.txn_type] ?? 0;
  const purityMap = await fetchPurityMap(orgId);

  if (txn.status === 'posted') {
    const reversalRows = items.map((item) => {
      const purityValue = purityMap[item.purity_id]?.value ?? 999;
      const fw = parseFloat(calcFineWeight(item.gross_weight, purityValue) || '0');
      return {
        org_id: orgId,
        transaction_id: txn.id,
        transaction_item_id: item.id,
        metal_id: item.metal_id,
        purity_id: item.purity_id,
        location_id: txn.location_id,
        entry_type: txn.txn_type,
        gross_weight_delta: -sign * item.gross_weight,
        fine_weight_delta: -sign * fw,
        ref_no: txn.ref_no,
        entry_date: new Date().toISOString().split('T')[0],
        posted_by: userId,
        is_reversal: true,
      };
    });

    const { error: revError } = await supabase.from('inventory_ledger').insert(reversalRows);
    if (revError) {
      return { success: false, error: revError.message };
    }
  }

  const { error: txnError } = await supabase
    .from('transactions')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', txn.id);
  if (txnError) {
    return { success: false, error: txnError.message };
  }

  await logAudit({
    org_id: orgId,
    user_id: userId,
    action: 'transaction.cancelled',
    entity_type: 'transaction',
    entity_id: txn.id,
    details: { txn_type: txn.txn_type, ref_no: txn.ref_no, was_posted: txn.status === 'posted' },
  });

  return { success: true };
}

export async function postReconciliationAdjustment(
  reconId: string,
  orgId: string,
  userId: string | null,
  lines: Array<{
    metal_id: string;
    purity_id: string;
    location_id: string | null;
    fine_variance: number;
    gross_variance: number;
    reason: string | null;
  }>
): Promise<PostResult> {
  const adjustmentRows = lines
    .filter((l) => l.fine_variance !== 0)
    .map((l) => ({
      org_id: orgId,
      reconciliation_id: reconId,
      metal_id: l.metal_id,
      purity_id: l.purity_id,
      location_id: l.location_id,
      entry_type: 'reconciliation',
      gross_weight_delta: l.gross_variance,
      fine_weight_delta: l.fine_variance,
      ref_no: `RECON-${reconId.slice(0, 8)}`,
      entry_date: new Date().toISOString().split('T')[0],
      posted_by: userId,
      is_reversal: false,
    }));

  if (adjustmentRows.length > 0) {
    const { error } = await supabase.from('inventory_ledger').insert(adjustmentRows);
    if (error) {
      return { success: false, error: error.message };
    }
  }

  await logAudit({
    org_id: orgId,
    user_id: userId,
    action: 'reconciliation.adjustment_posted',
    entity_type: 'reconciliation',
    entity_id: reconId,
    details: { line_count: adjustmentRows.length },
  });

  return { success: true, postedCount: adjustmentRows.length };
}
