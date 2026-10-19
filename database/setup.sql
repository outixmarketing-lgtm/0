-- Run in a NEW Supabase project SQL editor, then add the owner's Auth UUID.
begin;
create table if not exists public.airix_allowed_users(user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.airix_allowed_users enable row level security;
revoke all on public.airix_allowed_users from public,anon,authenticated;
create table if not exists public.airix_workspaces(
 owner_id uuid primary key references auth.users(id) on delete cascade,
 data jsonb not null check(jsonb_typeof(data)='object'),
 revision integer not null default 1 check(revision>0),
 updated_at timestamptz not null default now()
);
alter table public.airix_workspaces enable row level security;
revoke all on public.airix_workspaces from public,anon,authenticated;
grant select on public.airix_workspaces to authenticated;
create or replace function public.airix_allowed() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.airix_allowed_users where user_id=(select auth.uid()));
$$;
revoke all on function public.airix_allowed() from public,anon;
grant execute on function public.airix_allowed() to authenticated;
drop policy if exists airix_read_own on public.airix_workspaces;
create policy airix_read_own on public.airix_workspaces for select to authenticated
 using(owner_id=(select auth.uid()) and (select public.airix_allowed()));
create or replace function public.airix_save(p_data jsonb,p_expected integer) returns integer
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_current integer;v_next integer;
begin
 if v_uid is null or not exists(select 1 from public.airix_allowed_users where user_id=v_uid) then raise exception 'FORBIDDEN' using errcode='42501';end if;
 if p_expected is null or p_expected<0 or p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>2000000 then raise exception 'INVALID_DATA';end if;
 perform pg_advisory_xact_lock(hashtextextended(v_uid::text,0));
 select revision into v_current from public.airix_workspaces where owner_id=v_uid;
 if coalesce(v_current,0)<>p_expected then raise exception 'REVISION_CONFLICT';end if;
 v_next:=coalesce(v_current,0)+1;
 insert into public.airix_workspaces(owner_id,data,revision) values(v_uid,p_data,v_next)
 on conflict(owner_id) do update set data=excluded.data,revision=excluded.revision,updated_at=now();
 return v_next;
end;$$;
revoke all on function public.airix_save(jsonb,integer) from public,anon;
grant execute on function public.airix_save(jsonb,integer) to authenticated;
commit;
-- AFTER creating your own account in Supabase Authentication > Users:
-- insert into public.airix_allowed_users(user_id) values ('YOUR_AUTH_USER_UUID');
-- Keep signups disabled. Do not add any other user unless authorized.
