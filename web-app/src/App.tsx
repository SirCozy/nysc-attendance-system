import { useState, useEffect } from 'react';
import Header from './components/Header';
import Landing from './pages/Landing';
import Login from './pages/Login';
import MemberLogin from './pages/MemberLogin';
import MemberSignup from './pages/MemberSignup';
import ScanPage from './pages/ScanPage';
import Dashboard from './pages/Dashboard';
import MemberDashboard from './pages/MemberDashboard';
import MembersPage from './pages/MembersPage';
import EventsPage from './pages/EventsPage';
import GenerateQRPage from './pages/GenerateQRPage';
import { getSession, logout } from './lib/auth';
import { setupAutoSync } from './lib/sync';
import type { AppView } from './types';
import './App.css';

export default function App() {
  const [view, setView] = useState<AppView>('landing');
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState<'admin' | 'member' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = getSession();
    if (session) {
      setUserName(session.userName);
      setUserRole(session.role);
      // Members go to member-dashboard, admins to dashboard
      setView(session.role === 'admin' ? 'dashboard' : 'member-dashboard');
    } else {
      // No session - go to landing page
      setView('landing');
    }
    setLoading(false);

    const cleanupSync = setupAutoSync();
    return cleanupSync;
  }, []);

  const handleLogin = (name: string, role: 'admin' | 'member') => {
    setUserName(name);
    setUserRole(role);
    // Members go to member-dashboard, admins to dashboard
    setView(role === 'admin' ? 'dashboard' : 'member-dashboard');
  };

  const handleLogout = () => {
    logout();
    setUserName('');
    setUserRole(null);
    setView('landing');
  };

  const handleNavigate = (newView: AppView) => {
    // Access control: members can't access admin-only views
    if (userRole === 'member') {
      // Members can only access: scanner, member-dashboard, and they can logout via header
      if (['dashboard', 'members', 'events', 'generate-qr'].includes(newView)) {
        return; // Prevent navigation
      }
    }

    // Access control: admins can't access member-only views
    if (userRole === 'admin') {
      // Admins can't access member-dashboard
      if (newView === 'member-dashboard') {
        return; // Prevent navigation
      }
    }

    setView(newView);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-logo">NYSC</div>
        <p>Loading...</p>
      </div>
    );
  }

  // Show appropriate login page based on view
  if (view === 'landing') {
    return <Landing onNavigate={handleNavigate} />;
  }

  if (view === 'login') {
    return <Login onLogin={handleLogin} />;
  }

  if (view === 'member-login') {
    return (
      <MemberLogin
        onLogin={handleLogin}
        onBackToLanding={() => setView('landing')}
      />
    );
  }

  if (view === 'member-signup') {
    return (
      <MemberSignup
        onSignupComplete={() => setView('member-login')}
        onBackToLanding={() => setView('landing')}
      />
    );
  }

  // For logged-in views, show header and main content
  return (
    <div className="app">
      <Header
        currentView={view}
        onNavigate={handleNavigate}
        userName={userName}
        userRole={userRole}
        onLogout={handleLogout}
      />
      <main className="main-content">
        {/* Admin views */}
        {view === 'dashboard' && userRole === 'admin' && <Dashboard />}
        {view === 'members' && userRole === 'admin' && <MembersPage />}
        {view === 'events' && userRole === 'admin' && <EventsPage />}
        {view === 'generate-qr' && userRole === 'admin' && <GenerateQRPage />}

        {/* Member views */}
        {view === 'member-dashboard' && userRole === 'member' && (
          <MemberDashboard onNavigate={handleNavigate} />
        )}
        {view === 'scanner' && <ScanPage />}
      </main>
    </div>
  );
}
