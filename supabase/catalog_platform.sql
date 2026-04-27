create extension if not exists pg_trgm;

create table if not exists public.waters (
  id text primary key,
  brand_group_id text not null,
  market_code text not null,
  sku_label text not null default '',
  brand text not null,
  country_origin text not null,
  available_in text[] not null default '{}',
  water_type text not null check (water_type in ('natural_mineral', 'spring', 'purified', 'alkaline', 'sparkling')),
  is_sparkling boolean not null default false,
  calcium_mg_l numeric,
  magnesium_mg_l numeric,
  sodium_mg_l numeric,
  potassium_mg_l numeric,
  bicarbonate_mg_l numeric,
  sulfate_mg_l numeric,
  chloride_mg_l numeric,
  silica_mg_l numeric,
  ph numeric,
  tds_ppm numeric,
  hardness_ppm_as_caco3 numeric generated always as (
    case
      when calcium_mg_l is null or magnesium_mg_l is null then null
      else round(((calcium_mg_l * 2.5) + (magnesium_mg_l * 4.1))::numeric, 1)
    end
  ) stored,
  alkalinity_ppm_as_caco3 numeric generated always as (
    case
      when bicarbonate_mg_l is null then null
      else round((bicarbonate_mg_l * 0.82)::numeric, 1)
    end
  ) stored,
  sca_match_score integer,
  brew_recommendation text not null default 'poor',
  search_text text not null,
  aliases text[] not null default '{}',
  verification_status text not null default 'review_required',
  publish_state text not null default 'review_only' check (publish_state in ('published', 'review_only', 'rejected')),
  is_brew_ready boolean not null default false,
  brew_block_reason text[] not null default '{}',
  primary_source jsonb,
  data_quality jsonb not null default '{}'::jsonb,
  published boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.water_sources (
  id bigserial primary key,
  water_id text not null references public.waters(id) on delete cascade,
  source_type text not null,
  source_url text not null,
  collected_at timestamptz not null,
  confidence_score numeric not null,
  created_at timestamptz not null default now()
);

create table if not exists public.drippers (
  id text primary key,
  brand text not null,
  model text not null,
  material text,
  geometry text,
  hole_count integer,
  rib_type text,
  filter_type text,
  capacity_cups integer,
  brew_style_notes text not null default '',
  available_in text[] not null default '{}',
  search_text text not null,
  aliases text[] not null default '{}',
  verification_status text not null default 'review_required',
  publish_state text not null default 'review_only' check (publish_state in ('published', 'review_only', 'rejected')),
  source_type text,
  confidence_score numeric not null default 0,
  manual_brew_capable boolean not null default true,
  filter_priority integer not null default 50,
  availability_confidence text not null default 'medium' check (availability_confidence in ('high', 'medium', 'low')),
  data_quality jsonb not null default '{}'::jsonb,
  published boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.dripper_sources (
  id bigserial primary key,
  dripper_id text not null references public.drippers(id) on delete cascade,
  source_type text not null,
  source_url text not null,
  collected_at timestamptz not null,
  confidence_score numeric not null,
  created_at timestamptz not null default now()
);

create table if not exists public.grinders (
  id text primary key,
  brand text not null,
  model text not null,
  grinder_type text,
  burr_type text,
  burr_material text,
  burr_size_mm numeric,
  step_type text,
  espresso_range text,
  pour_over_range text,
  french_press_range text,
  retention_notes text not null default '',
  available_in text[] not null default '{}',
  search_text text not null,
  aliases text[] not null default '{}',
  verification_status text not null default 'review_required',
  publish_state text not null default 'review_only' check (publish_state in ('published', 'review_only', 'rejected')),
  source_type text,
  confidence_score numeric not null default 0,
  manual_brew_capable boolean not null default true,
  filter_priority integer not null default 50,
  availability_confidence text not null default 'medium' check (availability_confidence in ('high', 'medium', 'low')),
  data_quality jsonb not null default '{}'::jsonb,
  published boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.grinder_sources (
  id bigserial primary key,
  grinder_id text not null references public.grinders(id) on delete cascade,
  source_type text not null,
  source_url text not null,
  collected_at timestamptz not null,
  confidence_score numeric not null,
  created_at timestamptz not null default now()
);

create table if not exists public.brand_suggestions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('water', 'dripper', 'grinder')),
  brand text not null,
  model text,
  region text not null,
  notes text,
  status text not null default 'queued',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.catalog_review_queue (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('water', 'dripper', 'grinder')),
  entity_id text,
  payload jsonb not null,
  review_status text not null default 'queued',
  reviewer_id uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ingest_runs (
  id uuid primary key default gen_random_uuid(),
  dataset_kind text not null,
  phase text not null,
  status text not null,
  source_count integer not null default 0,
  inserted_count integer not null default 0,
  updated_count integer not null default 0,
  error_count integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.brand_suggestions
  add column if not exists updated_at timestamptz not null default now();

alter table public.catalog_review_queue
  add column if not exists updated_at timestamptz not null default now();

alter table public.ingest_runs
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'waters_numeric_quality_check'
      and conrelid = 'public.waters'::regclass
  ) then
    alter table public.waters
      add constraint waters_numeric_quality_check
      check (
        (calcium_mg_l is null or calcium_mg_l >= 0)
        and (magnesium_mg_l is null or magnesium_mg_l >= 0)
        and (sodium_mg_l is null or sodium_mg_l >= 0)
        and (potassium_mg_l is null or potassium_mg_l >= 0)
        and (bicarbonate_mg_l is null or bicarbonate_mg_l >= 0)
        and (sulfate_mg_l is null or sulfate_mg_l >= 0)
        and (chloride_mg_l is null or chloride_mg_l >= 0)
        and (silica_mg_l is null or silica_mg_l >= 0)
        and (ph is null or (ph >= 0 and ph <= 14))
        and (tds_ppm is null or tds_ppm >= 0)
        and (sca_match_score is null or (sca_match_score >= 0 and sca_match_score <= 100))
        and char_length(id) <= 140
        and char_length(brand) <= 140
        and char_length(search_text) <= 1000
       ) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'source_confidence_score_check'
      and conrelid = 'public.water_sources'::regclass
  ) then
    alter table public.water_sources
      add constraint source_confidence_score_check
      check (confidence_score >= 0 and confidence_score <= 100 and char_length(source_url) <= 2048 ) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'drippers_quality_check'
      and conrelid = 'public.drippers'::regclass
  ) then
    alter table public.drippers
      add constraint drippers_quality_check
      check (
        (hole_count is null or hole_count >= 0)
        and (capacity_cups is null or capacity_cups >= 0)
        and confidence_score >= 0
        and confidence_score <= 100
        and filter_priority >= 0
        and filter_priority <= 100
        and char_length(id) <= 140
        and char_length(brand) <= 140
        and char_length(model) <= 180
        and char_length(search_text) <= 1000
       ) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'dripper_sources_confidence_score_check'
      and conrelid = 'public.dripper_sources'::regclass
  ) then
    alter table public.dripper_sources
      add constraint dripper_sources_confidence_score_check
      check (confidence_score >= 0 and confidence_score <= 100 and char_length(source_url) <= 2048 ) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'grinders_quality_check'
      and conrelid = 'public.grinders'::regclass
  ) then
    alter table public.grinders
      add constraint grinders_quality_check
      check (
        (burr_size_mm is null or burr_size_mm > 0)
        and confidence_score >= 0
        and confidence_score <= 100
        and filter_priority >= 0
        and filter_priority <= 100
        and char_length(id) <= 140
        and char_length(brand) <= 140
        and char_length(model) <= 180
        and char_length(search_text) <= 1000
       ) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'grinder_sources_confidence_score_check'
      and conrelid = 'public.grinder_sources'::regclass
  ) then
    alter table public.grinder_sources
      add constraint grinder_sources_confidence_score_check
      check (confidence_score >= 0 and confidence_score <= 100 and char_length(source_url) <= 2048 ) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'brand_suggestions_status_check'
      and conrelid = 'public.brand_suggestions'::regclass
  ) then
    alter table public.brand_suggestions
      add constraint brand_suggestions_status_check
      check (
        status in ('queued', 'needs_source', 'approved', 'published', 'rejected')
        and char_length(brand) <= 140
        and char_length(coalesce(model, '')) <= 180
        and char_length(region) <= 120
        and char_length(coalesce(notes, '')) <= 1000
       ) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'catalog_review_queue_status_check'
      and conrelid = 'public.catalog_review_queue'::regclass
  ) then
    alter table public.catalog_review_queue
      add constraint catalog_review_queue_status_check
      check (
        review_status in ('queued', 'approved', 'published', 'rejected', 'needs_source')
        and char_length(coalesce(entity_id, '')) <= 160
       ) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'ingest_runs_counts_check'
      and conrelid = 'public.ingest_runs'::regclass
  ) then
    alter table public.ingest_runs
      add constraint ingest_runs_counts_check
      check (
        status in ('queued', 'running', 'succeeded', 'failed', 'partial')
        and source_count >= 0
        and inserted_count >= 0
        and updated_count >= 0
        and error_count >= 0
        and char_length(dataset_kind) <= 80
        and char_length(phase) <= 80
        and char_length(coalesce(notes, '')) <= 2000
       ) not valid;
  end if;
