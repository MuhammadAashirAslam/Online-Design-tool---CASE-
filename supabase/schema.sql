-- ═══════════════════════════════════════════════════
-- ODT Database Schema for Supabase
-- Run this in the Supabase SQL Editor
-- ═══════════════════════════════════════════════════

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Users (extends auth.users) ──
create table if not exists public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  username text not null default '',
  avatar_url text,
  created_at timestamptz default now()
);

alter table public.users enable row level security;

create policy "Users can view own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.users for insert
  with check (auth.uid() = id);

-- ── Projects ──
create table if not exists public.projects (
  id uuid default uuid_generate_v4() primary key,
  owner_id uuid references public.users(id) on delete cascade not null,
  name text not null default 'Untitled Project',
  arch_style text not null default 'custom',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.projects enable row level security;

create policy "Users can view own projects"
  on public.projects for select
  using (auth.uid() = owner_id);

create policy "Users can create projects"
  on public.projects for insert
  with check (auth.uid() = owner_id);

create policy "Users can update own projects"
  on public.projects for update
  using (auth.uid() = owner_id);

create policy "Users can delete own projects"
  on public.projects for delete
  using (auth.uid() = owner_id);

-- ── Project Members (collaboration junction table) ──
create table if not exists public.project_members (
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  role text not null default 'editor',
  joined_at timestamptz default now(),
  primary key (project_id, user_id)
);

alter table public.project_members enable row level security;

create policy "Members can view their memberships"
  on public.project_members for select
  using (auth.uid() = user_id);

create policy "Project owners can manage members"
  on public.project_members for all
  using (
    auth.uid() in (
      select owner_id from public.projects where id = project_id
    )
  );

-- ── Diagrams ──
create table if not exists public.diagrams (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  name text not null default 'Untitled Diagram',
  uml_type text not null default 'class',
  view_type text not null default 'logical',
  is_valid boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.diagrams enable row level security;

create policy "Users can view diagrams of own projects"
  on public.diagrams for select
  using (
    project_id in (select id from public.projects where owner_id = auth.uid())
  );

create policy "Users can create diagrams in own projects"
  on public.diagrams for insert
  with check (
    project_id in (select id from public.projects where owner_id = auth.uid())
  );

create policy "Users can update diagrams in own projects"
  on public.diagrams for update
  using (
    project_id in (select id from public.projects where owner_id = auth.uid())
  );

create policy "Users can delete diagrams in own projects"
  on public.diagrams for delete
  using (
    project_id in (select id from public.projects where owner_id = auth.uid())
  );

-- ── Elements ──
create table if not exists public.elements (
  id uuid default uuid_generate_v4() primary key,
  diagram_id uuid references public.diagrams(id) on delete cascade not null,
  element_type text not null,
  label text not null default '',
  pos_x float not null default 0,
  pos_y float not null default 0,
  width float not null default 120,
  height float not null default 80,
  fill text default '#E6F1FB',
  stroke text default '#378ADD',
  properties jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.elements enable row level security;

create policy "Users can manage elements in own diagrams"
  on public.elements for all
  using (
    diagram_id in (
      select d.id from public.diagrams d
      join public.projects p on d.project_id = p.id
      where p.owner_id = auth.uid()
    )
  );

-- ── Connectors ──
create table if not exists public.connectors (
  id uuid default uuid_generate_v4() primary key,
  diagram_id uuid references public.diagrams(id) on delete cascade not null,
  source_id uuid references public.elements(id) on delete cascade not null,
  target_id uuid references public.elements(id) on delete cascade not null,
  relation_type text not null default 'association',
  label text default '',
  multiplicity_source text default '',
  multiplicity_target text default '',
  created_at timestamptz default now()
);

alter table public.connectors enable row level security;

create policy "Users can manage connectors in own diagrams"
  on public.connectors for all
  using (
    diagram_id in (
      select d.id from public.diagrams d
      join public.projects p on d.project_id = p.id
      where p.owner_id = auth.uid()
    )
  );

-- ── Exports ──
create table if not exists public.exports (
  id uuid default uuid_generate_v4() primary key,
  diagram_id uuid references public.diagrams(id) on delete cascade not null,
  format text not null,
  file_url text,
  created_at timestamptz default now()
);

alter table public.exports enable row level security;

create policy "Users can manage exports of own diagrams"
  on public.exports for all
  using (
    diagram_id in (
      select d.id from public.diagrams d
      join public.projects p on d.project_id = p.id
      where p.owner_id = auth.uid()
    )
  );

-- ── Validation Logs ──
create table if not exists public.validation_logs (
  id uuid default uuid_generate_v4() primary key,
  diagram_id uuid references public.diagrams(id) on delete cascade not null,
  error_count int default 0,
  errors jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

alter table public.validation_logs enable row level security;

create policy "Users can manage validation logs of own diagrams"
  on public.validation_logs for all
  using (
    diagram_id in (
      select d.id from public.diagrams d
      join public.projects p on d.project_id = p.id
      where p.owner_id = auth.uid()
    )
  );

-- ── Auto-create user profile on signup ──
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, username)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

-- Drop the trigger if it exists, then re-create
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
