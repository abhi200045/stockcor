/*
# Remove Authentication Requirement — Open RLS Policies

## Summary
This migration removes the sign-in/login requirement from the MetalOps application.
All RLS policies are changed from `TO authenticated` (requires login) to 
`TO anon, authenticated` (open access without login).

## Why
The user requested removing the user ID and password requirement.
The app should load directly into the dashboard without authentication.

## Tables Modified (16 tables, all policies replaced)
- organizations: org_select_member, org_insert, org_update_member
- organization_members: member_select_own, member_insert_own, member_update_own, member_delete_own
- metals: metals_select, metals_insert, metals_update, metals_delete
- purities: purities_select, purities_insert, purities_update, purities_delete
- locations: loc_select, loc_insert, loc_update, loc_delete
- parties: party_select, party_insert, party_update, party_delete
- transactions: txn_select, txn_insert, txn_update, txn_delete
- transaction_items: item_select, item_insert, item_update, item_delete
- inventory_ledger: ledger_select, ledger_insert, ledger_update, ledger_delete
- reconciliations: recon_select, recon_insert, recon_update, recon_delete
- reconciliation_lines: reconline_select, reconline_insert, reconline_update, reconline_delete
- audit_logs: audit_select, audit_insert
- notifications: notif_select, notif_insert, notif_update, notif_delete
- documents: doc_select, doc_insert, doc_update, doc_delete
- ai_conversations: ai_select, ai_insert, ai_delete
- app_settings: set_select, set_insert, set_update, set_delete

## Security
- RLS remains ENABLED on all tables.
- All policies now allow `anon, authenticated` — the anon-key frontend 
  can read and write all data without a login session.
- This is appropriate because the app is now a single-tenant, no-auth application.

## Important Notes
1. The app no longer requires sign-in. The frontend loads directly into the dashboard.
2. All existing data remains intact — no data is deleted or modified.
3. The `organizations` table still has its single demo org row which the app will use.
*/

