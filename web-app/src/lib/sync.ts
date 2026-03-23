import { getUnsyncedAttendance, markAttendanceSynced, getSyncQueue, removeSyncQueueItem, addToSyncQueue } from './db';
import type { SyncQueueItem } from '../types';

const SYNC_API_URL = ''; // Configure when backend is available

export function isOnline(): boolean {
  return navigator.onLine;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function getDeviceId(): string {
  let deviceId = localStorage.getItem('nysc-device-id');
  if (!deviceId) {
    deviceId = `device-${generateId()}`;
    localStorage.setItem('nysc-device-id', deviceId);
  }
  return deviceId;
}

/**
 * Attempt to sync unsynced attendance records to the server.
 * Falls back gracefully if the server is unreachable.
 */
export async function syncAttendance(): Promise<{ synced: number; failed: number }> {
  if (!isOnline() || !SYNC_API_URL) {
    return { synced: 0, failed: 0 };
  }

  const unsyncedRecords = await getUnsyncedAttendance();
  let synced = 0;
  let failed = 0;

  for (const record of unsyncedRecords) {
    try {
      const response = await fetch(`${SYNC_API_URL}/api/attendance/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });

      if (response.ok) {
        await markAttendanceSynced(record.id);
        synced++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return { synced, failed };
}

/**
 * Process the sync queue for any pending operations.
 */
export async function processSyncQueue(): Promise<void> {
  if (!isOnline() || !SYNC_API_URL) return;

  const queue = await getSyncQueue();

  for (const item of queue) {
    try {
      const response = await fetch(`${SYNC_API_URL}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });

      if (response.ok) {
        await removeSyncQueueItem(item.id);
      } else if (item.retries < 3) {
        const updated: SyncQueueItem = { ...item, retries: item.retries + 1 };
        await addToSyncQueue(updated);
      } else {
        await removeSyncQueueItem(item.id);
      }
    } catch {
      if (item.retries < 3) {
        const updated: SyncQueueItem = { ...item, retries: item.retries + 1 };
        await addToSyncQueue(updated);
      }
    }
  }
}

/**
 * Export attendance data as CSV string.
 */
export function exportToCSV(
  data: Array<{ memberName: string; stateCode: string; checkInTime: number; method: string }>
): string {
  const headers = 'Name,State Code,Check-In Time,Method\n';
  const rows = data.map((r) => {
    const time = new Date(r.checkInTime).toLocaleString();
    return `"${r.memberName}","${r.stateCode}","${time}","${r.method}"`;
  });
  return headers + rows.join('\n');
}

/**
 * Download CSV as file.
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * Set up automatic background sync when online.
 */
export function setupAutoSync(intervalMs: number = 30000): () => void {
  const interval = setInterval(async () => {
    if (isOnline()) {
      await syncAttendance();
      await processSyncQueue();
    }
  }, intervalMs);

  const onlineHandler = async () => {
    await syncAttendance();
    await processSyncQueue();
  };

  window.addEventListener('online', onlineHandler);

  return () => {
    clearInterval(interval);
    window.removeEventListener('online', onlineHandler);
  };
}
