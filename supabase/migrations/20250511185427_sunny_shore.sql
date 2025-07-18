/*
  # Add missing policies for profile and balance management

  1. Changes
    - Add policy for creating own profile during signup
    - Add policy for creating and managing balances
    
  2. Security
    - Allow users to create their own profile during signup
    - Allow users to manage their own balance
*/

-- Policy for creating own profile during signup
CREATE POLICY "Users can create their own profile"
ON profiles
FOR INSERT
TO public
WITH CHECK (auth.uid() = id);

-- Policy for creating initial balance
CREATE POLICY "Users can create their initial balance"
ON balances
FOR INSERT
TO public
WITH CHECK (auth.uid() = user_id);

-- Policy for updating own balance
CREATE POLICY "Users can update their own balance"
ON balances
FOR UPDATE
TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);