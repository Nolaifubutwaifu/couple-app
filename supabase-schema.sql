create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  timezone text,
  created_at timestamptz not null default now()
);

create table if not exists public.couples (
  id uuid primary key default gen_random_uuid(),
  invite_code text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.couple_members (
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (couple_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  question_id text not null,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  text text not null check (char_length(trim(text)) > 0),
  image_url text,
  created_at timestamptz not null default now()
);

create index if not exists couple_members_user_id_idx on public.couple_members(user_id);
create index if not exists messages_couple_question_created_idx on public.messages(couple_id, question_id, created_at);
create index if not exists messages_sender_id_idx on public.messages(sender_id);
create index if not exists messages_image_url_idx on public.messages(couple_id, created_at desc) where image_url is not null;

alter table public.profiles enable row level security;
alter table public.couples enable row level security;
alter table public.couple_members enable row level security;
alter table public.messages enable row level security;

create or replace function public.is_couple_member(couple_id_arg uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.couple_members
    where couple_id = couple_id_arg
      and user_id = auth.uid()
  );
$$;

create or replace function public.shares_couple(profile_id_arg uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select profile_id_arg = auth.uid()
    or exists (
      select 1
      from public.couple_members mine
      join public.couple_members theirs
        on theirs.couple_id = mine.couple_id
      where mine.user_id = auth.uid()
        and theirs.user_id = profile_id_arg
    );
$$;

drop function if exists public.get_my_couple();
drop function if exists public.create_couple();
drop function if exists public.join_couple_by_invite(text);

create or replace function public.get_my_couple()
returns table(couple_id uuid, invite_code text, member_count integer, partner_name text, partner_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.invite_code,
    (
      select count(*)::integer
      from public.couple_members cm_count
      where cm_count.couple_id = c.id
    ) as member_count,
    (
      select p.display_name
      from public.couple_members cm_partner
      join public.profiles p on p.id = cm_partner.user_id
      where cm_partner.couple_id = c.id
        and cm_partner.user_id <> auth.uid()
      order by cm_partner.created_at asc
      limit 1
    ) as partner_name,
    (
      select cm_partner.user_id
      from public.couple_members cm_partner
      where cm_partner.couple_id = c.id
        and cm_partner.user_id <> auth.uid()
      order by cm_partner.created_at asc
      limit 1
    ) as partner_id
  from public.couple_members cm
  join public.couples c on c.id = cm.couple_id
  where cm.user_id = auth.uid()
  order by cm.created_at asc
  limit 1;
$$;

create or replace function public.create_couple()
returns table(couple_id uuid, invite_code text, member_count integer, partner_name text, partner_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  generated_code text;
  new_couple_id uuid;
  existing_couple_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select cm.couple_id
  into existing_couple_id
  from public.couple_members cm
  where cm.user_id = auth.uid()
  order by cm.created_at asc
  limit 1;

  if existing_couple_id is not null then
    return query
      select *
      from public.get_my_couple();
    return;
  end if;

  loop
    generated_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

    begin
      insert into public.couples (invite_code, created_by)
      values (generated_code, auth.uid())
      returning id into new_couple_id;

      exit;
    exception
      when unique_violation then
        -- Try another generated invite code.
    end;
  end loop;

  insert into public.couple_members (couple_id, user_id)
  values (new_couple_id, auth.uid())
  on conflict do nothing;

  return query
    select
      new_couple_id,
      generated_code,
      1,
      null::text,
      null::uuid;
end;
$$;

create or replace function public.join_couple_by_invite(invite_code_arg text)
returns table(couple_id uuid, invite_code text, member_count integer, partner_name text, partner_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_code text;
  target_couple_id uuid;
  target_invite_code text;
  existing_couple_id uuid;
  current_member_count integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  clean_code := upper(trim(invite_code_arg));

  select c.id, c.invite_code
  into target_couple_id, target_invite_code
  from public.couples c
  where c.invite_code = clean_code
  for update;

  if target_couple_id is null then
    raise exception 'Invite code not found';
  end if;

  select cm.couple_id
  into existing_couple_id
  from public.couple_members cm
  where cm.user_id = auth.uid()
  order by cm.created_at asc
  limit 1;

  if existing_couple_id is not null and existing_couple_id <> target_couple_id then
    raise exception 'You are already in a couple space';
  end if;

  if existing_couple_id = target_couple_id then
    return query
      select *
      from public.get_my_couple();
    return;
  end if;

  select count(*)::integer
  into current_member_count
  from public.couple_members cm
  where cm.couple_id = target_couple_id;

  if current_member_count >= 2 then
    raise exception 'This couple space is already full';
  end if;

  insert into public.couple_members (couple_id, user_id)
  values (target_couple_id, auth.uid())
  on conflict do nothing;

  return query
    select *
    from public.get_my_couple();
end;
$$;

drop policy if exists "Profiles are visible to their couple" on public.profiles;
create policy "Profiles are visible to their couple"
on public.profiles
for select
to authenticated
using (public.shares_couple(id));

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Couples are visible to members" on public.couples;
create policy "Couples are visible to members"
on public.couples
for select
to authenticated
using (public.is_couple_member(id));

drop policy if exists "Couple members are visible to members" on public.couple_members;
create policy "Couple members are visible to members"
on public.couple_members
for select
to authenticated
using (public.is_couple_member(couple_id));

drop policy if exists "Messages are visible to couple members" on public.messages;
create policy "Messages are visible to couple members"
on public.messages
for select
to authenticated
using (public.is_couple_member(couple_id));

drop policy if exists "Members can send messages" on public.messages;
create policy "Members can send messages"
on public.messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and public.is_couple_member(couple_id)
);

drop policy if exists "Members can clear messages" on public.messages;
create policy "Members can clear messages"
on public.messages
for delete
to authenticated
using (public.is_couple_member(couple_id));

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select on public.couples to authenticated;
grant select on public.couple_members to authenticated;
grant select, insert, delete on public.messages to authenticated;
grant execute on function public.is_couple_member(uuid) to authenticated;
grant execute on function public.shares_couple(uuid) to authenticated;
grant execute on function public.get_my_couple() to authenticated;
grant execute on function public.create_couple() to authenticated;
grant execute on function public.join_couple_by_invite(text) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.couple_members;
exception
  when duplicate_object then null;
end $$;


-- ═══════════════════════════════════════════════
-- GAME STATES (persistent async turn-based games)
-- ═══════════════════════════════════════════════

create table if not exists public.game_states (
  couple_id uuid not null references public.couples(id) on delete cascade,
  game_type text not null check (game_type in ('tictactoe', 'memory', 'date')),
  state jsonb not null default '{}',
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key (couple_id, game_type)
);

alter table public.game_states enable row level security;

drop policy if exists "Game states visible to couple members" on public.game_states;
create policy "Game states visible to couple members"
on public.game_states
for select
to authenticated
using (public.is_couple_member(couple_id));

drop policy if exists "Couple members can create game states" on public.game_states;
create policy "Couple members can create game states"
on public.game_states
for insert
to authenticated
with check (
  updated_by = auth.uid()
  and public.is_couple_member(couple_id)
);

drop policy if exists "Couple members can update game states" on public.game_states;
create policy "Couple members can update game states"
on public.game_states
for update
to authenticated
using (public.is_couple_member(couple_id))
with check (updated_by = auth.uid());

drop policy if exists "Couple members can delete game states" on public.game_states;
create policy "Couple members can delete game states"
on public.game_states
for delete
to authenticated
using (public.is_couple_member(couple_id));

grant select, insert, update, delete on public.game_states to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.game_states;
exception
  when duplicate_object then null;
end $$;
