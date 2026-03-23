import { getAdminByName, seedDefaultAdmin } from './db';
import type { AdminUser } from '../types';

const SESSION_KEY = 'nysc-session';
const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours

interface Session {
  adminId: string;
  adminName: string;
  role: AdminUser['role'];
  expiresAt: number;
}

/**
 * Initialize auth - seed default admin if needed.
 */
export async function initAuth(): Promise<void> {
  await seedDefaultAdmin();
}

/**
 * Authenticate an admin by name and PIN.
 */
export async function login(name: string, pin: string): Promise<Session | null> {
  const admin = await getAdminByName(name.toLowerCase().trim());

  if (!admin || admin.pin !== pin) {
    return null;
  }

  const session: Session = {
    adminId: admin.id,
    adminName: admin.name,
    role: admin.role,
    expiresAt: Date.now() + SESSION_DURATION,
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
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
