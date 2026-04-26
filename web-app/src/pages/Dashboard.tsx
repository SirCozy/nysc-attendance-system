import { useState, useEffect } from 'react';
import AttendanceGrid from '../components/AttendanceGrid';
import SyncStatus from '../components/SyncStatus';
import { getStats, getActiveEvent, getAttendanceByEvent, getAllMembers, getAllAttendance, getAllEvents, activateEvent } from '../lib/db';
import { exportToCSV, downloadCSV, syncAttendance } from '../lib/sync';
import type { AttendanceRecord, Member, Event } from '../types';

export default function Dashboard() {
  const [stats, setStats] = useState({ totalMembers: 0, inCount: 0, outCount: 0 });
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadData();
    // Auto-refresh every 5 seconds
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [refreshKey]);

  const loadData = async () => {
    const allEvents = await getAllEvents();
    setEvents(allEvents.sort((a, b) => b.createdAt - a.createdAt));

    const event = await getActiveEvent();
    setActiveEvent(event ?? null);

    const allMembers = await getAllMembers();
    setMembers(allMembers);

    const attendance = event ? await getAttendanceByEvent(event.id) : await getAllAttendance();
    setRecords(attendance);

    const currentStats = await getStats(event?.id);
    setStats(currentStats);
  };

  const handleSelectEvent = async (id: string) => {
    if (!id) return;
    await activateEvent(id);
    setRefreshKey((k) => k + 1);
  };

  const handleExport = () => {
    const data = records.map((r) => ({
      memberName: r.memberName,
      stateCode: r.stateCode,
      timestamp: r.timestamp,
      status: r.type,
    }));
    const csv = exportToCSV(data);
    const eventName = activeEvent?.title ?? 'attendance';
    const date = new Date().toISOString().split('T')[0];
    downloadCSV(csv, `${eventName}-${date}.csv`);
  };

  const handleSync = async () => {
    setSyncing(true);
    await syncAttendance();
    setSyncing(false);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h2>Dashboard</h2>
        <div className="header-actions">
          <button className="btn btn-sm" onClick={() => setRefreshKey((k) => k + 1)}>
            Refresh
          </button>
          <button className="btn btn-sm" onClick={handleSync} disabled={syncing}>
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </div>

      <SyncStatus />

      <div className="event-selector card">
        <label htmlFor="active-event">Active Event</label>
        <select
          id="active-event"
          className="input-field"
          value={activeEvent?.id ?? ''}
          onChange={(e) => handleSelectEvent(e.target.value)}
        >
          <option value="">Select active event</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.title} — {event.date} {event.time ? `@ ${event.time}` : ''} ({event.status === 'ACTIVE' ? 'Active' : 'Ended'})
            </option>
          ))}
        </select>
      </div>

      {activeEvent && (
        <div className="event-banner">
          <strong>{activeEvent.title}</strong> &mdash; {activeEvent.date} @ {activeEvent.time} {activeEvent.location}
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-number">{stats.totalMembers}</span>
          <span className="stat-label">Total Members</span>
        </div>
        <div className="stat-card stat-success">
          <span className="stat-number">{stats.inCount}</span>
          <span className="stat-label">IN Count</span>
        </div>
        <div className="stat-card stat-danger">
          <span className="stat-number">{stats.outCount}</span>
          <span className="stat-label">OUT Count</span>
        </div>
      </div>

      <AttendanceGrid records={records} members={members} onExport={handleExport} />
    </div>
  );
}
