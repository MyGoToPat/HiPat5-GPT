/*
  # Fix Chat Messages Foreign Key Integrity

  1. Functions
    - `get_or_create_active_history`: Ensures user has an active chat_history record
    - `get_or_create_active_session`: Ensures user has an active chat_session record
    - `ensure_active_session`: RPC to proactively prep session/history

  2. Trigger
    - `trg_chat_messages_backfill_fk`: Automatically backfills missing FK values before insert

  3. Security
    - All functions use `security definer` to run with elevated privileges
    - Trigger ensures data integrity without breaking inserts
*/

-- Helper: Ensure user has an active chat_histories record
create or replace function get_or_create_active_history(p_user uuid)
returns uuid language plpgsql security definer as $$
declare
  v_hist uuid;
begin
  select id into v_hist
  from chat_histories
  where user_id = p_user and ended_at is null
  order by created_at desc
  limit 1;

  if v_hist is null then
    insert into chat_histories (user_id, created_at, ended_at)
    values (p_user, now(), null)
    returning id into v_hist;
  end if;

  return v_hist;
end $$;

-- Helper: Ensure user has an active chat_sessions record
create or replace function get_or_create_active_session(p_user uuid)
returns uuid language plpgsql security definer as $$
declare
  v_session uuid;
begin
  select id into v_session
  from chat_sessions
  where user_id = p_user and ended_at is null
  order by created_at desc
  limit 1;

  if v_session is null then
    insert into chat_sessions (user_id, started_at, ended_at)
    values (p_user, now(), null)
    returning id into v_session;
  end if;

  return v_session;
end $$;

-- Trigger function: Backfill missing FKs before insert
create or replace function chat_messages_backfill_fk()
returns trigger language plpgsql security definer as $$
begin
  -- Backfill session_id if missing
  if new.session_id is null then
    new.session_id := get_or_create_active_session(new.user_id);
  end if;

  -- Backfill chat_history_id if column exists and value is missing
  if (select count(*) from information_schema.columns
      where table_name='chat_messages' and column_name='chat_history_id') > 0 then
    if new.chat_history_id is null then
      new.chat_history_id := get_or_create_active_history(new.user_id);
    end if;
  end if;

  return new;
end $$;

-- Drop existing trigger if present
drop trigger if exists trg_chat_messages_backfill_fk on chat_messages;

-- Create trigger
create trigger trg_chat_messages_backfill_fk
before insert on chat_messages
for each row execute function chat_messages_backfill_fk();

-- RPC: Proactively prepare session/history for user
create or replace function ensure_active_session(p_user uuid)
returns table(session_id uuid, chat_history_id uuid)
language sql security definer stable as $$
  select get_or_create_active_session(p_user), get_or_create_active_history(p_user);
$$;
