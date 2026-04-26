import { useState, useCallback, useEffect } from 'react';
import QRScanner from '../components/QRScanner';
import {
  getMember,
  addAttendance,
  updateMember,
  getLatestAttendanceForMemberEvent,
  getActiveEvent,
} from '../lib/db';
import { getDeviceId, generateId } from '../lib/sync';
import { getSession } from '../lib/auth';
import type { Event } from '../types';

interface ScanResult {
  type: 'success' | 'duplicate' | 'error' | 'not-found' | 'debounced';
  message: string;
  attendanceType?: 'CHECK-IN' | 'CHECK-OUT';
}

export default function ScanPage() {
  const [scanEnabled, setScanEnabled] = useState(true);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const [memberStatus, setMemberStatus] = useState<{
    status: 'IN' | 'OUT' | 'NONE';
    lastScan?: number;
  } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>('');

  useEffect(() => {
    loadActiveEvent();
    loadSession();
  }, []);

  useEffect(() => {
    if (currentUserId && activeEvent) {
      refreshMemberStatus(currentUserId, activeEvent.id);
    }
  }, [currentUserId, activeEvent]);

  const loadSession = () => {
    const session = getSession();
    if (session && session.role === 'member') {
      setCurrentUserId(session.userId);
      setCurrentUserName(session.userName);
    } else {
      setCurrentUserId(null);
      setCurrentUserName('');
    }
  };

  const loadActiveEvent = async () => {
    const event = await getActiveEvent();
    setActiveEvent(event ?? null);
  };

  const refreshMemberStatus = async (memberId: string, eventId: string) => {
    const latest = await getLatestAttendanceForMemberEvent(memberId, eventId);
    if (!latest) {
      setMemberStatus({ status: 'NONE' });
      return;
    }

    setMemberStatus({
      status: latest.type === 'CHECK-IN' ? 'IN' : 'OUT',
      lastScan: latest.timestamp,
    });
  };

  const addResult = (result: ScanResult) => {
    setResults((prev) => [result, ...prev.slice(0, 19)]);
  };

  const processQRData = useCallback(
    async (qrData: string) => {
      const session = getSession();
      if (!session || session.role !== 'member') {
        addResult({ type: 'error', message: 'Attendance scanning requires a member session.' });
        return;
      }

      if (!activeEvent) {
        addResult({ type: 'error', message: 'No active event. Create one from the Events page.' });
        return;
      }

      const trimmed = qrData.trim();
      if (trimmed !== activeEvent.qrData) {
        addResult({ type: 'error', message: 'Invalid event QR code.' });
        return;
      }

      const member = await getMember(session.userId);
      if (!member) {
        addResult({ type: 'not-found', message: 'Member record not found.' });
        return;
      }

      const now = Date.now();
      const lastScan = member.lastScanTime ?? 0;
      if (now - lastScan < 30000) {
        addResult({ type: 'debounced', message: 'Please wait at least 30 seconds between scans.' });
        return;
      }

      const latest = await getLatestAttendanceForMemberEvent(member.id, activeEvent.id);
      if (!latest) {
        await addAttendance({
          id: generateId(),
          memberId: member.id,
          memberName: member.fullName,
          stateCode: member.stateCode,
          eventId: activeEvent.id,
          timestamp: now,
          type: 'CHECK-IN',
          synced: false,
          deviceId: getDeviceId(),
        });
        await updateMember({ ...member, lastScanTime: now });
        setScanCount((prev) => prev + 1);
        addResult({ type: 'success', message: `Checked in: ${member.fullName}`, attendanceType: 'CHECK-IN' });
      } else if (latest.type === 'CHECK-IN') {
        // Transition to CHECK-OUT (session still open)
        await addAttendance({
          id: generateId(),
          memberId: member.id,
          memberName: member.fullName,
          stateCode: member.stateCode,
          eventId: activeEvent.id,
          timestamp: now,
          type: 'CHECK-OUT',
          synced: false,
          deviceId: getDeviceId(),
        });
        await updateMember({ ...member, lastScanTime: now });
        setScanCount((prev) => prev + 1);
        addResult({ type: 'success', message: `Checked out: ${member.fullName}`, attendanceType: 'CHECK-OUT' });
      } else if (latest.type === 'CHECK-OUT') {
        // Session already completed - no further scans allowed
        addResult({ type: 'duplicate', message: `Session already completed for this event.` });
        return;
      }

      refreshMemberStatus(member.id, activeEvent.id);
    },
    [activeEvent]
  );

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleTimeString();
  };

  const getStatusText = () => {
    if (!currentUserId) {
      return 'Please log in with a member PIN to scan attendance.';
    }
    if (!activeEvent) {
      return 'No active event. Please ask an admin to create one.';
    }
    if (!memberStatus) {
      return 'Loading your attendance status...';
    }
    if (memberStatus.status === 'NONE') {
      return 'You have not scanned in for the current event yet.';
    }
    return `Last status: ${memberStatus.status} at ${formatTime(memberStatus.lastScan)}`;
  };

  return (
    <div className="scan-page">
      <div className="page-header">
        <h2>Attendance Scan</h2>
        {activeEvent ? (
          <span className="badge badge-success">{activeEvent.title}</span>
        ) : (
          <span className="badge badge-danger">No Active Event</span>
        )}
      </div>

      <div className="scan-summary">
        <div className="stat-card">
          <span className="stat-label">Member</span>
          <span className="stat-number">{currentUserName || 'Guest'}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Current Event</span>
          <span className="stat-number">{activeEvent?.title ?? 'None'}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Status</span>
          <span className="stat-number">{getStatusText()}</span>
        </div>
      </div>

      <div className="scan-stats">
        <div className="stat-card">
          <span className="stat-number">{scanCount}</span>
          <span className="stat-label">Valid Scans</span>
        </div>
      </div>

      <div className="scan-controls">
        <button
          className={`btn ${scanEnabled ? 'btn-danger' : 'btn-primary'}`}
          onClick={() => setScanEnabled(!scanEnabled)}
        >
          {scanEnabled ? 'Stop Scanner' : 'Start Scanner'}
        </button>
      </div>

      <QRScanner onScan={processQRData} enabled={scanEnabled} />

      <div className="scan-results">
        <h3>Recent Scan Events</h3>
        {results.length === 0 ? (
          <p className="empty-text">No scans yet. Scan the active event QR code to record attendance.</p>
        ) : (
          <ul className="result-list">
            {results.map((result, index) => (
              <li
                key={index}
                className={`result-item result-${result.type} ${result.attendanceType ? `result-${result.attendanceType.toLowerCase()}` : ''}`}
              >
                <span className="result-icon">
                  {result.type === 'success' && '✓'}
                  {result.type === 'duplicate' && '⚠'}
                  {result.type === 'error' && '✕'}
                  {result.type === 'not-found' && '?'}
                  {result.type === 'debounced' && '⏳'}
                </span>
                <span className="result-message">
                  {result.attendanceType && (
                    <span className={`attendance-badge badge-${result.attendanceType === 'CHECK-IN' ? 'success' : 'warning'}`}>
                      {result.attendanceType.replace('CHECK-', '')}
                    </span>
                  )}
                  {result.message}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
