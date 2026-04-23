import sourcesRaw from './sources.json' with { type: 'json' };
import methodProfilesRaw from './methodProfiles.json' with { type: 'json' };
import type {
  BrewCategory,
  BrewMethodId,
  EvidenceSource,
  EvidenceSourceTag,
  MethodEvidenceProfile,
  RoastAdjustmentProfile,
  RoastLevel,
  StandardsPackVersion,
} from '../types';

interface RawPack {
  packVersion: string;
  generatedAt: string;
  sourceDigest: string;
  categoryAdjustments: Record<BrewCategory, Record<RoastLevel, RoastAdjustmentProfile>>;
  methods: MethodEvidenceProfile[];
}

const ROAST_LEVELS: RoastLevel[] = ['light', 'medium_light', 'medium', 'medium_dark', 'dark'];

const evidenceSources = sourcesRaw as EvidenceSource[];
const rawPack = methodProfilesRaw as RawPack;

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`[EvidencePack] ${message}`);
}

function validateSources(sources: EvidenceSource[]) {
  const ids = new Set<string>();
  const validTags: EvidenceSourceTag[] = ['core_standard', 'competition_rule', 'peer_review', 'regional_context'];
  for (const source of sources) {
    assert(Boolean(source.id), 'Source id is required.');
    assert(!ids.has(source.id), `Duplicate source id: ${source.id}`);
    ids.add(source.id);
    assert(/^https?:\/\//.test(source.url), `Source URL must be absolute: ${source.id}`);
    assert(Array.isArray(source.tags) && source.tags.length > 0, `Source tags are required: ${source.id}`);
    for (const tag of source.tags) {
      assert(validTags.includes(tag), `Unknown source tag '${String(tag)}' on ${source.id}`);
    }
  }
}

function validateCategoryAdjustments(adjustments: RawPack['categoryAdjustments']) {
  const categories: BrewCategory[] = ['espresso', 'filter', 'batch'];
  for (const category of categories) {
    assert(Boolean(adjustments[category]), `Missing category adjustments for ${category}`);
    for (const roastLevel of ROAST_LEVELS) {
      const profile = adjustments[category][roastLevel];
      assert(Boolean(profile), `Missing roast adjustment for ${category}/${roastLevel}`);
      assert(Number.isFinite(profile.tempDeltaC), `Invalid temp delta for ${category}/${roastLevel}`);
      assert(Number.isFinite(profile.ratioDelta), `Invalid ratio delta for ${category}/${roastLevel}`);
      assert(Number.isFinite(profile.brewTimeDeltaSec), `Invalid brew time delta for ${category}/${roastLevel}`);
      assert(['finer', 'same', 'coarser'].includes(profile.grindBias), `Invalid grind bias for ${category}/${roastLevel}`);
      assert(Number.isFinite(profile.warningRules.highTempWarnAboveC), `Invalid high temp rule for ${category}/${roastLevel}`);
      assert(Number.isFinite(profile.warningRules.lowTempWarnBelowC), `Invalid low temp rule for ${category}/${roastLevel}`);
    }
  }
}

function validateProfiles(pack: RawPack, sources: EvidenceSource[]) {
  const sourceIds = new Set(sources.map((source) => source.id));
  const methodIds = new Set<BrewMethodId>();

  for (const profile of pack.methods) {
    assert(!methodIds.has(profile.methodId), `Duplicate method profile: ${profile.methodId}`);
    methodIds.add(profile.methodId);

    assert(profile.baseline.ratioRange[0] < profile.baseline.ratioRange[1], `Invalid ratio range for ${profile.methodId}`);
    assert(profile.baseline.tempRangeC[0] < profile.baseline.tempRangeC[1], `Invalid temp range for ${profile.methodId}`);
    assert(profile.baseline.brewTimeRangeSec[0] < profile.baseline.brewTimeRangeSec[1], `Invalid brew time range for ${profile.methodId}`);
    assert(profile.ratioPolicy.min < profile.ratioPolicy.max, `Invalid ratio policy for ${profile.methodId}`);
    assert(profile.sources.length > 0, `Missing sources for ${profile.methodId}`);

    for (const sourceId of profile.sources) {
      assert(sourceIds.has(sourceId), `Unknown source id '${sourceId}' on ${profile.methodId}`);
    }

    if (profile.roastAdjustments) {
      for (const roastLevel of ROAST_LEVELS) {
        const adj = profile.roastAdjustments[roastLevel];
        assert(Boolean(adj), `Missing roast adjustment ${roastLevel} on ${profile.methodId}`);
      }
    }
  }
}

validateSources(evidenceSources);
validateCategoryAdjustments(rawPack.categoryAdjustments);
validateProfiles(rawPack, evidenceSources);

const sourceMap = new Map(evidenceSources.map((source) => [source.id, source]));
const profileMap = new Map(rawPack.methods.map((profile) => [profile.methodId, profile]));

export const STANDARDS_PACK_VERSION: StandardsPackVersion = {
  packVersion: rawPack.packVersion,
  generatedAt: rawPack.generatedAt,
  sourceDigest: rawPack.sourceDigest,
};

export function getEvidenceSources(): EvidenceSource[] {
  return evidenceSources;
}

export function getEvidenceSource(id: string): EvidenceSource | undefined {
  return sourceMap.get(id);
}

export function getAllEvidenceProfiles(): MethodEvidenceProfile[] {
  return rawPack.methods;
}

export function getMethodEvidenceProfile(methodId: BrewMethodId): MethodEvidenceProfile | undefined {
  return profileMap.get(methodId);
}

export function getEvidenceSourcesForMethod(methodId: BrewMethodId): EvidenceSource[] {
  const profile = getMethodEvidenceProfile(methodId);
  if (!profile) return [];
  return profile.sources
    .map((sourceId) => getEvidenceSource(sourceId))
    .filter((source): source is EvidenceSource => Boolean(source));
}

export function getCategoryRoastAdjustments(category: BrewCategory): Record<RoastLevel, RoastAdjustmentProfile> {
  return rawPack.categoryAdjustments[category];
}
