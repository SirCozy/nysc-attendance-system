export interface Member {
  id: string;
  stateCode: string;
  fullName: string;
  cdsGroup: string;
  phone: string;
  qrData: string;
  registeredAt: number;
}

export interface AttendanceRecord {
  id: string;
  memberId: string;
  memberName: string;
  stateCode: string;
  eventId: string;
  timestamp: number;
  type: 'IN' | 'OUT';
  method: 'qr' | 'manual';
  synced: boolean;
  deviceId: string;
  shortCode?: string;
}

export interface Event {
  id: string;
  title: string;
  date: string;
  location: string;
  createdBy: string;
  createdAt: number;
  status: 'active' | 'closed';
}

export interface AdminUser {
  id: string;
  name: string;
  pin: string;
  role: 'lgi_officer' | 'admin';
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

export type AppView = 'login' | 'scanner' | 'dashboard' | 'members' | 'generate-qr' | 'events';
