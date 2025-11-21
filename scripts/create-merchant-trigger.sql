-- Create Merchant Stats Trigger
-- This trigger automatically updates merchant stats when transactions are inserted/updated/deleted

-- First, check if trigger exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.triggers
        WHERE trigger_name = 'update_merchant_stats_trigger'
    ) THEN
        RAISE NOTICE 'Trigger already exists, dropping it first';
        DROP TRIGGER update_merchant_stats_trigger ON transactions;
    END IF;
END $$;

-- Drop the function if it exists
DROP FUNCTION IF EXISTS update_merchant_stats();

-- Recreate the function to update merchant stats
CREATE OR REPLACE FUNCTION update_merchant_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment stats for new transaction
        UPDATE merchants
        SET
            transaction_count = transaction_count + 1,
            total_amount = total_amount + NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.merchant_id AND NEW.merchant_id IS NOT NULL;
        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' AND (NEW.merchant_id IS DISTINCT FROM OLD.merchant_id OR NEW.amount != OLD.amount) THEN
        -- Handle merchant change or amount change

        -- Decrement old merchant (if it had one)
        IF OLD.merchant_id IS NOT NULL THEN
            UPDATE merchants
            SET
                transaction_count = transaction_count - 1,
                total_amount = total_amount - OLD.amount,
                updated_at = NOW()
            WHERE id = OLD.merchant_id;
        END IF;

        -- Increment new merchant (if it has one)
        IF NEW.merchant_id IS NOT NULL THEN
            UPDATE merchants
            SET
                transaction_count = transaction_count + 1,
                total_amount = total_amount + NEW.amount,
                updated_at = NOW()
            WHERE id = NEW.merchant_id;
        END IF;
        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement stats when transaction is deleted
        IF OLD.merchant_id IS NOT NULL THEN
            UPDATE merchants
            SET
                transaction_count = transaction_count - 1,
                total_amount = total_amount - OLD.amount,
                updated_at = NOW()
            WHERE id = OLD.merchant_id;
        END IF;
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER update_merchant_stats_trigger
    AFTER INSERT OR UPDATE OR DELETE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_merchant_stats();

-- Confirm trigger was created
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing
FROM information_schema.triggers
WHERE trigger_name = 'update_merchant_stats_trigger';
