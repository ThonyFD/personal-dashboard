-- Check the schema of monthly_incomes and manual_transactions tables
SELECT
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'monthly_incomes'
ORDER BY ordinal_position;

SELECT
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'manual_transactions'
ORDER BY ordinal_position;
