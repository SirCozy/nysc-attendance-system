import { useState, useEffect } from 'react';
import { getMember, getLatestAttendanceForMemberEvent, getActiveEvent } from '../lib/db';
import { getSession } from '../lib/auth';
import type { Member, Event, AttendanceRecord } from '../types';

interface MemberDashboardProps {
  onNavigate: (view: string) => void;
}

export default function MemberDashboard({ onNavigate }: MemberDashboardProps) {
  const [member, setMember] = useState<Member | null>(null);
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);
  const [latestAttendance, setLatestAttendance] = useState<AttendanceRecord | null>(null);
  const [status, setStatus] = useState<'IN' | 'OUT' | 'NOT_SET'>('NOT_SET');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMemberData();
    const interval = setInterval(loadMemberData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadMemberData = async () => {
    try {
      const session = getSession();
      if (!session) {
        return;
      }

      const memberData = await getMember(session.userId);
      if (memberData) {
        setMember(memberData);
      }

      const event = await getActiveEvent();
      setActiveEvent(event ?? null);

      if (memberData && event) {
        const attendance = await getLatestAttendanceForMemberEvent(memberData.id, event.id);
        if (attendance) {
          setLatestAttendance(attendance);
          setStatus(attendance.type === 'CHECK-IN' ? 'IN' : 'OUT');
        } else {
          setStatus('NOT_SET');
          setLatestAttendance(null);
        }
      }
    } catch (error) {
      console.error('Error loading member data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <p>Loading...</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="dashboard-page">
        <p>Member data not found</p>
      </div>
    );
  }

  const getStatusColor = () => {
    switch (status) {
      case 'IN':
        return '#10b981';
      case 'OUT':
        return '#ef4444';
      default:
        return '#9ca3af';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'IN':
        return 'CHECKED IN';
      case 'OUT':
        return 'CHECKED OUT';
      default:
        return 'NO STATUS';
    }
  };

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h2>Dashboard</h2>
      </div>

      <div className="member-info-card card">
        <div className="member-info-section">
          <div className="info-row">
            <label>Name</label>
            <span className="info-value">{member.fullName}</span>
          </div>
          <div className="info-row">
            <label>State Code</label>
            <span className="info-value">{member.stateCode}</span>
          </div>
          <div className="info-row">
            <label>Service Year</label>
            <span className="info-value">{member.serviceYear}</span>
          </div>
        </div>

        <div className="status-section">
          <div className="status-badge" style={{ backgroundColor: getStatusColor() }}>
            {getStatusText()}
          </div>
          {latestAttendance && (
            <p className="status-time">
              {new Date(latestAttendance.timestamp).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {activeEvent ? (
        <div className="event-info card">
          <h3>Current Event</h3>
          <p className="event-title">{activeEvent.title}</p>
          <p className="event-date">
            {activeEvent.date} {activeEvent.time ? `@ ${activeEvent.time}` : ''}
          </p>
          {activeEvent.location && <p className="event-location">📍 {activeEvent.location}</p>}
        </div>
      ) : (
        <div className="event-info card no-event">
          <p>No active event at the moment</p>
        </div>
      )}

      <button className="btn btn-primary btn-full" onClick={() => onNavigate('scanner')}>
        Scan QR Code
      </button>

      <style>{`
        .member-info-card {
          margin-bottom: 1.5rem;
          padding: 1.5rem;
        }

        .member-info-section {
          margin-bottom: 1.5rem;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 0;
          border-bottom: 1px solid #e5e7eb;
        }

        .info-row:last-child {
          border-bottom: none;
        }

        .info-row label {
          font-weight: 600;
          color: #374151;
        }

        .info-value {
          color: #1f2937;
          font-size: 1rem;
        }

        .status-section {
          text-align: center;
          padding-top: 1rem;
        }

        .status-badge {
          display: inline-block;
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          font-weight: 700;
          font-size: 1.1rem;
          margin-bottom: 0.5rem;
        }

        .status-time {
          color: #6b7280;
          font-size: 0.9rem;
          margin: 0.5rem 0 0 0;
        }

        .event-info {
          margin-bottom: 1.5rem;
          padding: 1.5rem;
          background: #f3f4f6;
        }

        .event-info h3 {
          margin: 0 0 1rem 0;
          color: #1f2937;
        }

        .event-title {
          font-size: 1.2rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0.5rem 0;
        }

        .event-date {
          color: #6b7280;
          margin: 0.25rem 0;
        }

        .event-location {
          color: #6b7280;
          margin: 0.25rem 0;
        }

        .event-info.no-event {
          text-align: center;
          color: #9ca3af;
          padding: 2rem 1.5rem;
        }
      `}</style>
    </div>
  );
}
