-- OnionSetu — Strong Backend — Run this in Supabase Dashboard → SQL Editor → New Query for project eziibsuzwjqemzrentjn
-- This creates Postgres tables, RLS, Storage buckets, and seeds policies. Takes 10 seconds.

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Profiles (extends auth.users) — holds role per user
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('farmer','grader','admin')),
  name text not null,
  center text,
  location text,
  phone text,
  created_at timestamptz default now()
);

-- Policies (versioned grading config) — v2026.1 is active
create table if not exists public.policies (
  id text primary key,
  version text unique not null,
  label text not null,
  size_min int not null,
  size_max int not null,
  tolerances jsonb not null default '{"rotten":2,"sprouted":3,"damaged":5}',
  description text,
  effective_from date not null,
  is_active boolean default false,
  created_at timestamptz default now()
);

-- Assessments — per-user, RLS ensures farmer sees only own
create table if not exists public.assessments (
  id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  lot_id text not null,
  farmer_name text not null,
  center text not null,
  location text,
  assessor_name text,
  policy_version text not null references public.policies(version),
  model_version text not null default 'Prototype Demo Inference',
  sample_size int not null,
  grade_a int not null default 0 check (grade_a between 0 and 100),
  grade_b int not null default 0 check (grade_b between 0 and 100),
  grade_c int not null default 0 check (grade_c between 0 and 100),
  grade_reject int not null default 0 check (grade_reject between 0 and 100),
  urs int not null default 0 check (urs between 0 and 100),
  status text not null default 'Completed' check (status in ('Draft','Processing','Human Review','Completed','Sync Pending','Synced')),
  sync_status text not null default 'Synced' check (sync_status in ('Synced','Offline','Pending','Sync Pending')),
  confidence int,
  human_reviews int default 0,
  hash text,
  farmer_ack boolean default false,
  grader_ack boolean default false,
  dispute_reason text,
  dispute_at timestamptz,
  dispute_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_assessments_user on public.assessments(user_id);
create index if not exists idx_assessments_created on public.assessments(created_at desc);
create index if not exists idx_assessments_farmer on public.assessments(farmer_name);
create index if not exists idx_assessments_status on public.assessments(status);

create or replace function public.set_updated_at() returns trigger as $$ begin new.updated_at = now(); return new; end; $$ language plpgsql;
drop trigger if exists trg_assessments_updated on public.assessments;
create trigger trg_assessments_updated before update on public.assessments for each row execute function public.set_updated_at();

-- Per-onion results
create table if not exists public.assessment_onions (
  id uuid primary key default uuid_generate_v4(),
  assessment_id text not null references public.assessments(id) on delete cascade,
  onion_id text not null,
  size_mm numeric not null,
  defect text not null check (defect in ('Healthy','Damaged','Rotten','Sprouted')),
  confidence int not null check (confidence between 0 and 100),
  grade text not null check (grade in ('Grade A','Grade B','Grade C','Reject')),
  created_at timestamptz default now()
);
create index if not exists idx_onions_assessment on public.assessment_onions(assessment_id);

-- Images — storage_path points to Storage bucket
create table if not exists public.assessment_images (
  id uuid primary key default uuid_generate_v4(),
  assessment_id text not null references public.assessments(id) on delete cascade,
  view_index int not null check (view_index between 0 and 2),
  storage_path text not null,
  public_url text,
  uploaded_at timestamptz default now(),
  unique(assessment_id, view_index)
);

-- Reviews
create table if not exists public.reviews (
  id uuid primary key default uuid_generate_v4(),
  assessment_id text not null references public.assessments(id) on delete cascade,
  onion_id text not null,
  ai_defect text not null,
  ai_confidence int not null,
  human_decision text,
  reason text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz default now()
);

-- Disputes (linked, preserves original)
create table if not exists public.disputes (
  id uuid primary key default uuid_generate_v4(),
  assessment_id text not null references public.assessments(id) on delete cascade,
  reason text not null,
  reported_by text not null,
  status text not null default 'Open' check (status in ('Open','Reviewed','Resolved')),
  review_decision text,
  created_at timestamptz default now()
);

-- Audit log
create table if not exists public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  assessment_id text references public.assessments(id) on delete set null,
  action text not null,
  actor_id uuid references auth.users(id),
  actor_role text,
  details jsonb,
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, role, name, center, location, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role','farmer'),
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'center', 'Lasalgaon APMC'),
    'Nashik, MH',
    coalesce(new.phone,'')
  ) on conflict (id) do nothing;
  return new;
