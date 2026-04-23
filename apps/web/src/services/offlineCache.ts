import { DB_STORES, idbGet, idbGetAll, idbPut } from './db';

type OfflineFeature = 'home_search' | 'chat_reply' | 'scanner_result';

type OfflineCacheRecord<T = unknown> = {
  key: string;
  feature: OfflineFeature;
  inputHash: string;
  payload: T;
  updatedAt: number;
};

const OFFLINE_CACHE_PREFIX = 'offline_cache:';
const OFFLINE_CACHE_LATEST_SUFFIX = '__latest__';

function makeHash(input: string) {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
  }
  return Math.abs(hash >>> 0).toString(36);
}

function makeRecordKey(feature: OfflineFeature, hash: string) {
  return `${OFFLINE_CACHE_PREFIX}${feature}:${hash}`;
}

export async function setByFeatureKey<T>(
  feature: OfflineFeature,
  inputKey: string,
  payload: T
) {
  const hash = makeHash(inputKey.trim().toLowerCase());
  const record: OfflineCacheRecord<T> = {
    key: makeRecordKey(feature, hash),
    feature,
    inputHash: hash,
    payload,
    updatedAt: Date.now(),
  };
  await idbPut(DB_STORES.META, record);
}

export async function getByFeatureKey<T>(
  feature: OfflineFeature,
  inputKey: string
): Promise<T | null> {
  const hash = makeHash(inputKey.trim().toLowerCase());
  const record = await idbGet<OfflineCacheRecord<T>>(DB_STORES.META, makeRecordKey(feature, hash));
  return record?.payload ?? null;
}

export async function setLatestByFeature<T>(feature: OfflineFeature, payload: T) {
  const record: OfflineCacheRecord<T> = {
    key: makeRecordKey(feature, OFFLINE_CACHE_LATEST_SUFFIX),
    feature,
    inputHash: OFFLINE_CACHE_LATEST_SUFFIX,
    payload,
    updatedAt: Date.now(),
  };
  await idbPut(DB_STORES.META, record);
}

export async function getLatestByFeature<T>(feature: OfflineFeature): Promise<T | null> {
  const direct = await idbGet<OfflineCacheRecord<T>>(
    DB_STORES.META,
    makeRecordKey(feature, OFFLINE_CACHE_LATEST_SUFFIX)
  );
  if (direct?.payload) return direct.payload;

  const allMeta = await idbGetAll<OfflineCacheRecord<T> | { key: string }>(DB_STORES.META);
  const matches = allMeta
    .filter(
      (item): item is OfflineCacheRecord<T> =>
        typeof item === 'object'
        && item !== null
        && typeof (item as OfflineCacheRecord<T>).feature === 'string'
        && (item as OfflineCacheRecord<T>).feature === feature
        && typeof (item as OfflineCacheRecord<T>).updatedAt === 'number'
    )
    .sort((a, b) => b.updatedAt - a.updatedAt);

  return matches[0]?.payload ?? null;
}
