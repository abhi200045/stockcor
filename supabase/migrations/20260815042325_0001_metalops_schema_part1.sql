/*
# MetalOps Core Schema (part 1)

Creates organizations, members, metals, purities, locations, parties, transactions,
transaction_items, reconciliations, reconciliation_lines, and supporting triggers/indexes.
inventory_ledger (which references reconciliations) is created in part 2.
*/

-- ============================================================
-- organizations
-- ============================================================
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  business_type text NOT NULL DEFAULT 'dealer',
  currency text NOT NULL DEFAULT 'INR',
  weight_unit text NOT NULL DEFAULT 'g',
  onboarding_complete boolean NOT NULL DEFAULT false,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- organization_members
-- ============================================================
CREATE TABLE IF NOT EXISTS organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('super_admin','owner','manager','operator','viewer')),
  invited_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);

-- Now enable RLS and policies (after both tables exist)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_select_member" ON organizations;
CREATE POLICY "org_select_member" ON organizations FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = organizations.id AND m.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "org_update_member" ON organizations;
CREATE POLICY "org_update_member" ON organizations FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = organizations.id AND m.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = organizations.id AND m.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "org_insert" ON organizations;
CREATE POLICY "org_insert" ON organizations FOR INSERT
  TO authenticated WITH CHECK (true);

ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "member_select_own" ON organization_members;
CREATE POLICY "member_select_own" ON organization_members FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM organization_members m2 WHERE m2.org_id = organization_members.org_id AND m2.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "member_insert_own" ON organization_members;
CREATE POLICY "member_insert_own" ON organization_members FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "member_update_own" ON organization_members;
CREATE POLICY "member_update_own" ON organization_members FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "member_delete_own" ON organization_members;
CREATE POLICY "member_delete_own" ON organization_members FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- ============================================================
-- metals
-- ============================================================
CREATE TABLE IF NOT EXISTS metals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  unit text NOT NULL DEFAULT 'g',
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, code)
);

ALTER TABLE metals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "metals_select" ON metals;
CREATE POLICY "metals_select" ON metals FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = metals.org_id AND m.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "metals_insert" ON metals;
CREATE POLICY "metals_insert" ON metals FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = metals.org_id AND m.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "metals_update" ON metals;
CREATE POLICY "metals_update" ON metals FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = metals.org_id AND m.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = metals.org_id AND m.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "metals_delete" ON metals;
CREATE POLICY "metals_delete" ON metals FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = metals.org_id AND m.user_id = auth.uid())
  );

-- ============================================================
-- purities
-- ============================================================
CREATE TABLE IF NOT EXISTS purities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  metal_id uuid NOT NULL REFERENCES metals(id) ON DELETE CASCADE,
  name text NOT NULL,
  value int NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE purities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "purities_select" ON purities;
CREATE POLICY "purities_select" ON purities FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = purities.org_id AND m.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "purities_insert" ON purities;
CREATE POLICY "purities_insert" ON purities FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = purities.org_id AND m.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "purities_update" ON purities;
CREATE POLICY "purities_update" ON purities FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = purities.org_id AND m.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = purities.org_id AND m.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "purities_delete" ON purities;
CREATE POLICY "purities_delete" ON purities FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = purities.org_id AND m.user_id = auth.uid())
  );

-- ============================================================
-- locations
-- ============================================================
CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  address text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, code)
);

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "loc_select" ON locations;
CREATE POLICY "loc_select" ON locations FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = locations.org_id AND m.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "loc_insert" ON locations;
CREATE POLICY "loc_insert" ON locations FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = locations.org_id AND m.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "loc_update" ON locations;
CREATE POLICY "loc_update" ON locations FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = locations.org_id AND m.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = locations.org_id AND m.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "loc_delete" ON locations;
CREATE POLICY "loc_delete" ON locations FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = locations.org_id AND m.user_id = auth.uid())
  );

-- ============================================================
-- parties (customers + suppliers)
-- ============================================================
CREATE TABLE IF NOT EXISTS parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('customer','supplier')),
  name text NOT NULL,
  code text,
  phone text,
  email text,
  address text,
  gstin text,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE parties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "party_select" ON parties;
CREATE POLICY "party_select" ON parties FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = parties.org_id AND m.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "party_insert" ON parties;
CREATE POLICY "party_insert" ON parties FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = parties.org_id AND m.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "party_update" ON parties;
CREATE POLICY "party_update" ON parties FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = parties.org_id AND m.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = parties.org_id AND m.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "party_delete" ON parties;
CREATE POLICY "party_delete" ON parties FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = parties.org_id AND m.user_id = auth.uid())
  );

-- ============================================================
-- transactions
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  txn_type text NOT NULL CHECK (txn_type IN ('purchase','sale','issue','transfer_in','transfer_out','adjustment_in','adjustment_out','return_in','return_out','opening')),
  ref_no text,
  txn_date date NOT NULL DEFAULT CURRENT_DATE,
  party_id uuid REFERENCES parties(id) ON DELETE SET NULL,
  location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  to_location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','posted','cancelled')),
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "txn_select" ON transactions;
CREATE POLICY "txn_select" ON transactions FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = transactions.org_id AND m.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "txn_insert" ON transactions;
CREATE POLICY "txn_insert" ON transactions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = transactions.org_id AND m.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "txn_update" ON transactions;
CREATE POLICY "txn_update" ON transactions FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = transactions.org_id AND m.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = transactions.org_id AND m.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "txn_delete" ON transactions;
CREATE POLICY "txn_delete" ON transactions FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = transactions.org_id AND m.user_id = auth.uid())
  );

