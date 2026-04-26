import { useState } from 'react';
import { login } from '../lib/auth';

interface LoginProps {
  onLogin: (userName: string, role: 'admin' | 'member') => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

    const session = await login(trimmedPin);
    if (session) {
      onLogin(session.userName, session.role);
    } else {
      setError('Invalid PIN or expired account');
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">NYSC</div>
          <h1>Attendance System</h1>
          <p>Enter your PIN</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="alert alert-error">{error}</div>}

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
              autoFocus
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
