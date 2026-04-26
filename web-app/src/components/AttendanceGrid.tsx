import { useState } from 'react';
import type { AttendanceRecord, Member } from '../types';

interface AttendanceGridProps {
  records: AttendanceRecord[];
  members: Member[];
  onExport: () => void;
}

export default function AttendanceGrid({ records, members, onExport }: AttendanceGridProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'present' | 'absent'>('all');

  const latestRecordByMember = new Map<string, AttendanceRecord>();
  records
    .slice()
    .sort((a, b) => a.timestamp - b.timestamp)
    .forEach((record) => latestRecordByMember.set(record.memberId, record));

  const presentIds = new Set<string>(
    Array.from(latestRecordByMember.values())
      .filter((record) => record.type === 'CHECK-IN')
      .map((record) => record.memberId)
  );

  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.fullName.toLowerCase().includes(search.toLowerCase()) ||
      m.stateCode.toLowerCase().includes(search.toLowerCase());

    if (filter === 'present') return matchesSearch && presentIds.has(m.id);
    if (filter === 'absent') return matchesSearch && !presentIds.has(m.id);
    return matchesSearch;
  });

  const getLastTime = (memberId: string): string => {
    const record = latestRecordByMember.get(memberId);
    if (!record) return '-';
    return new Date(record.timestamp).toLocaleTimeString();
  };

  const getMemberStatus = (memberId: string): 'Present' | 'Absent' => {
    const record = latestRecordByMember.get(memberId);
    return record?.type === 'CHECK-IN' ? 'Present' : 'Absent';
  };

  return (
    <div className="attendance-grid">
      <div className="grid-controls">
        <input
          type="text"
          className="input-field"
          placeholder="Search name or state code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="filter-btns">
          <button
            className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({members.length})
          </button>
          <button
            className={`btn btn-sm ${filter === 'present' ? 'btn-success' : ''}`}
            onClick={() => setFilter('present')}
          >
            Present ({presentIds.size})
          </button>
          <button
            className={`btn btn-sm ${filter === 'absent' ? 'btn-danger' : ''}`}
            onClick={() => setFilter('absent')}
          >
            Absent ({members.length - presentIds.size})
          </button>
          <button className="btn btn-sm" onClick={onExport}>
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid-table-wrapper">
        <table className="grid-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>State Code</th>
              <th>Status</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.map((member, index) => {
              const isPresent = presentIds.has(member.id);
              return (
                <tr key={member.id} className={isPresent ? 'row-present' : 'row-absent'}>
                  <td>{index + 1}</td>
                  <td>{member.fullName}</td>
                  <td className="mono">{member.stateCode}</td>
                  <td>
                    <span className={`badge ${isPresent ? 'badge-success' : 'badge-danger'}`}>
                      {getMemberStatus(member.id)}
                    </span>
                  </td>
                  <td className="mono">{getLastTime(member.id)}</td>
                </tr>
              );
            })}
            {filteredMembers.length === 0 && (
              <tr>
                <td colSpan={5} className="empty-row">
                  No members found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
