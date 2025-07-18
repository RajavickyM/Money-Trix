/*
  # Fix transaction confirmation issues

  1. Changes
    - Update transfer_money function to handle transaction status properly
    - Add status check to prevent multiple confirmations
    - Add proper error handling
    
  2. Security
    - No changes to RLS policies needed
*/

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
    -- Check if transaction is already completed or rejected
    SELECT status INTO current_status
    FROM transactions
    WHERE id = transaction_id
    FOR UPDATE;

    IF current_status != 'pending' THEN
        RAISE EXCEPTION 'Transaction is no longer pending';
    END IF;

    -- Get sender's current balance
    SELECT amount INTO sender_balance
    FROM balances
    WHERE user_id = sender_id
    FOR UPDATE;

    -- Check if sender has enough balance
    IF sender_balance < transfer_amount THEN
        -- Update transaction status to failed
        UPDATE transactions
        SET status = 'failed'
        WHERE id = transaction_id;
        
        RETURN FALSE;
    END IF;

    -- Update sender's balance
    UPDATE balances
    SET amount = amount - transfer_amount
    WHERE user_id = sender_id;

    -- Update or insert receiver's balance
    INSERT INTO balances (user_id, amount)
    VALUES (receiver_id, transfer_amount)
    ON CONFLICT (user_id)
    DO UPDATE SET amount = balances.amount + transfer_amount;

    -- Update transaction status
    UPDATE transactions
    SET status = 'completed'
    WHERE id = transaction_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;