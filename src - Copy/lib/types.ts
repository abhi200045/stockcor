export type Role = 'super_admin' | 'owner' | 'manager' | 'operator' | 'viewer';

export type TxnType =
  | 'purchase'
  | 'sale'
  | 'issue'
  | 'transfer_in'
  | 'transfer_out'
  | 'adjustment_in'
  | 'adjustment_out'
  | 'return_in'
  | 'return_out'
  | 'opening';

export type TxnStatus = 'draft' | 'posted' | 'cancelled';

export type ReconStatus = 'draft' | 'submitted' | 'reviewed' | 'approved' | 'rejected' | 'closed';

export type PartyType = 'customer' | 'supplier';

export interface Organization {
  id: string;
  name: string;
  business_type: string;
  currency: string;
  weight_unit: string;
  onboarding_complete: boolean;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrgMember {
  id: string;
  org_id: string;
  user_id: string;
  role: Role;
  invited_by: string | null;
  created_at: string;
}

export interface Metal {
  id: string;
  org_id: string;
  name: string;
  code: string;
  unit: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Purity {
  id: string;
  org_id: string;
  metal_id: string;
  name: string;
  value: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Location {
  id: string;
  org_id: string;
  name: string;
  code: string;
  address: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Party {
  id: string;
  org_id: string;
  type: PartyType;
  name: string;
  code: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  gstin: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  org_id: string;
  txn_type: TxnType;
  ref_no: string | null;
  txn_date: string;
  party_id: string | null;
  location_id: string | null;
  to_location_id: string | null;
  status: TxnStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionItem {
  id: string;
  org_id: string;
  transaction_id: string;
  metal_id: string;
  purity_id: string;
  gross_weight: number;
  fine_weight: number;
  rate: number;
  amount: number;
  notes: string | null;
  created_at: string;
}

export interface InventoryLedgerEntry {
  id: string;
  org_id: string;
  transaction_id: string | null;
  transaction_item_id: string | null;
  reconciliation_id: string | null;
  metal_id: string;
  purity_id: string;
  location_id: string | null;
  entry_type: string;
  gross_weight_delta: number;
  fine_weight_delta: number;
  ref_no: string | null;
  entry_date: string;
  posted_by: string | null;
  created_at: string;
  is_reversal: boolean;
}

export interface Reconciliation {
  id: string;
  org_id: string;
  recon_no: string | null;
  recon_date: string;
  location_id: string | null;
  status: ReconStatus;
  submitted_by: string | null;
  reviewed_by: string | null;
  approved_by: string | null;
  comments: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReconciliationLine {
  id: string;
  org_id: string;
  reconciliation_id: string;
  metal_id: string;
  purity_id: string;
  book_gross: number;
  book_fine: number;
  physical_gross: number;
  physical_fine: number;
  gross_variance: number;
  fine_variance: number;
  variance_pct: number;
  reason: string | null;
  comments: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  org_id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface Notification {
  id: string;
  org_id: string;
  user_id: string | null;
  title: string;
  body: string | null;
  type: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Document {
  id: string;
  org_id: string;
  name: string;
  doc_type: string;
  entity_type: string | null;
  entity_id: string | null;
  storage_path: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface AiConversation {
  id: string;
  org_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface AppSetting {
  id: string;
  org_id: string;
  key: string;
  value: unknown;
  updated_at: string;
}

export interface TransactionWithDetails extends Transaction {
  party?: Party | null;
  location?: Location | null;
  to_location?: Location | null;
  items?: TransactionItem[];
}

export interface ReconciliationWithDetails extends Reconciliation {
  location?: Location | null;
  lines?: ReconciliationLine[];
}
