/*
  # Add balance creation trigger

  1. New Functions
    - `create_user_balance`: Creates a balance record for new users
  
  2. New Triggers
    - `create_balance_on_profile_insert`: Automatically creates balance when profile is created
  
  3. Changes
    - Adds trigger to profiles table
    - Ensures every user has a balance record
*/

-- Function to create user balance
CREATE OR REPLACE FUNCTION create_user_balance()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO balances (user_id, amount)
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create balance when profile is created
CREATE TRIGGER create_balance_on_profile_insert
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_user_balance();

-- Create balances for existing profiles that don't have one
INSERT INTO balances (user_id, amount)
SELECT id, 0
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM balances b WHERE b.user_id = p.id
);