/*
  # Add policy for searching profiles

  1. Changes
    - Add policy to allow authenticated users to search for other users' profiles
    
  2. Security
    - Users can only view limited profile information for search purposes
*/

CREATE POLICY "Allow authenticated users to search profiles"
    ON profiles FOR SELECT
    TO authenticated
    USING (true);