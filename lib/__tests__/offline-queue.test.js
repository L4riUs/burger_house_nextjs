import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { openDB, deleteDB } from 'idb';

const DB_NAME = 'burger-house-offline-test';
const STORE_NAME = 'offline_orders';

const ORDER_STATUS = {
  PENDING_SYNC: 'pending_sync',
  SYNCED: 'synced',
  CONFLICT: 'conflict',
};

let testDb = null;

async function getTestDB() {
  if (!testDb) {
    testDb = await openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('client_ref', 'client_ref', { unique: true });
          store.createIndex('status', 'status');
          store.createIndex('created_at', 'created_at');
        }
      },
    });
  }
  return testDb;
}

async function addOfflineOrder(payload) {
  const db = await getTestDB();
  const id = crypto.randomUUID();
  const clientRef = payload.client_ref || crypto.randomUUID();
  const now = new Date().toISOString();

  const order = {
    id,
    client_ref: clientRef,
    payload,
    status: ORDER_STATUS.PENDING_SYNC,
    created_at: now,
    updated_at: now,
    retry_count: 0,
    last_error: null,
  };

  await db.put(STORE_NAME, order);
  return order;
}

async function getAllOfflineOrders() {
  const db = await getTestDB();
  return db.getAllFromIndex(STORE_NAME, 'created_at');
}

async function getOfflineOrdersByStatus(status) {
  const db = await getTestDB();
  return db.getAllFromIndex(STORE_NAME, 'status', status);
}

async function getPendingSyncOrders() {
  return getOfflineOrdersByStatus(ORDER_STATUS.PENDING_SYNC);
}

async function getConflictOrders() {
  return getOfflineOrdersByStatus(ORDER_STATUS.CONFLICT);
}

async function getOfflineOrderByClientRef(clientRef) {
  const db = await getTestDB();
  return db.getFromIndex(STORE_NAME, 'client_ref', clientRef);
}

async function updateOfflineOrderStatus(id, status, error = null) {
  const db = await getTestDB();
  const order = await db.get(STORE_NAME, id);
  if (!order) return null;

  order.status = status;
  order.updated_at = new Date().toISOString();
  if (error) {
    order.last_error = error;
    order.retry_count = (order.retry_count || 0) + 1;
  }
  await db.put(STORE_NAME, order);
  return order;
}

async function markOrderSynced(id) {
  return updateOfflineOrderStatus(id, ORDER_STATUS.SYNCED);
}

async function markOrderConflict(id, error) {
  return updateOfflineOrderStatus(id, ORDER_STATUS.CONFLICT, error);
}

async function deleteOfflineOrder(id) {
  const db = await getTestDB();
  await db.delete(STORE_NAME, id);
}

async function clearSyncedOrders() {
  const db = await getTestDB();
  const syncedOrders = await getOfflineOrdersByStatus(ORDER_STATUS.SYNCED);
  for (const order of syncedOrders) {
    await db.delete(STORE_NAME, order.id);
  }
  return syncedOrders.length;
}

async function getPendingSyncCount() {
  const db = await getTestDB();
  return db.countFromIndex(STORE_NAME, 'status', ORDER_STATUS.PENDING_SYNC);
}

async function getConflictCount() {
  const db = await getTestDB();
  return db.countFromIndex(STORE_NAME, 'status', ORDER_STATUS.CONFLICT);
}

