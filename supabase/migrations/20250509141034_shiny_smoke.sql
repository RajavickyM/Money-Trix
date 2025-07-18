/*
  # Add balance management and transfer logic

  1. New Tables
    - balances
      - user_id (uuid, references profiles)
      - amount (decimal)
      - updated_at (timestamp)

  2. Functions
    - transfer_money: Handles money transfer between accounts
    
  3. Security
    - Enable RLS on balances table
    - Add policies for balance management
*/

-- Create balances table
CREATE TABLE balances (
    user_id UUID REFERENCES profiles(id) PRIMARY KEY,
    amount DECIMAL NOT NULL DEFAULT 0 CHECK (amount >= 0),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE balances ENABLE ROW LEVEL SECURITY;

-- Policies for balances
CREATE POLICY "Users can view their own balance"
    ON balances FOR SELECT
    USING (auth.uid() = user_id);

-- Function to handle money transfers
CREATE OR REPLACE FUNCTION transfer_money(
    sender_id UUID,
    receiver_id UUID,
    transfer_amount DECIMAL,
    transaction_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    sender_balance DECIMAL;
BEGIN
    -- Get sender's current balance
    SELECT amount INTO sender_balance
    FROM balances
    WHERE user_id = sender_id
    FOR UPDATE;

    -- Check if sender has enough balance
    IF sender_balance < transfer_amount THEN
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