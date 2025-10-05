/*
  # Fix Chat Messages FK Integrity - Clean Version

  Drops existing functions and recreates them cleanly to avoid signature conflicts.
*/

-- Drop existing functions if they exist
drop function if exists get_or_create_active_session(uuid, text);
drop function if exists get_or_create_active_session(uuid);
drop function if exists ensure_active_session(uuid);
drop function if exists chat_messages_backfill_fk() cascade;

-- 1) Ensure chat_sessions table has an "active" row per user
create function get_or_create_active_session(p_user uuid)
returns uuid
language plpgsql
security definer
as $$
declare v_session uuid;
begin
  select id
    into v_session
  from chat_sessions
  where user_id = p_user
    and ended_at is null
  order by created_at desc
  limit 1;

  if v_session is null then
    insert into chat_sessions (user_id, started_at, ended_at)
    values (p_user, now(), null)
    returning id into v_session;
  end if;

  return v_session;
end;
$$;

-- 2) BEFORE INSERT trigger to auto-backfill FKs on chat_messages
create function chat_messages_backfill_fk()
returns trigger
language plpgsql
security definer
as $$
begin
  -- session_id
  if new.session_id is null then
    new.session_id := get_or_create_active_session(new.user_id);
  end if;

  -- chat_history_id (mirror session)
  if exists (
    select 1 from information_schema.columns
    where table_name='chat_messages' and column_name='chat_history_id'
  ) then
    if new.chat_history_id is null then
      new.chat_history_id := new.session_id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_chat_messages_backfill_fk on chat_messages;

create trigger trg_chat_messages_backfill_fk
before insert on chat_messages
for each row execute function chat_messages_backfill_fk();

-- 3) RPC for app to call before first message
create function ensure_active_session(p_user uuid)
returns uuid
language sql
security definer
stable
as $$
  select get_or_create_active_session(p_user);
$$;