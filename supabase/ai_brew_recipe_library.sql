-- Baristachaw AI Brew journal and Recipe Library persistence.
-- Run after supabase/admin_management.sql. Safe to run more than once.

create extension if not exists pgcrypto;

create or replace function public.set_ai_brew_recipe_library_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.ai_brew_journal (
  id text primary key,
  user_id text not null,
  fingerprint text not null,
  title text not null default '',
  locale text not null default 'id',
  brew_mode text not null default 'hot' check (brew_mode in ('hot', 'iced')),
  method_family text not null default '',
  method_id text not null default '',
  coffee_name text not null default '',
  process text not null default '',
  variety text not null default '',
  roast_level text not null default '',
  target_profile_id text not null default '',
  target_profile_label text not null default '',
  dripper_name text not null default '',
  grinder_name text not null default '',
  dose_g numeric not null default 0,
  total_water_ml integer not null default 0,
  hot_water_ml integer not null default 0,
  ice_ml integer not null default 0,
  water_temp_c integer not null default 0,
  total_time_seconds integer not null default 0,
  final_beverage_ratio numeric not null default 0,
  ai_optimized boolean not null default false,
  feedback_rating text check (feedback_rating in ('great', 'sour', 'bitter', 'thin')),
  feedback_note text not null default '',
  plan jsonb not null default '{}'::jsonb,
  ai_notes jsonb not null default '{}'::jsonb,
  feedback jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recipe_library_items (
  id text primary key,
  user_id text not null,
  source text not null default 'collection' check (source in ('collection', 'ai_brew', 'import')),
  item_type text not null default 'recipe' check (item_type in ('recipe', 'ai_canvas')),
  title text not null default '',
  folder_id text,
  content jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_brew_journal_user_updated_idx
  on public.ai_brew_journal (user_id, updated_at desc);
create index if not exists ai_brew_journal_fingerprint_idx
  on public.ai_brew_journal (fingerprint);
create index if not exists ai_brew_journal_method_updated_idx
  on public.ai_brew_journal (method_family, updated_at desc);
create index if not exists ai_brew_journal_feedback_idx
  on public.ai_brew_journal (feedback_rating, updated_at desc)
  where feedback_rating is not null;

create index if not exists recipe_library_items_user_updated_idx
  on public.recipe_library_items (user_id, updated_at desc);
create index if not exists recipe_library_items_type_updated_idx
  on public.recipe_library_items (item_type, updated_at desc);
create index if not exists recipe_library_items_source_updated_idx
  on public.recipe_library_items (source, updated_at desc);
create index if not exists recipe_library_items_live_idx
  on public.recipe_library_items (user_id, updated_at desc)
  where deleted_at is null;

drop trigger if exists ai_brew_journal_set_updated_at on public.ai_brew_journal;
create trigger ai_brew_journal_set_updated_at
before update on public.ai_brew_journal
for each row execute function public.set_ai_brew_recipe_library_updated_at();

drop trigger if exists recipe_library_items_set_updated_at on public.recipe_library_items;
create trigger recipe_library_items_set_updated_at
before update on public.recipe_library_items
for each row execute function public.set_ai_brew_recipe_library_updated_at();

alter table public.ai_brew_journal enable row level security;
alter table public.ai_brew_journal force row level security;
alter table public.recipe_library_items enable row level security;
alter table public.recipe_library_items force row level security;

drop policy if exists "service role manages ai brew journal" on public.ai_brew_journal;
create policy "service role manages ai brew journal"
on public.ai_brew_journal
for all
to service_role
using (true)
with check (true);

drop policy if exists "authenticated users read own ai brew journal" on public.ai_brew_journal;
create policy "authenticated users read own ai brew journal"
on public.ai_brew_journal
for select
to authenticated
using (user_id = (select auth.uid())::text);

drop policy if exists "service role manages recipe library" on public.recipe_library_items;
create policy "service role manages recipe library"
on public.recipe_library_items
for all
to service_role
using (true)
with check (true);

drop policy if exists "authenticated users read own recipe library" on public.recipe_library_items;
create policy "authenticated users read own recipe library"
on public.recipe_library_items
for select
to authenticated
using (user_id = (select auth.uid())::text);

do $$
begin
  alter publication supabase_realtime add table public.ai_brew_journal;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.recipe_library_items;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

select
  'ai_brew_recipe_library_ready' as check_name,
  count(*) as table_count
from information_schema.tables
where table_schema = 'public'
  and table_name in ('ai_brew_journal', 'recipe_library_items');