describe("Offline Queue - IndexedDB Operations", () => {
  beforeEach(async () => {
    await deleteDB(DB_NAME);
    testDb = null;
  });

  afterEach(async () => {
    if (testDb) {
      testDb.close();
    }
    await deleteDB(DB_NAME);
  });

  const samplePayload = {
    fulfillment_type: 'pickup',
    channel: 'pos',
    cart_items: [
      { type: 'product', product_id: 'prod-1', quantity: 2, extras: [] },
    ],
    customer_type: 'guest',
    guest_customer: { full_name: 'Test User', phone: '0412-0000000' },
    payment_method_id: 'pm-1',
  };

  describe("addOfflineOrder", () => {
    it("adds an order with generated id and client_ref", async () => {
      const order = await addOfflineOrder(samplePayload);

      expect(order.id).toBeDefined();
      expect(order.client_ref).toBeDefined();
      expect(order.status).toBe(ORDER_STATUS.PENDING_SYNC);
      expect(order.payload).toEqual(samplePayload);
      expect(order.created_at).toBeDefined();
      expect(order.retry_count).toBe(0);
    });

    it("uses provided client_ref if present", async () => {
      const customClientRef = 'custom-client-ref-123';
      const order = await addOfflineOrder({ ...samplePayload, client_ref: customClientRef });

      expect(order.client_ref).toBe(customClientRef);
    });

    it("stores order in IndexedDB", async () => {
      const order = await addOfflineOrder(samplePayload);
      const stored = await getOfflineOrderByClientRef(order.client_ref);

      expect(stored).toBeDefined();
      expect(stored.id).toBe(order.id);
    });
  });

  describe("getPendingSyncOrders", () => {
    it("returns only pending_sync orders", async () => {
      await addOfflineOrder({ ...samplePayload, client_ref: 'ref-1' });
      await addOfflineOrder({ ...samplePayload, client_ref: 'ref-2' });

      const order3 = await addOfflineOrder({ ...samplePayload, client_ref: 'ref-3' });
      await markOrderSynced(order3.id);

      const order4 = await addOfflineOrder({ ...samplePayload, client_ref: 'ref-4' });
      await markOrderConflict(order4.id, 'Test error');

      const pending = await getPendingSyncOrders();

      expect(pending).toHaveLength(2);
      expect(pending.every(o => o.status === ORDER_STATUS.PENDING_SYNC)).toBe(true);
    });

    it("returns empty array when no pending orders", async () => {
      const pending = await getPendingSyncOrders();
      expect(pending).toEqual([]);
    });
  });

  describe("getConflictOrders", () => {
    it("returns only conflict orders", async () => {
      await addOfflineOrder({ ...samplePayload, client_ref: 'ref-1' });
      const order2 = await addOfflineOrder({ ...samplePayload, client_ref: 'ref-2' });
      await markOrderConflict(order2.id, 'Product not found');

      const conflicts = await getConflictOrders();

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].status).toBe(ORDER_STATUS.CONFLICT);
      expect(conflicts[0].last_error).toBe('Product not found');
    });
  });

  describe("markOrderSynced", () => {
    it("updates order status to synced", async () => {
      const order = await addOfflineOrder(samplePayload);
      const updated = await markOrderSynced(order.id);

      expect(updated.status).toBe(ORDER_STATUS.SYNCED);
      expect(updated.updated_at).not.toBe(order.updated_at);
    });

    it("returns null for non-existent order", async () => {
      const result = await markOrderSynced('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe("markOrderConflict", () => {
    it("updates order status to conflict with error message", async () => {
      const order = await addOfflineOrder(samplePayload);
      const updated = await markOrderConflict(order.id, 'Product discontinued');

      expect(updated.status).toBe(ORDER_STATUS.CONFLICT);
      expect(updated.last_error).toBe('Product discontinued');
      expect(updated.retry_count).toBe(1);
    });
  });

  describe("deleteOfflineOrder", () => {
    it("removes order from IndexedDB", async () => {
      const order = await addOfflineOrder(samplePayload);
      await deleteOfflineOrder(order.id);

      const stored = await getOfflineOrderByClientRef(order.client_ref);
      expect(stored).toBeUndefined();
    });
  });

  describe("getPendingSyncCount", () => {
    it("returns correct count of pending orders", async () => {
      await addOfflineOrder({ ...samplePayload, client_ref: 'ref-1' });
      await addOfflineOrder({ ...samplePayload, client_ref: 'ref-2' });

      const count = await getPendingSyncCount();
      expect(count).toBe(2);
    });
  });

  describe("getConflictCount", () => {
    it("returns correct count of conflict orders", async () => {
      await addOfflineOrder({ ...samplePayload, client_ref: 'ref-1' });
      const order2 = await addOfflineOrder({ ...samplePayload, client_ref: 'ref-2' });
      await markOrderConflict(order2.id, 'Error');

      const count = await getConflictCount();
      expect(count).toBe(1);
    });
  });

  describe("clearSyncedOrders", () => {
    it("deletes all synced orders and returns count", async () => {
      const order1 = await addOfflineOrder({ ...samplePayload, client_ref: 'ref-1' });
      const order2 = await addOfflineOrder({ ...samplePayload, client_ref: 'ref-2' });
      await markOrderSynced(order1.id);
      await markOrderSynced(order2.id);

      const deletedCount = await clearSyncedOrders();

      expect(deletedCount).toBe(2);
      const remaining = await getAllOfflineOrders();
      expect(remaining).toHaveLength(0);
    });
  });

  describe("idempotency via unique client_ref index", () => {
    it("prevents duplicate client_ref entries", async () => {
      await addOfflineOrder({ ...samplePayload, client_ref: 'same-ref' });

      await expect(
        addOfflineOrder({ ...samplePayload, client_ref: 'same-ref' })
      ).rejects.toThrow();
    });
  });
});