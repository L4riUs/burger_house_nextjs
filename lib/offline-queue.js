import { openDB } from 'idb';

const DB_NAME = 'burger-house-offline';
const DB_VERSION = 1;
const STORE_NAME = 'offline_orders';

const ORDER_STATUS = {
  PENDING_SYNC: 'pending_sync',
  SYNCED: 'synced',
  CONFLICT: 'conflict',
};

let dbPromise = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
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
  return dbPromise;
}

export async function addOfflineOrder(payload) {
  const db = await getDB();
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

export async function getAllOfflineOrders() {
  const db = await getDB();
  return db.getAllFromIndex(STORE_NAME, 'created_at');
}

export async function getOfflineOrdersByStatus(status) {
  const db = await getDB();
  return db.getAllFromIndex(STORE_NAME, 'status', status);
}

export async function getPendingSyncOrders() {
  return getOfflineOrdersByStatus(ORDER_STATUS.PENDING_SYNC);
}

export async function getConflictOrders() {
  return getOfflineOrdersByStatus(ORDER_STATUS.CONFLICT);
}

export async function getOfflineOrderByClientRef(clientRef) {
  const db = await getDB();
  return db.getFromIndex(STORE_NAME, 'client_ref', clientRef);
}

export async function updateOfflineOrderStatus(id, status, error = null) {
  const db = await getDB();
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

export async function markOrderSynced(id) {
  return updateOfflineOrderStatus(id, ORDER_STATUS.SYNCED);
}

export async function markOrderConflict(id, error) {
  return updateOfflineOrderStatus(id, ORDER_STATUS.CONFLICT, error);
}

export async function deleteOfflineOrder(id) {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

export async function clearSyncedOrders() {
  const db = await getDB();
  const syncedOrders = await getOfflineOrdersByStatus(ORDER_STATUS.SYNCED);
  for (const order of syncedOrders) {
    await db.delete(STORE_NAME, order.id);
  }
  return syncedOrders.length;
}

export async function getPendingSyncCount() {
  const db = await getDB();
  return db.countFromIndex(STORE_NAME, 'status', ORDER_STATUS.PENDING_SYNC);
}

export async function getConflictCount() {
  const db = await getDB();
  return db.countFromIndex(STORE_NAME, 'status', ORDER_STATUS.CONFLICT);
}

export { ORDER_STATUS };