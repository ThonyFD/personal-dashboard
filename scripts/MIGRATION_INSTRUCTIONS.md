# Category Migration Instructions

## Easiest Method: Use Google Cloud Console SQL Editor

### Step 1: Open Cloud SQL Instance
1. Go to: https://console.cloud.google.com/sql/instances/personal-dashboard-fdc/overview?project=mail-reader-433802
2. Click on the instance `personal-dashboard-fdc`
3. Click on **"Cloud SQL Studio"** in the left menu (or use the legacy SQL tab)

### Step 2: Execute Migration Scripts

#### 2.1 Populate Categories
Copy and paste this SQL:

```sql
-- From scripts/populate-categories.sql
INSERT INTO categories (id, name, icon, color, description, is_default) VALUES
(1, 'Food & Dining', '🍽️', '#FF6B6B', 'Restaurants, Coffee shops, Fast food, Bars', true),
(2, 'Groceries', '🛒', '#4ECB71', 'Supermarkets, Grocery stores', true),
(3, 'Transportation', '🚗', '#4ECDC4', 'Uber, Gas stations, Parking, Tolls', true),
(4, 'Entertainment', '🎮', '#9B59B6', 'Netflix, Gaming, Movies, Streaming services', true),
(5, 'Shopping', '🛍️', '#F39C12', 'Amazon, Retail stores, Clothing', true),
(6, 'Bills & Utilities', '💡', '#3498DB', 'Electric, Water, Internet, Phone', true),
(7, 'Healthcare', '🏥', '#E74C3C', 'Hospitals, Pharmacies, Doctors', true),
(8, 'Travel', '✈️', '#1ABC9C', 'Hotels, Airlines, Airbnb', true),
(9, 'Education', '📚', '#2ECC71', 'Schools, Universities, Online courses', true),
(10, 'Services', '🔧', '#95A5A6', 'Repairs, Cleaning, Salons', true),
(11, 'Subscriptions', '📱', '#E67E22', 'Monthly memberships, Recurring services', true),
(12, 'Transfers', '💸', '#34495E', 'Yappy, Bank transfers, P2P payments', true),
(13, 'Investment', '📈', '#27AE60', 'Admiral Markets, Brokers, Trading platforms, Crypto exchanges', true),
(14, 'Pago Mensual', '💳', '#8E44AD', 'Loan payments, Mortgages, Financing', true),
(15, 'Other', '📦', '#95A5A6', 'Uncategorized transactions', true)
ON CONFLICT (name) DO NOTHING;

SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));
```

Click **Run** ▶️

#### 2.2 Migrate Merchant Categories
Copy and paste this SQL:

```sql
-- From scripts/migrate-merchant-categories.sql
UPDATE merchants SET category_id = 1 WHERE category = 'Food & Dining' AND category_id IS NULL;
UPDATE merchants SET category_id = 2 WHERE category = 'Groceries' AND category_id IS NULL;
UPDATE merchants SET category_id = 3 WHERE category = 'Transportation' AND category_id IS NULL;
UPDATE merchants SET category_id = 4 WHERE category = 'Entertainment' AND category_id IS NULL;
UPDATE merchants SET category_id = 5 WHERE category = 'Shopping' AND category_id IS NULL;
UPDATE merchants SET category_id = 6 WHERE category = 'Bills & Utilities' AND category_id IS NULL;
UPDATE merchants SET category_id = 7 WHERE category = 'Healthcare' AND category_id IS NULL;
UPDATE merchants SET category_id = 8 WHERE category = 'Travel' AND category_id IS NULL;
UPDATE merchants SET category_id = 9 WHERE category = 'Education' AND category_id IS NULL;
UPDATE merchants SET category_id = 10 WHERE category = 'Services' AND category_id IS NULL;
UPDATE merchants SET category_id = 11 WHERE category = 'Subscriptions' AND category_id IS NULL;
UPDATE merchants SET category_id = 12 WHERE category = 'Transfers' AND category_id IS NULL;
UPDATE merchants SET category_id = 13 WHERE category = 'Investment' AND category_id IS NULL;
UPDATE merchants SET category_id = 14 WHERE category = 'Pago Mensual' AND category_id IS NULL;
UPDATE merchants SET category_id = 15 WHERE category = 'Other' AND category_id IS NULL;

-- Special case: "Gas" should map to Transportation (ID: 3)
UPDATE merchants SET category_id = 3 WHERE category = 'Gas' AND category_id IS NULL;

-- Set any remaining NULL category_id to 'Other' (ID: 15)
UPDATE merchants SET category_id = 15 WHERE category_id IS NULL;

-- Verify the migration
SELECT category, category_id, COUNT(*) as count
FROM merchants
GROUP BY category, category_id
ORDER BY category_id, category;
```

Click **Run** ▶️

#### 2.3 Add Foreign Key Constraint
Copy and paste this SQL:

```sql
-- From scripts/add-category-fk-constraint.sql
ALTER TABLE merchants
ADD CONSTRAINT fk_merchants_category
FOREIGN KEY (category_id)
REFERENCES categories(id)
ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_merchants_category_id ON merchants(category_id);

-- Verify
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'merchants';
```

Click **Run** ▶️

### Step 3: Deploy Code Changes

After the database migration is complete:

```bash
# Deploy Firebase Data Connect
firebase deploy --only dataconnect

# Build and deploy ingestor
cd services/ingestor
npm run build
~/google-cloud-sdk/bin/gcloud run deploy ingestor \
  --source . \
  --region=us-central1 \
  --project=mail-reader-433802
```

---

## Alternative: Use Scripts (Requires Setup)

If you prefer CLI, you need to:

1. **Download Cloud SQL Proxy:**
```bash
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.darwin.amd64
chmod +x cloud-sql-proxy
sudo mv cloud-sql-proxy /usr/local/bin/
```

2. **Start Proxy (in separate terminal):**
```bash
cloud-sql-proxy mail-reader-433802:us-central1:personal-dashboard-fdc
```

3. **Run Migration (in another terminal):**
```bash
node scripts/run-category-migration.js
```

---

## Verification

After migration, verify in Cloud Console SQL Editor:

```sql
-- Check all merchants have category_id
SELECT COUNT(*) as null_count FROM merchants WHERE category_id IS NULL;
-- Should return 0

-- Check category distribution
SELECT
  c.id,
  c.name,
  COUNT(m.id) as merchant_count
FROM categories c
LEFT JOIN merchants m ON m.category_id = c.id
GROUP BY c.id, c.name
ORDER BY merchant_count DESC;
```
