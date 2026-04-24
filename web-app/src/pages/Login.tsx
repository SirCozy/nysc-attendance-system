import { useState, useEffect } from 'react';
import { login } from '../lib/auth';

interface LoginProps {
  onLogin: (adminName: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasStoredPin, setHasStoredPin] = useState(false);

  useEffect(() => {
    setHasStoredPin(Boolean(localStorage.getItem('admin_pin')));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const trimmedPin = pin.trim();
    if (!/^[0-9]+$/.test(trimmedPin)) {
      setError('PIN must contain only numbers');
      setLoading(false);
      return;
    }

    if (trimmedPin.length < 4 || trimmedPin.length > 8) {
      setError('PIN must be 4 to 8 digits');
      setLoading(false);
      return;
    }

    if (!hasStoredPin && !name.trim()) {
      setError('Please enter a username');
      setLoading(false);
      return;
    }

    const session = await login(name.trim() || 'Admin', trimmedPin);
    if (session) {
      onLogin(session.adminName);
    } else {
      setError(hasStoredPin ? 'Wrong PIN' : 'Unable to set PIN');
    }
    setLoading(false);
  };

  const handleResetPin = () => {
    localStorage.removeItem('admin_pin');
    setHasStoredPin(false);
    setError('PIN reset. Please set a new PIN.');
    setPin('');
    setName('');
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

          {!hasStoredPin && (
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
          )}

          <div className="form-group">
            <label htmlFor="pin">PIN</label>
            <input
              id="pin"
              type="password"
              className="input-field"
              placeholder="Enter 4-8 digit PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Signing in...' : hasStoredPin ? 'Sign In' : 'Set PIN & Sign In'}
          </button>

          {hasStoredPin && (
            <button
              type="button"
              className="btn btn-secondary btn-full"
              onClick={handleResetPin}
            >
              Reset PIN
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
