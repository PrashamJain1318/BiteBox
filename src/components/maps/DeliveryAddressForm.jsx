import { useState } from 'react';

export default function DeliveryAddressForm({
  selectedLocation = {},
  initialValues = {},
  onSave = () => {},
  onBackToMap = () => {},
  isSaving = false,
}) {
  const [formData, setFormData] = useState({
    fullName: initialValues.fullName || '',
    phone: initialValues.phone || '',
    houseNumber: initialValues.houseNumber || '',
    apartment: initialValues.apartment || '',
    landmark: initialValues.landmark || '',
    label: initialValues.label || 'Home',
    fullAddress: initialValues.fullAddress || selectedLocation.fullAddress || '',
    isDefault: initialValues.isDefault !== undefined ? initialValues.isDefault : true,
  });

  const [validationError, setValidationError] = useState('');

  const addressLabels = [
    { id: 'Home', icon: '🏠', title: 'Home' },
    { id: 'Work', icon: '💼', title: 'Work' },
    { id: 'College', icon: '🎓', title: 'College' },
    { id: 'Other', icon: '📍', title: 'Other' },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError('');

    if (!formData.fullName.trim()) {
      setValidationError('Please provide the recipient name.');
      return;
    }
    if (!formData.phone.trim() || formData.phone.trim().length < 10) {
      setValidationError('Please provide a valid 10-digit contact phone number.');
      return;
    }
    if (!formData.houseNumber.trim()) {
      setValidationError('Please provide your flat, house, or floor number.');
      return;
    }
    if (!formData.fullAddress.trim()) {
      setValidationError('Delivery address line is required.');
      return;
    }

    const coordinates = selectedLocation.coordinates || {
      lat: 19.0607,
      lng: 72.8362,
    };

    onSave({
      fullName: formData.fullName.trim(),
      phone: formData.phone.trim(),
      label: formData.label,
      tag: formData.label,
      houseNumber: formData.houseNumber.trim(),
      apartment: formData.apartment.trim(),
      landmark: formData.landmark.trim(),
      addressLine: `${formData.houseNumber.trim()}${
        formData.apartment.trim() ? `, ${formData.apartment.trim()}` : ''
      }`,
      fullAddress: formData.fullAddress.trim(),
      area: selectedLocation.area || 'Locality',
      city: selectedLocation.city || 'Mumbai',
      pincode: selectedLocation.pincode || '400050',
      placeId: selectedLocation.placeId || '',
      coordinates,
      isDefault: formData.isDefault,
    });
  };

  return (
    <form className="delivery-address-form" onSubmit={handleSubmit}>
      <div className="address-form-header">
        <button
          type="button"
          className="back-to-map-btn"
          onClick={onBackToMap}
          title="Adjust location on map"
        >
          ← Adjust Pin on Map
        </button>
        <span className="address-form-badge">STEP 2: ADDRESS DETAILS</span>
      </div>

      {/* Selected Location Summary Card */}
      <div className="selected-location-mini-card">
        <span className="location-pin-icon">📍</span>
        <div className="location-mini-text">
          <strong>Selected Pin Location</strong>
          <p>{formData.fullAddress || 'Selected on Google Map'}</p>
          {selectedLocation.coordinates && (
            <small className="coordinates-tag">
              GPS: {selectedLocation.coordinates.lat.toFixed(4)},{' '}
              {selectedLocation.coordinates.lng.toFixed(4)}
            </small>
          )}
        </div>
      </div>

      {validationError && (
        <div className="address-form-error-alert" role="alert">
          <span>⚠️</span> {validationError}
        </div>
      )}

      {/* Contact Details */}
      <div className="form-row-two-col">
        <div className="form-group">
          <label htmlFor="addr-fullname">
            Recipient Name <span className="req">*</span>
          </label>
          <input
            id="addr-fullname"
            type="text"
            className="form-input"
            placeholder="e.g. Prasham Jain"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="addr-phone">
            10-Digit Mobile Number <span className="req">*</span>
          </label>
          <input
            id="addr-phone"
            type="tel"
            className="form-input"
            placeholder="e.g. 9876543210"
            maxLength={13}
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
          />
        </div>
      </div>

      {/* Flat & Society */}
      <div className="form-row-two-col">
        <div className="form-group">
          <label htmlFor="addr-house">
            Flat / House / Floor No. <span className="req">*</span>
          </label>
          <input
            id="addr-house"
            type="text"
            className="form-input"
            placeholder="e.g. Flat 402, 4th Floor"
            value={formData.houseNumber}
            onChange={(e) => setFormData({ ...formData, houseNumber: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="addr-apartment">Apartment / Society / Building</label>
          <input
            id="addr-apartment"
            type="text"
            className="form-input"
            placeholder="e.g. Sunshine Heights"
            value={formData.apartment}
            onChange={(e) => setFormData({ ...formData, apartment: e.target.value })}
          />
        </div>
      </div>

      {/* Landmark & Full Street */}
      <div className="form-group">
        <label htmlFor="addr-landmark">Nearby Landmark (Optional)</label>
        <input
          id="addr-landmark"
          type="text"
          className="form-input"
          placeholder="e.g. Opposite National College, Next to ICICI ATM"
          value={formData.landmark}
          onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
        />
      </div>

      <div className="form-group">
        <label htmlFor="addr-full">Full Street Address & Area</label>
        <textarea
          id="addr-full"
          className="form-textarea"
          rows={2}
          value={formData.fullAddress}
          onChange={(e) => setFormData({ ...formData, fullAddress: e.target.value })}
          placeholder="Complete street address details"
          required
        />
      </div>

      {/* Address Label Pills */}
      <div className="form-group">
        <label>Save Address As</label>
        <div className="address-label-pills" role="radiogroup">
          {addressLabels.map((lbl) => (
            <button
              key={lbl.id}
              type="button"
              className={`address-pill-btn ${formData.label === lbl.id ? 'active' : ''}`}
              onClick={() => setFormData({ ...formData, label: lbl.id })}
            >
              <span>{lbl.icon}</span>
              <span>{lbl.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Default Checkbox */}
      <div className="form-checkbox-wrap">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={formData.isDefault}
            onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
          />
          <span>Make this my primary default delivery address</span>
        </label>
      </div>

      <div className="form-actions-row">
        <button type="button" className="btn-secondary" onClick={onBackToMap}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={isSaving}>
          {isSaving ? 'Saving Address...' : 'Save & Deliver Here →'}
        </button>
      </div>
    </form>
  );
}
