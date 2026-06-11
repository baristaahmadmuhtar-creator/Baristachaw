export const PRIORITY_REGIONS = ['Indonesia', 'Brunei', 'Singapore', 'Malaysia'] as const;

export type PriorityRegion = (typeof PRIORITY_REGIONS)[number];

export type AvailabilityRegion = PriorityRegion | 'Global' | string;

export type SourceType =
  | 'label'
  | 'official_report'
  | 'brand_site'
  | 'regulator'
  | 'distributor'
  | 'community_reference'
  | 'catalog_seed';

export type VerificationStatus = 'verified' | 'curated' | 'review_required';
export type CatalogPublishState = 'published' | 'review_only' | 'rejected';

export type BrewRecommendation = 'excellent' | 'good' | 'acceptable' | 'poor';
export type AvailabilityConfidence = 'high' | 'medium' | 'low';

export interface CatalogSource {
  source_type: SourceType;
  source_url: string;
  collected_at: string;
  confidence_score: number;
}

export interface DataQuality {
  is_estimated: boolean;
  missing_fields: string[];
  completeness_score: number;
}

export interface SearchableRecord {
  id: string;
  published: boolean;
  publish_state: CatalogPublishState;
  search_text: string;
  aliases: string[];
  available_in: AvailabilityRegion[];
  verification_status: VerificationStatus;
  data_quality: DataQuality;
}

export interface WaterMinerals {
  calcium: number | null;
  magnesium: number | null;
  sodium: number | null;
  potassium: number | null;
  bicarbonate: number | null;
  sulfate: number | null;
  chloride: number | null;
  silica: number | null;
}

export interface WaterCoffeeParameters {
  hardness_ppm_as_caco3: number | null;
  alkalinity_ppm_as_caco3: number | null;
  sca_match_score: number | null;
  brew_recommendation: BrewRecommendation;
}

export interface WaterRecord extends SearchableRecord {
  brand_group_id: string;
  market_code: string;
  sku_label: string;
  brand: string;
  country_origin: string;
  water_type: 'natural_mineral' | 'spring' | 'purified' | 'alkaline' | 'sparkling';
  is_sparkling: boolean;
  is_brew_ready: boolean;
  brew_block_reason: string[];
  minerals_mg_l: WaterMinerals;
  ph: number | null;
  tds_ppm: number | null;
  coffee_parameters: WaterCoffeeParameters;
  sources: CatalogSource[];
  primary_source: CatalogSource | null;
  updated_at: string;
}

export interface DripperRecord extends SearchableRecord {
  brand: string;
  model: string;
  material: 'ceramic' | 'plastic' | 'metal' | 'glass' | null;
  geometry: 'conical' | 'flat_bottom' | 'hybrid' | null;
  hole_count: number | null;
  rib_type: 'none' | 'spiral' | 'vertical' | 'hybrid' | null;
  filter_type: 'paper' | 'metal' | 'cloth' | null;
  capacity_cups: number | null;
  brew_style_notes: string;
  sources: CatalogSource[];
  primary_source: CatalogSource | null;
  source_type: SourceType | null;
  confidence_score: number;
  manual_brew_capable: boolean;
  filter_priority: number;
  availability_confidence: AvailabilityConfidence;
  updated_at: string;
}

export interface GrinderRecord extends SearchableRecord {
  brand: string;
  model: string;
  grinder_type: 'hand' | 'electric' | null;
  burr_type: 'flat' | 'conical' | null;
  burr_material: 'steel' | 'ceramic' | 'titanium' | 'other' | null;
  burr_size_mm: number | null;
  step_type: 'stepped' | 'stepless' | null;
  recommended_range: {
    espresso: string | null;
    pour_over: string | null;
    french_press: string | null;
  };
  retention_notes: string;
  sources: CatalogSource[];
  primary_source: CatalogSource | null;
  source_type: SourceType | null;
  confidence_score: number;
  manual_brew_capable: boolean;
  filter_priority: number;
  availability_confidence: AvailabilityConfidence;
  updated_at: string;
}

export interface CatalogState {
  version: string;
  waters: WaterRecord[];
  drippers: DripperRecord[];
  grinders: GrinderRecord[];
}

export interface CatalogSuggestionRecord {
  id: string;
  kind: 'water' | 'dripper' | 'grinder';
  brand: string;
  model?: string;
  region: AvailabilityRegion;
  notes?: string;
  submitted_at: string;
  status: 'queued';
  durability: 'supabase' | 'file' | 'ephemeral';
}

export interface SearchItem<T> {
  item: T;
  score: number;
  match: 'exact' | 'prefix' | 'partial' | 'fuzzy';
}

export interface SearchResponse<T> {
  items: T[];
  total: number;
  suggestions: Array<{ id: string; label: string; kind: string }>;
  can_submit_suggestion: boolean;
  can_request_ai_research: boolean;
}

export interface WaterSearchExportItem {
  id: string;
  brand_group_id: string;
  market_code: string;
  sku_label: string;
  brand: string;
  country_origin: string;
  available_in: AvailabilityRegion[];
  water_type: WaterRecord['water_type'];
  is_sparkling: boolean;
  is_brew_ready: boolean;
  brew_block_reason: string[];
  publish_state: CatalogPublishState;
  verification_status: VerificationStatus;
  data_quality: DataQuality;
  coffee_parameters: WaterCoffeeParameters;
  search_text: string;
  aliases: string[];
  updated_at: string;
}

export interface EquipmentSearchExportItem {
  id: string;
  brand: string;
  model: string;
  available_in: AvailabilityRegion[];
  publish_state: CatalogPublishState;
  verification_status: VerificationStatus;
  data_quality: DataQuality;
  manual_brew_capable: boolean;
  filter_priority: number;
  availability_confidence: AvailabilityConfidence;
  search_text: string;
  aliases: string[];
  updated_at: string;
}

export interface CatalogQualityReport {
  generated_at: string;
  version: string;
  waters: {
    total: number;
    published: number;
    brew_ready: number;
    complete: number;
    incomplete: number;
    estimated: string[];
    by_country: Record<string, number>;
    by_market: Record<string, number>;
    by_publish_state: Record<CatalogPublishState, number>;
    top_recommended_by_region: Record<string, Array<{ id: string; brand: string; score: number }>>;
    source_coverage: Array<{ id: string; brand: string; sources: string[] }>;
    data_gaps: Array<{ id: string; brand: string; missing_fields: string[] }>;
    manual_only: string[];
  };
  drippers: {
    total: number;
    published: number;
    by_publish_state: Record<CatalogPublishState, number>;
    by_brand: Record<string, number>;
    review_required: string[];
    source_coverage: Array<{ id: string; label: string; sources: string[] }>;
    data_gaps: Array<{ id: string; label: string; missing_fields: string[] }>;
  };
  grinders: {
    total: number;
    published: number;
    by_publish_state: Record<CatalogPublishState, number>;
    by_brand: Record<string, number>;
    review_required: string[];
    source_coverage: Array<{ id: string; label: string; sources: string[] }>;
    data_gaps: Array<{ id: string; label: string; missing_fields: string[] }>;
  };
}
