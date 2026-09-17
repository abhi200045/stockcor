/*
# MetalOps Core Schema (part 2)

Creates inventory_ledger (immutable posted entries), audit_logs, notifications,
documents, ai_conversations, app_settings, and their RLS policies + indexes.
*/

-- ============================================================
-- inventory_ledger (immutable posted entries)
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES transactions(id) ON DELETE CASCADE,
  transaction_item_id uuid REFERENCES transaction_items(id) ON DELETE SET NULL,
  reconciliation_id uuid REFERENCES reconciliations(id) ON DELETE SET NULL,
  metal_id uuid NOT NULL REFERENCES metals(id) ON DELETE RESTRICT,
  purity_id uuid NOT NULL REFERENCES purities(id) ON DELETE RESTRICT,
  location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  entry_type text NOT NULL CHECK (entry_type IN ('opening','purchase','sale','issue','transfer_in','transfer_out','adjustment_in','adjustment_out','return_in','return_out','reconciliation')),
  gross_weight_delta numeric(18,6) NOT NULL DEFAULT 0,
  fine_weight_delta numeric(18,6) NOT NULL DEFAULT 0,
  ref_no text,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  posted_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  is_reversal boolean NOT NULL DEFAULT false
);

ALTER TABLE inventory_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ledger_select" ON inventory_ledger;
CREATE POLICY "ledger_select" ON inventory_ledger FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = inventory_ledger.org_id AND m.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "ledger_insert" ON inventory_ledger;
CREATE POLICY "ledger_insert" ON inventory_ledger FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = inventory_ledger.org_id AND m.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "ledger_update" ON inventory_ledger;
CREATE POLICY "ledger_update" ON inventory_ledger FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = inventory_ledger.org_id AND m.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = inventory_ledger.org_id AND m.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "ledger_delete" ON inventory_ledger;
CREATE POLICY "ledger_delete" ON inventory_ledger FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = inventory_ledger.org_id AND m.user_id = auth.uid())
  );

-- ============================================================
-- audit_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_select" ON audit_logs;
CREATE POLICY "audit_select" ON audit_logs FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = audit_logs.org_id AND m.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "audit_insert" ON audit_logs;
CREATE POLICY "audit_insert" ON audit_logs FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = audit_logs.org_id AND m.user_id = auth.uid())
  );

-- ============================================================
-- notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  type text NOT NULL DEFAULT 'info',
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_select" ON notifications;
CREATE POLICY "notif_select" ON notifications FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = notifications.org_id AND m.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "notif_insert" ON notifications;
CREATE POLICY "notif_insert" ON notifications FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = notifications.org_id AND m.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "notif_update" ON notifications;
CREATE POLICY "notif_update" ON notifications FOR UPDATE
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = notifications.org_id AND m.user_id = auth.uid())
  ) WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = notifications.org_id AND m.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "notif_delete" ON notifications;
CREATE POLICY "notif_delete" ON notifications FOR DELETE
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = notifications.org_id AND m.user_id = auth.uid())
  );

-- ============================================================
-- documents
-- ============================================================
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  doc_type text NOT NULL DEFAULT 'other',
  entity_type text,
  entity_id uuid,
  storage_path text,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "doc_select" ON documents;
CREATE POLICY "doc_select" ON documents FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = documents.org_id AND m.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "doc_insert" ON documents;
CREATE POLICY "doc_insert" ON documents FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = documents.org_id AND m.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "doc_update" ON documents;
CREATE POLICY "doc_update" ON documents FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = documents.org_id AND m.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = documents.org_id AND m.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "doc_delete" ON documents;
CREATE POLICY "doc_delete" ON documents FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = documents.org_id AND m.user_id = auth.uid())
  );

-- ============================================================
-- ai_conversations
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_select" ON ai_conversations;
CREATE POLICY "ai_select" ON ai_conversations FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = ai_conversations.org_id AND m.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "ai_insert" ON ai_conversations;
CREATE POLICY "ai_insert" ON ai_conversations FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = ai_conversations.org_id AND m.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "ai_delete" ON ai_conversations;
CREATE POLICY "ai_delete" ON ai_conversations FOR DELETE
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = ai_conversations.org_id AND m.user_id = auth.uid())
  );

-- ============================================================
-- app_settings
-- ============================================================
CREATE TABLE IF NOT EXISTS app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  key text NOT NULL,
  value jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, key)
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "set_select" ON app_settings;
CREATE POLICY "set_select" ON app_settings FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = app_settings.org_id AND m.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "set_insert" ON app_settings;
CREATE POLICY "set_insert" ON app_settings FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = app_settings.org_id AND m.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "set_update" ON app_settings;
CREATE POLICY "set_update" ON app_settings FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = app_settings.org_id AND m.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = app_settings.org_id AND m.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "set_delete" ON app_settings;
CREATE POLICY "set_delete" ON app_settings FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = app_settings.org_id AND m.user_id = auth.uid())
  );

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_ledger_org ON inventory_ledger(org_id);
CREATE INDEX IF NOT EXISTS idx_ledger_metal ON inventory_ledger(metal_id, purity_id, location_id);
CREATE INDEX IF NOT EXISTS idx_ledger_date ON inventory_ledger(entry_date);
CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_doc_org ON documents(org_id);
CREATE INDEX IF NOT EXISTS idx_ai_org ON ai_conversations(org_id, user_id);

-- ============================================================
-- app_settings updated_at trigger
-- ============================================================
DROP TRIGGER IF EXISTS set_updated ON app_settings;
CREATE TRIGGER set_updated BEFORE UPDATE ON app_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
