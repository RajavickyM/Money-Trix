/*
  # Add type column to transactions table

  1. Changes
    - Add `type` column to transactions table to distinguish between 'send' and 'request' transactions
    
  2. Security
    - No changes to RLS policies needed
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' 
    AND column_name = 'type'
  ) THEN
    ALTER TABLE transactions 
    ADD COLUMN type text NOT NULL DEFAULT 'send' 
    CHECK (type IN ('send', 'request'));
  END IF;
END $$;