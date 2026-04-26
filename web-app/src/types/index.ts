export interface Member {
  id: string;
  stateCode: string;
  fullName: string;
  cdsGroup: string;
  phone: string;
  qrData: string;
  pin: string;
  serviceYear: string;
  role: 'admin' | 'member';
  registeredAt: number;
  lastScanTime?: number; // for cooldown
}

export interface AttendanceRecord {
  id: string;
  memberId: string;
  memberName: string;
  stateCode: string;
  eventId: string;
  timestamp: number;
  type: 'CHECK-IN' | 'CHECK-OUT';
  synced: boolean;
  deviceId: string;
  shortCode?: string;
}

export interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  qrData: string;
  createdBy: string;
  createdAt: number;
  status: 'ACTIVE' | 'ENDED';
  location?: string;
}

export interface AdminUser {
  id: string;
  pin: string;
  role: 'admin';
  createdAt: number;
}

export interface SyncQueueItem {
  id: string;
  type: 'attendance' | 'member' | 'event';
  action: 'create' | 'update' | 'delete';
  data: unknown;
  timestamp: number;
  retries: number;
}

export type AppView = 'landing' | 'login' | 'member-login' | 'member-signup' | 'scanner' | 'dashboard' | 'members' | 'generate-qr' | 'events' | 'member-dashboard';