end; $$ language plpgsql security definer;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.policies enable row level security;
alter table public.assessments enable row level security;
alter table public.assessment_onions enable row level security;
alter table public.assessment_images enable row level security;
alter table public.reviews enable row level security;
alter table public.disputes enable row level security;
alter table public.audit_logs enable row level security;

-- Policies — allow authenticated to read policies
drop policy if exists "policies_read_all" on public.policies;
create policy "policies_read_all" on public.policies for select to authenticated using (true);
drop policy if exists "profiles_own" on public.profiles;
create policy "profiles_own" on public.profiles for select to authenticated using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid() = id);

-- Assessments: farmer sees own (user_id = uid or farmer_name matches profile), grader sees all in their center (for demo, grader sees all)
drop policy if exists "assessments_select_own_or_grader" on public.assessments;
create policy "assessments_select_own_or_grader" on public.assessments for select to authenticated using (
  user_id = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'grader')
);
drop policy if exists "assessments_insert_auth" on public.assessments;
create policy "assessments_insert_auth" on public.assessments for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "assessments_update_own_or_grader" on public.assessments;
create policy "assessments_update_own_or_grader" on public.assessments for update to authenticated using (
  user_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role='grader')
);

-- Child tables: allow if parent assessment is visible
drop policy if exists "onions_select_parent" on public.assessment_onions;
create policy "onions_select_parent" on public.assessment_onions for select to authenticated using (
  exists (select 1 from public.assessments a where a.id = assessment_id and (a.user_id = auth.uid() or exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='grader')))
);
drop policy if exists "onions_insert_parent" on public.assessment_onions;
create policy "onions_insert_parent" on public.assessment_onions for insert to authenticated with check (true);
drop policy if exists "images_select_parent" on public.assessment_images;
create policy "images_select_parent" on public.assessment_images for select to authenticated using (
  exists (select 1 from public.assessments a where a.id = assessment_id and (a.user_id = auth.uid() or exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='grader')))
);
drop policy if exists "images_insert_parent" on public.assessment_images;
create policy "images_insert_parent" on public.assessment_images for insert to authenticated with check (true);
drop policy if exists "reviews_all" on public.reviews;
create policy "reviews_all" on public.reviews for all to authenticated using (true) with check (true);
drop policy if exists "disputes_all" on public.disputes;
create policy "disputes_all" on public.disputes for all to authenticated using (true) with check (true);
drop policy if exists "audit_all" on public.audit_logs;
create policy "audit_all" on public.audit_logs for all to authenticated using (true) with check (true);

-- Storage buckets
insert into storage.buckets (id, name, public) values ('assessment-images','assessment-images', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('reports','reports', false) on conflict (id) do nothing;

-- Storage policies (authenticated can upload/read own)
drop policy if exists "assessment-images upload" on storage.objects;
create policy "assessment-images upload" on storage.objects for insert to authenticated with check (bucket_id='assessment-images');
drop policy if exists "assessment-images read" on storage.objects;
create policy "assessment-images read" on storage.objects for select to authenticated using (bucket_id='assessment-images');
drop policy if exists "reports upload" on storage.objects;
create policy "reports upload" on storage.objects for insert to authenticated with check (bucket_id='reports');
drop policy if exists "reports read" on storage.objects;
create policy "reports read" on storage.objects for select to authenticated using (bucket_id='reports');

-- Seed policies
insert into public.policies (id, version, label, size_min, size_max, tolerances, description, effective_from, is_active)
values
  ('PROCUREMENT-2026','v2026.1','Current — Relaxed (June 2026)',35,70,'{"rotten":2,"sprouted":3,"damaged":5}','Widened size band from 45–65mm to 35–70mm after Lasalgaon review. PSF procurement.', '2026-06-15', true),
  ('PROCUREMENT-2025','v2025.2','Previous — Standard',45,65,'{"rotten":1,"sprouted":2,"damaged":3}','AGMARK-aligned standard band before June 2026 relaxation.', '2025-04-01', false),
  ('PROCUREMENT-AGMARK','vAGMARK-1','AGMARK Reference',30,80,'{"rotten":1,"sprouted":1,"damaged":2}','Reference AGMARK grade bands A >80mm, B 50–80mm, C 30–50mm.', '2024-01-01', false)
on conflict (id) do nothing;