-- ============================================================
-- organizations
-- ============================================================
DROP POLICY IF EXISTS "org_select_member" ON organizations;
CREATE POLICY "org_select_member" ON organizations FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "org_insert" ON organizations;
CREATE POLICY "org_insert" ON organizations FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "org_update_member" ON organizations;
CREATE POLICY "org_update_member" ON organizations FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- organization_members
-- ============================================================
DROP POLICY IF EXISTS "member_select_own" ON organization_members;
CREATE POLICY "member_select_own" ON organization_members FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "member_insert_own" ON organization_members;
CREATE POLICY "member_insert_own" ON organization_members FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "member_update_own" ON organization_members;
CREATE POLICY "member_update_own" ON organization_members FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "member_delete_own" ON organization_members;
CREATE POLICY "member_delete_own" ON organization_members FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- metals
-- ============================================================
DROP POLICY IF EXISTS "metals_select" ON metals;
CREATE POLICY "metals_select" ON metals FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "metals_insert" ON metals;
CREATE POLICY "metals_insert" ON metals FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "metals_update" ON metals;
CREATE POLICY "metals_update" ON metals FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "metals_delete" ON metals;
CREATE POLICY "metals_delete" ON metals FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- purities
-- ============================================================
DROP POLICY IF EXISTS "purities_select" ON purities;
CREATE POLICY "purities_select" ON purities FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "purities_insert" ON purities;
CREATE POLICY "purities_insert" ON purities FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "purities_update" ON purities;
CREATE POLICY "purities_update" ON purities FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "purities_delete" ON purities;
CREATE POLICY "purities_delete" ON purities FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- locations
-- ============================================================
DROP POLICY IF EXISTS "loc_select" ON locations;
CREATE POLICY "loc_select" ON locations FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "loc_insert" ON locations;
CREATE POLICY "loc_insert" ON locations FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "loc_update" ON locations;
CREATE POLICY "loc_update" ON locations FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "loc_delete" ON locations;
CREATE POLICY "loc_delete" ON locations FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- parties
-- ============================================================
DROP POLICY IF EXISTS "party_select" ON parties;
CREATE POLICY "party_select" ON parties FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "party_insert" ON parties;
CREATE POLICY "party_insert" ON parties FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "party_update" ON parties;
CREATE POLICY "party_update" ON parties FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "party_delete" ON parties;
CREATE POLICY "party_delete" ON parties FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- transactions
-- ============================================================
DROP POLICY IF EXISTS "txn_select" ON transactions;
CREATE POLICY "txn_select" ON transactions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "txn_insert" ON transactions;
CREATE POLICY "txn_insert" ON transactions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "txn_update" ON transactions;
CREATE POLICY "txn_update" ON transactions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "txn_delete" ON transactions;
CREATE POLICY "txn_delete" ON transactions FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- transaction_items
-- ============================================================
DROP POLICY IF EXISTS "item_select" ON transaction_items;
CREATE POLICY "item_select" ON transaction_items FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "item_insert" ON transaction_items;
CREATE POLICY "item_insert" ON transaction_items FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "item_update" ON transaction_items;
CREATE POLICY "item_update" ON transaction_items FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "item_delete" ON transaction_items;
CREATE POLICY "item_delete" ON transaction_items FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- inventory_ledger
-- ============================================================
DROP POLICY IF EXISTS "ledger_select" ON inventory_ledger;
CREATE POLICY "ledger_select" ON inventory_ledger FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "ledger_insert" ON inventory_ledger;
CREATE POLICY "ledger_insert" ON inventory_ledger FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "ledger_update" ON inventory_ledger;
CREATE POLICY "ledger_update" ON inventory_ledger FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "ledger_delete" ON inventory_ledger;
CREATE POLICY "ledger_delete" ON inventory_ledger FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- reconciliations
-- ============================================================
DROP POLICY IF EXISTS "recon_select" ON reconciliations;
CREATE POLICY "recon_select" ON reconciliations FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "recon_insert" ON reconciliations;
CREATE POLICY "recon_insert" ON reconciliations FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "recon_update" ON reconciliations;
CREATE POLICY "recon_update" ON reconciliations FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "recon_delete" ON reconciliations;
CREATE POLICY "recon_delete" ON reconciliations FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- reconciliation_lines
-- ============================================================
DROP POLICY IF EXISTS "reconline_select" ON reconciliation_lines;
CREATE POLICY "reconline_select" ON reconciliation_lines FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "reconline_insert" ON reconciliation_lines;
CREATE POLICY "reconline_insert" ON reconciliation_lines FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "reconline_update" ON reconciliation_lines;
CREATE POLICY "reconline_update" ON reconciliation_lines FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "reconline_delete" ON reconciliation_lines;
CREATE POLICY "reconline_delete" ON reconciliation_lines FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- audit_logs
-- ============================================================
DROP POLICY IF EXISTS "audit_select" ON audit_logs;
CREATE POLICY "audit_select" ON audit_logs FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "audit_insert" ON audit_logs;
CREATE POLICY "audit_insert" ON audit_logs FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- ============================================================
-- notifications
-- ============================================================
DROP POLICY IF EXISTS "notif_select" ON notifications;
CREATE POLICY "notif_select" ON notifications FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "notif_insert" ON notifications;
CREATE POLICY "notif_insert" ON notifications FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "notif_update" ON notifications;
CREATE POLICY "notif_update" ON notifications FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "notif_delete" ON notifications;
CREATE POLICY "notif_delete" ON notifications FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- documents
-- ============================================================
DROP POLICY IF EXISTS "doc_select" ON documents;
CREATE POLICY "doc_select" ON documents FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "doc_insert" ON documents;
CREATE POLICY "doc_insert" ON documents FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "doc_update" ON documents;
CREATE POLICY "doc_update" ON documents FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "doc_delete" ON documents;
CREATE POLICY "doc_delete" ON documents FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- ai_conversations
-- ============================================================
DROP POLICY IF EXISTS "ai_select" ON ai_conversations;
CREATE POLICY "ai_select" ON ai_conversations FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "ai_insert" ON ai_conversations;
CREATE POLICY "ai_insert" ON ai_conversations FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "ai_delete" ON ai_conversations;
CREATE POLICY "ai_delete" ON ai_conversations FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- app_settings
-- ============================================================
DROP POLICY IF EXISTS "set_select" ON app_settings;
CREATE POLICY "set_select" ON app_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "set_insert" ON app_settings;
CREATE POLICY "set_insert" ON app_settings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "set_update" ON app_settings;
CREATE POLICY "set_update" ON app_settings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "set_delete" ON app_settings;
CREATE POLICY "set_delete" ON app_settings FOR DELETE
  TO anon, authenticated USING (true);
