import type { AppView } from '../types';

interface LandingProps {
  onNavigate: (view: AppView) => void;
}

export default function Landing({ onNavigate }: LandingProps) {
  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">NYSC</div>
          <h1>Attendance System</h1>
          <p>Welcome</p>
        </div>

        <div className="landing-content">
          <p style={{ marginBottom: '2rem', textAlign: 'center', color: '#666' }}>
            Choose your login type
          </p>

          <div className="login-buttons-group">
            <button
              className="btn btn-primary btn-full"
              onClick={() => onNavigate('member-login')}
            >
              Login as Member
            </button>

            <button
              className="btn btn-secondary btn-full"
              onClick={() => onNavigate('login')}
            >
              Login as LGI (Admin)
            </button>

            <button
              className="btn btn-outline btn-full"
              onClick={() => onNavigate('member-signup')}
            >
              Create Account
            </button>
          </div>

          <style>{`
            .landing-content {
              padding: 1.5rem 0;
            }

            .login-buttons-group {
              display: flex;
              flex-direction: column;
              gap: 1rem;
            }

            .btn-outline {
              background-color: transparent;
              border: 2px solid #3b82f6;
              color: #3b82f6;
            }

            .btn-outline:hover {
              background-color: #f0f7ff;
            }
          `}</style>
        </div>
      </div>
    </div>
  );
}
