import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, logout, updateProfile } = useAuth();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [profileImage, setProfileImage] = useState(user?.profileImage || '');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    setStatusMsg('');
    const res = await updateProfile({ name, profileImage });
    setIsSaving(false);

    if (res.success) {
      setStatusMsg('Profile details updated successfully!');
      setIsEditing(false);
      setTimeout(() => setStatusMsg(''), 3000);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  if (!user) return null;

  const joinDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : 'Recently';

  return (
    <main className="profile-page-container">
      <div className="profile-wrapper">
        {/* Profile Card Header */}
        <section className="profile-hero-card">
          <div className="profile-hero-left">
            <div className="profile-img-container">
              <img
                src={user.profileImage || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'}
                alt={user.name}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80';
                }}
              />
              <span className="profile-vip-badge">VIP</span>
            </div>

            <div className="profile-hero-info">
              <h1>{user.name}</h1>
              <p className="profile-email-text">{user.email}</p>
              <div className="profile-badges-row">
                <span className="badge-pill auth-pill">
                  {user.provider === 'google' ? 'Google Account' : 'Verified Foodie'}
                </span>
                <span className="badge-pill member-pill">Member since {joinDate}</span>
              </div>
            </div>
          </div>

          <div className="profile-hero-actions">
            <button
              type="button"
              className="profile-edit-btn"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? 'Cancel Edit' : 'Edit Profile ✏️'}
            </button>
            <button
              type="button"
              className="profile-logout-btn"
              onClick={handleLogout}
            >
              Sign Out 🚪
            </button>
          </div>
        </section>

        {statusMsg && (
          <div className="profile-success-toast">
            <span>✓</span> {statusMsg}
          </div>
        )}

        {/* Edit Profile Form */}
        {isEditing && (
          <section className="profile-edit-section">
            <h3>Edit Account Details</h3>
            <form onSubmit={handleSaveProfile} className="profile-edit-form">
              <div className="auth-field-group">
                <label htmlFor="edit-name">Display Name</label>
                <input
                  id="edit-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="auth-field-group">
                <label htmlFor="edit-avatar">Profile Image URL</label>
                <input
                  id="edit-avatar"
                  type="url"
                  placeholder="https://..."
                  value={profileImage}
                  onChange={(e) => setProfileImage(e.target.value)}
                />
              </div>

              <div className="profile-preset-avatars">
                <small>Or pick an avatar preset:</small>
                <div className="avatar-presets-row">
                  {[
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
                    'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=200&q=80',
                    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
                    'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80',
                  ].map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt="Preset avatar"
                      className={`preset-thumb ${profileImage === url ? 'selected' : ''}`}
                      onClick={() => setProfileImage(url)}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="swiggy-orange-btn"
                disabled={isSaving}
              >
                {isSaving ? 'Saving Changes...' : 'Save Profile Changes'}
              </button>
            </form>
          </section>
        )}

        {/* User Account Panels */}
        <section className="profile-panels-grid">
          {/* Saved Addresses */}
          <div className="profile-panel">
            <div className="profile-panel-header">
              <h3>📍 Delivery Addresses</h3>
              <span className="panel-badge">1 Saved</span>
            </div>
            <div className="address-card">
              <div className="address-tag">HOME</div>
              <p className="address-line">4th Block, 80ft Road, Koramangala</p>
              <small className="address-city">Bengaluru, Karnataka 560034</small>
            </div>
          </div>

          {/* Active BiteBox Rewards */}
          <div className="profile-panel">
            <div className="profile-panel-header">
              <h3>🏷️ BiteBox Rewards</h3>
              <span className="panel-badge">4 Active</span>
            </div>
            <div className="rewards-summary">
              <div className="reward-chip">
                <strong>BITEBOX60</strong>
                <small>60% OFF up to ₹120</small>
              </div>
              <div className="reward-chip">
                <strong>FREEDEL</strong>
                <small>Free Delivery on 3 orders</small>
              </div>
            </div>
          </div>

          {/* Recent Orders Overview */}
          <div className="profile-panel full-span">
            <div className="profile-panel-header">
              <h3>📦 Recent Activity</h3>
              <Link to="/" className="panel-link">Browse Restaurants →</Link>
            </div>
            <div className="recent-orders-list">
              <div className="recent-order-item">
                <div className="order-icon">🍔</div>
                <div className="order-details">
                  <h4>Burger Boulevard</h4>
                  <p>American Smash Cheeseburger × 2, Fries</p>
                  <small>Delivered on November 21, 2026 • ₹478</small>
                </div>
                <span className="order-status delivered">Delivered ✓</span>
              </div>
              <div className="recent-order-item">
                <div className="order-icon">🍕</div>
                <div className="order-details">
                  <h4>Slice Society</h4>
                  <p>Margherita D.O.P. (12"), Garlic Bread</p>
                  <small>Delivered on November 18, 2026 • ₹549</small>
                </div>
                <span className="order-status delivered">Delivered ✓</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
