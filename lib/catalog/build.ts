import type {
  CatalogQualityReport,
  CatalogState,
  EquipmentSearchExportItem,
  WaterSearchExportItem,
} from './types.js';

function sortStringsMap(values: Record<string, number>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(values).sort((left, right) => left[0].localeCompare(right[0])),
  );
}

export function buildCatalogArtifacts(catalog: CatalogState): {
  watersCatalog: CatalogState['waters'];
  waterSearch: WaterSearchExportItem[];
  dripperSearch: EquipmentSearchExportItem[];
  grinderSearch: EquipmentSearchExportItem[];
  report: CatalogQualityReport;
} {
  const watersCatalog = catalog.waters;
  const waterSearch = catalog.waters
    .filter(item => item.published)
    .map(item => ({
      id: item.id,
      brand_group_id: item.brand_group_id,
      market_code: item.market_code,
      sku_label: item.sku_label,
      brand: item.brand,
      country_origin: item.country_origin,
      available_in: item.available_in,
      water_type: item.water_type,
      is_sparkling: item.is_sparkling,
      is_brew_ready: item.is_brew_ready,
      brew_block_reason: item.brew_block_reason,
      publish_state: item.publish_state,
      verification_status: item.verification_status,
      data_quality: item.data_quality,
      coffee_parameters: item.coffee_parameters,
      search_text: item.search_text,
      aliases: item.aliases,
      updated_at: item.updated_at,
    }));

  const toEquipmentSearch = (item: CatalogState['drippers'][number] | CatalogState['grinders'][number]): EquipmentSearchExportItem => ({
    id: item.id,
    brand: item.brand,
    model: item.model,
    available_in: item.available_in,
    publish_state: item.publish_state,
    verification_status: item.verification_status,
    data_quality: item.data_quality,
    manual_brew_capable: item.manual_brew_capable,
    filter_priority: item.filter_priority,
    availability_confidence: item.availability_confidence,
    search_text: item.search_text,
    aliases: item.aliases,
    updated_at: item.updated_at,
  });

  const dripperSearch = catalog.drippers.filter(item => item.published).map(toEquipmentSearch);
  const grinderSearch = catalog.grinders.filter(item => item.published).map(toEquipmentSearch);

  const waterCountryCounts: Record<string, number> = {};
  const waterMarketCounts: Record<string, number> = {};
  const waterPublishStateCounts = {
    published: 0,
    review_only: 0,
    rejected: 0,
  } satisfies Record<'published' | 'review_only' | 'rejected', number>;
  for (const item of catalog.waters) {
    waterCountryCounts[item.country_origin] = (waterCountryCounts[item.country_origin] || 0) + 1;
    waterMarketCounts[item.market_code] = (waterMarketCounts[item.market_code] || 0) + 1;
    waterPublishStateCounts[item.publish_state] += 1;
  }

  const topRegions = ['Indonesia', 'Brunei', 'Singapore', 'Malaysia'];
  const topRecommendedByRegion = Object.fromEntries(
    topRegions.map((region) => [
      region,
      catalog.waters
        .filter(item => item.published && item.available_in.includes(region))
        .filter(item => item.is_brew_ready)
        .filter(item => item.coffee_parameters.sca_match_score !== null)
        .sort((left, right) => (right.coffee_parameters.sca_match_score || 0) - (left.coffee_parameters.sca_match_score || 0))
        .slice(0, 5)
        .map(item => ({
          id: item.id,
          brand: item.brand,
          score: item.coffee_parameters.sca_match_score || 0,
        })),
    ]),
  );

  const dripperBrandCounts: Record<string, number> = {};
  const dripperPublishStateCounts = {
    published: 0,
    review_only: 0,
    rejected: 0,
  } satisfies Record<'published' | 'review_only' | 'rejected', number>;
  for (const item of catalog.drippers) {
    dripperBrandCounts[item.brand] = (dripperBrandCounts[item.brand] || 0) + 1;
    dripperPublishStateCounts[item.publish_state] += 1;
  }

  const grinderBrandCounts: Record<string, number> = {};
  const grinderPublishStateCounts = {
    published: 0,
    review_only: 0,
    rejected: 0,
  } satisfies Record<'published' | 'review_only' | 'rejected', number>;
  for (const item of catalog.grinders) {
    grinderBrandCounts[item.brand] = (grinderBrandCounts[item.brand] || 0) + 1;
    grinderPublishStateCounts[item.publish_state] += 1;
  }

  const report: CatalogQualityReport = {
    generated_at: new Date().toISOString(),
    version: catalog.version,
    waters: {
      total: catalog.waters.length,
      published: catalog.waters.filter(item => item.published).length,
      brew_ready: catalog.waters.filter(item => item.is_brew_ready).length,
      complete: catalog.waters.filter(item => item.data_quality.completeness_score >= 85).length,
      incomplete: catalog.waters.filter(item => item.data_quality.completeness_score < 85).length,
      estimated: catalog.waters.filter(item => item.data_quality.is_estimated).map(item => item.id),
      by_country: sortStringsMap(waterCountryCounts),
      by_market: sortStringsMap(waterMarketCounts),
      by_publish_state: waterPublishStateCounts,
      top_recommended_by_region: topRecommendedByRegion,
      source_coverage: catalog.waters.map(item => ({
        id: item.id,
        brand: item.brand,
        sources: item.sources.map(source => source.source_url),
      })),
      data_gaps: catalog.waters
        .filter(item => item.data_quality.missing_fields.length > 0)
        .map(item => ({
          id: item.id,
          brand: item.brand,
          missing_fields: item.data_quality.missing_fields,
        })),
      manual_only: catalog.waters.filter(item => !item.is_brew_ready).map(item => item.id),
    },
    drippers: {
      total: catalog.drippers.length,
      published: catalog.drippers.filter(item => item.published).length,
      by_publish_state: dripperPublishStateCounts,
      by_brand: sortStringsMap(dripperBrandCounts),
      review_required: catalog.drippers.filter(item => item.verification_status === 'review_required').map(item => item.id),
      source_coverage: catalog.drippers.map(item => ({
        id: item.id,
        label: `${item.brand} ${item.model}`,
        sources: item.sources.map(source => source.source_url),
      })),
      data_gaps: catalog.drippers
        .filter(item => item.data_quality.missing_fields.length > 0)
        .map(item => ({
          id: item.id,
          label: `${item.brand} ${item.model}`,
          missing_fields: item.data_quality.missing_fields,
        })),
    },
    grinders: {
      total: catalog.grinders.length,
      published: catalog.grinders.filter(item => item.published).length,
      by_publish_state: grinderPublishStateCounts,
      by_brand: sortStringsMap(grinderBrandCounts),
      review_required: catalog.grinders.filter(item => item.verification_status === 'review_required').map(item => item.id),
      source_coverage: catalog.grinders.map(item => ({
        id: item.id,
        label: `${item.brand} ${item.model}`,
        sources: item.sources.map(source => source.source_url),
      })),
      data_gaps: catalog.grinders
        .filter(item => item.data_quality.missing_fields.length > 0)
        .map(item => ({
          id: item.id,
          label: `${item.brand} ${item.model}`,
          missing_fields: item.data_quality.missing_fields,
        })),
    },
  };

  return { watersCatalog, waterSearch, dripperSearch, grinderSearch, report };
}
