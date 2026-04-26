import { openDB, type IDBPDatabase } from 'idb';
import type { Member, AttendanceRecord, Event, AdminUser, SyncQueueItem } from '../types';

const DB_NAME = 'nysc-attendance';
const DB_VERSION = 4;

let dbInstance: IDBPDatabase | null = null;

export async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance;

  try {
    dbInstance = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        console.log(`Upgrading database from version ${oldVersion} to ${DB_VERSION}`);
        try {
          // Corps Members store (now Members)
          if (!db.objectStoreNames.contains('members')) {
            const memberStore = db.createObjectStore('members', { keyPath: 'id' });
            memberStore.createIndex('stateCode', 'stateCode', { unique: true });
            memberStore.createIndex('qrData', 'qrData', { unique: true });
            memberStore.createIndex('pin', 'pin', { unique: true });
          } else if (oldVersion < 3) {
            const memberStore = db.objectStore('members');
            if (!memberStore.indexNames.contains('pin')) {
              memberStore.createIndex('pin', 'pin', { unique: true });
            }
          }

          // Attendance records store
          if (!db.objectStoreNames.contains('attendance')) {
            const attendanceStore = db.createObjectStore('attendance', { keyPath: 'id' });
            attendanceStore.createIndex('eventId', 'eventId', { unique: false });
            attendanceStore.createIndex('memberId', 'memberId', { unique: false });
            attendanceStore.createIndex('synced', 'synced', { unique: false });
            attendanceStore.createIndex('memberEvent', ['memberId', 'eventId'], { unique: false });
          } else if (oldVersion < 4) {
            const attendanceStore = db.objectStore('attendance');
            if (attendanceStore.indexNames.contains('memberEvent')) {
              attendanceStore.deleteIndex('memberEvent');
            }
            attendanceStore.createIndex('memberEvent', ['memberId', 'eventId'], { unique: false });
          }

          // Events store
          if (!db.objectStoreNames.contains('events')) {
            const eventStore = db.createObjectStore('events', { keyPath: 'id' });
            eventStore.createIndex('qrData', 'qrData', { unique: true });
          } else if (oldVersion < 4) {
            const eventStore = db.objectStore('events');
            if (!eventStore.indexNames.contains('qrData')) {
              eventStore.createIndex('qrData', 'qrData', { unique: true });
            }
          }

          // Admin users store
          if (!db.objectStoreNames.contains('admins')) {
            const adminStore = db.createObjectStore('admins', { keyPath: 'id' });
            adminStore.createIndex('pin', 'pin', { unique: true });
          }

          // Sync queue store
          if (!db.objectStoreNames.contains('syncQueue')) {
            const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
            syncStore.createIndex('timestamp', 'timestamp', { unique: false });
          }
        } catch (error) {
          console.error('Database upgrade failed:', error);
          throw error;
        }
      },
    });
    console.log('Database initialized successfully');
    return dbInstance;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

// ============ MEMBERS ============

export async function addMember(member: Member): Promise<void> {
  try {
    const db = await getDB();
    await db.put('members', member);
  } catch (error) {
    console.error('Failed to add member:', error);
    throw error;
  }
}

export async function updateMember(member: Member): Promise<void> {
  try {
    const db = await getDB();
    await db.put('members', member);
  } catch (error) {
    console.error('Failed to update member:', error);
    throw error;
  }
}

export async function getMember(id: string): Promise<Member | undefined> {
  try {
    const db = await getDB();
    return await db.get('members', id);
  } catch (error) {
    console.error('Failed to get member:', error);
    throw error;
  }
}

export async function getMemberByStateCode(stateCode: string): Promise<Member | undefined> {
  try {
    const db = await getDB();
    return await db.getFromIndex('members', 'stateCode', stateCode);
  } catch (error) {
    console.error('Failed to get member by state code:', error);
    throw error;
  }
}

export async function getMemberByPin(pin: string): Promise<Member | undefined> {
  try {
    const db = await getDB();
    return await db.getFromIndex('members', 'pin', pin);
  } catch (error) {
    console.error('Failed to get member by PIN:', error);
    throw error;
  }
}

export async function getAllMembers(): Promise<Member[]> {
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

export async function updateAttendance(record: AttendanceRecord): Promise<void> {
  const db = await getDB();
  await db.put('attendance', record);
}

export async function getLatestAttendanceForMemberEvent(memberId: string, eventId: string): Promise<AttendanceRecord | undefined> {
  const db = await getDB();
  const records = await db.getAllFromIndex('attendance', 'memberEvent', [memberId, eventId]);
  if (records.length === 0) return undefined;
  return records.sort((a, b) => b.timestamp - a.timestamp)[0];
}

export async function getAttendanceByEvent(eventId: string): Promise<AttendanceRecord[]> {
  const db = await getDB();
  return db.getAllFromIndex('attendance', 'eventId', eventId);
}

export async function getAllAttendance(): Promise<AttendanceRecord[]> {
  const db = await getDB();
  return db.getAll('attendance');
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

export async function getStats(eventId?: string): Promise<{ totalMembers: number; inCount: number; outCount: number }> {
  const allMembers = await getAllMembers();
  const totalMembers = allMembers.length;

  if (!eventId) {
    return { totalMembers, inCount: 0, outCount: 0 };
  }

  const records = await getAttendanceByEvent(eventId);
  const latestByMember = new Map<string, AttendanceRecord>();

  for (const record of records) {
    const existing = latestByMember.get(record.memberId);
    if (!existing || record.timestamp > existing.timestamp) {
      latestByMember.set(record.memberId, record);
    }
  }

  let inCount = 0;
  let outCount = 0;

  for (const record of latestByMember.values()) {
    if (record.type === 'CHECK-IN') inCount++;
    else if (record.type === 'CHECK-OUT') outCount++;
  }

  return { totalMembers, inCount, outCount };
}

// ============ EVENTS ============

export async function addEvent(event: Event): Promise<void> {
  const db = await getDB();
  await db.put('events', event);
}

export async function updateEvent(event: Event): Promise<void> {
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
  return events.find((e: Event) => e.status === 'ACTIVE');
}

export async function activateEvent(id: string): Promise<void> {
  const db = await getDB();
  const events = await db.getAll('events');

  for (const existing of events) {
    if (existing.status === 'ACTIVE' && existing.id !== id) {
      existing.status = 'ENDED';
      await db.put('events', existing);
    }
  }

  const event = await db.get('events', id);
  if (event) {
    event.status = 'ACTIVE';
    await db.put('events', event);
  }
}

export async function closeEvent(id: string): Promise<void> {
  const db = await getDB();
  const event = await db.get('events', id);
  if (event) {
    event.status = 'ENDED';
    await db.put('events', event);
  }
}

export async function getEventByQR(qrData: string): Promise<Event | undefined> {
  const db = await getDB();
  return db.getFromIndex('events', 'qrData', qrData);
}

// ============ ADMINS ============

export async function addAdmin(admin: AdminUser): Promise<void> {
  const db = await getDB();
  await db.put('admins', admin);
}

export async function updateAdmin(admin: AdminUser): Promise<void> {
  const db = await getDB();
  await db.put('admins', admin);
}

export async function getAdminByPin(pin: string): Promise<AdminUser | undefined> {
  const db = await getDB();
  return db.getFromIndex('admins', 'pin', pin);
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

