export type AiBrewExternalSourceType =
  | 'variety_reference'
  | 'process_reference'
  | 'sensory_reference'
  | 'market_catalog'
  | 'method_recipe_corpus'
  | 'manufacturer_guide';

export type AiBrewExternalLicenseStatus =
  | 'allowed'
  | 'needs_review'
  | 'restricted'
  | 'unknown';

export type AiBrewExternalVerificationLevel =
  | 'official'
  | 'curated'
  | 'research_reference'
  | 'dataset_unverified'
  | 'community_reference';

export interface AiBrewExternalDataSourceBlueprint {
  sourceName: string;
  sourceUrl: string;
  sourceType: AiBrewExternalSourceType;
  licenseStatus: AiBrewExternalLicenseStatus;
  verificationLevel: AiBrewExternalVerificationLevel;
  allowedUse: string;
  lastCheckedAt: string;
  notes: string[];
}

export interface AiBrewDataEnrichmentBlueprint {
  coffeeVarieties: AiBrewExternalDataSourceBlueprint[];
  coffeeProcesses: AiBrewExternalDataSourceBlueprint[];
  sensoryReference: AiBrewExternalDataSourceBlueprint[];
  beanMarketCatalog: AiBrewExternalDataSourceBlueprint[];
  methodWorkflows: AiBrewExternalDataSourceBlueprint[];
  methodTargetBehaviors: AiBrewExternalDataSourceBlueprint[];
  recipeCorpusSources: AiBrewExternalDataSourceBlueprint[];
}

export type AiBrewFutureSourceRole =
  | 'world_coffee_research_variety_lineage'
  | 'cqi_sensory_reference'
  | 'roastdb_market_catalog_license_review'
  | 'coffee_review_style_tasting_trends_license_review'
  | 'aeroprecipe_recipe_inspiration_license_review'
  | 'manufacturer_method_baseline_license_review';

// External data must not be imported into production catalogs unless licenseStatus
// explicitly allows the intended use. Sources such as WCR, CQI, RoastDB,
// CoffeeReview-style datasets, AeroPrecipe, and manufacturer guides should be
// treated as references or inspiration until license and verification are reviewed.
export const AI_BREW_DATA_ENRICHMENT_BLUEPRINT: AiBrewDataEnrichmentBlueprint = {
  coffeeVarieties: [],
  coffeeProcesses: [],
  sensoryReference: [],
  beanMarketCatalog: [],
  methodWorkflows: [],
  methodTargetBehaviors: [],
  recipeCorpusSources: [],
};
