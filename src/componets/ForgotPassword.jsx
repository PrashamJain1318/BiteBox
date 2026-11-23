import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [devResetUrl, setDevResetUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setMessage('');
    setDevResetUrl('');

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    const result = await forgotPassword(email);
    setIsSubmitting(false);

    setMessage(result.message);
    if (result.devResetUrl) {
      setDevResetUrl(result.devResetUrl);
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
            <h1>Reset Your Password</h1>
            <p>Enter the email linked to your BiteBox account, and we'll send you a password reset link.</p>
          </div>

          {errorMsg && (
            <div className="auth-error-alert">
              <span>⚠️</span>
              <p>{errorMsg}</p>
            </div>
          )}

          {message && (
            <div className="auth-success-alert">
              <span>✓</span>
              <div>
                <p>{message}</p>
                {devResetUrl && (
                  <div className="dev-reset-link-box">
                    <small>Development Mode Instant Link:</small>
                    <a href={devResetUrl}>{devResetUrl}</a>
                  </div>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <div className="auth-field-group">
              <label htmlFor="forgot-email">Account Email Address</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">✉️</span>
                <input
                  id="forgot-email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sending Link...' : 'Send Reset Link'}
            </button>

            <div className="auth-switch-prompt">
              <span>Remember your password?</span>{' '}
              <Link to="/login" className="auth-switch-link">
                Back to Login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
