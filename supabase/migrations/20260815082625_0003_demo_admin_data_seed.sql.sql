-- ============================================================
-- MetalOps Demo Data Seed
-- Creates a fully populated demo organization with metals,
-- purities, locations, parties, transactions, inventory ledger,
-- reconciliation, audit logs, and notifications.
-- Demo user: admin@metalops.demo (already created in auth.users)
-- ============================================================

DO $$
DECLARE
  v_org_id uuid;
  v_user_id uuid := '5ea8c411-4bc3-43fe-a6a6-733062483d55';
  v_gold_metal_id uuid;
  v_silver_metal_id uuid;
  v_loc_id uuid;
  v_loc2_id uuid;
  v_purity_999 uuid;
  v_purity_995 uuid;
  v_purity_916 uuid;
  v_purity_750 uuid;
  v_purity_585 uuid;
  v_purity_375 uuid;
  v_silver_999 uuid;
  v_silver_990 uuid;
  v_silver_925 uuid;
  v_silver_900 uuid;
  v_silver_835 uuid;
  v_supplier1 uuid;
  v_supplier2 uuid;
  v_supplier3 uuid;
  v_customer1 uuid;
  v_customer2 uuid;
  v_customer3 uuid;
  v_customer4 uuid;
  v_txn1 uuid; v_txn2 uuid; v_txn3 uuid; v_txn4 uuid; v_txn5 uuid;
  v_txn6 uuid; v_txn7 uuid; v_txn8 uuid; v_txn9 uuid; v_txn10 uuid;
  v_txn11 uuid; v_txn12 uuid; v_txn13 uuid;
  v_recon_id uuid;
  d_today date := CURRENT_DATE;
  d_30ago date := CURRENT_DATE - 30;
  d_14ago date := CURRENT_DATE - 14;
  d_12ago date := CURRENT_DATE - 12;
  d_10ago date := CURRENT_DATE - 10;
  d_9ago date := CURRENT_DATE - 9;
  d_7ago date := CURRENT_DATE - 7;
  d_5ago date := CURRENT_DATE - 5;
  d_3ago date := CURRENT_DATE - 3;
  d_2ago date := CURRENT_DATE - 2;
  d_1ago date := CURRENT_DATE - 1;
