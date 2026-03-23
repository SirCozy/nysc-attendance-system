import { useState, useEffect } from 'react';
import { getAllEvents, addEvent, closeEvent, getActiveEvent, getAttendanceByEvent } from '../lib/db';
import { generateId } from '../lib/sync';
import { sanitizeInput } from '../lib/auth';
import type { Event } from '../types';

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);
  const [eventCounts, setEventCounts] = useState<Record<string, number>>({});
  const [form, setForm] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0] ?? '',
    location: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    const all = await getAllEvents();
    setEvents(all.sort((a, b) => b.createdAt - a.createdAt));

    const active = await getActiveEvent();
    setActiveEvent(active ?? null);

    const counts: Record<string, number> = {};
    for (const event of all) {
      const records = await getAttendanceByEvent(event.id);
      counts[event.id] = records.length;
    }
    setEventCounts(counts);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.title.trim()) {
      setError('Event title is required');
      return;
    }

    // Close any currently active event
    if (activeEvent) {
      await closeEvent(activeEvent.id);
    }

    const event: Event = {
      id: generateId(),
      title: sanitizeInput(form.title),
      date: form.date,
      location: sanitizeInput(form.location),
      createdBy: 'admin',
      createdAt: Date.now(),
      status: 'active',
    };

    await addEvent(event);
    setForm({ title: '', date: new Date().toISOString().split('T')[0] ?? '', location: '' });
    setShowForm(false);
    await loadEvents();
  };

  const handleClose = async (id: string) => {
    if (window.confirm('Close this event? No more check-ins will be accepted.')) {
      await closeEvent(id);
      await loadEvents();
    }
  };

  return (
    <div className="events-page">
      <div className="page-header">
        <h2>Events</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Event'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="event-form card">
          <h3>Create Event</h3>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-group">
            <label>Event Title *</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g., CDS Meeting - March 2026"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                className="input-field"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g., LGA Secretariat"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>
          </div>
          <p className="form-hint">Creating a new event will close the current active event.</p>
          <button type="submit" className="btn btn-primary">
            Create Event
          </button>
        </form>
      )}

      <div className="events-list">
        {events.map((event) => (
          <div key={event.id} className={`event-card card ${event.status === 'active' ? 'event-active' : ''}`}>
            <div className="event-info">
              <div className="event-title-row">
                <strong>{event.title}</strong>
                <span className={`badge ${event.status === 'active' ? 'badge-success' : 'badge-muted'}`}>
                  {event.status === 'active' ? 'Active' : 'Closed'}
                </span>
              </div>
              <div className="event-details">
                <span>{event.date}</span>
                {event.location && <span> &bull; {event.location}</span>}
                <span> &bull; {eventCounts[event.id] ?? 0} check-ins</span>
              </div>
            </div>
            {event.status === 'active' && (
              <div className="event-actions">
                <button className="btn btn-sm btn-danger" onClick={() => handleClose(event.id)}>
                  Close Event
                </button>
              </div>
            )}
          </div>
        ))}
        {events.length === 0 && (
          <p className="empty-text">No events yet. Create your first event to start taking attendance.</p>
        )}
      </div>
    </div>
  );
}
