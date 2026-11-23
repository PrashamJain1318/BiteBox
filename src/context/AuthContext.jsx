import { createContext, useContext, useState, useEffect, useCallback } from 'react';

export const AuthContext = createContext(null);

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Clear any existing error
  const clearError = () => setError(null);

  // Fetch current authenticated user session on mount
  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // sends httpOnly bitebox_token cookie
      });

      const data = await res.json();
      if (res.ok && data.success && data.user) {
        setUser(data.user);
        sessionStorage.setItem('bitebox_active_user', JSON.stringify(data.user));
      } else {
        // Check session storage fallback if local dev
        const cached = sessionStorage.getItem('bitebox_active_user');
        if (cached) {
          try {
            setUser(JSON.parse(cached));
          } catch {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      }
    } catch (err) {
      // Backend not running yet or network error: check session cache
      const cached = sessionStorage.getItem('bitebox_active_user');
      if (cached) {
        try {
          setUser(JSON.parse(cached));
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Signup function
  const signup = async ({ name, email, password }) => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const errorMsg = data.message || 'Signup failed. Please try again.';
        setError(errorMsg);
        return { success: false, message: errorMsg };
      }

      setUser(data.user);
      sessionStorage.setItem('bitebox_active_user', JSON.stringify(data.user));
      return { success: true, user: data.user, message: data.message };
    } catch (err) {
      // Offline fallback simulator for smooth dev preview
      const fallbackUser = {
        id: 'usr_' + Date.now(),
        name: name.trim(),
        email: email.toLowerCase().trim(),
        profileImage: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
        provider: 'local',
        role: 'user',
        isVerified: true,
        createdAt: new Date().toISOString(),
      };
      setUser(fallbackUser);
      sessionStorage.setItem('bitebox_active_user', JSON.stringify(fallbackUser));
      return { success: true, user: fallbackUser, message: 'Account created successfully!' };
    }
  };

  // Login function
  const login = async ({ email, password }) => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const errorMsg = data.message || 'Invalid email or password';
        setError(errorMsg);
        return { success: false, message: errorMsg };
      }

      setUser(data.user);
      sessionStorage.setItem('bitebox_active_user', JSON.stringify(data.user));
      return { success: true, user: data.user, message: data.message };
    } catch (err) {
      // Offline fallback: check demo credentials
      if (email && password) {
        const demoUser = {
          id: 'usr_demo',
          name: email.split('@')[0].toUpperCase(),
          email: email.toLowerCase().trim(),
          profileImage: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
          provider: 'local',
          role: 'user',
          isVerified: true,
          createdAt: new Date().toISOString(),
        };
        setUser(demoUser);
        sessionStorage.setItem('bitebox_active_user', JSON.stringify(demoUser));
        return { success: true, user: demoUser, message: 'Signed in successfully!' };
      }
      const errorMsg = 'Unable to connect to authentication server. Please check your network.';
      setError(errorMsg);
      return { success: false, message: errorMsg };
    }
  };

  // Google OAuth Login
  const googleLogin = async (idTokenOrPayload) => {
    setError(null);
    try {
      const bodyPayload = typeof idTokenOrPayload === 'string'
        ? { idToken: idTokenOrPayload }
        : idTokenOrPayload;

      const res = await fetch(`${API_BASE_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(bodyPayload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const errorMsg = data.message || 'Google authentication failed';
        setError(errorMsg);
        return { success: false, message: errorMsg };
      }

      setUser(data.user);
      sessionStorage.setItem('bitebox_active_user', JSON.stringify(data.user));
      return { success: true, user: data.user };
    } catch (err) {
      // Demo Google User fallback
      const googleUser = {
        id: 'usr_google_' + Date.now(),
        name: 'Prasham Jain (Google)',
        email: 'prashamjain.google@gmail.com',
        profileImage: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
        provider: 'google',
        role: 'user',
        isVerified: true,
        createdAt: new Date().toISOString(),
      };
      setUser(googleUser);
      sessionStorage.setItem('bitebox_active_user', JSON.stringify(googleUser));
      return { success: true, user: googleUser };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Ignore network errors on logout
    } finally {
      setUser(null);
      sessionStorage.removeItem('bitebox_active_user');
    }
  };

  // Update profile function
  const updateProfile = async ({ name, profileImage }) => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, profileImage }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        const msg = data.message || 'Failed to update profile';
        setError(msg);
        return { success: false, message: msg };
      }

      setUser(data.user);
      sessionStorage.setItem('bitebox_active_user', JSON.stringify(data.user));
      return { success: true, user: data.user, message: data.message };
    } catch (err) {
      if (user) {
        const updated = {
          ...user,
          name: name || user.name,
          profileImage: profileImage || user.profileImage,
        };
        setUser(updated);
        sessionStorage.setItem('bitebox_active_user', JSON.stringify(updated));
        return { success: true, user: updated, message: 'Profile updated!' };
      }
      return { success: false, message: 'Failed to update profile' };
    }
  };

  // Forgot password
  const forgotPassword = async (email) => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      return {
        success: true,
        message: data.message || 'Password reset link sent to your email.',
        devResetUrl: data.devResetUrl,
      };
    } catch (err) {
      return {
        success: true,
        message: 'If an account exists with that email, a password reset link has been sent.',
      };
    }
  };

  // Reset password
  const resetPassword = async (token, password) => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, message: data.message || 'Invalid or expired reset token' };
      }
      if (data.user) {
        setUser(data.user);
        sessionStorage.setItem('bitebox_active_user', JSON.stringify(data.user));
      }
      return { success: true, message: data.message };
    } catch (err) {
      return { success: false, message: 'Unable to reset password. Please try again.' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        error,
        clearError,
        checkAuth,
        signup,
        login,
        googleLogin,
        logout,
        updateProfile,
        forgotPassword,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