end;
$$;

create index if not exists waters_brand_trgm_idx on public.waters using gin (brand gin_trgm_ops);
create index if not exists waters_search_text_trgm_idx on public.waters using gin (search_text gin_trgm_ops);
create index if not exists waters_available_in_gin_idx on public.waters using gin (available_in);
create index if not exists waters_country_type_idx on public.waters (country_origin, market_code, water_type, updated_at desc);
create index if not exists waters_brand_group_market_idx on public.waters (brand_group_id, market_code, updated_at desc);
create index if not exists waters_published_quality_idx on public.waters (published, is_brew_ready, brew_recommendation, updated_at desc) where published = true and is_brew_ready = true;

create index if not exists drippers_brand_trgm_idx on public.drippers using gin (brand gin_trgm_ops);
create index if not exists drippers_model_trgm_idx on public.drippers using gin (model gin_trgm_ops);
create index if not exists drippers_search_text_trgm_idx on public.drippers using gin (search_text gin_trgm_ops);
create index if not exists drippers_available_in_gin_idx on public.drippers using gin (available_in);
create index if not exists drippers_published_idx on public.drippers (published, manual_brew_capable, filter_priority, updated_at desc) where published = true;

create index if not exists grinders_brand_trgm_idx on public.grinders using gin (brand gin_trgm_ops);
create index if not exists grinders_model_trgm_idx on public.grinders using gin (model gin_trgm_ops);
create index if not exists grinders_search_text_trgm_idx on public.grinders using gin (search_text gin_trgm_ops);
create index if not exists grinders_available_in_gin_idx on public.grinders using gin (available_in);
create index if not exists grinders_published_idx on public.grinders (published, manual_brew_capable, filter_priority, updated_at desc) where published = true;
create index if not exists water_sources_water_id_idx on public.water_sources (water_id, created_at desc);
create index if not exists dripper_sources_dripper_id_idx on public.dripper_sources (dripper_id, created_at desc);
create index if not exists grinder_sources_grinder_id_idx on public.grinder_sources (grinder_id, created_at desc);
create index if not exists brand_suggestions_created_by_idx on public.brand_suggestions (created_by, created_at desc);
create index if not exists brand_suggestions_queue_idx on public.brand_suggestions (status, kind, created_at desc) where status in ('queued', 'needs_source');
create index if not exists catalog_review_queue_status_idx on public.catalog_review_queue (review_status, kind, created_at desc);
create index if not exists ingest_runs_status_idx on public.ingest_runs (status, dataset_kind, created_at desc);

