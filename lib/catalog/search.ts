import type {
  AvailabilityRegion,
  SearchItem,
  SearchResponse,
  SearchableRecord,
  VerificationStatus,
} from './types.js';

type SearchMode = 'published' | 'review';

function normalizeText(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function levenshteinDistance(left: string, right: string): number {
  if (left === right) return 0;
  if (!left) return right.length;
  if (!right) return left.length;

  const previous = new Array(right.length + 1).fill(0).map((_, index) => index);
  const current = new Array(right.length + 1).fill(0);

  for (let i = 0; i < left.length; i += 1) {
    current[0] = i + 1;
    for (let j = 0; j < right.length; j += 1) {
      const cost = left[i] === right[j] ? 0 : 1;
      current[j + 1] = Math.min(
        current[j] + 1,
        previous[j + 1] + 1,
        previous[j] + cost,
      );
    }
    for (let j = 0; j <= right.length; j += 1) previous[j] = current[j];
  }

  return previous[right.length];
}

function fuzzyScore(left: string, right: string): number {
  if (!left || !right) return 0;
  const distance = levenshteinDistance(left, right);
  return 1 - (distance / Math.max(left.length, right.length));
}

function verificationWeight(status: VerificationStatus): number {
  if (status === 'verified') return 40;
  if (status === 'curated') return 20;
  return -20;
}

function regionWeight(itemRegions: AvailabilityRegion[], region: string): number {
  if (itemRegions.includes(region)) return 120;
  if (itemRegions.includes('Global')) return 40;
  return -30;
}

function publishStateWeight(item: SearchableRecord & Record<string, unknown>): number {
  if (item.publish_state === 'published') return 65;
  if (item.publish_state === 'review_only') return -45;
  return -120;
}

function brewReadyWeight(item: SearchableRecord & Record<string, unknown>): number {
  if ('is_brew_ready' in item) {
    return item.is_brew_ready ? 70 : -40;
  }
  return 0;
}

function equipmentPriorityWeight(item: SearchableRecord & Record<string, unknown>): number {
  let score = 0;
  if ('manual_brew_capable' in item && item.manual_brew_capable) score += 35;
  if ('filter_priority' in item && typeof item.filter_priority === 'number') score += Math.round(item.filter_priority * 0.8);
  if ('availability_confidence' in item) {
    if (item.availability_confidence === 'high') score += 18;
    else if (item.availability_confidence === 'medium') score += 8;
  }
  return score;
}

export function rankSearchResults<T extends SearchableRecord>(
  items: T[],
  region: string,
  query: string,
  options?: { allowReviewFallback?: boolean; mode?: SearchMode },
): SearchItem<T>[] {
  const normalizedQuery = normalizeText(query);
  const tokens = normalizedQuery.split(' ').filter(Boolean);

  return items
    .map((item) => {
      const haystack = normalizeText(`${item.search_text} ${item.aliases.join(' ')}`);
      const aliases = item.aliases.map(alias => normalizeText(alias));
      const exact =
        haystack === normalizedQuery
        || aliases.includes(normalizedQuery)
        || normalizeText(item.id) === normalizedQuery;

      const prefix = !exact && (
        haystack.startsWith(normalizedQuery)
        || aliases.some(alias => alias.startsWith(normalizedQuery))
        || tokens.some(token => haystack.includes(` ${token}`))
      );

      const partial = !exact && !prefix && haystack.includes(normalizedQuery);
      const fuzzy = !exact && !prefix && !partial ? fuzzyScore(normalizedQuery, haystack.slice(0, Math.max(normalizedQuery.length + 6, 12))) : 0;

      let score = regionWeight(item.available_in, region)
        + verificationWeight(item.verification_status)
        + item.data_quality.completeness_score
        + publishStateWeight(item as SearchableRecord & Record<string, unknown>)
        + brewReadyWeight(item as SearchableRecord & Record<string, unknown>)
        + equipmentPriorityWeight(item as SearchableRecord & Record<string, unknown>);

      let match: SearchItem<T>['match'] | null = null;
      if (!normalizedQuery) {
        score += 20;
        match = 'partial';
      } else if (exact) {
        score += 1000;
        match = 'exact';
      } else if (prefix) {
        score += 820;
        match = 'prefix';
      } else if (partial) {
        score += 640;
        match = 'partial';
      } else if (fuzzy >= 0.55) {
        score += Math.round(fuzzy * 420);
        match = 'fuzzy';
      }

      if (!match) return null;
      if (!options?.allowReviewFallback && options?.mode !== 'review' && !item.published) return null;
      if (options?.mode === 'published' && !options?.allowReviewFallback && !item.published) return null;
      if (options?.mode === 'review' && item.publish_state === 'rejected') return null;

      if (!item.published) score -= 120;
      if (item.data_quality.is_estimated) score -= 80;

      return { item, score, match };
    })
    .filter(Boolean)
    .sort((left, right) => {
      if (right!.score !== left!.score) return right!.score - left!.score;
      return left!.item.id.localeCompare(right!.item.id);
    }) as SearchItem<T>[];
}

export function searchCatalog<T extends SearchableRecord & { brand?: string; model?: string }>(
  items: T[],
  region: string,
  query: string,
  limit = 10,
  options?: { mode?: SearchMode },
): SearchResponse<T> {
  const mode = options?.mode || 'published';
  const publishedMatches = rankSearchResults(items.filter(item => item.published), region, query, { mode });
  const exactPublishedHit = publishedMatches.some(result => result.match === 'exact');

  const fallbackMatches = mode === 'published' && (!publishedMatches.length || !exactPublishedHit)
    ? rankSearchResults(items.filter(item => !item.published), region, query, { allowReviewFallback: true, mode })
    : [];
  const reviewMatches = mode === 'review'
    ? rankSearchResults(items, region, query, { allowReviewFallback: true, mode })
    : [];

  const merged = mode === 'review'
    ? reviewMatches.slice(0, limit)
    : [...publishedMatches, ...fallbackMatches]
    .slice(0, limit);

  const suggestionPool = (mode === 'review' ? reviewMatches : [...publishedMatches, ...fallbackMatches])
    .slice(0, 5)
    .map(({ item }) => ({
      id: item.id,
      label: `${item.brand || ''} ${item.model || ''}`.trim() || item.id,
      kind: item.publish_state === 'published' ? 'catalog' : item.publish_state,
    }));

  return {
    items: merged.map(entry => entry.item),
    total: merged.length,
    suggestions: suggestionPool,
    can_submit_suggestion: true,
    can_request_ai_research: (mode === 'review' ? reviewMatches.length : fallbackMatches.length) > 0 || merged.length === 0,
  };
}
