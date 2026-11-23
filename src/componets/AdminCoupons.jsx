import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../api/apiConfig'
import '../style.css'

export default function AdminCoupons() {
  const { user } = useAuth()
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Form Modal State
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discountType: 'percentage',
    discountValue: 20,
    minOrderValue: 299,
    maxDiscount: 150,
    expiryDate: '2027-12-31',
    usageLimit: 100,
    perUserLimit: 2,
    firstOrderOnly: false,
    isActive: true,
  })

  // Fetch all coupons
  const fetchCoupons = async () => {
    try {
      setLoading(true)
      const res = await apiFetch('/coupons')
      const data = await res.json()
      if (data.success && data.coupons) {
        setCoupons(data.coupons)
      } else {
        setErrorMsg(data.message || 'Failed to fetch coupons.')
      }
    } catch {
      setErrorMsg('Network error while fetching coupons.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCoupons()
  }, [])

  // Open modal for creating or editing
  function handleOpenModal(coupon = null) {
    if (coupon) {
      setEditingId(coupon._id || coupon.code)
      setFormData({
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minOrderValue: coupon.minOrderValue || 0,
        maxDiscount: coupon.maxDiscount || '',
        expiryDate: coupon.expiryDate ? coupon.expiryDate.split('T')[0] : '2027-12-31',
        usageLimit: coupon.usageLimit || '',
        perUserLimit: coupon.perUserLimit || 1,
        firstOrderOnly: Boolean(coupon.firstOrderOnly),
        isActive: Boolean(coupon.isActive),
      })
    } else {
      setEditingId(null)
      setFormData({
        code: '',
        description: '',
        discountType: 'percentage',
        discountValue: 20,
        minOrderValue: 299,
        maxDiscount: 150,
        expiryDate: '2027-12-31',
        usageLimit: 100,
        perUserLimit: 2,
        firstOrderOnly: false,
        isActive: true,
      })
    }
    setErrorMsg('')
    setSuccessMsg('')
    setShowModal(true)
  }

  // Submit create or edit form
  async function handleSubmit(e) {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    const payload = {
      ...formData,
      code: formData.code.trim().toUpperCase(),
      discountValue: Number(formData.discountValue),
      minOrderValue: Number(formData.minOrderValue),
      maxDiscount: formData.maxDiscount ? Number(formData.maxDiscount) : null,
      usageLimit: formData.usageLimit ? Number(formData.usageLimit) : null,
      perUserLimit: Number(formData.perUserLimit),
    }

    try {
      let res
      if (editingId) {
        res = await apiFetch(`/coupons/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
      } else {
        res = await apiFetch('/coupons', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      }

      const data = await res.json()
      if (data.success) {
        setSuccessMsg(data.message || 'Coupon saved successfully.')
        setShowModal(false)
        fetchCoupons()
      } else {
        setErrorMsg(data.message || 'Operation failed.')
      }
    } catch {
      setErrorMsg('Failed to save coupon. Check connection.')
    }
  }

  // Toggle active/inactive
  async function handleToggle(id) {
    try {
      const res = await apiFetch(`/coupons/${id}/toggle`, {
        method: 'PATCH',
      })
      const data = await res.json()
      if (data.success) {
        setSuccessMsg(data.message)
        fetchCoupons()
      } else {
        setErrorMsg(data.message)
      }
    } catch {
      setErrorMsg('Could not toggle coupon status.')
    }
  }

  // Delete coupon
  async function handleDelete(id, code) {
    if (!window.confirm(`Are you sure you want to delete coupon '${code}'?`)) return
    try {
      const res = await apiFetch(`/coupons/${id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.success) {
        setSuccessMsg(data.message)
        fetchCoupons()
      } else {
        setErrorMsg(data.message)
      }
    } catch {
      setErrorMsg('Could not delete coupon.')
    }
  }

  // Access check
  if (user && user.role !== 'admin') {
    return (
      <div className="admin-container">
        <div className="admin-denied-card">
          <h2>🚫 Access Denied</h2>
          <p>You must have Admin privileges to access the coupon management console.</p>
          <Link to="/" className="browse-menu-btn">
            Return to BiteBox Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-container">
      <div className="admin-header-row">
        <div>
          <span className="admin-badge">ADMINISTRATION CONSOLE</span>
          <h1 className="admin-title">Coupon Discount Management</h1>
          <p className="admin-sub">
            Create, configure, monitor, and manage active promotional coupon codes
          </p>
        </div>
        <button
          type="button"
          className="admin-create-btn"
          onClick={() => handleOpenModal()}
        >
          + Create New Coupon
        </button>
      </div>

      {successMsg && <div className="coupon-alert success">{successMsg}</div>}
      {errorMsg && <div className="coupon-alert error">{errorMsg}</div>}

      {/* Coupons Table */}
      <div className="admin-table-wrap">
        {loading ? (
          <div className="admin-spinner-wrap">
            <div className="status-spinner" />
            <p>Loading coupons list...</p>
          </div>
        ) : (
          <table className="admin-coupons-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Discount</th>
                <th>Min Order</th>
                <th>Max Discount</th>
                <th>Per User</th>
                <th>Used Count</th>
                <th>Status</th>
                <th>Expiry</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c._id || c.code}>
                  <td>
                    <strong className="code-pill">{c.code}</strong>
                    <div className="code-desc">{c.description}</div>
                  </td>
                  <td>
                    {c.discountType === 'percentage'
                      ? `${c.discountValue}% OFF`
                      : c.discountType === 'flat'
                      ? `₹${c.discountValue} Flat`
                      : 'Free Shipping'}
                    {c.firstOrderOnly && <span className="first-order-tag">1st Order</span>}
                  </td>
                  <td>₹{c.minOrderValue}</td>
                  <td>{c.maxDiscount ? `₹${c.maxDiscount}` : 'No cap'}</td>
                  <td>{c.perUserLimit || 1} times</td>
                  <td>
                    <strong>{c.usedCount || 0}</strong>
                    {c.usageLimit ? ` / ${c.usageLimit}` : ' (unlimited)'}
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`status-toggle-btn ${c.isActive ? 'active' : 'inactive'}`}
                      onClick={() => handleToggle(c._id || c.code)}
                      title="Click to toggle status"
                    >
                      {c.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td>{c.expiryDate ? new Date(c.expiryDate).toLocaleDateString() : 'Never'}</td>
                  <td>
                    <div className="action-buttons-group">
                      <button
                        type="button"
                        className="edit-coupon-btn"
                        onClick={() => handleOpenModal(c)}
                        title="Edit coupon"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        type="button"
                        className="delete-coupon-btn"
                        onClick={() => handleDelete(c._id || c.code, c.code)}
                        title="Delete coupon"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content coupon-modal">
            <div className="modal-header">
              <h3>{editingId ? `Edit Coupon: ${formData.code}` : 'Create New Coupon'}</h3>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="admin-modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Coupon Code (Uppercase)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. FESTIVE25"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    maxLength={15}
                  />
                </div>
                <div className="form-group">
                  <label>Discount Type</label>
                  <select
                    value={formData.discountType}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                  >
                    <option value="percentage">Percentage Discount (%)</option>
                    <option value="flat">Flat Cash Discount (₹)</option>
                    <option value="free_delivery">Free Delivery</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Offer Description / Tagline</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Get 25% discount on all orders above ₹399!"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Discount Value ({formData.discountType === 'percentage' ? '%' : '₹'})</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Minimum Order Value (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.minOrderValue}
                    onChange={(e) => setFormData({ ...formData, minOrderValue: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Maximum Discount Cap (₹)</label>
                  <input
                    type="number"
                    placeholder="Leave empty for no cap"
                    value={formData.maxDiscount}
                    onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Global Total Usage Limit</label>
                  <input
                    type="number"
                    placeholder="Unlimited if empty"
                    value={formData.usageLimit}
                    onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Max Times Per User</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.perUserLimit}
                    onChange={(e) => setFormData({ ...formData, perUserLimit: e.target.value })}
                  />
                </div>
              </div>

              <div className="checkboxes-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.firstOrderOnly}
                    onChange={(e) => setFormData({ ...formData, firstOrderOnly: e.target.checked })}
                  />
                  <span>First-Order-Only restriction</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                  <span>Active & Ready for use</span>
                </label>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="save-btn">
                  {editingId ? 'Update Coupon' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
