import { useState, useEffect } from 'react';

const CITIES = [
  { name: 'Indore', state: 'Madhya Pradesh', area: 'Sarafa, Chappan Dukan, Vijay Nagar' },
  { name: 'Ahmedabad', state: 'Gujarat', area: 'Manek Chowk, SG Highway, Navrangpura' },
  { name: 'Mumbai', state: 'Maharashtra', area: 'Bandra, Andheri, Powai, Colaba' },
  { name: 'Nagpur', state: 'Maharashtra', area: 'Dharampeth, Sadar, Sitabuldi' },
  { name: 'Delhi', state: 'Delhi', area: 'Connaught Place, Karol Bagh, Saket, Chandni Chowk' },
  { name: 'Raipur', state: 'Chhattisgarh', area: 'Marine Drive, Pandri, Shankar Nagar' },
  { name: 'Neemuch', state: 'Madhya Pradesh', area: 'Tagore Marg, CRPF Colony, Scheme No 36' },
  { name: 'Kolkata', state: 'West Bengal', area: 'Park Street, Salt Lake, Esplanade' },
  { name: 'Bengaluru', state: 'Karnataka', area: 'Koramangala, Indiranagar, HSR, Whitefield' },
  { name: 'Chennai', state: 'Tamil Nadu', area: 'T Nagar, Mylapore, Nungambakkam' },
  { name: 'Hyderabad', state: 'Telangana', area: 'HITEC City, Banjara Hills, Jubilee Hills' },
];

const FAQS = [
  {
    q: 'How do I track my delivery partner in real-time?',
    a: 'Once your order is accepted by the restaurant, visit the "Track Order" page from your profile or the order confirmation screen to watch live GPS navigation directly to your doorstep.',
  },
  {
    q: 'How do I apply coupon discount codes?',
    a: 'On the Cart page or at Checkout, enter your coupon code (e.g. BITEBOX20, FLAT50, or WELCOME10) in the "Apply Coupon" box and click Apply. The discount will instantly be subtracted from your bill.',
  },
  {
    q: 'What payment methods does BiteBox support?',
    a: 'We accept Cash on Delivery (COD), UPI (Google Pay, PhonePe, Paytm, BHIM via Razorpay QR), Credit/Debit Cards (Visa, MasterCard, RuPay), and Net Banking across 50+ Indian banks.',
  },
  {
    q: 'What is BiteBox’s cancellation and refund policy?',
    a: 'Orders can be cancelled free of charge within 60 seconds of placement. If cancelled afterwards due to kitchen preparation delays, refunds are credited back to your original payment method in 24-48 hours.',
  },
];

const JOB_OPENINGS = [
  { id: 'job-1', title: 'Senior Full-Stack Engineer (MERN)', dept: 'Engineering', loc: 'Bengaluru / Remote', type: 'Full-time' },
  { id: 'job-2', title: 'Lead Product Designer (UI/UX)', dept: 'Product Design', loc: 'Remote', type: 'Full-time' },
  { id: 'job-3', title: 'City Fleet & Logistics Operations Lead', dept: 'Operations', loc: 'Mumbai', type: 'Full-time' },
  { id: 'job-4', title: 'Restaurant Growth & Brand Partnerships Manager', dept: 'Business', loc: 'Delhi NCR', type: 'Full-time' },
];

const TEAM_MEMBERS = [
  {
    name: 'Prasham Jain',
    role: 'Founder & Chief Executive Officer',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    bio: 'Passionate about hyper-fast food logistics, product architecture, and delightful customer experiences.',
  },
  {
    name: 'Aarav Sharma',
    role: 'Chief Technology Officer',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    bio: 'Former principal architect specializing in high-throughput dispatch algorithms and distributed payment infrastructure.',
  },
  {
    name: 'Sneha Kulkarni',
    role: 'Head of Culinary Partnerships',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
    bio: 'Onboarding India’s finest regional kitchens, cloud kitchens, and gourmet dining chains onto BiteBox.',
  },
  {
    name: 'Vikram Patel',
    role: 'VP of Delivery Operations & Fleet',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
    bio: 'Leading 25,000+ electric vehicle delivery partners with a laser focus on rider safety and 15-minute delivery.',
  },
];

