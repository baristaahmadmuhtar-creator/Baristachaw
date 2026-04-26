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
  created_at timestamptz not null default now()
);

create table if not exists public.catalog_review_queue (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('water', 'dripper', 'grinder')),
  entity_id text,
  payload jsonb not null,
  review_status text not null default 'queued',
  reviewer_id uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
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
  created_at timestamptz not null default now()
);

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

alter table public.waters enable row level security;
alter table public.water_sources enable row level security;
alter table public.drippers enable row level security;
alter table public.dripper_sources enable row level security;
alter table public.grinders enable row level security;
alter table public.grinder_sources enable row level security;
alter table public.brand_suggestions enable row level security;
alter table public.catalog_review_queue enable row level security;
alter table public.ingest_runs enable row level security;

create policy "public can read published waters" on public.waters
  for select using (published = true);

create policy "public can read published water sources" on public.water_sources
  for select using (exists (
    select 1 from public.waters
    where public.waters.id = water_sources.water_id
      and public.waters.published = true
  ));

create policy "public can read published drippers" on public.drippers
  for select using (published = true);

create policy "public can read published dripper sources" on public.dripper_sources
  for select using (exists (
    select 1 from public.drippers
    where public.drippers.id = dripper_sources.dripper_id
      and public.drippers.published = true
  ));

create policy "public can read published grinders" on public.grinders
  for select using (published = true);

create policy "public can read published grinder sources" on public.grinder_sources
  for select using (exists (
    select 1 from public.grinders
    where public.grinders.id = grinder_sources.grinder_id
      and public.grinders.published = true
  ));

create policy "authenticated users can insert suggestions" on public.brand_suggestions
  for insert
  to authenticated
  with check (auth.uid() is not null);

create policy "users can read their own suggestions" on public.brand_suggestions
  for select
  to authenticated
  using (created_by = auth.uid());

create policy "service role manages waters" on public.waters
  for all
  to service_role
  using (true)
  with check (true);

create policy "service role manages water sources" on public.water_sources
  for all
  to service_role
  using (true)
  with check (true);

create policy "service role manages drippers" on public.drippers
  for all
  to service_role
  using (true)
  with check (true);

create policy "service role manages dripper sources" on public.dripper_sources
  for all
  to service_role
  using (true)
  with check (true);

create policy "service role manages grinders" on public.grinders
  for all
  to service_role
  using (true)
  with check (true);

create policy "service role manages grinder sources" on public.grinder_sources
  for all
  to service_role
  using (true)
  with check (true);

create policy "service role manages review queue" on public.catalog_review_queue
  for all
  to service_role
  using (true)
  with check (true);

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
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.brand_suggestions;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.grinders;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.drippers;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.waters;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;
