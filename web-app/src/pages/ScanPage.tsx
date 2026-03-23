import { useState, useCallback, useEffect } from 'react';
import QRScanner from '../components/QRScanner';
import {
  getMemberByQR,
  addAttendance,
  checkDuplicateAttendance,
  getActiveEvent,
  getAllMembers,
  addMember,
} from '../lib/db';
import { generateId, getDeviceId } from '../lib/sync';
import type { Event } from '../types';

interface ScanResult {
  type: 'success' | 'duplicate' | 'error' | 'not-found';
  message: string;
  memberName?: string;
}

export default function ScanPage() {
  const [scanEnabled, setScanEnabled] = useState(true);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const [manualCode, setManualCode] = useState('');

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
    async (qrData: string) => {
      if (!activeEvent) {
        addResult({ type: 'error', message: 'No active event. Create one from the Events page.' });
        return;
      }

      // Validate QR format
      if (!qrData.startsWith('NYSC-')) {
        addResult({ type: 'error', message: `Invalid QR code format: ${qrData}` });
        return;
      }

      // Look up member
      let member = await getMemberByQR(qrData);

      // Auto-register if member not found (for quick setup)
      if (!member) {
        const parts = qrData.split('-');
        const memberNumber = parts[parts.length - 1] ?? qrData;
        member = {
          id: generateId(),
          stateCode: qrData,
          fullName: `Member ${memberNumber}`,
          cdsGroup: 'Default CDS',
          phone: '',
          qrData: qrData,
          registeredAt: Date.now(),
        };
        await addMember(member);
      }

      // Check for duplicate
      const isDuplicate = await checkDuplicateAttendance(member.id, activeEvent.id);
      if (isDuplicate) {
        addResult({
          type: 'duplicate',
          message: `Already checked in: ${member.fullName}`,
          memberName: member.fullName,
        });
        return;
      }

      // Record attendance
      await addAttendance({
        id: generateId(),
        memberId: member.id,
        memberName: member.fullName,
        stateCode: member.stateCode,
        eventId: activeEvent.id,
        checkInTime: Date.now(),
        method: 'qr',
        synced: false,
        deviceId: getDeviceId(),
      });

      setScanCount((prev) => prev + 1);
      addResult({
        type: 'success',
        message: `Checked in: ${member.fullName} (${member.stateCode})`,
        memberName: member.fullName,
      });
    },
    [activeEvent]
  );

  const handleManualCheckIn = async () => {
    if (!manualCode.trim()) return;
    await processQRData(manualCode.trim());
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
          id: generateId(),
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
            placeholder="Enter QR code data (e.g., NYSC-2026-CDS-001)"
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
              <li key={index} className={`result-item result-${result.type}`}>
                <span className="result-icon">
                  {result.type === 'success' && '\u2713'}
                  {result.type === 'duplicate' && '\u26A0'}
                  {result.type === 'error' && '\u2717'}
                  {result.type === 'not-found' && '?'}
                </span>
                <span className="result-message">{result.message}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
