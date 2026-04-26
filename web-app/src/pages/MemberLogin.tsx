import { useState } from 'react';
import { memberLogin } from '../lib/auth';

interface MemberLoginProps {
  onLogin: (userName: string, role: 'member') => void;
  onBackToLanding: () => void;
}

export default function MemberLogin({ onLogin, onBackToLanding }: MemberLoginProps) {
  const [stateCode, setStateCode] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedStateCode = stateCode.trim().toUpperCase();
    const trimmedPin = pin.trim();

    if (!trimmedStateCode) {
      setError('State code is required');
      return;
    }

    if (!/^[0-9]{4,6}$/.test(trimmedPin)) {
      setError('PIN must be 4-6 digits');
      return;
    }

    setLoading(true);

    try {
      const session = await memberLogin(trimmedStateCode, trimmedPin);
      if (session) {
        onLogin(session.userName, 'member');
      } else {
        setError('Invalid state code or PIN');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">NYSC</div>
          <h1>Attendance System</h1>
          <p>Member Login</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="stateCode">State Code</label>
            <input
              id="stateCode"
              type="text"
              className="input-field"
              placeholder="e.g., AB/12X/1234"
              value={stateCode}
              onChange={(e) => setStateCode(e.target.value.toUpperCase())}
              autoComplete="off"
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="pin">PIN</label>
            <input
              id="pin"
              type="password"
              className="input-field"
              placeholder="Enter 4-6 digit PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-full"
            onClick={onBackToLanding}
            disabled={loading}
          >
            Back
          </button>
        </form>
      </div>
    </div>
  );
}
