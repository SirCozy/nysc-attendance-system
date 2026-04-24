import { useState, useEffect } from 'react';
import AttendanceGrid from '../components/AttendanceGrid';
import SyncStatus from '../components/SyncStatus';
import { getStats, getActiveEvent, getAttendanceByEvent, getAllMembers, getAllAttendance } from '../lib/db';
import { exportToCSV, downloadCSV, syncAttendance } from '../lib/sync';
import type { AttendanceRecord, Member, Event } from '../types';

export default function Dashboard() {
  const [stats, setStats] = useState({ totalMembers: 0, totalPresent: 0, totalAbsent: 0, attendanceRate: 0 });
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
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
    const event = await getActiveEvent();
    setActiveEvent(event ?? null);

    const allMembers = await getAllMembers();
    setMembers(allMembers);

    const attendance = event ? await getAttendanceByEvent(event.id) : await getAllAttendance();
    setRecords(attendance);

    const currentStats = await getStats(event?.id);
    setStats(currentStats);
  };

  const handleExport = () => {
    const data = records.map((r) => ({
      memberName: r.memberName,
      stateCode: r.stateCode,
      checkInTime: r.checkInTime,
      checkOutTime: r.checkOutTime,
      status: r.status,
      method: r.method,
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

      {activeEvent && (
        <div className="event-banner">
          <strong>{activeEvent.title}</strong> &mdash; {activeEvent.date} @ {activeEvent.location}
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-number">{stats.totalMembers}</span>
          <span className="stat-label">Total Members</span>
        </div>
        <div className="stat-card stat-success">
          <span className="stat-number">{stats.totalPresent}</span>
          <span className="stat-label">Present</span>
        </div>
        <div className="stat-card stat-danger">
          <span className="stat-number">{stats.totalAbsent}</span>
          <span className="stat-label">Absent</span>
        </div>
        <div className="stat-card stat-info">
          <span className="stat-number">{stats.attendanceRate}%</span>
          <span className="stat-label">Attendance Rate</span>
        </div>
      </div>

      <AttendanceGrid records={records} members={members} onExport={handleExport} />
    </div>
  );
}