-- ============================================================
-- transaction_items
-- ============================================================
CREATE TABLE IF NOT EXISTS transaction_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  transaction_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  metal_id uuid NOT NULL REFERENCES metals(id) ON DELETE RESTRICT,
  purity_id uuid NOT NULL REFERENCES purities(id) ON DELETE RESTRICT,
  gross_weight numeric(18,6) NOT NULL DEFAULT 0,
  fine_weight numeric(18,6) NOT NULL DEFAULT 0,
  rate numeric(18,2) NOT NULL DEFAULT 0,
  amount numeric(18,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "item_select" ON transaction_items;
CREATE POLICY "item_select" ON transaction_items FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = transaction_items.org_id AND m.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "item_insert" ON transaction_items;
CREATE POLICY "item_insert" ON transaction_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = transaction_items.org_id AND m.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "item_update" ON transaction_items;
CREATE POLICY "item_update" ON transaction_items FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = transaction_items.org_id AND m.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = transaction_items.org_id AND m.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "item_delete" ON transaction_items;
CREATE POLICY "item_delete" ON transaction_items FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = transaction_items.org_id AND m.user_id = auth.uid())
  );

-- ============================================================
-- reconciliations
-- ============================================================
CREATE TABLE IF NOT EXISTS reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  recon_no text,
  recon_date date NOT NULL DEFAULT CURRENT_DATE,
  location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','reviewed','approved','rejected','closed')),
  submitted_by uuid REFERENCES auth.users(id),
  reviewed_by uuid REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  comments text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reconciliations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recon_select" ON reconciliations;
CREATE POLICY "recon_select" ON reconciliations FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = reconciliations.org_id AND m.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "recon_insert" ON reconciliations;
CREATE POLICY "recon_insert" ON reconciliations FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = reconciliations.org_id AND m.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "recon_update" ON reconciliations;
CREATE POLICY "recon_update" ON reconciliations FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = reconciliations.org_id AND m.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = reconciliations.org_id AND m.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "recon_delete" ON reconciliations;
CREATE POLICY "recon_delete" ON reconciliations FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = reconciliations.org_id AND m.user_id = auth.uid())
  );

-- ============================================================
-- reconciliation_lines
-- ============================================================
CREATE TABLE IF NOT EXISTS reconciliation_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  reconciliation_id uuid NOT NULL REFERENCES reconciliations(id) ON DELETE CASCADE,
  metal_id uuid NOT NULL REFERENCES metals(id) ON DELETE RESTRICT,
  purity_id uuid NOT NULL REFERENCES purities(id) ON DELETE RESTRICT,
  book_gross numeric(18,6) NOT NULL DEFAULT 0,
  book_fine numeric(18,6) NOT NULL DEFAULT 0,
  physical_gross numeric(18,6) NOT NULL DEFAULT 0,
  physical_fine numeric(18,6) NOT NULL DEFAULT 0,
  gross_variance numeric(18,6) GENERATED ALWAYS AS (physical_gross - book_gross) STORED,
  fine_variance numeric(18,6) GENERATED ALWAYS AS (physical_fine - book_fine) STORED,
  variance_pct numeric(8,4) GENERATED ALWAYS AS (
    CASE WHEN book_fine = 0 THEN 0 ELSE round(((physical_fine - book_fine) / book_fine) * 100, 4) END
  ) STORED,
  reason text,
  comments text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reconciliation_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reconline_select" ON reconciliation_lines;
CREATE POLICY "reconline_select" ON reconciliation_lines FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = reconciliation_lines.org_id AND m.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "reconline_insert" ON reconciliation_lines;
CREATE POLICY "reconline_insert" ON reconciliation_lines FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = reconciliation_lines.org_id AND m.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "reconline_update" ON reconciliation_lines;
CREATE POLICY "reconline_update" ON reconciliation_lines FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = reconciliation_lines.org_id AND m.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = reconciliation_lines.org_id AND m.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "reconline_delete" ON reconciliation_lines;
CREATE POLICY "reconline_delete" ON reconciliation_lines FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = reconciliation_lines.org_id AND m.user_id = auth.uid())
  );

-- ============================================================
-- updated_at triggers
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_org_updated ON organizations;
CREATE TRIGGER trg_org_updated BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS txn_updated ON transactions;
CREATE TRIGGER txn_updated BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS recon_updated ON reconciliations;
CREATE TRIGGER recon_updated BEFORE UPDATE ON reconciliations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_metals_org ON metals(org_id);
CREATE INDEX IF NOT EXISTS idx_purities_org ON purities(org_id);
CREATE INDEX IF NOT EXISTS idx_purities_metal ON purities(metal_id);
CREATE INDEX IF NOT EXISTS idx_locations_org ON locations(org_id);
CREATE INDEX IF NOT EXISTS idx_parties_org ON parties(org_id);
CREATE INDEX IF NOT EXISTS idx_txn_org ON transactions(org_id);
CREATE INDEX IF NOT EXISTS idx_txn_date ON transactions(txn_date);
CREATE INDEX IF NOT EXISTS idx_txn_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_items_txn ON transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_items_org ON transaction_items(org_id);
CREATE INDEX IF NOT EXISTS idx_recon_org ON reconciliations(org_id);
CREATE INDEX IF NOT EXISTS idx_reconline_recon ON reconciliation_lines(reconciliation_id);
CREATE INDEX IF NOT EXISTS idx_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_org ON organization_members(org_id);
