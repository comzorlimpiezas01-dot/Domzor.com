-- DOMZOR Community: automatic public reviews + before/after photos
-- Safe to run again in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.community_submissions (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null check (char_length(customer_name) between 2 and 80),
  email text not null,
  phone text,
  service_type text not null,
  rating integer not null check (rating between 1 and 5),
  comment text not null check (char_length(comment) between 3 and 1000),
  before_url text,
  after_url text,
  consent boolean not null default false check (consent = true),
  status text not null default 'approved' check (status in ('pending','approved','rejected')),
  admin_reply text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.community_submissions add column if not exists phone text;
alter table public.community_submissions alter column status set default 'approved';
alter table public.admins enable row level security;
alter table public.community_submissions enable row level security;

-- Force every new public submission to approved, regardless of an old client payload.
create or replace function public.auto_approve_submission()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.status := 'approved';
  new.admin_reply := null;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists auto_approve_submission_trigger on public.community_submissions;
create trigger auto_approve_submission_trigger
before insert on public.community_submissions
for each row execute function public.auto_approve_submission();

-- Remove every policy name used by previous DOMZOR versions.
drop policy if exists "public reads approved submissions" on public.community_submissions;
drop policy if exists "public creates pending submissions" on public.community_submissions;
drop policy if exists "public creates approved submissions" on public.community_submissions;
drop policy if exists "public can submit" on public.community_submissions;
drop policy if exists "admins update submissions" on public.community_submissions;
drop policy if exists "admins delete submissions" on public.community_submissions;
drop policy if exists "admins can read admin table" on public.admins;

create policy "public reads approved submissions" on public.community_submissions
for select to anon, authenticated
using (status = 'approved' or exists (select 1 from public.admins a where a.user_id = auth.uid()));

create policy "public can submit" on public.community_submissions
for insert to anon, authenticated
with check (
  status = 'approved'
  and consent = true
  and admin_reply is null
  and (before_url is null or before_url like 'https://yvnblhvyqjlqwbrnublg.supabase.co/storage/v1/object/public/community-photos/%')
  and (after_url is null or after_url like 'https://yvnblhvyqjlqwbrnublg.supabase.co/storage/v1/object/public/community-photos/%')
);

create policy "admins update submissions" on public.community_submissions
for update to authenticated
using (exists(select 1 from public.admins a where a.user_id=auth.uid()))
with check (exists(select 1 from public.admins a where a.user_id=auth.uid()));

create policy "admins delete submissions" on public.community_submissions
for delete to authenticated
using (exists(select 1 from public.admins a where a.user_id=auth.uid()));

create policy "admins can read admin table" on public.admins
for select to authenticated using (user_id=auth.uid());

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('community-photos','community-photos',true,8388608,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
set public=true,file_size_limit=8388608,allowed_mime_types=array['image/jpeg','image/png','image/webp'];

drop policy if exists "public uploads community photos" on storage.objects;
drop policy if exists "public reads community photos" on storage.objects;
drop policy if exists "admins delete community photos" on storage.objects;

create policy "public uploads community photos" on storage.objects
for insert to anon, authenticated
with check (
  bucket_id='community-photos'
  and (storage.foldername(name))[1] is not null
);

create policy "public reads community photos" on storage.objects
for select to public using (bucket_id='community-photos');

create policy "admins delete community photos" on storage.objects
for delete to authenticated
using (bucket_id='community-photos' and exists(select 1 from public.admins a where a.user_id=auth.uid()));

-- Existing pending rows become visible immediately.
update public.community_submissions
set status='approved', updated_at=now()
where status='pending' and consent=true;

-- Verification: expected values are approved + true + 3 policies.
select column_default as status_default
from information_schema.columns
where table_schema='public' and table_name='community_submissions' and column_name='status';

select tgname as trigger_name
from pg_trigger
where tgrelid='public.community_submissions'::regclass and not tgisinternal;

select policyname, cmd, roles
from pg_policies
where schemaname='public' and tablename='community_submissions'
order by policyname;
