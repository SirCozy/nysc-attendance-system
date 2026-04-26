import { useState, useEffect } from 'react';
import Header from './components/Header';
import Login from './pages/Login';
import ScanPage from './pages/ScanPage';
import Dashboard from './pages/Dashboard';
import MembersPage from './pages/MembersPage';
import EventsPage from './pages/EventsPage';
import GenerateQRPage from './pages/GenerateQRPage';
import { getSession, logout } from './lib/auth';
import { setupAutoSync } from './lib/sync';
import type { AppView } from './types';
import './App.css';

export default function App() {
  const [view, setView] = useState<AppView>('login');
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState<'admin' | 'member' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = getSession();
    if (session) {
      setUserName(session.userName);
      setUserRole(session.role);
      setView(session.role === 'admin' ? 'dashboard' : 'scanner');
    }
    setLoading(false);

    const cleanupSync = setupAutoSync();
    return cleanupSync;
  }, []);

  const handleLogin = (name: string, role: 'admin' | 'member') => {
    setUserName(name);
    setUserRole(role);
    setView(role === 'admin' ? 'dashboard' : 'scanner');
  };

  const handleLogout = () => {
    logout();
    setUserName('');
    setUserRole(null);
    setView('login');
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-logo">NYSC</div>
        <p>Loading...</p>
      </div>
    );
  }

  if (view === 'login') {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <Header
        currentView={view}
        onNavigate={setView}
        userName={userName}
        userRole={userRole}
        onLogout={handleLogout}
      />
      <main className="main-content">
        {view === 'dashboard' && userRole === 'admin' && <Dashboard />}
        {view === 'scanner' && <ScanPage />}
        {view === 'members' && userRole === 'admin' && <MembersPage />}
        {view === 'events' && userRole === 'admin' && <EventsPage />}
        {view === 'generate-qr' && userRole === 'admin' && <GenerateQRPage />}
      </main>
    </div>
  );
}
