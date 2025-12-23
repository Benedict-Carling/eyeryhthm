/**
 * Sync Queue Service
 *
 * Manages a persistent queue of failed sync operations using IndexedDB.
 * Provides retry mechanism with exponential backoff for offline resilience.
 */

import type { QueuedOperation, SyncOperationType, SyncEntityType } from './types';

const DB_NAME = 'eyerhythm-sync-queue';
const DB_VERSION = 1;
const STORE_NAME = 'operations';
const MAX_RETRIES = 6;

/**
 * Queue service for managing failed sync operations
 *
 * Uses IndexedDB for persistence across sessions:
 * - Asynchronous (doesn't block UI)
 * - Large storage quota (50GB+)
 * - Survives page refreshes and crashes
 */
export class SyncQueue {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the IndexedDB database
   */
  async init(): Promise<void> {
    // Reuse existing initialization if in progress
    if (this.initPromise) {
      return this.initPromise;
    }

    // Check if running in browser
    if (typeof window === 'undefined' || !window.indexedDB) {
      console.warn('[SyncQueue] IndexedDB not available, queue will not persist');
      return;
    }

    this.initPromise = new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[SyncQueue] Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[SyncQueue] IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store for operations
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });

          // Indexes for efficient queries
          store.createIndex('userId', 'userId', { unique: false });
          store.createIndex('entity', 'entity', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('retryCount', 'retryCount', { unique: false });

          console.log('[SyncQueue] Object store created');
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Add an operation to the queue
   */
  async enqueue(params: {
    type: SyncOperationType;
    entity: SyncEntityType;
    payload: unknown;
    userId: string;
  }): Promise<string> {
    await this.init();

    if (!this.db) {
      console.warn('[SyncQueue] DB not available, operation not queued');
      return '';
    }

    const operation: QueuedOperation = {
      id: this.generateId(),
      type: params.type,
      entity: params.entity,
      payload: params.payload,
      userId: params.userId,
      retryCount: 0,
      maxRetries: MAX_RETRIES,
      lastAttemptAt: Date.now(),
      createdAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(operation);

      request.onsuccess = () => {
        console.log(`[SyncQueue] Enqueued ${params.entity} ${params.type}:`, operation.id);
        resolve(operation.id);
      };

      request.onerror = () => {
        console.error('[SyncQueue] Failed to enqueue operation:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Mark an operation as completed and remove from queue
   */
  async markComplete(operationId: string): Promise<void> {
    await this.init();

    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(operationId);

      request.onsuccess = () => {
        console.log('[SyncQueue] Operation completed:', operationId);
        resolve();
      };

      request.onerror = () => {
        console.error('[SyncQueue] Failed to mark complete:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Mark an operation as failed and increment retry count
   */
  async markFailed(operationId: string, error: string): Promise<void> {
    await this.init();

    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(operationId);

      getRequest.onsuccess = () => {
        const operation = getRequest.result as QueuedOperation | undefined;

        if (!operation) {
          console.warn('[SyncQueue] Operation not found:', operationId);
          resolve();
          return;
        }

        // Update retry count and error
        operation.retryCount += 1;
        operation.lastAttemptAt = Date.now();
        operation.error = error;

        const putRequest = store.put(operation);

        putRequest.onsuccess = () => {
          console.log(
            `[SyncQueue] Operation failed (attempt ${operation.retryCount}/${operation.maxRetries}):`,
            operationId
          );
          resolve();
        };

        putRequest.onerror = () => {
          console.error('[SyncQueue] Failed to update operation:', putRequest.error);
          reject(putRequest.error);
        };
      };

      getRequest.onerror = () => {
        console.error('[SyncQueue] Failed to get operation:', getRequest.error);
        reject(getRequest.error);
      };
    });
  }

  /**
   * Get all failed operations ready for retry
   *
   * Filters operations based on:
   * - Retry count < max retries
   * - Exponential backoff delay has passed
   */
  async getRetryableOperations(): Promise<QueuedOperation[]> {
    await this.init();

    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const operations = request.result as QueuedOperation[];
        const now = Date.now();

        // Filter operations ready for retry
        const retryable = operations.filter((op) => {
          // Skip if max retries exceeded
          if (op.retryCount >= op.maxRetries) {
            return false;
          }

          // Calculate backoff delay: 1s, 2s, 4s, 8s, 16s, 32s
          const backoffMs = Math.min(1000 * Math.pow(2, op.retryCount), 32000);
          const timeSinceLastAttempt = now - op.lastAttemptAt;

          // Ready if backoff period has passed
          return timeSinceLastAttempt >= backoffMs;
        });

        resolve(retryable);
      };

      request.onerror = () => {
        console.error('[SyncQueue] Failed to get retryable operations:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get all operations (for debugging/monitoring)
   */
  async getAllOperations(): Promise<QueuedOperation[]> {
    await this.init();

    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result as QueuedOperation[]);
      };

      request.onerror = () => {
        console.error('[SyncQueue] Failed to get all operations:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get queue size
   */
  async getQueueSize(): Promise<number> {
    await this.init();

    if (!this.db) return 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.count();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('[SyncQueue] Failed to get queue size:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Clear all operations from queue (for testing or reset)
   */
  async clear(): Promise<void> {
    await this.init();

    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('[SyncQueue] Queue cleared');
        resolve();
      };

      request.onerror = () => {
        console.error('[SyncQueue] Failed to clear queue:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get operations that exceeded max retries (dead-letter queue)
   */
  async getDeadLetterOperations(): Promise<QueuedOperation[]> {
    await this.init();

    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const operations = request.result as QueuedOperation[];
        const deadLetter = operations.filter((op) => op.retryCount >= op.maxRetries);
        resolve(deadLetter);
      };

      request.onerror = () => {
        console.error('[SyncQueue] Failed to get dead-letter operations:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Generate unique operation ID
   */
  private generateId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}

// Singleton instance
let queueInstance: SyncQueue | null = null;

/**
 * Get the singleton sync queue instance
 */
export function getSyncQueue(): SyncQueue {
  if (!queueInstance) {
    queueInstance = new SyncQueue();
  }
  return queueInstance;
}
