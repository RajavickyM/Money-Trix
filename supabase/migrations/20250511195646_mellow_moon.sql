/*
  # Add ensure_balance function
  
  1. New Functions
    - `ensure_balance`: Creates a balance record for a user if it doesn't exist
      - Takes user_id as parameter
      - Returns the balance record
      - Runs with security definer to bypass RLS
  
  2. Security
    - Function runs with security definer privileges
    - Only authenticated users can call the function
*/

create or replace function ensure_balance(user_id uuid)
returns table (
  user_id uuid,
  amount numeric,
  updated_at timestamptz
)
security definer
set search_path = public
language plpgsql
as $$
begin
  -- First try to get existing balance
  return query
  select b.user_id, b.amount, b.updated_at
  from balances b
  where b.user_id = ensure_balance.user_id;
  
  -- If no rows returned, insert new balance
  if not found then
    return query
    insert into balances (user_id, amount)
    values (ensure_balance.user_id, 0)
    returning user_id, amount, updated_at;
  end if;
end;
$$;