create or replace function public.set_catalog_platform_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.normalize_brand_suggestion_row()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.brand = trim(new.brand);
  new.model = nullif(trim(coalesce(new.model, '')), '');
  new.region = trim(new.region);
  new.notes = nullif(trim(coalesce(new.notes, '')), '');

  if coalesce(auth.role(), '') = 'authenticated' then
    new.created_by = (select auth.uid());
    new.status = 'queued';
  end if;

  return new;
end;
$$;

revoke all on function public.set_catalog_platform_updated_at() from public;
revoke all on function public.normalize_brand_suggestion_row() from public;

drop trigger if exists waters_updated_at on public.waters;
create trigger waters_updated_at
before update on public.waters
for each row execute function public.set_catalog_platform_updated_at();

drop trigger if exists drippers_updated_at on public.drippers;
create trigger drippers_updated_at
before update on public.drippers
for each row execute function public.set_catalog_platform_updated_at();

drop trigger if exists grinders_updated_at on public.grinders;
create trigger grinders_updated_at
before update on public.grinders
for each row execute function public.set_catalog_platform_updated_at();

drop trigger if exists brand_suggestions_updated_at on public.brand_suggestions;
create trigger brand_suggestions_updated_at
before update on public.brand_suggestions
for each row execute function public.set_catalog_platform_updated_at();

drop trigger if exists brand_suggestions_normalize on public.brand_suggestions;
create trigger brand_suggestions_normalize
before insert or update on public.brand_suggestions
for each row execute function public.normalize_brand_suggestion_row();

drop trigger if exists catalog_review_queue_updated_at on public.catalog_review_queue;
create trigger catalog_review_queue_updated_at
before update on public.catalog_review_queue
for each row execute function public.set_catalog_platform_updated_at();

drop trigger if exists ingest_runs_updated_at on public.ingest_runs;
create trigger ingest_runs_updated_at
before update on public.ingest_runs
for each row execute function public.set_catalog_platform_updated_at();

alter table public.waters enable row level security;
alter table public.water_sources enable row level security;
alter table public.drippers enable row level security;
alter table public.dripper_sources enable row level security;
alter table public.grinders enable row level security;
alter table public.grinder_sources enable row level security;
alter table public.brand_suggestions enable row level security;
alter table public.catalog_review_queue enable row level security;
alter table public.ingest_runs enable row level security;

