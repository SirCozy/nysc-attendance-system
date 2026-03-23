import { useState, useEffect } from 'react';
import Header from './components/Header';
import Login from './pages/Login';
import ScanPage from './pages/ScanPage';
import Dashboard from './pages/Dashboard';
import MembersPage from './pages/MembersPage';
import EventsPage from './pages/EventsPage';
import GenerateQRPage from './pages/GenerateQRPage';
import { initAuth, getSession, logout } from './lib/auth';
import { setupAutoSync } from './lib/sync';
import type { AppView } from './types';
import './App.css';

export default function App() {
  const [view, setView] = useState<AppView>('login');
  const [adminName, setAdminName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      await initAuth();
      const session = getSession();
      if (session) {
        setAdminName(session.adminName);
        setView('dashboard');
      }
      setLoading(false);
    };
    init();

    const cleanupSync = setupAutoSync();
    return cleanupSync;
  }, []);

  const handleLogin = (name: string) => {
    setAdminName(name);
    setView('dashboard');
  };

  const handleLogout = () => {
    logout();
    setAdminName('');
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
        adminName={adminName}
        onLogout={handleLogout}
      />
      <main className="main-content">
        {view === 'dashboard' && <Dashboard />}
        {view === 'scanner' && <ScanPage />}
        {view === 'members' && <MembersPage />}
        {view === 'events' && <EventsPage />}
        {view === 'generate-qr' && <GenerateQRPage />}
      </main>
    </div>
  );
}
