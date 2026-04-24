import { useState, useCallback, useEffect, useRef } from 'react';
import QRScanner from '../components/QRScanner';
import {
  getMember,
  addAttendance,
  updateAttendance,
  getAttendanceByMemberAndEvent,
  getActiveEvent,
  getAllMembers,
  addMember,
} from '../lib/db';
import { generateId, getDeviceId } from '../lib/sync';
import { generateShortCode } from '../utils/shortCode';
import type { Event } from '../types';

interface ScanResult {
  type: 'success' | 'duplicate' | 'error' | 'not-found' | 'debounced';
  message: string;
  memberName?: string;
  attendanceType?: 'IN' | 'OUT';
}

export default function ScanPage() {
  const [scanEnabled, setScanEnabled] = useState(true);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const [manualCode, setManualCode] = useState('');
  const lastScanTimes = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    loadActiveEvent();
  }, []);

  const loadActiveEvent = async () => {
    const event = await getActiveEvent();
    setActiveEvent(event ?? null);
  };

  const addResult = (result: ScanResult) => {
    setResults((prev) => [result, ...prev.slice(0, 19)]);
  };

  const processQRData = useCallback(
    async (qrData: string, method: 'qr' | 'manual' = 'qr') => {
      if (!activeEvent) {
        addResult({ type: 'error', message: 'No active event. Create one from the Events page.' });
        return;
      }

      // Decode QR to memberId (assume QR data is memberId)
      const memberId = qrData.trim();

      // Check debounce: prevent rapid scans for same member
      const now = Date.now();
      const lastScan = lastScanTimes.current.get(memberId);
      if (lastScan && now - lastScan < 5000) { // 5 seconds debounce
        addResult({ type: 'debounced', message: 'Please wait before scanning again.' });
        return;
      }

      // Look up member by ID
      const member = await getMember(memberId);
      if (!member) {
        addResult({ type: 'not-found', message: `Member not found: ${memberId}` });
        return;
      }

      // Get existing attendance record for this member and event
      const existing = await getAttendanceByMemberAndEvent(memberId, activeEvent.id);

      let attendanceStatus: 'IN' | 'OUT';
      if (!existing) {
        // First scan: check-in
        attendanceStatus = 'IN';
        await addAttendance({
          id: generateId(),
          memberId: member.id,
          memberName: member.fullName,
          stateCode: member.stateCode,
          eventId: activeEvent.id,
          checkInTime: now,
          checkOutTime: null,
          status: 'IN',
          method: method,
          synced: false,
          deviceId: getDeviceId(),
          shortCode: generateShortCode(6),
        });
      } else if (existing.status === 'IN') {
        // Second scan: check-out
        attendanceStatus = 'OUT';
        await updateAttendance({
          ...existing,
          checkOutTime: now,
          status: 'OUT',
        });
      } else {
        // Already checked out
        addResult({
          type: 'duplicate',
          message: `Already checked out: ${member.fullName}`,
          memberName: member.fullName,
        });
        return;
      }

      // Update last scan time
      lastScanTimes.current.set(memberId, now);

      setScanCount((prev) => prev + 1);
      addResult({
        type: 'success',
        message: `${attendanceStatus === 'IN' ? 'Checked in' : 'Checked out'}: ${member.fullName} (${member.stateCode})`,
        memberName: member.fullName,
        attendanceType: attendanceStatus,
      });
    },
    [activeEvent]
  );

  const handleManualCheckIn = async () => {
    if (!manualCode.trim()) return;
    await processQRData(manualCode.trim(), 'manual');
    setManualCode('');
  };

  const handleQuickRegisterAndScan = async () => {
    if (!activeEvent) {
      addResult({ type: 'error', message: 'No active event.' });
      return;
    }

    // Batch register some demo members
    const members = await getAllMembers();
    if (members.length === 0) {
      for (let i = 1; i <= 20; i++) {
        const code = `NYSC-2026-CDS-${i.toString().padStart(3, '0')}`;
        await addMember({
          id: code, // Use code as ID for demo
          stateCode: code,
          fullName: `Corps Member ${i}`,
          cdsGroup: 'Default CDS Group',
          phone: '',
          qrData: code,
          registeredAt: Date.now(),
        });
      }
      addResult({ type: 'success', message: 'Registered 20 demo members' });
    }
  };

  return (
    <div className="scan-page">
      <div className="page-header">
        <h2>QR Check-In</h2>
        {activeEvent ? (
          <span className="badge badge-success">{activeEvent.title}</span>
        ) : (
          <span className="badge badge-danger">No Active Event</span>
        )}
      </div>

      <div className="scan-stats">
        <div className="stat-card">
          <span className="stat-number">{scanCount}</span>
          <span className="stat-label">Scanned This Session</span>
        </div>
      </div>

      <div className="scan-controls">
        <button
          className={`btn ${scanEnabled ? 'btn-danger' : 'btn-primary'}`}
          onClick={() => setScanEnabled(!scanEnabled)}
        >
          {scanEnabled ? 'Stop Scanner' : 'Start Scanner'}
        </button>
        <button className="btn" onClick={handleQuickRegisterAndScan}>
          Load Demo Members
        </button>
      </div>

      <QRScanner onScan={processQRData} enabled={scanEnabled} />

      <div className="manual-entry">
        <h3>Manual Entry</h3>
        <div className="manual-form">
          <input
            type="text"
            className="input-field"
            placeholder="Enter member ID (e.g., NYSC-2026-CDS-001)"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleManualCheckIn()}
          />
          <button className="btn btn-primary" onClick={handleManualCheckIn}>
            Check In
          </button>
        </div>
      </div>

      <div className="scan-results">
        <h3>Recent Scans</h3>
        {results.length === 0 ? (
          <p className="empty-text">No scans yet. Point camera at a QR code.</p>
        ) : (
          <ul className="result-list">
            {results.map((result, index) => (
              <li key={index} className={`result-item result-${result.type} ${result.attendanceType ? `result-${result.attendanceType.toLowerCase()}` : ''}`}>
                <span className="result-icon">
                  {result.type === 'success' && '\u2713'}
                  {result.type === 'duplicate' && '\u26A0'}
                  {result.type === 'error' && '\u2717'}
                  {result.type === 'not-found' && '?'}
                  {result.type === 'debounced' && '\u23F3'}
                </span>
                <span className="result-message">
                  {result.attendanceType && <span className={`attendance-badge badge-${result.attendanceType.toLowerCase()}`}>{result.attendanceType}</span>}
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
