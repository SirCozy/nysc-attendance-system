import { useState, useEffect } from 'react';
import QRGenerator from '../components/QRGenerator';
import { getAllMembers } from '../lib/db';
import type { CorpsMember } from '../types';

export default function GenerateQRPage() {
  const [members, setMembers] = useState<CorpsMember[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [batchStartInput, setBatchStartInput] = useState('1');
  const [batchEndInput, setBatchEndInput] = useState('20');
  const [mode, setMode] = useState<'members' | 'batch'>('batch');

  const batchStart = Math.max(1, Math.min(999, parseInt(batchStartInput, 10) || 1));
  const batchEnd = Math.max(1, Math.min(999, parseInt(batchEndInput, 10) || 20));

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    const all = await getAllMembers();
    setMembers(all);
  };

  const toggleMember = (id: string) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedMembers.length === members.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(members.map((m) => m.id));
    }
  };

  const batchCodes = [];
  for (let i = batchStart; i <= batchEnd && i <= 999; i++) {
    batchCodes.push(`NYSC-2026-CDS-${i.toString().padStart(3, '0')}`);
  }

  return (
    <div className="generate-qr-page">
      <div className="page-header">
        <h2>Generate QR Codes</h2>
      </div>

      <div className="mode-toggle">
        <button
          className={`btn btn-sm ${mode === 'batch' ? 'btn-primary' : ''}`}
          onClick={() => setMode('batch')}
        >
          Batch Generate
        </button>
        <button
          className={`btn btn-sm ${mode === 'members' ? 'btn-primary' : ''}`}
          onClick={() => setMode('members')}
        >
          From Members
        </button>
      </div>

      {mode === 'batch' && (
        <div className="batch-controls card">
          <h3>Batch QR Generation</h3>
          <p className="text-muted">Generate QR codes for a range of member numbers.</p>
          <div className="form-row">
            <div className="form-group">
              <label>Start Number</label>
              <input
                type="text"
                inputMode="numeric"
                className="input-field"
                value={batchStartInput}
                onChange={(e) => {
                  const next = e.target.value;
                  if (/^\d*$/.test(next)) {
                    setBatchStartInput(next);
                  }
                }}
                onBlur={() => {
                  const normalized = batchStartInput.replace(/^0+/, '') || '1';
                  setBatchStartInput(String(Math.max(1, Math.min(999, parseInt(normalized, 10)))));
                }}
              />
            </div>
            <div className="form-group">
              <label>End Number</label>
              <input
                type="text"
                inputMode="numeric"
                className="input-field"
                value={batchEndInput}
                onChange={(e) => {
                  const next = e.target.value;
                  if (/^\d*$/.test(next)) {
                    setBatchEndInput(next);
                  }
                }}
                onBlur={() => {
                  const normalized = batchEndInput.replace(/^0+/, '') || '20';
                  setBatchEndInput(String(Math.max(1, Math.min(999, parseInt(normalized, 10)))));
                }}
              />
            </div>
          </div>
          <p className="text-muted">Generating {batchCodes.length} QR codes</p>
        </div>
      )}

      {mode === 'members' && (
        <div className="member-select card">
          <div className="select-header">
            <h3>Select Members</h3>
            <button className="btn btn-sm" onClick={selectAll}>
              {selectedMembers.length === members.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          {members.length === 0 ? (
            <p className="empty-text">No members registered. Add members first.</p>
          ) : (
            <div className="member-checklist">
              {members.map((member) => (
                <label key={member.id} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(member.id)}
                    onChange={() => toggleMember(member.id)}
                  />
                  <span>
                    {member.fullName} ({member.stateCode})
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="qr-grid">
        {mode === 'batch' &&
          batchCodes.map((code) => (
            <QRGenerator key={code} data={code} size={180} label={code} />
          ))}
        {mode === 'members' &&
          members
            .filter((m) => selectedMembers.includes(m.id))
            .map((member) => (
              <QRGenerator
                key={member.id}
                data={member.qrData}
                size={180}
                label={`${member.fullName}\n${member.stateCode}`}
              />
            ))}
      </div>
    </div>
  );
}
