import { type AppView } from '../types';
import { isOnline } from '../lib/sync';
import { useState, useEffect } from 'react';

interface HeaderProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  userName: string;
  userRole: 'admin' | 'member' | null;
  onLogout: () => void;
}

export default function Header({ currentView, onNavigate, userName, userRole, onLogout }: HeaderProps) {
  const [online, setOnline] = useState(isOnline());
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const navItems: { view: AppView; label: string }[] = userRole === 'admin' ? [
    { view: 'dashboard', label: 'Dashboard' },
    { view: 'scanner', label: 'Scan QR' },
    { view: 'members', label: 'Members' },
    { view: 'events', label: 'Events' },
    { view: 'generate-qr', label: 'Generate QR' },
  ] : userRole === 'member' ? [
    { view: 'member-dashboard', label: 'Dashboard' },
    { view: 'scanner', label: 'Scan QR' },
  ] : [];

  const handleHomeClick = () => {
    if (userRole === 'admin') {
      onNavigate('dashboard');
    } else if (userRole === 'member') {
      onNavigate('member-dashboard');
    }
  };

  return (
    <header className="header">
      <div className="header-top">
        <div className="header-brand" onClick={handleHomeClick}>
          <span className="header-logo">NYSC</span>
          <span className="header-title">Attendance</span>
        </div>
        <div className="header-right">
          <span className={`status-dot ${online ? 'online' : 'offline'}`} />
          <span className="status-text">{online ? 'Online' : 'Offline'}</span>
          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? '\u2715' : '\u2630'}
          </button>
        </div>
      </div>
      <nav className={`header-nav ${menuOpen ? 'open' : ''}`}>
        {navItems.map((item) => (
          <button
            key={item.view}
            className={`nav-btn ${currentView === item.view ? 'active' : ''}`}
            onClick={() => {
              onNavigate(item.view);
              setMenuOpen(false);
            }}
          >
            {item.label}
          </button>
        ))}
        <div className="nav-user">
          <span className="nav-user-name">{userName}</span>
          <button className="nav-btn logout-btn" onClick={onLogout}>
            Logout
          </button>
        </div>
      </nav>
    </header>
  );
}
