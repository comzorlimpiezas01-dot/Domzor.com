-- Run this entire file in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.community_submissions (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null check (char_length(customer_name) between 2 and 80),
  email text not null,
  service_type text not null,
  rating integer not null check (rating between 1 and 5),
  comment text not null check (char_length(comment) between 3 and 1000),
  before_url text,
  after_url text,
  consent boolean not null default false check (consent = true),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_reply text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admins enable row level security;
alter table public.community_submissions enable row level security;

create policy "public reads approved submissions" on public.community_submissions for select using (status='approved' or exists(select 1 from public.admins a where a.user_id=auth.uid()));
create policy "public creates pending submissions" on public.community_submissions for insert with check (status='pending' and consent=true and admin_reply is null);
create policy "admins update submissions" on public.community_submissions for update using (exists(select 1 from public.admins a where a.user_id=auth.uid())) with check (exists(select 1 from public.admins a where a.user_id=auth.uid()));
create policy "admins delete submissions" on public.community_submissions for delete using (exists(select 1 from public.admins a where a.user_id=auth.uid()));
create policy "admins can read admin table" on public.admins for select using (user_id=auth.uid());

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('community-photos','community-photos',true,8388608,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true,file_size_limit=8388608,allowed_mime_types=array['image/jpeg','image/png','image/webp'];

create policy "public uploads community photos" on storage.objects for insert to anon,authenticated with check (bucket_id='community-photos');
create policy "public reads community photos" on storage.objects for select to public using (bucket_id='community-photos');
create policy "admins delete community photos" on storage.objects for delete to authenticated using (bucket_id='community-photos' and exists(select 1 from public.admins a where a.user_id=auth.uid()));

-- AFTER creating your admin user in Authentication > Users, run this line with that user's UUID:
-- insert into public.admins(user_id) values ('PASTE_ADMIN_USER_UUID');
