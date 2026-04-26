import { addAdmin, getAdminByPin, getAllAdmins, getMemberByPin, getMemberByStateCode, addMember } from './db';
import type { AdminUser, Member } from '../types';

const SESSION_KEY = 'nysc-session';
const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours

interface Session {
  userId: string;
  userName: string;
  role: 'admin' | 'member';
  expiresAt: number;
}

/**
 * Sign up a new member.
 */
export async function memberSignup(
  fullName: string,
  stateCode: string,
  serviceYear: string,
  pin: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedPin = pin.trim();
    const normalizedStateCode = stateCode.trim().toUpperCase();
    const normalizedName = fullName.trim();

    // Validate PIN: 4-6 digits
    if (!/^[0-9]{4,6}$/.test(normalizedPin)) {
      return { success: false, error: 'PIN must be 4-6 digits' };
    }

    // Validate state code format
    if (!/^[A-Z]{2}\/\d{2}[A-Z]\/\d{4}$/.test(normalizedStateCode)) {
      return { success: false, error: 'Invalid state code format (e.g., AB/12X/1234)' };
    }

    // Validate name
    if (normalizedName.length < 2) {
      return { success: false, error: 'Name must be at least 2 characters' };
    }

    // Validate service year format (YYYY-YYYY)
    if (!/^\d{4}-\d{4}$/.test(serviceYear)) {
      return { success: false, error: 'Service year must be in format YYYY-YYYY' };
    }

    // Check if state code already exists
    const existingMember = await getMemberByStateCode(normalizedStateCode);
    if (existingMember) {
      return { success: false, error: 'State code already registered' };
    }

    // Check if PIN already exists
    const existingPin = await getMemberByPin(normalizedPin);
    if (existingPin) {
      return { success: false, error: 'PIN already in use' };
    }

    // Create new member
    const newMember: Member = {
      id: `member-${Date.now()}`,
      stateCode: normalizedStateCode,
      fullName: normalizedName,
      serviceYear: serviceYear,
      pin: normalizedPin,
      cdsGroup: '',
      phone: '',
      qrData: '',
      role: 'member',
      registeredAt: Date.now(),
    };

    await addMember(newMember);
    return { success: true };
  } catch (error) {
    console.error('Member signup failed:', error);
    return { success: false, error: 'Failed to create account. Please try again.' };
  }
}

/**
 * Member login using stateCode + PIN.
 */
export async function memberLogin(stateCode: string, pin: string): Promise<Session | null> {
  try {
    const normalizedStateCode = stateCode.trim().toUpperCase();
    const normalizedPin = pin.trim();

    // Validate PIN: 4-6 digits
    if (!/^[0-9]{4,6}$/.test(normalizedPin)) {
      return null;
    }

    // Get member by state code
    const member = await getMemberByStateCode(normalizedStateCode);
    if (!member) {
      return null;
    }

    // Check PIN matches
    if (member.pin !== normalizedPin) {
      return null;
    }

    // Validate service year hasn't expired
    const currentYear = new Date().getFullYear();
    const parts = member.serviceYear.split('-');
    if (parts.length !== 2) {
      return null;
    }
    const endPart = parts[1] ?? '';
    if (!endPart) {
      return null;
    }
    const endYear = parseInt(endPart, 10);
    if (Number.isNaN(endYear) || endYear < currentYear) {
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
  } catch (error) {
    console.error('Member login failed:', error);
    return null;
  }
}

/**
 * Admin login using PIN only.
 * If no admin exists yet, creates the first admin.
 */
export async function adminLogin(pin: string): Promise<Session | null> {
  const normalizedPin = pin.trim();

  if (!/^[0-9]{4,8}$/.test(normalizedPin)) {
    return null;
  }

  // Check if this PIN matches an existing admin
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

  // If no admins exist yet, create first admin
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
 * Legacy login function for backward compatibility.
 * Tries both member PIN and admin PIN.
 */
export async function login(pin: string): Promise<Session | null> {
  const normalizedPin = pin.trim();

  if (!/^[0-9]{4,8}$/.test(normalizedPin)) {
    return null;
  }

  // First try to login as member
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

  // Then try admin login
  return adminLogin(pin);
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
