import { useState, useEffect } from 'react';
import { isOnline } from '../lib/sync';
import { getUnsyncedAttendance } from '../lib/db';

export default function SyncStatus() {
  const [online, setOnline] = useState(isOnline());
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const checkPending = async () => {
      const unsynced = await getUnsyncedAttendance();
      setPendingCount(unsynced.length);
    };

    checkPending();
    const interval = setInterval(checkPending, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className={`sync-status ${online ? 'sync-online' : 'sync-offline'}`}>
      <span className={`status-dot ${online ? 'online' : 'offline'}`} />
      <span>{online ? 'Online' : 'Offline Mode'}</span>
      {pendingCount > 0 && (
        <span className="sync-pending">
          {pendingCount} record{pendingCount !== 1 ? 's' : ''} pending sync
        </span>
      )}
    </div>
  );
}
