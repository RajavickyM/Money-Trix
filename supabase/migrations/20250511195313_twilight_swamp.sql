/*
  # Fix transaction status updates and policies

  1. Changes
    - Update transfer_money function to handle transaction status properly
    - Add policy for updating transaction status
    - Fix transaction status checks
    
  2. Security
    - Add proper RLS policies for transaction updates
*/

-- Update the transfer_money function with better transaction handling
CREATE OR REPLACE FUNCTION transfer_money(
    sender_id UUID,
    receiver_id UUID,
    transfer_amount DECIMAL,
    transaction_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    sender_balance DECIMAL;
    current_status TEXT;
BEGIN
    -- Lock the transaction row first
    SELECT status INTO current_status
    FROM transactions
    WHERE id = transaction_id
    FOR UPDATE;

    IF current_status IS NULL THEN
        RAISE EXCEPTION 'Transaction not found';
    END IF;

    IF current_status != 'pending' THEN
        RAISE EXCEPTION 'Transaction is no longer pending';
    END IF;

    -- Get sender's current balance with row lock
    SELECT amount INTO sender_balance
    FROM balances
    WHERE user_id = sender_id
    FOR UPDATE;

    IF sender_balance IS NULL THEN
        -- Update transaction status to failed
        UPDATE transactions
        SET status = 'failed',
            updated_at = now()
        WHERE id = transaction_id;
        
        RAISE EXCEPTION 'Sender balance not found';
    END IF;

    -- Check if sender has enough balance
    IF sender_balance < transfer_amount THEN
        -- Update transaction status to failed
        UPDATE transactions
        SET status = 'failed',
            updated_at = now()
        WHERE id = transaction_id;
        
        RETURN FALSE;
    END IF;

    -- Update sender's balance
    UPDATE balances
    SET amount = amount - transfer_amount,
        updated_at = now()
    WHERE user_id = sender_id;

    -- Update or insert receiver's balance
    INSERT INTO balances (user_id, amount, updated_at)
    VALUES (receiver_id, transfer_amount, now())
    ON CONFLICT (user_id)
    DO UPDATE SET 
        amount = balances.amount + transfer_amount,
        updated_at = now();

    -- Update transaction status
    UPDATE transactions
    SET status = 'completed',
        updated_at = now()
    WHERE id = transaction_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add policy for updating transaction status
CREATE POLICY "Users can update transaction status"
    ON transactions
    FOR UPDATE
    TO public
    USING (
        (auth.uid() = receiver_id AND type = 'send') OR
        (auth.uid() = sender_id AND type = 'request')
    )
    WITH CHECK (
        (auth.uid() = receiver_id AND type = 'send') OR
        (auth.uid() = sender_id AND type = 'request')
    );

-- Drop and recreate the policy for creating transactions to fix request handling
DROP POLICY IF EXISTS "Users can create transactions" ON transactions;
DROP POLICY IF EXISTS "Users can create request transactions" ON transactions;

CREATE POLICY "Users can create transactions"
    ON transactions
    FOR INSERT
    TO public
    WITH CHECK (
        (auth.uid() = sender_id AND type = 'send' AND status = 'pending') OR
        (auth.uid() = receiver_id AND type = 'request' AND status = 'pending')
    );