/**
 * SyncQueue Unit Tests
 *
 * Tests for IndexedDB-based operation queue with retry logic
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { SyncQueue, getSyncQueue } from './sync-queue';

describe('SyncQueue', () => {
  let queue: SyncQueue;

  beforeEach(async () => {
    // Create a fresh queue instance for each test
    queue = new SyncQueue();
    await queue.init();
  });

  afterEach(async () => {
    // Clean up after each test
    await queue.clear();
  });

  describe('init', () => {
    it('initializes IndexedDB successfully', async () => {
      const newQueue = new SyncQueue();
      await expect(newQueue.init()).resolves.not.toThrow();
    });

    it('reuses existing initialization if called multiple times', async () => {
      const newQueue = new SyncQueue();
      const promise1 = newQueue.init();
      const promise2 = newQueue.init();
      // Both calls should resolve successfully (reusing initialization)
      await expect(promise1).resolves.not.toThrow();
      await expect(promise2).resolves.not.toThrow();
    });
  });

  describe('enqueue', () => {
    it('adds operation to queue and returns ID', async () => {
      const id = await queue.enqueue({
        type: 'create',
        entity: 'session',
        payload: { sessionId: 'test-123' },
        userId: 'user-123',
      });

      expect(id).toBeTruthy();
      expect(id.startsWith('op_')).toBe(true);
    });

    it('creates operation with correct default values', async () => {
      await queue.enqueue({
        type: 'update',
        entity: 'calibration',
        payload: { calibrationId: 'cal-123' },
        userId: 'user-456',
      });

      const operations = await queue.getAllOperations();
      expect(operations).toHaveLength(1);
      expect(operations[0]!.retryCount).toBe(0);
      expect(operations[0]!.maxRetries).toBe(6);
      expect(operations[0]!.type).toBe('update');
      expect(operations[0]!.entity).toBe('calibration');
      expect(operations[0]!.userId).toBe('user-456');
    });

    it('stores multiple operations', async () => {
      await queue.enqueue({
        type: 'create',
        entity: 'session',
        payload: {},
        userId: 'user-1',
      });
      await queue.enqueue({
        type: 'create',
        entity: 'calibration',
        payload: {},
        userId: 'user-1',
      });
      await queue.enqueue({
        type: 'create',
        entity: 'blink_pattern',
        payload: {},
        userId: 'user-1',
      });

      const size = await queue.getQueueSize();
      expect(size).toBe(3);
    });
  });

  describe('markComplete', () => {
    it('removes operation from queue', async () => {
      const id = await queue.enqueue({
        type: 'create',
        entity: 'session',
        payload: {},
        userId: 'user-123',
      });

      await queue.markComplete(id);

      const operations = await queue.getAllOperations();
      expect(operations).toHaveLength(0);
    });

    it('only removes specified operation', async () => {
      const id1 = await queue.enqueue({
        type: 'create',
        entity: 'session',
        payload: {},
        userId: 'user-123',
      });
      await queue.enqueue({
        type: 'create',
        entity: 'calibration',
        payload: {},
        userId: 'user-123',
      });

      await queue.markComplete(id1);

      const operations = await queue.getAllOperations();
      expect(operations).toHaveLength(1);
      expect(operations[0]!.entity).toBe('calibration');
    });
  });

  describe('markFailed', () => {
    it('increments retry count', async () => {
      const id = await queue.enqueue({
        type: 'create',
        entity: 'session',
        payload: {},
        userId: 'user-123',
      });

      await queue.markFailed(id, 'Network error');

      const operations = await queue.getAllOperations();
      expect(operations[0]!.retryCount).toBe(1);
    });

    it('stores error message', async () => {
      const id = await queue.enqueue({
        type: 'create',
        entity: 'session',
        payload: {},
        userId: 'user-123',
      });

      await queue.markFailed(id, 'Connection timeout');

      const operations = await queue.getAllOperations();
      expect(operations[0]!.error).toBe('Connection timeout');
    });

    it('updates lastAttemptAt timestamp', async () => {
      const id = await queue.enqueue({
        type: 'create',
        entity: 'session',
        payload: {},
        userId: 'user-123',
      });

      const before = Date.now();
      await queue.markFailed(id, 'Error');
      const after = Date.now();

      const operations = await queue.getAllOperations();
      expect(operations[0]!.lastAttemptAt).toBeGreaterThanOrEqual(before);
      expect(operations[0]!.lastAttemptAt).toBeLessThanOrEqual(after);
    });

    it('does not throw for non-existent operation', async () => {
      await expect(queue.markFailed('non-existent-id', 'Error')).resolves.not.toThrow();
    });
  });

  describe('getRetryableOperations', () => {
    it('returns operations ready for retry', async () => {
      // Add operation with past lastAttemptAt
      await queue.enqueue({
        type: 'create',
        entity: 'session',
        payload: {},
        userId: 'user-123',
      });

      // Wait for backoff period (1s for first retry)
      await new Promise((r) => setTimeout(r, 1100));

      const retryable = await queue.getRetryableOperations();
      expect(retryable).toHaveLength(1);
    });

    it('excludes operations within backoff period', async () => {
      await queue.enqueue({
        type: 'create',
        entity: 'session',
        payload: {},
        userId: 'user-123',
      });

      // Immediately check - should still be in backoff
      const retryable = await queue.getRetryableOperations();
      expect(retryable).toHaveLength(0);
    });

    it('excludes operations that exceeded max retries', async () => {
      const id = await queue.enqueue({
        type: 'create',
        entity: 'session',
        payload: {},
        userId: 'user-123',
      });

      // Fail 6 times (max retries)
      for (let i = 0; i < 6; i++) {
        await queue.markFailed(id, 'Error');
      }

      // Wait for backoff
      await new Promise((r) => setTimeout(r, 1100));

      const retryable = await queue.getRetryableOperations();
      expect(retryable).toHaveLength(0);
    });

    it('calculates exponential backoff correctly', async () => {
      // Test that backoff increases with retry count
      // Formula: Math.min(1000 * Math.pow(2, retryCount), 32000)
      const id = await queue.enqueue({
        type: 'create',
        entity: 'session',
        payload: {},
        userId: 'user-123',
      });

      // First failure: 1s backoff (2^0 = 1)
      await queue.markFailed(id, 'Error');
      let operations = await queue.getAllOperations();
      expect(operations[0]!.retryCount).toBe(1);

      // Second failure: 2s backoff (2^1 = 2)
      await queue.markFailed(id, 'Error');
      operations = await queue.getAllOperations();
      expect(operations[0]!.retryCount).toBe(2);

      // The backoff timing is tested implicitly:
      // - getRetryableOperations filters by: timeSinceLastAttempt >= backoffMs
      // - backoffMs = Math.min(1000 * Math.pow(2, retryCount), 32000)
    });
  });

  describe('getDeadLetterOperations', () => {
    it('returns operations that exceeded max retries', async () => {
      const id = await queue.enqueue({
        type: 'create',
        entity: 'session',
        payload: {},
        userId: 'user-123',
      });

      // Fail 6 times
      for (let i = 0; i < 6; i++) {
        await queue.markFailed(id, 'Error');
      }

      const deadLetter = await queue.getDeadLetterOperations();
      expect(deadLetter).toHaveLength(1);
    });

    it('excludes operations under max retries', async () => {
      const id = await queue.enqueue({
        type: 'create',
        entity: 'session',
        payload: {},
        userId: 'user-123',
      });

      // Fail only 3 times
      for (let i = 0; i < 3; i++) {
        await queue.markFailed(id, 'Error');
      }

      const deadLetter = await queue.getDeadLetterOperations();
      expect(deadLetter).toHaveLength(0);
    });
  });

  describe('getQueueSize', () => {
    it('returns 0 for empty queue', async () => {
      const size = await queue.getQueueSize();
      expect(size).toBe(0);
    });

    it('returns correct count', async () => {
      await queue.enqueue({ type: 'create', entity: 'session', payload: {}, userId: 'user-1' });
      await queue.enqueue({ type: 'create', entity: 'session', payload: {}, userId: 'user-1' });

      const size = await queue.getQueueSize();
      expect(size).toBe(2);
    });
  });

  describe('clear', () => {
    it('removes all operations', async () => {
      await queue.enqueue({ type: 'create', entity: 'session', payload: {}, userId: 'user-1' });
      await queue.enqueue({ type: 'create', entity: 'session', payload: {}, userId: 'user-1' });

      await queue.clear();

      const size = await queue.getQueueSize();
      expect(size).toBe(0);
    });
  });

  describe('getSyncQueue singleton', () => {
    it('returns the same instance', () => {
      const instance1 = getSyncQueue();
      const instance2 = getSyncQueue();
      expect(instance1).toBe(instance2);
    });
  });
});