export default function Footer({ onSelectCity }) {
  const [activeModal, setActiveModal] = useState(null); // 'about' | 'corporate' | 'careers' | 'team' | 'help' | 'partner' | 'ride' | 'appDownload' | 'terms' | 'privacy'
  const [toastMessage, setToastMessage] = useState('');
  const [activeFaq, setActiveFaq] = useState(null);

  // Form states
  const [corporateForm, setCorporateForm] = useState({ company: '', email: '', teamSize: '50-200', city: '' });
  const [partnerForm, setPartnerForm] = useState({ restaurantName: '', ownerName: '', phone: '', city: 'Bengaluru', cuisine: '' });
  const [riderForm, setRiderForm] = useState({ fullName: '', phone: '', city: 'Bengaluru', vehicle: 'Bike' });
  const [supportForm, setSupportForm] = useState({ orderId: '', category: 'Order Delivery', message: '' });
  const [smsPhone, setSmsPhone] = useState('');
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const openModal = (modalKey) => {
    setFormSubmitted(false);
    setActiveModal(modalKey);
  };

  const closeModal = () => {
    setActiveModal(null);
    setFormSubmitted(false);
  };

  const handleCityClick = (cityName) => {
    showToast(`📍 Switched location to ${cityName}! Showing top restaurants near you.`);
    if (typeof onSelectCity === 'function') {
      onSelectCity(cityName);
    }
    const listingEl = document.getElementById('restaurants');
    if (listingEl) {
      listingEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleCorporateSubmit = (e) => {
    e.preventDefault();
    setFormSubmitted(true);
    showToast(`✓ Corporate inquiry received for ${corporateForm.company || 'your team'}! Our team will contact you shortly.`);
    setTimeout(() => closeModal(), 2200);
  };

  const handlePartnerSubmit = (e) => {
    e.preventDefault();
    setFormSubmitted(true);
    showToast(`🎉 Partnership application received for ${partnerForm.restaurantName || 'your restaurant'}!`);
    setTimeout(() => closeModal(), 2200);
  };

  const handleRiderSubmit = (e) => {
    e.preventDefault();
    setFormSubmitted(true);
    showToast(`🛵 Welcome aboard, ${riderForm.fullName || 'Rider'}! Our fleet coordinator will call you.`);
    setTimeout(() => closeModal(), 2200);
  };

  const handleSupportSubmit = (e) => {
    e.preventDefault();
    setFormSubmitted(true);
    const ticketId = 'TKT-' + Math.floor(100000 + Math.random() * 900000);
    showToast(`✓ Support ticket #${ticketId} created! An agent will respond in 5 minutes.`);
    setTimeout(() => closeModal(), 2200);
  };

  const handleSmsSubmit = (e) => {
    e.preventDefault();
    if (!smsPhone || smsPhone.length < 10) {
      showToast('⚠️ Please enter a valid 10-digit mobile number');
      return;
    }
    setFormSubmitted(true);
    showToast(`📲 App download link sent via SMS to +91 ${smsPhone}!`);
    setTimeout(() => closeModal(), 2200);
  };

  return (
    <footer className="swiggy-footer">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="footer-toast-banner" role="status">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. APP DOWNLOAD PROMO BANNER */}
      <div className="swiggy-footer__app-banner">
        <div className="app-banner__content">
          <h2>For better experience, download the BiteBox app now</h2>
          <p>Get exclusive app-only coupons, live GPS delivery tracking, and ultra-fast checkout.</p>
        </div>
        <div className="app-banner__badges">
          <button
            type="button"
            className="app-badge"
            onClick={() => openModal('appDownload')}
            aria-label="Download BiteBox on the App Store"
          >
            <span className="badge-icon">🍏</span>
            <div>
              <small>Download on the</small>
              <strong>App Store</strong>
            </div>
          </button>
          <button
            type="button"
            className="app-badge"
            onClick={() => openModal('appDownload')}
            aria-label="Get BiteBox on Google Play"
          >
            <span className="badge-icon">▶</span>
            <div>
              <small>GET IT ON</small>
              <strong>Google Play</strong>
            </div>
          </button>
        </div>
      </div>

      {/* 2. FOOTER COLUMNS */}
      <div className="swiggy-footer__links">
        {/* Brand Column */}
        <div className="footer-col brand-col">
          <div className="footer-logo">
            <span className="bitebox-logo__badge">📦</span>
            <span className="bitebox-logo__text">
              Bite<span className="bitebox-logo__accent">Box</span>
            </span>
          </div>
          <p className="footer-copyright">© 2026 BiteBox Technologies Pvt. Ltd.</p>
          <p className="footer-tagline">Good Food. Fast Delivery. Every Single Time.</p>

          <div className="footer-social-row">
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-social-pill"
              title="Follow us on X (Twitter)"
            >
              𝕏
            </a>
            <a
              href="https://www.instagram.com/gokhru__prasham/"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-social-pill"
              title="Follow Prasham on Instagram (@gokhru__prasham)"
              aria-label="Instagram profile @gokhru__prasham"
            >
              📸
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-social-pill"
              title="Connect with us on LinkedIn"
            >
              💼
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-social-pill"
              title="View source on GitHub"
            >
              🐙
            </a>
          </div>
        </div>

        {/* Company Column */}
        <div className="footer-col">
          <h4>Company</h4>
          <button type="button" className="footer-link-btn" onClick={() => openModal('about')}>
            About Us
          </button>
          <button type="button" className="footer-link-btn" onClick={() => openModal('corporate')}>
            BiteBox Corporate
          </button>
          <button type="button" className="footer-link-btn" onClick={() => openModal('careers')}>
            Careers
          </button>
          <button type="button" className="footer-link-btn" onClick={() => openModal('team')}>
            Team
          </button>
        </div>

        {/* Contact Us Column */}
        <div className="footer-col">
          <h4>Contact Us</h4>
          <button type="button" className="footer-link-btn" onClick={() => openModal('help')}>
            Help & Support
          </button>
          <button type="button" className="footer-link-btn" onClick={() => openModal('partner')}>
            Partner with us
          </button>
          <button type="button" className="footer-link-btn" onClick={() => openModal('ride')}>
            Ride with us
          </button>
          <button type="button" className="footer-link-btn" onClick={() => openModal('terms')}>
            Terms & Conditions
          </button>
        </div>

        {/* Available In Column */}
        <div className="footer-col">
          <h4>Available In</h4>
          {CITIES.map((city) => (
            <button
              key={city.name}
              type="button"
              className="footer-city-btn"
              onClick={() => handleCityClick(city.name)}
              title={`Switch delivery location to ${city.name}`}
            >
              <span className="city-pin">📍</span>
              <span className="city-name">{city.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* =========================================================================
          INTERACTIVE FOOTER MODALS (ALL FULLY FUNCTIONAL)
          ========================================================================= */}
      {activeModal && (
        <div className="footer-modal-backdrop" onClick={closeModal}>
          <div
            className="footer-modal-content"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              className="footer-modal-close-btn"
              onClick={closeModal}
              aria-label="Close dialog"
            >
              ✕
            </button>

            {/* --- MODAL 1: ABOUT US --- */}
            {activeModal === 'about' && (
              <div className="footer-modal-body">
                <div className="footer-modal-header-icon">📦</div>
                <h2>About BiteBox</h2>
                <p className="footer-modal-lead">
                  Delivering hot, authentic, mouth-watering food from top local kitchens to your door in under 20 minutes.
                </p>

                <div className="footer-stats-grid">
                  <div className="stat-card">
                    <strong>500+</strong>
                    <span>Restaurant Partners</span>
                  </div>
                  <div className="stat-card">
                    <strong>5+</strong>
                    <span>Major Indian Metros</span>
                  </div>
                  <div className="stat-card">
                    <strong>15 Mins</strong>
                    <span>Average Delivery Time</span>
                  </div>
                  <div className="stat-card">
                    <strong>4.8 ★</strong>
                    <span>App Store Rating</span>
                  </div>
                </div>

                <div className="footer-values-list">
                  <div className="value-item">
                    <span>⚡</span>
                    <div>
                      <h4>Ultra-Fast Hyperlocal Dispatch</h4>
                      <p>Proprietary route optimization ensuring food reaches you piping hot and freshly packed.</p>
                    </div>
                  </div>
                  <div className="value-item">
                    <span>🌱</span>
                    <div>
                      <h4>100% Eco-Friendly Electric Fleet</h4>
                      <p>Committed to zero carbon footprint deliveries with EV two-wheelers and biodegradable packaging.</p>
                    </div>
                  </div>
                  <div className="value-item">
                    <span>🛡️</span>
                    <div>
                      <h4>Verified Hygiene & Quality</h4>
                      <p>Every partner restaurant undergoes strict kitchen cleanliness inspection and quality audits.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* --- MODAL 2: BITEBOX CORPORATE --- */}
            {activeModal === 'corporate' && (
              <div className="footer-modal-body">
                <div className="footer-modal-header-icon">🏢</div>
                <h2>BiteBox for Business</h2>
                <p className="footer-modal-lead">
                  Streamlined team lunches, late-night sprint meals, and VIP event catering with dedicated account managers.
                </p>

                {formSubmitted ? (
                  <div className="footer-form-success">
                    <span className="success-icon">🎉</span>
                    <h3>Thank You for Your Inquiry!</h3>
                    <p>Our Corporate Solutions Lead will reach out to you within 2 business hours.</p>
                  </div>
                ) : (
                  <form onSubmit={handleCorporateSubmit} className="footer-modal-form">
                    <div className="footer-form-field">
                      <label>Company / Organization Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Acme Technologies Pvt. Ltd."
                        value={corporateForm.company}
                        onChange={(e) => setCorporateForm({ ...corporateForm, company: e.target.value })}
                        required
                      />
                    </div>
                    <div className="footer-form-field">
                      <label>Work Email Address</label>
                      <input
                        type="email"
                        placeholder="e.g. hr@company.com"
                        value={corporateForm.email}
                        onChange={(e) => setCorporateForm({ ...corporateForm, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="footer-form-row">
                      <div className="footer-form-field">
                        <label>Team Size</label>
                        <select
                          value={corporateForm.teamSize}
                          onChange={(e) => setCorporateForm({ ...corporateForm, teamSize: e.target.value })}
                        >
                          <option value="1-50">1 - 50 employees</option>
                          <option value="50-200">50 - 200 employees</option>
                          <option value="200-1000">200 - 1,000 employees</option>
                          <option value="1000+">1,000+ Enterprise</option>
                        </select>
                      </div>
                      <div className="footer-form-field">
                        <label>Office City</label>
                        <input
                          type="text"
                          placeholder="e.g. Bengaluru"
                          value={corporateForm.city}
                          onChange={(e) => setCorporateForm({ ...corporateForm, city: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <button type="submit" className="footer-submit-btn">
                      Request Corporate Tasting Box →
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* --- MODAL 3: CAREERS --- */}
            {activeModal === 'careers' && (
              <div className="footer-modal-body">
                <div className="footer-modal-header-icon">🚀</div>
                <h2>Careers at BiteBox</h2>
                <p className="footer-modal-lead">
                  Help us redefine food delivery infrastructure in India. We are hiring passionate builders!
                </p>

                <div className="footer-jobs-list">
                  {JOB_OPENINGS.map((job) => (
                    <div key={job.id} className="job-card">
                      <div>
                        <h4>{job.title}</h4>
                        <div className="job-meta">
                          <span>{job.dept}</span> • <span>{job.loc}</span> • <span>{job.type}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="job-apply-btn"
                        onClick={() => {
                          showToast(`✓ Applied for "${job.title}"! We'll review your portfolio.`);
                          closeModal();
                        }}
                      >
                        Apply Now
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* --- MODAL 4: TEAM --- */}
            {activeModal === 'team' && (
              <div className="footer-modal-body">
                <div className="footer-modal-header-icon">👥</div>
                <h2>Leadership & Core Team</h2>
                <p className="footer-modal-lead">
                  The engineers, food lovers, and logistics specialists building BiteBox.
                </p>

                <div className="footer-team-grid">
                  {TEAM_MEMBERS.map((member) => (
                    <div key={member.name} className="team-member-card">
                      <img src={member.avatar} alt={member.name} className="team-avatar" />
                      <div>
                        <h4>{member.name}</h4>
                        <span className="team-role">{member.role}</span>
                        <p>{member.bio}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* --- MODAL 5: HELP & SUPPORT --- */}
            {activeModal === 'help' && (
              <div className="footer-modal-body">
                <div className="footer-modal-header-icon">💬</div>
                <h2>Help & Support (24/7)</h2>
                <p className="footer-modal-lead">
                  Got a question about your order, delivery partner, or coupon discount? We are here to help!
                </p>

                <div className="footer-faqs-accordion">
                  <h3>Frequently Asked Questions</h3>
                  {FAQS.map((faq, idx) => (
                    <div key={faq.q} className={`faq-item ${activeFaq === idx ? 'open' : ''}`}>
                      <button
                        type="button"
                        className="faq-question-btn"
                        onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                      >
                        <span>{faq.q}</span>
                        <span>{activeFaq === idx ? '−' : '+'}</span>
                      </button>
                      {activeFaq === idx && <p className="faq-answer">{faq.a}</p>}
                    </div>
                  ))}
                </div>

                <div className="footer-support-contact-box">
                  <h3>Direct Support Lines</h3>
                  <div className="support-pills-row">
                    <span className="support-pill">📞 1800-BITE-BOX</span>
                    <span className="support-pill">✉️ support@bitebox.in</span>
                    <span className="support-pill">💬 WhatsApp: +91 98765 43210</span>
                  </div>
                </div>

                {formSubmitted ? (
                  <div className="footer-form-success">
                    <span className="success-icon">✓</span>
                    <h3>Support Ticket Created!</h3>
                    <p>Our 24/7 live team will respond to your registered email shortly.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSupportSubmit} className="footer-modal-form">
                    <h3>Submit a Support Ticket</h3>
                    <div className="footer-form-field">
                      <label>Order ID (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. BB-2026-9842"
                        value={supportForm.orderId}
                        onChange={(e) => setSupportForm({ ...supportForm, orderId: e.target.value })}
                      />
                    </div>
                    <div className="footer-form-field">
                      <label>Issue Description</label>
                      <textarea
                        rows="3"
                        placeholder="Describe what happened with your order or delivery..."
                        value={supportForm.message}
                        onChange={(e) => setSupportForm({ ...supportForm, message: e.target.value })}
                        required
                      />
                    </div>
                    <button type="submit" className="footer-submit-btn">
                      Send Support Request →
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* --- MODAL 6: PARTNER WITH US --- */}
            {activeModal === 'partner' && (
              <div className="footer-modal-body">
                <div className="footer-modal-header-icon">🍳</div>
                <h2>Partner with BiteBox</h2>
                <p className="footer-modal-lead">
                  Reach 500,000+ local foodies with 0% commission on your first 30 days!
                </p>

                {formSubmitted ? (
                  <div className="footer-form-success">
                    <span className="success-icon">🎉</span>
                    <h3>Application Received!</h3>
                    <p>Our merchant onboarding specialist will visit your restaurant for catalog setup.</p>
                  </div>
                ) : (
                  <form onSubmit={handlePartnerSubmit} className="footer-modal-form">
                    <div className="footer-form-field">
                      <label>Restaurant / Kitchen Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Royal Biryani Darbar"
                        value={partnerForm.restaurantName}
                        onChange={(e) => setPartnerForm({ ...partnerForm, restaurantName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="footer-form-row">
                      <div className="footer-form-field">
                        <label>Owner / Manager Name</label>
                        <input
                          type="text"
                          placeholder="Full Name"
                          value={partnerForm.ownerName}
                          onChange={(e) => setPartnerForm({ ...partnerForm, ownerName: e.target.value })}
                          required
                        />
                      </div>
                      <div className="footer-form-field">
                        <label>Phone Number</label>
                        <input
                          type="tel"
                          placeholder="e.g. 9876543210"
                          value={partnerForm.phone}
                          onChange={(e) => setPartnerForm({ ...partnerForm, phone: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="footer-form-row">
                      <div className="footer-form-field">
                        <label>City</label>
                        <select
                          value={partnerForm.city}
                          onChange={(e) => setPartnerForm({ ...partnerForm, city: e.target.value })}
                        >
                          {CITIES.map((c) => (
                            <option key={c.name} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="footer-form-field">
                        <label>Primary Cuisine</label>
                        <input
                          type="text"
                          placeholder="e.g. North Indian, Pizzas, Desserts"
                          value={partnerForm.cuisine}
                          onChange={(e) => setPartnerForm({ ...partnerForm, cuisine: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <button type="submit" className="footer-submit-btn">
                      Submit Partner Application →
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* --- MODAL 7: RIDE WITH US --- */}
            {activeModal === 'ride' && (
              <div className="footer-modal-body">
                <div className="footer-modal-header-icon">🛵</div>
                <h2>Ride with BiteBox Fleet</h2>
                <p className="footer-modal-lead">
                  Earn up to ₹35,000/month with weekly instant payouts, accidental insurance, and flexible shifts.
                </p>

                {formSubmitted ? (
                  <div className="footer-form-success">
                    <span className="success-icon">🛵</span>
                    <h3>Application Accepted!</h3>
                    <p>Our fleet center will send you a verification code via SMS to complete onboarding.</p>
                  </div>
                ) : (
                  <form onSubmit={handleRiderSubmit} className="footer-modal-form">
                    <div className="footer-form-field">
                      <label>Your Full Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Rahul Sharma"
                        value={riderForm.fullName}
                        onChange={(e) => setRiderForm({ ...riderForm, fullName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="footer-form-row">
                      <div className="footer-form-field">
                        <label>Mobile Number</label>
                        <input
                          type="tel"
                          placeholder="10-digit mobile"
                          value={riderForm.phone}
                          onChange={(e) => setRiderForm({ ...riderForm, phone: e.target.value })}
                          required
                        />
                      </div>
                      <div className="footer-form-field">
                        <label>City</label>
                        <select
                          value={riderForm.city}
                          onChange={(e) => setRiderForm({ ...riderForm, city: e.target.value })}
                        >
                          {CITIES.map((c) => (
                            <option key={c.name} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="footer-form-field">
                      <label>Vehicle Type</label>
                      <select
                        value={riderForm.vehicle}
                        onChange={(e) => setRiderForm({ ...riderForm, vehicle: e.target.value })}
                      >
                        <option value="Bike">Motorcycle / Bike (Petrol)</option>
                        <option value="EV">Electric Scooter / EV Bike</option>
                        <option value="Bicycle">Bicycle (Short Distances)</option>
                      </select>
                    </div>
                    <button type="submit" className="footer-submit-btn">
                      Register as Delivery Hero →
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* --- MODAL 8: APP DOWNLOAD --- */}
            {activeModal === 'appDownload' && (
              <div className="footer-modal-body">
                <div className="footer-modal-header-icon">📱</div>
                <h2>Get the BiteBox App</h2>
                <p className="footer-modal-lead">
                  Scan the QR code below or enter your phone number to receive a direct app download link.
                </p>

                <div className="footer-qr-container">
                  <div className="qr-box">
                    <img
                      src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=https://bite-box-six-beta.vercel.app"
                      alt="Scan to Download BiteBox App"
                      className="qr-img"
                    />
                    <span>Scan with your phone camera</span>
                  </div>

                  <div className="qr-or-divider">OR</div>

                  <form onSubmit={handleSmsSubmit} className="sms-form">
                    <label>Get direct download link via SMS:</label>
                    <div className="sms-input-row">
                      <span className="country-code">+91</span>
                      <input
                        type="tel"
                        placeholder="Enter mobile number"
                        value={smsPhone}
                        onChange={(e) => setSmsPhone(e.target.value)}
                        maxLength={10}
                        required
                      />
                      <button type="submit" className="sms-submit-btn">
                        Send Link
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* --- MODAL 9: TERMS & CONDITIONS --- */}
            {activeModal === 'terms' && (
              <div className="footer-modal-body">
                <h2>Terms & Conditions</h2>
                <p className="footer-modal-lead">Last updated: November 2026</p>
                <div className="legal-text-scroll">
                  <h4>1. Acceptance of Terms</h4>
                  <p>By downloading, browsing, or placing orders on BiteBox, you agree to be bound by these Terms of Service.</p>
                  <h4>2. Ordering & Payment</h4>
                  <p>All orders are subject to acceptance by participating restaurant partners. Payment may be completed via Cash on Delivery or digital gateways powered by Razorpay.</p>
                  <h4>3. Delivery Guarantees</h4>
                  <p>While BiteBox strives for 20-minute delivery, timings may vary during peak hours or adverse weather conditions.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </footer>
  );
}
