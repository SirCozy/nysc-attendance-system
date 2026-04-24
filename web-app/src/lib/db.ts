import { openDB, type IDBPDatabase } from 'idb';
import type { CorpsMember, AttendanceRecord, Event, AdminUser, SyncQueueItem } from '../types';

const DB_NAME = 'nysc-attendance';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase | null = null;

export async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Corps Members store
      if (!db.objectStoreNames.contains('members')) {
        const memberStore = db.createObjectStore('members', { keyPath: 'id' });
        memberStore.createIndex('stateCode', 'stateCode', { unique: true });
        memberStore.createIndex('qrData', 'qrData', { unique: true });
      }

      // Attendance records store
      if (!db.objectStoreNames.contains('attendance')) {
        const attendanceStore = db.createObjectStore('attendance', { keyPath: 'id' });
        attendanceStore.createIndex('eventId', 'eventId', { unique: false });
        attendanceStore.createIndex('memberId', 'memberId', { unique: false });
        attendanceStore.createIndex('synced', 'synced', { unique: false });
        attendanceStore.createIndex('memberEvent', ['memberId', 'eventId'], { unique: true });
      }

      // Events store
      if (!db.objectStoreNames.contains('events')) {
        db.createObjectStore('events', { keyPath: 'id' });
      }

      // Admin users store
      if (!db.objectStoreNames.contains('admins')) {
        const adminStore = db.createObjectStore('admins', { keyPath: 'id' });
        adminStore.createIndex('name', 'name', { unique: true });
      }

      // Sync queue store
      if (!db.objectStoreNames.contains('syncQueue')) {
        const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    },
  });

  return dbInstance;
}

// ============ MEMBERS ============

export async function addMember(member: CorpsMember): Promise<void> {
  const db = await getDB();
  await db.put('members', member);
}

export async function getMember(id: string): Promise<CorpsMember | undefined> {
  const db = await getDB();
  return db.get('members', id);
}

export async function getMemberByStateCode(stateCode: string): Promise<CorpsMember | undefined> {
  const db = await getDB();
  return db.getFromIndex('members', 'stateCode', stateCode);
}

export async function getMemberByQR(qrData: string): Promise<CorpsMember | undefined> {
  const db = await getDB();
  return db.getFromIndex('members', 'qrData', qrData);
}

export async function getAllMembers(): Promise<CorpsMember[]> {
  const db = await getDB();
  return db.getAll('members');
}

export async function deleteMember(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('members', id);
}

// ============ ATTENDANCE ============

export async function addAttendance(record: AttendanceRecord): Promise<void> {
  const db = await getDB();
  await db.put('attendance', record);
}

export async function getAttendanceByEvent(eventId: string): Promise<AttendanceRecord[]> {
  const db = await getDB();
  return db.getAllFromIndex('attendance', 'eventId', eventId);
}

export async function checkDuplicateAttendance(memberId: string, eventId: string): Promise<boolean> {
  const db = await getDB();
  const existing = await db.getFromIndex('attendance', 'memberEvent', [memberId, eventId]);
  return !!existing;
}

export async function getUnsyncedAttendance(): Promise<AttendanceRecord[]> {
  const db = await getDB();
  const all = await db.getAll('attendance');
  return all.filter((r: AttendanceRecord) => !r.synced);
}

export async function markAttendanceSynced(id: string): Promise<void> {
  const db = await getDB();
  const record = await db.get('attendance', id);
  if (record) {
    record.synced = true;
    await db.put('attendance', record);
  }
}

export async function getAllAttendance(): Promise<AttendanceRecord[]> {
  const db = await getDB();
  return db.getAll('attendance');
}

// ============ EVENTS ============

export async function addEvent(event: Event): Promise<void> {
  const db = await getDB();
  await db.put('events', event);
}

export async function getEvent(id: string): Promise<Event | undefined> {
  const db = await getDB();
  return db.get('events', id);
}

export async function getAllEvents(): Promise<Event[]> {
  const db = await getDB();
  return db.getAll('events');
}

export async function getActiveEvent(): Promise<Event | undefined> {
  const db = await getDB();
  const events = await db.getAll('events');
  return events.find((e: Event) => e.status === 'active');
}

export async function closeEvent(id: string): Promise<void> {
  const db = await getDB();
  const event = await db.get('events', id);
  if (event) {
    event.status = 'closed';
    await db.put('events', event);
  }
}

// ============ ADMINS ============

export async function addAdmin(admin: AdminUser): Promise<void> {
  const db = await getDB();
  await db.put('admins', admin);
}

export async function getAdminByName(name: string): Promise<AdminUser | undefined> {
  const db = await getDB();
  return db.getFromIndex('admins', 'name', name);
}

export async function getAllAdmins(): Promise<AdminUser[]> {
  const db = await getDB();
  return db.getAll('admins');
}

// ============ SYNC QUEUE ============

export async function addToSyncQueue(item: SyncQueueItem): Promise<void> {
  const db = await getDB();
  await db.put('syncQueue', item);
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await getDB();
  return db.getAllFromIndex('syncQueue', 'timestamp');
}

export async function removeSyncQueueItem(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('syncQueue', id);
}

// ============ SEED DATA ============

export async function seedDefaultAdmin(): Promise<void> {
  // No default admin is created when local PIN authentication is used.
}

export async function getStats(eventId?: string): Promise<{
  totalMembers: number;
  totalPresent: number;
  totalAbsent: number;
  attendanceRate: number;
}> {
  const members = await getAllMembers();
  const attendance = eventId
    ? await getAttendanceByEvent(eventId)
    : await getAllAttendance();

  const totalMembers = members.length;
  const uniquePresentIds = new Set(attendance.map((a: AttendanceRecord) => a.memberId));
  const totalPresent = uniquePresentIds.size;
  const totalAbsent = Math.max(0, totalMembers - totalPresent);
  const attendanceRate = totalMembers > 0 ? Math.round((totalPresent / totalMembers) * 100) : 0;

  return { totalMembers, totalPresent, totalAbsent, attendanceRate };
}