BEGIN
  -- ============================================================
  -- Organization
  -- ============================================================
  INSERT INTO organizations (id, name, business_type, currency, weight_unit, onboarding_complete, is_demo)
  VALUES (gen_random_uuid(), 'MetalOps Demo Co.', 'dealer', 'INR', 'g', true, true)
  RETURNING id INTO v_org_id;

  -- ============================================================
  -- Organization member (owner)
  -- ============================================================
  INSERT INTO organization_members (org_id, user_id, role)
  VALUES (v_org_id, v_user_id, 'owner');

  -- ============================================================
  -- Metals
  -- ============================================================
  INSERT INTO metals (org_id, name, code, unit, is_active, sort_order)
  VALUES (v_org_id, 'Gold', 'AU', 'g', true, 1)
  RETURNING id INTO v_gold_metal_id;

  INSERT INTO metals (org_id, name, code, unit, is_active, sort_order)
  VALUES (v_org_id, 'Silver', 'AG', 'g', true, 2)
  RETURNING id INTO v_silver_metal_id;

  -- ============================================================
  -- Purities (Gold)
  -- ============================================================
  INSERT INTO purities (org_id, metal_id, name, value, is_active, sort_order) VALUES (v_org_id, v_gold_metal_id, '999 (Fine)', 999, true, 1) RETURNING id INTO v_purity_999;
  INSERT INTO purities (org_id, metal_id, name, value, is_active, sort_order) VALUES (v_org_id, v_gold_metal_id, '995', 995, true, 2) RETURNING id INTO v_purity_995;
  INSERT INTO purities (org_id, metal_id, name, value, is_active, sort_order) VALUES (v_org_id, v_gold_metal_id, '916 (22K)', 916, true, 3) RETURNING id INTO v_purity_916;
  INSERT INTO purities (org_id, metal_id, name, value, is_active, sort_order) VALUES (v_org_id, v_gold_metal_id, '750 (18K)', 750, true, 4) RETURNING id INTO v_purity_750;
  INSERT INTO purities (org_id, metal_id, name, value, is_active, sort_order) VALUES (v_org_id, v_gold_metal_id, '585 (14K)', 585, true, 5) RETURNING id INTO v_purity_585;
  INSERT INTO purities (org_id, metal_id, name, value, is_active, sort_order) VALUES (v_org_id, v_gold_metal_id, '375 (9K)', 375, true, 6) RETURNING id INTO v_purity_375;

  -- Purities (Silver)
  INSERT INTO purities (org_id, metal_id, name, value, is_active, sort_order) VALUES (v_org_id, v_silver_metal_id, '999 (Fine)', 999, true, 1) RETURNING id INTO v_silver_999;
  INSERT INTO purities (org_id, metal_id, name, value, is_active, sort_order) VALUES (v_org_id, v_silver_metal_id, '990', 990, true, 2) RETURNING id INTO v_silver_990;
  INSERT INTO purities (org_id, metal_id, name, value, is_active, sort_order) VALUES (v_org_id, v_silver_metal_id, '925 (Sterling)', 925, true, 3) RETURNING id INTO v_silver_925;
  INSERT INTO purities (org_id, metal_id, name, value, is_active, sort_order) VALUES (v_org_id, v_silver_metal_id, '900', 900, true, 4) RETURNING id INTO v_silver_900;
  INSERT INTO purities (org_id, metal_id, name, value, is_active, sort_order) VALUES (v_org_id, v_silver_metal_id, '835', 835, true, 5) RETURNING id INTO v_silver_835;

  -- ============================================================
  -- Locations
  -- ============================================================
  INSERT INTO locations (org_id, name, code, address, is_active)
  VALUES (v_org_id, 'Main Vault', 'MV-01', 'Head Office, Mumbai', true)
  RETURNING id INTO v_loc_id;

  INSERT INTO locations (org_id, name, code, address, is_active)
  VALUES (v_org_id, 'Branch Store', 'BR-02', 'Zaveri Bazaar, Mumbai', true)
  RETURNING id INTO v_loc2_id;

  -- ============================================================
  -- Parties (Suppliers)
  -- ============================================================
  INSERT INTO parties (org_id, type, name, code, phone, email, address, gstin, is_active)
  VALUES (v_org_id, 'supplier', 'Swiss Refinery Corp', 'SRC', '+41 22 555 0100', 'contact@swissref.demo', 'Zurich, Switzerland', NULL, true)
  RETURNING id INTO v_supplier1;

  INSERT INTO parties (org_id, type, name, code, phone, email, address, gstin, is_active)
  VALUES (v_org_id, 'supplier', 'Mumbai Gold Exchange', 'MGE', '+91 22 5555 0100', 'trade@mgoldex.demo', 'Zaveri Bazaar, Mumbai', '27AAAAA0000A1Z5', true)
  RETURNING id INTO v_supplier2;

  INSERT INTO parties (org_id, type, name, code, phone, email, address, gstin, is_active)
  VALUES (v_org_id, 'supplier', 'Ahmedabad Silver House', 'ASH', '+91 79 5555 0100', 'info@ahmsilver.demo', 'Ratanpole, Ahmedabad', '24BBBBB0000B1Z2', true)
  RETURNING id INTO v_supplier3;

  -- Parties (Customers)
  INSERT INTO parties (org_id, type, name, code, phone, email, address, gstin, is_active)
  VALUES (v_org_id, 'customer', 'Tanishq Jewellers', 'TAN', '+91 80 5555 0100', 'purchase@tanishq.demo', 'Bangalore', '29AAACC0000C1Z3', true)
  RETURNING id INTO v_customer1;

  INSERT INTO parties (org_id, type, name, code, phone, email, address, gstin, is_active)
  VALUES (v_org_id, 'customer', 'Kalyan Jewellers', 'KAL', '+91 484 555 0100', 'buy@kalyan.demo', 'Kochi', '32AAADK0000D1Z4', true)
  RETURNING id INTO v_customer2;

  INSERT INTO parties (org_id, type, name, code, phone, email, address, gstin, is_active)
  VALUES (v_org_id, 'customer', 'PC Jewellers', 'PCJ', '+91 11 5555 0100', 'procurement@pcj.demo', 'New Delhi', '07AAAEPC0000E1Z5', true)
  RETURNING id INTO v_customer3;

  INSERT INTO parties (org_id, type, name, code, phone, email, address, gstin, is_active)
  VALUES (v_org_id, 'customer', 'Sharma Sons Jewellers', 'SHM', '+91 141 555 0100', 'sharma@jewellers.demo', 'Jaipur', '08AAAAS0000F1Z6', true)
  RETURNING id INTO v_customer4;

  -- ============================================================
  -- Opening Stock Transactions
  -- ============================================================
  -- Gold 999: 500g gross, 499.5g fine
  INSERT INTO transactions (org_id, txn_type, ref_no, txn_date, location_id, status, created_by, notes)
  VALUES (v_org_id, 'opening', 'OPENING-G999', d_30ago, v_loc_id, 'posted', v_user_id, 'DEMO DATA — NOT REAL TRANSACTIONS')
  RETURNING id INTO v_txn1;

  INSERT INTO transaction_items (org_id, transaction_id, metal_id, purity_id, gross_weight, fine_weight, rate, amount)
  VALUES (v_org_id, v_txn1, v_gold_metal_id, v_purity_999, 500, 499.500, 0, 0);

  INSERT INTO inventory_ledger (org_id, transaction_id, metal_id, purity_id, location_id, entry_type, gross_weight_delta, fine_weight_delta, ref_no, entry_date, posted_by)
  VALUES (v_org_id, v_txn1, v_gold_metal_id, v_purity_999, v_loc_id, 'opening', 500, 499.500, 'OPENING-G999', d_30ago, v_user_id);

  -- Gold 916: 1200g gross, 1099.2g fine
  INSERT INTO transactions (org_id, txn_type, ref_no, txn_date, location_id, status, created_by, notes)
  VALUES (v_org_id, 'opening', 'OPENING-G916', d_30ago, v_loc_id, 'posted', v_user_id, 'DEMO DATA')
  RETURNING id INTO v_txn2;

  INSERT INTO transaction_items (org_id, transaction_id, metal_id, purity_id, gross_weight, fine_weight, rate, amount)
  VALUES (v_org_id, v_txn2, v_gold_metal_id, v_purity_916, 1200, 1099.200, 0, 0);

  INSERT INTO inventory_ledger (org_id, transaction_id, metal_id, purity_id, location_id, entry_type, gross_weight_delta, fine_weight_delta, ref_no, entry_date, posted_by)
  VALUES (v_org_id, v_txn2, v_gold_metal_id, v_purity_916, v_loc_id, 'opening', 1200, 1099.200, 'OPENING-G916', d_30ago, v_user_id);

  -- Gold 750: 350g gross, 262.5g fine
  INSERT INTO transactions (org_id, txn_type, ref_no, txn_date, location_id, status, created_by, notes)
  VALUES (v_org_id, 'opening', 'OPENING-G750', d_30ago, v_loc_id, 'posted', v_user_id, 'DEMO DATA')
  RETURNING id INTO v_txn3;

  INSERT INTO transaction_items (org_id, transaction_id, metal_id, purity_id, gross_weight, fine_weight, rate, amount)
  VALUES (v_org_id, v_txn3, v_gold_metal_id, v_purity_750, 350, 262.500, 0, 0);

  INSERT INTO inventory_ledger (org_id, transaction_id, metal_id, purity_id, location_id, entry_type, gross_weight_delta, fine_weight_delta, ref_no, entry_date, posted_by)
  VALUES (v_org_id, v_txn3, v_gold_metal_id, v_purity_750, v_loc_id, 'opening', 350, 262.500, 'OPENING-G750', d_30ago, v_user_id);

  -- Silver 999: 15000g gross, 14985g fine
  INSERT INTO transactions (org_id, txn_type, ref_no, txn_date, location_id, status, created_by, notes)
  VALUES (v_org_id, 'opening', 'OPENING-S999', d_30ago, v_loc_id, 'posted', v_user_id, 'DEMO DATA')
  RETURNING id INTO v_txn4;

  INSERT INTO transaction_items (org_id, transaction_id, metal_id, purity_id, gross_weight, fine_weight, rate, amount)
  VALUES (v_org_id, v_txn4, v_silver_metal_id, v_silver_999, 15000, 14985.000, 0, 0);

  INSERT INTO inventory_ledger (org_id, transaction_id, metal_id, purity_id, location_id, entry_type, gross_weight_delta, fine_weight_delta, ref_no, entry_date, posted_by)
  VALUES (v_org_id, v_txn4, v_silver_metal_id, v_silver_999, v_loc_id, 'opening', 15000, 14985.000, 'OPENING-S999', d_30ago, v_user_id);

  -- Silver 925: 8000g gross, 7400g fine
  INSERT INTO transactions (org_id, txn_type, ref_no, txn_date, location_id, status, created_by, notes)
  VALUES (v_org_id, 'opening', 'OPENING-S925', d_30ago, v_loc_id, 'posted', v_user_id, 'DEMO DATA')
  RETURNING id INTO v_txn5;

  INSERT INTO transaction_items (org_id, transaction_id, metal_id, purity_id, gross_weight, fine_weight, rate, amount)
  VALUES (v_org_id, v_txn5, v_silver_metal_id, v_silver_925, 8000, 7400.000, 0, 0);

  INSERT INTO inventory_ledger (org_id, transaction_id, metal_id, purity_id, location_id, entry_type, gross_weight_delta, fine_weight_delta, ref_no, entry_date, posted_by)
  VALUES (v_org_id, v_txn5, v_silver_metal_id, v_silver_925, v_loc_id, 'opening', 8000, 7400.000, 'OPENING-S925', d_30ago, v_user_id);

  -- ============================================================
  -- Purchase Transactions (last 14 days)
  -- ============================================================
  -- PUR-14: Gold 999, 250g from Swiss Refinery @ 7200/g
  INSERT INTO transactions (org_id, txn_type, ref_no, txn_date, party_id, location_id, status, created_by, notes)
  VALUES (v_org_id, 'purchase', 'PUR-14-G999', d_14ago, v_supplier1, v_loc_id, 'posted', v_user_id, 'DEMO DATA')
  RETURNING id INTO v_txn6;

  INSERT INTO transaction_items (org_id, transaction_id, metal_id, purity_id, gross_weight, fine_weight, rate, amount)
  VALUES (v_org_id, v_txn6, v_gold_metal_id, v_purity_999, 250, 249.750, 7200, 1798200);

  INSERT INTO inventory_ledger (org_id, transaction_id, metal_id, purity_id, location_id, entry_type, gross_weight_delta, fine_weight_delta, ref_no, entry_date, posted_by)
  VALUES (v_org_id, v_txn6, v_gold_metal_id, v_purity_999, v_loc_id, 'purchase', 250, 249.750, 'PUR-14-G999', d_14ago, v_user_id);

  -- PUR-12: Gold 916, 800g from Mumbai Gold Exchange @ 6595.2/g (7200*0.916)
  INSERT INTO transactions (org_id, txn_type, ref_no, txn_date, party_id, location_id, status, created_by, notes)
  VALUES (v_org_id, 'purchase', 'PUR-12-G916', d_12ago, v_supplier2, v_loc_id, 'posted', v_user_id, 'DEMO DATA')
  RETURNING id INTO v_txn7;

  INSERT INTO transaction_items (org_id, transaction_id, metal_id, purity_id, gross_weight, fine_weight, rate, amount)
  VALUES (v_org_id, v_txn7, v_gold_metal_id, v_purity_916, 800, 732.800, 6595.20, 4832746.56);

  INSERT INTO inventory_ledger (org_id, transaction_id, metal_id, purity_id, location_id, entry_type, gross_weight_delta, fine_weight_delta, ref_no, entry_date, posted_by)
  VALUES (v_org_id, v_txn7, v_gold_metal_id, v_purity_916, v_loc_id, 'purchase', 800, 732.800, 'PUR-12-G916', d_12ago, v_user_id);

  -- PUR-10: Silver 999, 5000g from Ahmedabad Silver @ 92/g
  INSERT INTO transactions (org_id, txn_type, ref_no, txn_date, party_id, location_id, status, created_by, notes)
  VALUES (v_org_id, 'purchase', 'PUR-10-S999', d_10ago, v_supplier3, v_loc_id, 'posted', v_user_id, 'DEMO DATA')
  RETURNING id INTO v_txn8;

  INSERT INTO transaction_items (org_id, transaction_id, metal_id, purity_id, gross_weight, fine_weight, rate, amount)
  VALUES (v_org_id, v_txn8, v_silver_metal_id, v_silver_999, 5000, 4995.000, 92, 459540);

  INSERT INTO inventory_ledger (org_id, transaction_id, metal_id, purity_id, location_id, entry_type, gross_weight_delta, fine_weight_delta, ref_no, entry_date, posted_by)
  VALUES (v_org_id, v_txn8, v_silver_metal_id, v_silver_999, v_loc_id, 'purchase', 5000, 4995.000, 'PUR-10-S999', d_10ago, v_user_id);

  -- PUR-7: Gold 995, 150g from Swiss Refinery @ 7164/g (7200*0.995)
  INSERT INTO transactions (org_id, txn_type, ref_no, txn_date, party_id, location_id, status, created_by, notes)
  VALUES (v_org_id, 'purchase', 'PUR-7-G995', d_7ago, v_supplier1, v_loc_id, 'posted', v_user_id, 'DEMO DATA')
  RETURNING id INTO v_txn9;

  INSERT INTO transaction_items (org_id, transaction_id, metal_id, purity_id, gross_weight, fine_weight, rate, amount)
  VALUES (v_org_id, v_txn9, v_gold_metal_id, v_purity_995, 150, 149.250, 7164, 1069198.20);

  INSERT INTO inventory_ledger (org_id, transaction_id, metal_id, purity_id, location_id, entry_type, gross_weight_delta, fine_weight_delta, ref_no, entry_date, posted_by)
  VALUES (v_org_id, v_txn9, v_gold_metal_id, v_purity_995, v_loc_id, 'purchase', 150, 149.250, 'PUR-7-G995', d_7ago, v_user_id);

  -- PUR-5: Silver 925, 3000g from Ahmedabad Silver @ 85.1/g (92*0.925)
  INSERT INTO transactions (org_id, txn_type, ref_no, txn_date, party_id, location_id, status, created_by, notes)
  VALUES (v_org_id, 'purchase', 'PUR-5-S925', d_5ago, v_supplier3, v_loc_id, 'posted', v_user_id, 'DEMO DATA')
  RETURNING id INTO v_txn10;

  INSERT INTO transaction_items (org_id, transaction_id, metal_id, purity_id, gross_weight, fine_weight, rate, amount)
  VALUES (v_org_id, v_txn10, v_silver_metal_id, v_silver_925, 3000, 2775.000, 85.10, 236152.50);

  INSERT INTO inventory_ledger (org_id, transaction_id, metal_id, purity_id, location_id, entry_type, gross_weight_delta, fine_weight_delta, ref_no, entry_date, posted_by)
  VALUES (v_org_id, v_txn10, v_silver_metal_id, v_silver_925, v_loc_id, 'purchase', 3000, 2775.000, 'PUR-5-S925', d_5ago, v_user_id);

  -- PUR-2: Gold 750, 200g from Mumbai Gold Exchange @ 5400/g (7200*0.75)
  INSERT INTO transactions (org_id, txn_type, ref_no, txn_date, party_id, location_id, status, created_by, notes)
  VALUES (v_org_id, 'purchase', 'PUR-2-G750', d_2ago, v_supplier2, v_loc_id, 'posted', v_user_id, 'DEMO DATA')
  RETURNING id INTO v_txn11;

  INSERT INTO transaction_items (org_id, transaction_id, metal_id, purity_id, gross_weight, fine_weight, rate, amount)
  VALUES (v_org_id, v_txn11, v_gold_metal_id, v_purity_750, 200, 150.000, 5400, 810000);

  INSERT INTO inventory_ledger (org_id, transaction_id, metal_id, purity_id, location_id, entry_type, gross_weight_delta, fine_weight_delta, ref_no, entry_date, posted_by)
  VALUES (v_org_id, v_txn11, v_gold_metal_id, v_purity_750, v_loc_id, 'purchase', 200, 150.000, 'PUR-2-G750', d_2ago, v_user_id);

  -- PUR-1: Silver 990, 2000g from Ahmedabad Silver @ 91.08/g (92*0.99)
  INSERT INTO transactions (org_id, txn_type, ref_no, txn_date, party_id, location_id, status, created_by, notes)
  VALUES (v_org_id, 'purchase', 'PUR-1-S990', d_1ago, v_supplier3, v_loc_id, 'posted', v_user_id, 'DEMO DATA')
  RETURNING id INTO v_txn12;

  INSERT INTO transaction_items (org_id, transaction_id, metal_id, purity_id, gross_weight, fine_weight, rate, amount)
  VALUES (v_org_id, v_txn12, v_silver_metal_id, v_silver_990, 2000, 1980.000, 91.08, 180338.40);

  INSERT INTO inventory_ledger (org_id, transaction_id, metal_id, purity_id, location_id, entry_type, gross_weight_delta, fine_weight_delta, ref_no, entry_date, posted_by)
  VALUES (v_org_id, v_txn12, v_silver_metal_id, v_silver_990, v_loc_id, 'purchase', 2000, 1980.000, 'PUR-1-S990', d_1ago, v_user_id);

  -- ============================================================
  -- Sale Transactions (last 9 days)
  -- ============================================================
  -- SAL-9: Gold 999, 100g to Tanishq @ 7250/g
  INSERT INTO transactions (org_id, txn_type, ref_no, txn_date, party_id, location_id, status, created_by, notes)
  VALUES (v_org_id, 'sale', 'SAL-9-G999', d_9ago, v_customer1, v_loc_id, 'posted', v_user_id, 'DEMO DATA')
  RETURNING id INTO v_txn13;

  INSERT INTO transaction_items (org_id, transaction_id, metal_id, purity_id, gross_weight, fine_weight, rate, amount)
  VALUES (v_org_id, v_txn13, v_gold_metal_id, v_purity_999, 100, 99.900, 7250, 722775);

  INSERT INTO inventory_ledger (org_id, transaction_id, metal_id, purity_id, location_id, entry_type, gross_weight_delta, fine_weight_delta, ref_no, entry_date, posted_by)
  VALUES (v_org_id, v_txn13, v_gold_metal_id, v_purity_999, v_loc_id, 'sale', -100, -99.900, 'SAL-9-G999', d_9ago, v_user_id);

  -- SAL-7: Gold 916, 400g to Kalyan @ 6625.2/g (7200*0.916 + 30)
  INSERT INTO transactions (org_id, txn_type, ref_no, txn_date, party_id, location_id, status, created_by, notes)
  VALUES (v_org_id, 'sale', 'SAL-7-G916', d_7ago, v_customer2, v_loc_id, 'posted', v_user_id, 'DEMO DATA');

  INSERT INTO transaction_items (org_id, transaction_id, metal_id, purity_id, gross_weight, fine_weight, rate, amount)
  VALUES (v_org_id, v_txn13, v_gold_metal_id, v_purity_916, 400, 366.400, 6625.20, 2427473.28);

  -- Use a separate transaction ID for SAL-7
  INSERT INTO transactions (org_id, txn_type, ref_no, txn_date, party_id, location_id, status, created_by, notes)
  VALUES (v_org_id, 'sale', 'SAL-7-G916', d_7ago, v_customer2, v_loc_id, 'posted', v_user_id, 'DEMO DATA')
  RETURNING id INTO v_txn13;

  -- Fix: SAL-7 items should reference v_txn13 (the SAL-7 txn)
  DELETE FROM transaction_items WHERE transaction_id = v_txn13 AND purity_id = v_purity_916;

  INSERT INTO transaction_items (org_id, transaction_id, metal_id, purity_id, gross_weight, fine_weight, rate, amount)
  VALUES (v_org_id, v_txn13, v_gold_metal_id, v_purity_916, 400, 366.400, 6625.20, 2427473.28);

  INSERT INTO inventory_ledger (org_id, transaction_id, metal_id, purity_id, location_id, entry_type, gross_weight_delta, fine_weight_delta, ref_no, entry_date, posted_by)
  VALUES (v_org_id, v_txn13, v_gold_metal_id, v_purity_916, v_loc_id, 'sale', -400, -366.400, 'SAL-7-G916', d_7ago, v_user_id);

  -- SAL-5: Silver 925, 2000g to Sharma Sons @ 90.05/g (92*0.925 + 5)
  INSERT INTO transactions (org_id, txn_type, ref_no, txn_date, party_id, location_id, status, created_by, notes)
  VALUES (v_org_id, 'sale', 'SAL-5-S925', d_5ago, v_customer4, v_loc_id, 'posted', v_user_id, 'DEMO DATA');

  INSERT INTO inventory_ledger (org_id, transaction_id, metal_id, purity_id, location_id, entry_type, gross_weight_delta, fine_weight_delta, ref_no, entry_date, posted_by)
  SELECT v_org_id, t.id, v_silver_metal_id, v_silver_925, v_loc_id, 'sale', -2000, -1850.000, 'SAL-5-S925', d_5ago, v_user_id
  FROM transactions t WHERE t.org_id = v_org_id AND t.ref_no = 'SAL-5-S925';

  INSERT INTO transaction_items (org_id, transaction_id, metal_id, purity_id, gross_weight, fine_weight, rate, amount)
  SELECT v_org_id, t.id, v_silver_metal_id, v_silver_925, 2000, 1850.000, 90.05, 166592.50
  FROM transactions t WHERE t.org_id = v_org_id AND t.ref_no = 'SAL-5-S925';

  -- SAL-3: Gold 750, 150g to PC Jewellers @ 5420/g (7200*0.75 + 20)
  INSERT INTO transactions (org_id, txn_type, ref_no, txn_date, party_id, location_id, status, created_by, notes)
  VALUES (v_org_id, 'sale', 'SAL-3-G750', d_3ago, v_customer3, v_loc_id, 'posted', v_user_id, 'DEMO DATA');

  INSERT INTO transaction_items (org_id, transaction_id, metal_id, purity_id, gross_weight, fine_weight, rate, amount)
  SELECT v_org_id, t.id, v_gold_metal_id, v_purity_750, 150, 112.500, 5420, 609750
  FROM transactions t WHERE t.org_id = v_org_id AND t.ref_no = 'SAL-3-G750';

  INSERT INTO inventory_ledger (org_id, transaction_id, metal_id, purity_id, location_id, entry_type, gross_weight_delta, fine_weight_delta, ref_no, entry_date, posted_by)
  SELECT v_org_id, t.id, v_gold_metal_id, v_purity_750, v_loc_id, 'sale', -150, -112.500, 'SAL-3-G750', d_3ago, v_user_id
  FROM transactions t WHERE t.org_id = v_org_id AND t.ref_no = 'SAL-3-G750';

  -- SAL-1: Silver 999, 3000g to Tanishq @ 95/g (92 + 3)
  INSERT INTO transactions (org_id, txn_type, ref_no, txn_date, party_id, location_id, status, created_by, notes)
  VALUES (v_org_id, 'sale', 'SAL-1-S999', d_1ago, v_customer1, v_loc_id, 'posted', v_user_id, 'DEMO DATA');

  INSERT INTO transaction_items (org_id, transaction_id, metal_id, purity_id, gross_weight, fine_weight, rate, amount)
  SELECT v_org_id, t.id, v_silver_metal_id, v_silver_999, 3000, 2997.000, 95, 284715
  FROM transactions t WHERE t.org_id = v_org_id AND t.ref_no = 'SAL-1-S999';

  INSERT INTO inventory_ledger (org_id, transaction_id, metal_id, purity_id, location_id, entry_type, gross_weight_delta, fine_weight_delta, ref_no, entry_date, posted_by)
  SELECT v_org_id, t.id, v_silver_metal_id, v_silver_999, v_loc_id, 'sale', -3000, -2997.000, 'SAL-1-S999', d_1ago, v_user_id
  FROM transactions t WHERE t.org_id = v_org_id AND t.ref_no = 'SAL-1-S999';

  -- SAL-0: Gold 585, 80g to Kalyan @ 4217/g (7200*0.585 + 10)
  INSERT INTO transactions (org_id, txn_type, ref_no, txn_date, party_id, location_id, status, created_by, notes)
  VALUES (v_org_id, 'sale', 'SAL-0-G585', d_today, v_customer2, v_loc_id, 'posted', v_user_id, 'DEMO DATA');

  INSERT INTO transaction_items (org_id, transaction_id, metal_id, purity_id, gross_weight, fine_weight, rate, amount)
  SELECT v_org_id, t.id, v_gold_metal_id, v_purity_585, 80, 46.800, 4217, 197355.60
  FROM transactions t WHERE t.org_id = v_org_id AND t.ref_no = 'SAL-0-G585';

  INSERT INTO inventory_ledger (org_id, transaction_id, metal_id, purity_id, location_id, entry_type, gross_weight_delta, fine_weight_delta, ref_no, entry_date, posted_by)
  SELECT v_org_id, t.id, v_gold_metal_id, v_purity_585, v_loc_id, 'sale', -80, -46.800, 'SAL-0-G585', d_today, v_user_id
  FROM transactions t WHERE t.org_id = v_org_id AND t.ref_no = 'SAL-0-G585';

  -- ============================================================
  -- Reconciliation (draft, with small variance)
  -- ============================================================
  INSERT INTO reconciliations (org_id, recon_no, recon_date, location_id, status)
  VALUES (v_org_id, 'RECON-DEMO-001', d_today, v_loc_id, 'draft')
  RETURNING id INTO v_recon_id;

  -- Reconciliation lines: book vs physical (physical = 99.8% of book, small variance)
  -- Gold 999: book 650g gross, physical 648.7g
  INSERT INTO reconciliation_lines (org_id, reconciliation_id, metal_id, purity_id, book_gross, book_fine, physical_gross, physical_fine)
  VALUES (v_org_id, v_recon_id, v_gold_metal_id, v_purity_999, 650, 649.350, 648.700, 648.051);

  -- Gold 916: book 1600g gross, physical 1596.8g
  INSERT INTO reconciliation_lines (org_id, reconciliation_id, metal_id, purity_id, book_gross, book_fine, physical_gross, physical_fine)
  VALUES (v_org_id, v_recon_id, v_gold_metal_id, v_purity_916, 1600, 1465.600, 1596.800, 1462.509);

  -- Gold 750: book 400g gross, physical 399.2g
  INSERT INTO reconciliation_lines (org_id, reconciliation_id, metal_id, purity_id, book_gross, book_fine, physical_gross, physical_fine)
  VALUES (v_org_id, v_recon_id, v_gold_metal_id, v_purity_750, 400, 300.000, 399.200, 299.400);

  -- Silver 999: book 17000g gross, physical 16966g
  INSERT INTO reconciliation_lines (org_id, reconciliation_id, metal_id, purity_id, book_gross, book_fine, physical_gross, physical_fine)
  VALUES (v_org_id, v_recon_id, v_silver_metal_id, v_silver_999, 17000, 16983.000, 16966.000, 16966.034);

  -- Silver 925: book 9000g gross, physical 8982g
  INSERT INTO reconciliation_lines (org_id, reconciliation_id, metal_id, purity_id, book_gross, book_fine, physical_gross, physical_fine)
  VALUES (v_org_id, v_recon_id, v_silver_metal_id, v_silver_925, 9000, 8325.000, 8982.000, 8308.350);

  -- ============================================================
  -- Audit Logs
  -- ============================================================
  INSERT INTO audit_logs (org_id, user_id, action, entity_type, entity_id, details) VALUES
    (v_org_id, v_user_id, 'organization.created', 'organization', v_org_id, '{"note":"DEMO DATA"}'::jsonb),
    (v_org_id, v_user_id, 'onboarding.completed', 'organization', v_org_id, '{"note":"DEMO DATA"}'::jsonb),
    (v_org_id, v_user_id, 'metals.configured', 'organization', v_org_id, '{"metals":["gold","silver"]}'::jsonb),
    (v_org_id, v_user_id, 'locations.created', 'location', v_loc_id, '{"name":"Main Vault"}'::jsonb),
    (v_org_id, v_user_id, 'locations.created', 'location', v_loc2_id, '{"name":"Branch Store"}'::jsonb),
    (v_org_id, v_user_id, 'party.created', 'party', v_supplier1, '{"type":"supplier","name":"Swiss Refinery Corp"}'::jsonb),
    (v_org_id, v_user_id, 'party.created', 'party', v_supplier2, '{"type":"supplier","name":"Mumbai Gold Exchange"}'::jsonb),
    (v_org_id, v_user_id, 'party.created', 'party', v_supplier3, '{"type":"supplier","name":"Ahmedabad Silver House"}'::jsonb),
    (v_org_id, v_user_id, 'party.created', 'party', v_customer1, '{"type":"customer","name":"Tanishq Jewellers"}'::jsonb),
    (v_org_id, v_user_id, 'party.created', 'party', v_customer2, '{"type":"customer","name":"Kalyan Jewellers"}'::jsonb),
    (v_org_id, v_user_id, 'party.created', 'party', v_customer3, '{"type":"customer","name":"PC Jewellers"}'::jsonb),
    (v_org_id, v_user_id, 'party.created', 'party', v_customer4, '{"type":"customer","name":"Sharma Sons Jewellers"}'::jsonb),
    (v_org_id, v_user_id, 'transaction.posted', 'transaction', v_txn1, '{"type":"opening","ref":"OPENING-G999"}'::jsonb),
    (v_org_id, v_user_id, 'transaction.posted', 'transaction', v_txn4, '{"type":"opening","ref":"OPENING-S999"}'::jsonb),
    (v_org_id, v_user_id, 'transaction.posted', 'transaction', v_txn6, '{"type":"purchase","ref":"PUR-14-G999"}'::jsonb),
    (v_org_id, v_user_id, 'transaction.posted', 'transaction', v_txn7, '{"type":"purchase","ref":"PUR-12-G916"}'::jsonb),
    (v_org_id, v_user_id, 'transaction.posted', 'transaction', v_txn8, '{"type":"purchase","ref":"PUR-10-S999"}'::jsonb),
    (v_org_id, v_user_id, 'transaction.posted', 'transaction', v_txn11, '{"type":"purchase","ref":"PUR-2-G750"}'::jsonb),
    (v_org_id, v_user_id, 'transaction.posted', 'transaction', v_txn13, '{"type":"sale","ref":"SAL-7-G916"}'::jsonb),
    (v_org_id, v_user_id, 'reconciliation.created', 'reconciliation', v_recon_id, '{"recon_no":"RECON-DEMO-001"}'::jsonb),
    (v_org_id, v_user_id, 'demo.data_seeded', 'organization', v_org_id, '{"note":"DEMO DATA — NOT REAL TRANSACTIONS"}'::jsonb);

  -- ============================================================
  -- Notifications
  -- ============================================================
  INSERT INTO notifications (org_id, user_id, title, body, type, is_read) VALUES
    (v_org_id, v_user_id, 'Welcome to MetalOps Demo', 'Your demo organization has been set up with sample data. Explore all features freely.', 'info', false),
    (v_org_id, v_user_id, 'Low Stock Alert: Gold 585 (14K)', 'Current stock of Gold 585 is below 50g gross. Consider restocking.', 'warning', false),
    (v_org_id, v_user_id, 'Reconciliation Draft Created', 'RECON-DEMO-001 has been created for Main Vault. Review and submit when ready.', 'info', false),
    (v_org_id, v_user_id, 'Variance Detected', 'Small variance detected in Silver 925 stock (0.2%). Please review during reconciliation.', 'warning', true),
    (v_org_id, v_user_id, 'Purchase Posted', 'PUR-1-S990: 2000g of Silver 990 purchased from Ahmedabad Silver House.', 'success', true),
    (v_org_id, v_user_id, 'Sale Posted', 'SAL-0-G585: 80g of Gold 585 sold to Kalyan Jewellers.', 'success', true);

  -- ============================================================
  -- App Settings
  -- ============================================================
  INSERT INTO app_settings (org_id, key, value) VALUES
    (v_org_id, 'default_location', to_jsonb(v_loc_id)),
    (v_org_id, 'demo_mode', 'true'::jsonb),
    (v_org_id, 'low_stock_threshold', '50'::jsonb);

  RAISE NOTICE 'Demo data seeded successfully for org %', v_org_id;
END $$;
