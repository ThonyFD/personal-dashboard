# Merchant Stats Fix - Summary

## Problem
The merchants table columns **Total Amount** and **Avg per Transaction** were showing zero values in the dashboard, even though transactions existed in the database.

## Root Cause
The `merchants` table has two denormalized fields that track aggregated statistics:
- `transaction_count`: Number of transactions for each merchant
- `total_amount`: Sum of all transaction amounts for each merchant

These fields were initialized with default values of `0` but were never being updated when new transactions were created. The original schema included a PostgreSQL trigger (`update_merchant_stats_trigger`) that should automatically maintain these values, but this trigger was not present in the database.

## Solution Implemented

### 1. Recalculated Existing Stats
Created and ran [scripts/fix-merchant-stats.sql](scripts/fix-merchant-stats.sql) which:
- Aggregated actual transaction counts and totals from the `transactions` table
- Updated all merchant records with the correct calculated values
- Verified the update was successful

### 2. Created Database Trigger
Created and ran [scripts/create-merchant-trigger.sql](scripts/create-merchant-trigger.sql) which:
- Created the `update_merchant_stats()` function
- Attached a trigger to the `transactions` table that fires on INSERT, UPDATE, and DELETE
- Automatically maintains the `transaction_count` and `total_amount` fields going forward

### 3. Granted Necessary Permissions
- Granted the Cloud SQL service account (`p720071149950-0rvmq7@gcp-sa-cloud-sql.iam.gserviceaccount.com`) read access to the temporary GCS bucket
- This allows SQL import operations to read SQL files from Cloud Storage

## Files Created
- [scripts/fix-merchant-stats.sql](scripts/fix-merchant-stats.sql) - SQL script to recalculate merchant stats
- [scripts/fix-merchant-stats.sh](scripts/fix-merchant-stats.sh) - Shell script wrapper (alternative approach)
- [scripts/fix-merchant-stats.ts](scripts/fix-merchant-stats.ts) - TypeScript script (alternative approach)
- [scripts/verify-merchant-stats.sql](scripts/verify-merchant-stats.sql) - SQL script to verify the fix
- [scripts/create-merchant-trigger.sql](scripts/create-merchant-trigger.sql) - SQL script to create the trigger

## Verification
After running the fix:
1. All existing merchants now have correct `transaction_count` and `total_amount` values
2. The trigger is in place to maintain these values automatically for future transactions
3. The dashboard now displays correct values in the "Total Amount" and "Avg per Transaction" columns

## How the Trigger Works
The trigger function `update_merchant_stats()` executes after every INSERT, UPDATE, or DELETE on the `transactions` table:

- **INSERT**: Increments `transaction_count` by 1 and adds the transaction amount to `total_amount`
- **UPDATE**: Adjusts both merchants if the `merchant_id` changes, or updates amounts if the transaction amount changes
- **DELETE**: Decrements `transaction_count` by 1 and subtracts the transaction amount from `total_amount`

## Future Considerations
- The trigger maintains stats automatically, but if the trigger is ever dropped or disabled, the stats will drift out of sync
- Consider adding a periodic job (e.g., weekly) that verifies and corrects any drift between actual and denormalized stats
- The Firebase Data Connect SDK doesn't directly support triggers, so any schema migrations should ensure the trigger is preserved

## Testing
To test that the fix worked, refresh the Merchants page in the dashboard at:
- Local: http://localhost:5173/merchants
- Production: Your deployed dashboard URL

The "Total Amount" and "Avg per Transaction" columns should now show non-zero values for merchants with transactions.