alter table public.waters force row level security;
alter table public.water_sources force row level security;
alter table public.drippers force row level security;
alter table public.dripper_sources force row level security;
alter table public.grinders force row level security;
alter table public.grinder_sources force row level security;
alter table public.brand_suggestions force row level security;
alter table public.catalog_review_queue force row level security;
alter table public.ingest_runs force row level security;

grant usage on schema public to anon, authenticated, service_role;

revoke all on public.waters from anon, authenticated;
revoke all on public.water_sources from anon, authenticated;
revoke all on public.drippers from anon, authenticated;
revoke all on public.dripper_sources from anon, authenticated;
revoke all on public.grinders from anon, authenticated;
revoke all on public.grinder_sources from anon, authenticated;
revoke all on public.brand_suggestions from anon, authenticated;
revoke all on public.catalog_review_queue from anon, authenticated;
revoke all on public.ingest_runs from anon, authenticated;

grant select on public.waters to anon, authenticated;
grant select on public.water_sources to anon, authenticated;
grant select on public.drippers to anon, authenticated;
grant select on public.dripper_sources to anon, authenticated;
grant select on public.grinders to anon, authenticated;
grant select on public.grinder_sources to anon, authenticated;
grant select, insert on public.brand_suggestions to authenticated;
grant all on public.waters to service_role;
grant all on public.water_sources to service_role;
grant all on public.drippers to service_role;
grant all on public.dripper_sources to service_role;
grant all on public.grinders to service_role;
grant all on public.grinder_sources to service_role;
grant all on public.brand_suggestions to service_role;
grant all on public.catalog_review_queue to service_role;
grant all on public.ingest_runs to service_role;
grant usage, select on all sequences in schema public to service_role;

drop policy if exists "public can read published waters" on public.waters;
create policy "public can read published waters" on public.waters
  for select to anon, authenticated using (published = true);

drop policy if exists "public can read published water sources" on public.water_sources;
create policy "public can read published water sources" on public.water_sources
  for select to anon, authenticated using (exists (
    select 1 from public.waters
    where public.waters.id = water_sources.water_id
      and public.waters.published = true
  ));

drop policy if exists "public can read published drippers" on public.drippers;
create policy "public can read published drippers" on public.drippers
  for select to anon, authenticated using (published = true);

drop policy if exists "public can read published dripper sources" on public.dripper_sources;
create policy "public can read published dripper sources" on public.dripper_sources
  for select to anon, authenticated using (exists (
    select 1 from public.drippers
    where public.drippers.id = dripper_sources.dripper_id
      and public.drippers.published = true
  ));

drop policy if exists "public can read published grinders" on public.grinders;
create policy "public can read published grinders" on public.grinders
  for select to anon, authenticated using (published = true);

drop policy if exists "public can read published grinder sources" on public.grinder_sources;
create policy "public can read published grinder sources" on public.grinder_sources
  for select to anon, authenticated using (exists (
    select 1 from public.grinders
    where public.grinders.id = grinder_sources.grinder_id
      and public.grinders.published = true
  ));

drop policy if exists "authenticated users can insert suggestions" on public.brand_suggestions;
create policy "authenticated users can insert suggestions" on public.brand_suggestions
  for insert
  to authenticated
  with check (
    created_by = (select auth.uid())
    and status = 'queued'
  );

drop policy if exists "users can read their own suggestions" on public.brand_suggestions;
create policy "users can read their own suggestions" on public.brand_suggestions
  for select
  to authenticated
  using (created_by = (select auth.uid()));

drop policy if exists "service role manages waters" on public.waters;
create policy "service role manages waters" on public.waters
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "service role manages water sources" on public.water_sources;
create policy "service role manages water sources" on public.water_sources
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "service role manages drippers" on public.drippers;
create policy "service role manages drippers" on public.drippers
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "service role manages dripper sources" on public.dripper_sources;
create policy "service role manages dripper sources" on public.dripper_sources
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "service role manages grinders" on public.grinders;
create policy "service role manages grinders" on public.grinders
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "service role manages grinder sources" on public.grinder_sources;
create policy "service role manages grinder sources" on public.grinder_sources
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "service role manages review queue" on public.catalog_review_queue;
create policy "service role manages review queue" on public.catalog_review_queue
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "service role manages ingest runs" on public.ingest_runs;
create policy "service role manages ingest runs" on public.ingest_runs
  for all
  to service_role
  using (true)
  with check (true);

do $$
begin
  alter publication supabase_realtime add table public.catalog_review_queue;
exception
  when duplicate_object then null;
  when undefined_table then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.brand_suggestions;
exception
  when duplicate_object then null;
  when undefined_table then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.grinders;
exception
  when duplicate_object then null;
  when undefined_table then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.drippers;
exception
  when duplicate_object then null;
  when undefined_table then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.waters;
exception
  when duplicate_object then null;
  when undefined_table then null;
  when undefined_object then null;
end;
$$;
