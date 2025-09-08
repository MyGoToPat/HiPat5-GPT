/*
  # Create admin API keys table

  1. New Tables
    - `admin_api_keys`
      - `provider` (text, primary key) - API provider name (e.g., 'openai', 'stripe')
      - `secret` (text, not null) - encrypted API key/secret
      - `updated_at` (timestamp) - when the key was last updated
  
  2. Security
    - Enable RLS on `admin_api_keys` table
    - Add policies for admin-only access using JWT claims
    - Admins can read, insert, and update API keys
  
  3. Notes
    - API secrets should be encrypted at the application layer before storage
    - Only admins with 'is_admin' JWT claim can access this table
    - Used for storing third-party service credentials securely
*/

-- 1) Table to hold admin-managed API keys (one row per provider)
create table if not exists admin_api_keys (
  provider text primary key,
  secret   text not null,
  updated_at timestamptz default now()
);

-- 2) Enable RLS
alter table admin_api_keys enable row level security;

-- 3) Allow only admins to read/write.
-- If you're using an 'is_admin' JWT claim, use it here.
create policy "admin can read" on admin_api_keys
  for select using (auth.jwt() ->> 'is_admin' = 'true');

create policy "admin can upsert" on admin_api_keys
  for insert with check (auth.jwt() ->> 'is_admin' = 'true');

create policy "admin can update" on admin_api_keys
  for update using (auth.jwt() ->> 'is_admin' = 'true')
             with check (auth.jwt() ->> 'is_admin' = 'true');