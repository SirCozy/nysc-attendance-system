import { useState } from 'react';
import { login } from '../lib/auth';

interface LoginProps {
  onLogin: (adminName: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!name.trim() || !pin.trim()) {
      setError('Please enter both username and PIN');
      setLoading(false);
      return;
    }

    if (pin.length < 4) {
      setError('PIN must be at least 4 digits');
      setLoading(false);
      return;
    }

    const session = await login(name, pin);
    if (session) {
      onLogin(session.adminName);
    } else {
      setError('Invalid credentials');
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">NYSC</div>
          <h1>Attendance System</h1>
          <p>LGI Officer Login</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="name">Username</label>
            <input
              id="name"
              type="text"
              className="input-field"
              placeholder="Enter username"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="pin">PIN</label>
            <input
              id="pin"
              type="password"
              className="input-field"
              placeholder="Enter 4-digit PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <p className="login-hint">Default: admin / 1234</p>
        </form>
      </div>
    </div>
  );
}
