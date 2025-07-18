/*
  # Add RLS policy for money requests

  1. Changes
    - Add new RLS policy to allow users to create request transactions where they are the receiver
  
  2. Security
    - Policy ensures users can only create requests where they are the receiver
    - Maintains existing security model while enabling money request functionality
*/

CREATE POLICY "Users can create request transactions" ON public.transactions
FOR INSERT
TO public
WITH CHECK (
  (auth.uid() = receiver_id) AND 
  (type = 'request') AND 
  (status = 'pending')
);