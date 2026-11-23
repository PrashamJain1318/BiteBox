import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, googleLogin, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Destination to return after successful login
  const from = location.state?.from?.pathname || '/';

  const completeGoogleLogin = useCallback(
    async (payload) => {
      setIsSubmitting(true);
      const result = await googleLogin(payload);
      setIsSubmitting(false);

      if (result.success) {
        navigate(from, { replace: true });
      }
    },
    [googleLogin, navigate, from]
  );

  // Initialize Google Identity Services (GIS) on mount if available
  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (window.google?.accounts?.id && clientId && clientId !== 'YOUR_GOOGLE_CLIENT_ID_HERE') {
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            if (response?.credential) {
              await completeGoogleLogin({
                credential: response.credential,
                idToken: response.credential,
              });
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });
      } catch (err) {
        console.warn('Google Identity Services init error:', err);
      }
    }
  }, [completeGoogleLogin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');
    clearError();

    if (!email.trim()) {
      setValidationError('Please enter your email address');
      return;
    }
    if (!password) {
      setValidationError('Please enter your password');
      return;
    }

    setIsSubmitting(true);
    const result = await login({ email, password });
    setIsSubmitting(false);

    if (result.success) {
      navigate(from, { replace: true });
    }
  };

  const handleGoogleSignIn = async () => {
    setValidationError('');
    clearError();

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    // If Google Identity Services is available and configured, trigger One Tap prompt
    if (window.google?.accounts?.id && clientId && clientId !== 'YOUR_GOOGLE_CLIENT_ID_HERE') {
      try {
        let promptHandled = false;
        window.google.accounts.id.prompt((notification) => {
          promptHandled = true;
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            completeGoogleLogin({
              idToken: 'mock_google_id_token_' + Date.now(),
              email: email.trim() || 'prashamjain.google@gmail.com',
              name: 'Prasham Jain',
              picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
            });
          }
        });

        setTimeout(() => {
          if (!promptHandled) {
            completeGoogleLogin({
              idToken: 'mock_google_id_token_' + Date.now(),
              email: email.trim() || 'prashamjain.google@gmail.com',
              name: 'Prasham Jain',
              picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
            });
          }
        }, 1200);
        return;
      } catch (e) {
        console.warn('Google prompt fallback:', e);
      }
    }

    await completeGoogleLogin({
      idToken: 'mock_google_id_token_' + Date.now(),
      email: email.trim() || 'prashamjain.google@gmail.com',
      name: 'Prasham Jain',
      picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    });
  };

  return (
    <main className="auth-page-container">
      <div className="auth-card-wrap">
        {/* Left Side: Visual Food Banner */}
        <div className="auth-banner-side">
          <img
            src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80"
            alt="Delicious BiteBox Food"
          />
          <div className="auth-banner-overlay">
            <span className="auth-brand-pill">📦 BITEBOX FOOD DELIVERY</span>
            <h2>Fresh flavours delivered straight to your door.</h2>
            <p>Sign in to track orders, redeem coupons, and explore 20+ top restaurants.</p>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="auth-form-side">
          <div className="auth-form-header">
            <Link to="/" className="auth-logo-link">
              <span className="bitebox-logo__badge">📦</span>
              <span className="bitebox-logo__text">Bite<span className="bitebox-logo__accent">Box</span></span>
            </Link>
            <h1>Welcome Back</h1>
            <p>Enter your details to sign in to your account</p>
          </div>

          {(validationError || error) && (
            <div className="auth-error-alert">
              <span>⚠️</span>
              <p>{validationError || error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <div className="auth-field-group">
              <label htmlFor="login-email">Email Address</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">✉️</span>
                <input
                  id="login-email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="auth-field-group">
              <div className="auth-label-row">
                <label htmlFor="login-password">Password</label>
                <Link to="/forgot-password" className="auth-forgot-link">
                  Forgot password?
                </Link>
              </div>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">🔒</span>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
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

            <div className="auth-remember-row">
              <label className="auth-checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me on this device</span>
              </label>
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>

            <div className="auth-divider">
              <span>or continue with</span>
            </div>

            <button
              type="button"
              className="google-auth-btn"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Sign in with Google</span>
            </button>

            <div className="auth-switch-prompt">
              <span>Don't have an account?</span>{' '}
              <Link to="/signup" className="auth-switch-link">
                Sign up for free
              </Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
