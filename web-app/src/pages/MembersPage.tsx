import { useState, useEffect } from 'react';
import { getAllMembers, addMember, deleteMember } from '../lib/db';
import { generateId } from '../lib/sync';
import type { Member } from '../types';

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    fullName: '',
    stateCode: '',
    cdsGroup: '',
    phone: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    const all = await getAllMembers();
    setMembers(all);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.fullName.trim() || !form.stateCode.trim()) {
      setError('Name and State Code are required');
      return;
    }

    // Check for duplicate state code
    const existing = members.find(
      (m) => m.stateCode.toLowerCase() === form.stateCode.trim().toLowerCase()
    );
    if (existing) {
      setError('A member with this state code already exists');
      return;
    }

    const qrData = `NYSC-${form.stateCode.trim().replace(/\//g, '-')}`;
    const member: Member = {
      id: generateId(),
      fullName: form.fullName.trim(),
      stateCode: form.stateCode.trim().toUpperCase(),
      cdsGroup: form.cdsGroup.trim(),
      phone: form.phone.trim(),
      qrData,
      registeredAt: Date.now(),
    };

    await addMember(member);
    setForm({ fullName: '', stateCode: '', cdsGroup: '', phone: '' });
    setShowForm(false);
    await loadMembers();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Remove this member?')) {
      await deleteMember(id);
      await loadMembers();
    }
  };

  const filteredMembers = members.filter(
    (m) =>
      m.fullName.toLowerCase().includes(search.toLowerCase()) ||
      m.stateCode.toLowerCase().includes(search.toLowerCase()) ||
      m.cdsGroup.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="members-page">
      <div className="page-header">
        <h2>Corps Members ({members.length})</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Member'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="member-form card">
          <h3>Register New Member</h3>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-row">
            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g., John Doe"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>State Code *</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g., LA/22A/1234"
                value={form.stateCode}
                onChange={(e) => setForm({ ...form, stateCode: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>CDS Group</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g., Health CDS"
                value={form.cdsGroup}
                onChange={(e) => setForm({ ...form, cdsGroup: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input
                type="tel"
                className="input-field"
                placeholder="e.g., 08012345678"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary">
            Register Member
          </button>
        </form>
      )}

      <div className="search-bar">
        <input
          type="text"
          className="input-field"
          placeholder="Search members..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="members-list">
        {filteredMembers.map((member) => (
          <div key={member.id} className="member-card card">
            <div className="member-info">
              <strong>{member.fullName}</strong>
              <span className="mono">{member.stateCode}</span>
              {member.cdsGroup && <span className="text-muted">{member.cdsGroup}</span>}
            </div>
            <div className="member-actions">
              <button
                className="btn btn-sm btn-danger"
                onClick={() => handleDelete(member.id)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
        {filteredMembers.length === 0 && (
          <p className="empty-text">
            {search ? 'No members match your search' : 'No members registered yet'}
          </p>
        )}
      </div>
    </div>
  );
}
