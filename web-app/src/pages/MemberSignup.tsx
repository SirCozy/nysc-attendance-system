import { useState } from 'react';
import { memberSignup } from '../lib/auth';

interface MemberSignupProps {
  onSignupComplete: () => void;
  onBackToLanding: () => void;
}

export default function MemberSignup({ onSignupComplete, onBackToLanding }: MemberSignupProps) {
  const [fullName, setFullName] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [serviceYear, setServiceYear] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate all fields
    if (!fullName.trim()) {
      setError('Full name is required');
      return;
    }

    if (!stateCode.trim()) {
      setError('State code is required');
      return;
    }

    if (!serviceYear.trim()) {
      setError('Service year is required');
      return;
    }

    if (!pin.trim()) {
      setError('PIN is required');
      return;
    }

    if (pin !== confirmPin) {
      setError('PINs do not match');
      return;
    }

    setLoading(true);

    try {
      const result = await memberSignup(fullName, stateCode, serviceYear, pin);
      if (result.success) {
        // Signup successful - redirect to member login
        onSignupComplete();
      } else {
        setError(result.error || 'Signup failed');
      }
    } catch (error) {
      console.error('Signup error:', error);
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
          <p>Create New Account</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="fullName">Full Name</label>
            <input
              id="fullName"
              type="text"
              className="input-field"
              placeholder="Enter your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              disabled={loading}
            />
          </div>

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
            />
            <small>Format: AB/12X/1234</small>
          </div>

          <div className="form-group">
            <label htmlFor="serviceYear">Service Year</label>
            <input
              id="serviceYear"
              type="text"
              className="input-field"
              placeholder="e.g., 2024-2025"
              value={serviceYear}
              onChange={(e) => setServiceYear(e.target.value)}
              autoComplete="off"
              disabled={loading}
            />
            <small>Format: YYYY-YYYY</small>
          </div>

          <div className="form-group">
            <label htmlFor="pin">PIN (4-6 digits)</label>
            <input
              id="pin"
              type="password"
              className="input-field"
              placeholder="Enter 4-6 digit PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="new-password"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPin">Confirm PIN</label>
            <input
              id="confirmPin"
              type="password"
              className="input-field"
              placeholder="Confirm your PIN"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="new-password"
              disabled={loading}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
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
