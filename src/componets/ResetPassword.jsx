import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ResetPassword() {
  const { token } = useParams();
  const { resetPassword } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    const result = await resetPassword(token, password);
    setIsSubmitting(false);

    if (result.success) {
      setSuccessMsg(result.message || 'Password successfully updated!');
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 1500);
    } else {
      setErrorMsg(result.message || 'Unable to reset password. The link may have expired.');
    }
  };

  return (
    <main className="auth-page-container">
      <div className="auth-card-wrap single-pane">
        <div className="auth-form-side full-width">
          <div className="auth-form-header">
            <Link to="/" className="auth-logo-link">
              <span className="bitebox-logo__badge">📦</span>
              <span className="bitebox-logo__text">Bite<span className="bitebox-logo__accent">Box</span></span>
            </Link>
            <h1>Set New Password</h1>
            <p>Please enter your new secure password below</p>
          </div>

          {errorMsg && (
            <div className="auth-error-alert">
              <span>⚠️</span>
              <p>{errorMsg}</p>
            </div>
          )}

          {successMsg && (
            <div className="auth-success-alert">
              <span>✓</span>
              <p>{successMsg}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <div className="auth-field-group">
              <label htmlFor="reset-new-password">New Password</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">🔒</span>
                <input
                  id="reset-new-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="auth-show-pass-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <div className="auth-field-group">
              <label htmlFor="reset-confirm-password">Confirm New Password</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">🔒</span>
                <input
                  id="reset-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Updating Password...' : 'Save New Password'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
