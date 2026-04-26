import { useState, useEffect } from 'react';
import QRGenerator from '../components/QRGenerator';
import { getActiveEvent } from '../lib/db';
import type { Event } from '../types';

export default function GenerateQRPage() {
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);

  useEffect(() => {
    loadActiveEvent();
  }, []);

  const loadActiveEvent = async () => {
    const event = await getActiveEvent();
    setActiveEvent(event ?? null);
  };

  return (
    <div className="generate-qr-page">
      <div className="page-header">
        <h2>Event QR Code</h2>
      </div>

      {activeEvent ? (
        <div className="qr-card-wrapper">
          <p className="text-muted">Scan this QR code to record attendance for the active event.</p>
          <QRGenerator
            data={activeEvent.qrData}
            size={260}
            label={`${activeEvent.title}\n${activeEvent.date} ${activeEvent.time}`}
          />
        </div>
      ) : (
        <div className="empty-state card">
          <p>No active event found. Create or activate an event in the Events page.</p>
        </div>
      )}
    </div>
  );
}
