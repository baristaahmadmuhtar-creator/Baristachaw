import { listCollectionItems, quickSaveInsight, saveCollectionItem, softDeleteCollectionItem } from './mobileStore';
import type { CollectionItemRecord, MobileQuickSavePayload } from '../types';

export async function readCollectionItems(): Promise<CollectionItemRecord[]> {
  return listCollectionItems();
}

export async function saveCollectionItems(items: CollectionItemRecord[]): Promise<void> {
  for (const item of items) {
    await saveCollectionItem(item);
  }
}

export async function saveQuickInsight(payload: MobileQuickSavePayload) {
  return quickSaveInsight(payload);
}

export async function deleteCollectionItem(id: string): Promise<void> {
  await softDeleteCollectionItem(id);
}
