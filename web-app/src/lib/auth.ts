import { addAdmin, getAdminByPin, getAllAdmins, getMemberByPin } from './db';
import type { AdminUser } from '../types';

const SESSION_KEY = 'nysc-session';
const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours

interface Session {
  userId: string;
  userName: string;
  role: 'admin' | 'member';
  expiresAt: number;
}

/**
 * Authenticate by PIN. Members log in with member PINs; admins use admin PIN.
 * If no admin exists yet, the first admin PIN is created on first login.
 */
export async function login(pin: string): Promise<Session | null> {
  const normalizedPin = pin.trim();

  if (!/^[0-9]{4,8}$/.test(normalizedPin)) {
    return null;
  }

  const member = await getMemberByPin(normalizedPin);
  if (member) {
    const currentYear = new Date().getFullYear();
    const parts = member.serviceYear.split('-');
    if (parts.length !== 2) {
      return null;
    }
    const startPart = parts[0] ?? '';
    const endPart = parts[1] ?? '';
    if (!startPart || !endPart) {
      return null;
    }
    const startYear = parseInt(startPart, 10);
    const endYear = parseInt(endPart, 10);
    if (Number.isNaN(startYear) || Number.isNaN(endYear)) {
      return null;
    }
    if (endYear < currentYear) {
      return null;
    }

    const session: Session = {
      userId: member.id,
      userName: member.fullName,
      role: 'member',
      expiresAt: Date.now() + SESSION_DURATION,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  const admin = await getAdminByPin(normalizedPin);
  if (admin) {
    const session: Session = {
      userId: admin.id,
      userName: 'Admin',
      role: 'admin',
      expiresAt: Date.now() + SESSION_DURATION,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  const admins = await getAllAdmins();
  if (admins.length === 0) {
    const newAdmin: AdminUser = {
      id: `admin-${Date.now()}`,
      pin: normalizedPin,
      role: 'admin',
      createdAt: Date.now(),
    };
    await addAdmin(newAdmin);

    const session: Session = {
      userId: newAdmin.id,
      userName: 'Admin',
      role: 'admin',
      expiresAt: Date.now() + SESSION_DURATION,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  return null;
}

/**
 * Get current session if valid.
 */
export function getSession(): Session | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    const session: Session = JSON.parse(raw);
    if (Date.now() > session.expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

/**
 * Clear the current session.
 */
export function logout(): void {
  localStorage.removeItem(SESSION_KEY);
}

/**
 * Simple input sanitization to prevent XSS.
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

/**
 * Validate state code format: XX/XXXX/XXXX
 */
export function validateStateCode(code: string): boolean {
  return /^[A-Z]{2}\/\d{2}[A-Z]\/\d{4}$/.test(code.toUpperCase());
}
