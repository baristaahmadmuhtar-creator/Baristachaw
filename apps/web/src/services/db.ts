const DB_NAME = 'baristachaw_v1';
const DB_VERSION = 2;

const STORES = {
    CHAT_SESSIONS: 'chat_sessions',
    CHAT_MESSAGES: 'chat_messages',
    CHAT_FOLDERS: 'chat_folders',
    COLLECTION_ITEMS: 'collection_items',
    COLLECTION_FOLDERS: 'collection_folders',
    AI_BREW_JOURNAL: 'ai_brew_journal',
    AI_BREW_PRESETS: 'ai_brew_presets',
    BRAIN_SYNC_QUEUE: 'brain_sync_queue',
    META: 'meta',
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

let dbPromise: Promise<IDBDatabase> | null = null;

export const DB_STORES = STORES;

export const openAppDb = (): Promise<IDBDatabase> => {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;

            if (!db.objectStoreNames.contains(STORES.CHAT_SESSIONS)) {
                const store = db.createObjectStore(STORES.CHAT_SESSIONS, { keyPath: 'id' });
                store.createIndex('updatedAt', 'updatedAt', { unique: false });
                store.createIndex('folderId', 'folderId', { unique: false });
                store.createIndex('deletedAt', 'deletedAt', { unique: false });
            }

            if (!db.objectStoreNames.contains(STORES.CHAT_MESSAGES)) {
                const store = db.createObjectStore(STORES.CHAT_MESSAGES, { keyPath: 'id' });
                store.createIndex('sessionId', 'sessionId', { unique: false });
                store.createIndex('timestamp', 'timestamp', { unique: false });
                store.createIndex('deletedAt', 'deletedAt', { unique: false });
            }

            if (!db.objectStoreNames.contains(STORES.CHAT_FOLDERS)) {
                const store = db.createObjectStore(STORES.CHAT_FOLDERS, { keyPath: 'id' });
                store.createIndex('name', 'name', { unique: false });
                store.createIndex('deletedAt', 'deletedAt', { unique: false });
            }

            if (!db.objectStoreNames.contains(STORES.COLLECTION_ITEMS)) {
                const store = db.createObjectStore(STORES.COLLECTION_ITEMS, { keyPath: 'id' });
                store.createIndex('folderId', 'folderId', { unique: false });
                store.createIndex('type', 'type', { unique: false });
                store.createIndex('updatedAt', 'updatedAt', { unique: false });
                store.createIndex('deletedAt', 'deletedAt', { unique: false });
            }

            if (!db.objectStoreNames.contains(STORES.COLLECTION_FOLDERS)) {
                const store = db.createObjectStore(STORES.COLLECTION_FOLDERS, { keyPath: 'id' });
                store.createIndex('name', 'name', { unique: false });
                store.createIndex('deletedAt', 'deletedAt', { unique: false });
            }

            if (!db.objectStoreNames.contains(STORES.AI_BREW_JOURNAL)) {
                const store = db.createObjectStore(STORES.AI_BREW_JOURNAL, { keyPath: 'id' });
                store.createIndex('updatedAt', 'updatedAt', { unique: false });
                store.createIndex('fingerprint', 'fingerprint', { unique: false });
            }

            if (!db.objectStoreNames.contains(STORES.AI_BREW_PRESETS)) {
                const store = db.createObjectStore(STORES.AI_BREW_PRESETS, { keyPath: 'id' });
                store.createIndex('updatedAt', 'updatedAt', { unique: false });
                store.createIndex('fingerprint', 'fingerprint', { unique: false });
            }

            if (!db.objectStoreNames.contains(STORES.BRAIN_SYNC_QUEUE)) {
                const store = db.createObjectStore(STORES.BRAIN_SYNC_QUEUE, { keyPath: 'id' });
                store.createIndex('status', 'status', { unique: false });
                store.createIndex('nextRetryAt', 'nextRetryAt', { unique: false });
                store.createIndex('updatedAt', 'updatedAt', { unique: false });
            }

            if (!db.objectStoreNames.contains(STORES.META)) {
                db.createObjectStore(STORES.META, { keyPath: 'key' });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
    });

    return dbPromise;
};

const requestToPromise = <T>(request: IDBRequest<T>): Promise<T> =>
    new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
    });

export const tx = async <T>(
    storeName: StoreName,
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => Promise<T> | T
): Promise<T> => {
    const db = await openAppDb();

    return new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);

        Promise.resolve(operation(store))
            .then((value) => {
                transaction.oncomplete = () => resolve(value);
                transaction.onerror = () => reject(transaction.error || new Error('IndexedDB transaction failed'));
                transaction.onabort = () => reject(transaction.error || new Error('IndexedDB transaction aborted'));
            })
            .catch(reject);
    });
};

export const idbGet = async <T>(storeName: StoreName, key: IDBValidKey): Promise<T | undefined> =>
    tx(storeName, 'readonly', (store) => requestToPromise<T | undefined>(store.get(key)));

export const idbPut = async <T>(storeName: StoreName, value: T): Promise<void> =>
    tx(storeName, 'readwrite', async (store) => {
        await requestToPromise(store.put(value));
    });

export const idbDelete = async (storeName: StoreName, key: IDBValidKey): Promise<void> =>
    tx(storeName, 'readwrite', async (store) => {
        await requestToPromise(store.delete(key));
    });

export const idbGetAll = async <T>(storeName: StoreName): Promise<T[]> =>
    tx(storeName, 'readonly', (store) => requestToPromise<T[]>(store.getAll()));

export const idbGetAllByIndex = async <T>(
    storeName: StoreName,
    indexName: string,
    query?: IDBValidKey | IDBKeyRange | null
): Promise<T[]> =>
    tx(storeName, 'readonly', (store) => {
        const index = store.index(indexName);
        const request = query === undefined || query === null ? index.getAll() : index.getAll(query);
        return requestToPromise<T[]>(request as IDBRequest<T[]>);
    });

export const idbClear = async (storeName: StoreName): Promise<void> =>
    tx(storeName, 'readwrite', async (store) => {
        await requestToPromise(store.clear());
    });

export const idbPutMany = async <T>(storeName: StoreName, values: T[]): Promise<void> => {
    if (!values.length) return;

    await tx(storeName, 'readwrite', async (store) => {
        for (const value of values) {
            await requestToPromise(store.put(value));
        }
    });
};
