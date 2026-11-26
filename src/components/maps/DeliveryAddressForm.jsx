import { useState, useEffect } from 'react';

export default function DeliveryAddressForm({
  selectedLocation = {},
  initialValues = {},
  onSave = () => {},
  onBackToMap = () => {},
  isSaving = false,
}) {
  const [formData, setFormData] = useState({
    fullName: initialValues.fullName || initialValues.recipientName || '',
    phone: initialValues.phone || '',
    houseNumber: initialValues.houseNumber || '',
    apartment: initialValues.apartment || '',
    area: initialValues.area || selectedLocation.area || '',
    city: initialValues.city || selectedLocation.city || 'Mumbai',
    state: initialValues.state || selectedLocation.state || 'Maharashtra',
    pincode: initialValues.pincode || selectedLocation.pincode || '',
    landmark: initialValues.landmark || '',
    label: initialValues.label || initialValues.tag || 'Home',
    fullAddress: initialValues.fullAddress || selectedLocation.fullAddress || '',
    isDefault: initialValues.isDefault !== undefined ? initialValues.isDefault : true,
  });

  const [validationError, setValidationError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Sync with selected location updates from Google Map or Autocomplete
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      area: prev.area || selectedLocation.area || '',
      city: prev.city || selectedLocation.city || 'Mumbai',
      state: prev.state || selectedLocation.state || 'Maharashtra',
      pincode: prev.pincode || selectedLocation.pincode || '',
      fullAddress: prev.fullAddress || selectedLocation.fullAddress || '',
    }));
  }, [selectedLocation]);

  const addressLabels = [
    { id: 'Home', icon: '🏠', title: 'Home' },
    { id: 'Work', icon: '💼', title: 'Work' },
    { id: 'College', icon: '🎓', title: 'College' },
    { id: 'Other', icon: '📍', title: 'Other' },
  ];

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear specific field error as user types
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (validationError) {
      setValidationError('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError('');
    const errors = {};

    // 1. Recipient Name validation
    if (!formData.fullName.trim()) {
      errors.fullName = 'Please enter recipient name.';
    }

    // 2. Phone validation (10 digits)
    const cleanPhone = formData.phone.trim().replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length !== 10) {
      errors.phone = 'Please enter a valid 10-digit mobile number.';
    }

    // 3. Flat / House number validation
    if (!formData.houseNumber.trim()) {
      errors.houseNumber = 'Please enter flat, house, or floor number.';
    }

    // 4. Locality / Area validation
    if (!formData.area.trim()) {
      errors.area = 'Please enter delivery area / locality.';
    }

    // 5. City validation
    if (!formData.city.trim()) {
      errors.city = 'Please enter city.';
    }

    // 6. PIN code validation (6 digits)
    const cleanPincode = formData.pincode.trim().replace(/\D/g, '');
    if (!cleanPincode || cleanPincode.length !== 6) {
      errors.pincode = 'Please enter a valid 6-digit Indian PIN code.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstErrorMessage = Object.values(errors)[0];
      setValidationError(firstErrorMessage);
      return;
    }

    const coordinates = selectedLocation.coordinates || {
      lat: 19.0607,
      lng: 72.8362,
    };

    const streetAddress = `${formData.houseNumber.trim()}${
      formData.apartment.trim() ? `, ${formData.apartment.trim()}` : ''
    }`.trim();

    const formattedFull =
      formData.fullAddress.trim() ||
      `${streetAddress}, ${formData.area.trim()}, ${formData.city.trim()} - ${cleanPincode}`;

    onSave({
      fullName: formData.fullName.trim(),
      recipientName: formData.fullName.trim(),
      phone: cleanPhone,
      label: formData.label,
      tag: formData.label,
      houseNumber: formData.houseNumber.trim(),
      apartment: formData.apartment.trim(),
      landmark: formData.landmark.trim(),
      addressLine: streetAddress,
      address: streetAddress,
      fullAddress: formattedFull,
      area: formData.area.trim(),
      city: formData.city.trim(),
      state: formData.state.trim() || 'Maharashtra',
      pincode: cleanPincode,
      placeId: selectedLocation.placeId || '',
      coordinates,
      isDefault: formData.isDefault,
    });
  };

  return (
    <form className="delivery-address-form" onSubmit={handleSubmit} noValidate>
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

      {/* Row 1: Contact Details */}
      <div className="form-row-two-col">
        <div className="form-group">
          <label htmlFor="addr-fullname">
            Recipient Name <span className="req">*</span>
          </label>
          <input
            id="addr-fullname"
            type="text"
            className={`form-input ${fieldErrors.fullName ? 'input-error' : ''}`}
            placeholder="e.g. Prasham Jain"
            value={formData.fullName}
            onChange={(e) => handleInputChange('fullName', e.target.value)}
            required
          />
          {fieldErrors.fullName && (
            <span className="field-error-msg">{fieldErrors.fullName}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="addr-phone">
            10-Digit Mobile Number <span className="req">*</span>
          </label>
          <input
            id="addr-phone"
            type="tel"
            className={`form-input ${fieldErrors.phone ? 'input-error' : ''}`}
            placeholder="e.g. 9876543210"
            maxLength={10}
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            required
          />
          {fieldErrors.phone && (
            <span className="field-error-msg">{fieldErrors.phone}</span>
          )}
        </div>
      </div>

      {/* Row 2: Flat & Society */}
      <div className="form-row-two-col">
        <div className="form-group">
          <label htmlFor="addr-house">
            Flat / House / Floor No. <span className="req">*</span>
          </label>
          <input
            id="addr-house"
            type="text"
            className={`form-input ${fieldErrors.houseNumber ? 'input-error' : ''}`}
            placeholder="e.g. Flat 402, 4th Floor"
            value={formData.houseNumber}
            onChange={(e) => handleInputChange('houseNumber', e.target.value)}
            required
          />
          {fieldErrors.houseNumber && (
            <span className="field-error-msg">{fieldErrors.houseNumber}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="addr-apartment">Apartment / Society / Building</label>
          <input
            id="addr-apartment"
            type="text"
            className="form-input"
            placeholder="e.g. Sunshine Heights"
            value={formData.apartment}
            onChange={(e) => handleInputChange('apartment', e.target.value)}
          />
        </div>
      </div>

      {/* Row 3: Area / Locality & 6-Digit PIN Code */}
      <div className="form-row-two-col">
        <div className="form-group">
          <label htmlFor="addr-area">
            Delivery Area / Locality <span className="req">*</span>
          </label>
          <input
            id="addr-area"
            type="text"
            className={`form-input ${fieldErrors.area ? 'input-error' : ''}`}
            placeholder="e.g. Bandra West, Linking Road"
            value={formData.area}
            onChange={(e) => handleInputChange('area', e.target.value)}
            required
          />
          {fieldErrors.area && (
            <span className="field-error-msg">{fieldErrors.area}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="addr-pincode">
            6-Digit Postal PIN Code <span className="req">*</span>
          </label>
          <input
            id="addr-pincode"
            type="text"
            className={`form-input ${fieldErrors.pincode ? 'input-error' : ''}`}
            placeholder="e.g. 400050"
            maxLength={6}
            value={formData.pincode}
            onChange={(e) => handleInputChange('pincode', e.target.value)}
            required
          />
          {fieldErrors.pincode && (
            <span className="field-error-msg">{fieldErrors.pincode}</span>
          )}
        </div>
      </div>

      {/* Row 4: City & State */}
      <div className="form-row-two-col">
        <div className="form-group">
          <label htmlFor="addr-city">
            City <span className="req">*</span>
          </label>
          <input
            id="addr-city"
            type="text"
            className={`form-input ${fieldErrors.city ? 'input-error' : ''}`}
            placeholder="e.g. Mumbai"
            value={formData.city}
            onChange={(e) => handleInputChange('city', e.target.value)}
            required
          />
          {fieldErrors.city && (
            <span className="field-error-msg">{fieldErrors.city}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="addr-state">State</label>
          <input
            id="addr-state"
            type="text"
            className="form-input"
            placeholder="e.g. Maharashtra"
            value={formData.state}
            onChange={(e) => handleInputChange('state', e.target.value)}
          />
        </div>
      </div>

      {/* Landmark */}
      <div className="form-group">
        <label htmlFor="addr-landmark">Nearby Landmark (Optional)</label>
        <input
          id="addr-landmark"
          type="text"
          className="form-input"
          placeholder="e.g. Opposite National College, Next to ICICI ATM"
          value={formData.landmark}
          onChange={(e) => handleInputChange('landmark', e.target.value)}
        />
      </div>

      {/* Full Street Address Line */}
      <div className="form-group">
        <label htmlFor="addr-full">Full Street Address (Auto-filled / Editable)</label>
        <textarea
          id="addr-full"
          className="form-textarea"
          rows={2}
          value={formData.fullAddress}
          onChange={(e) => handleInputChange('fullAddress', e.target.value)}
          placeholder="Complete street address details"
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
              onClick={() => handleInputChange('label', lbl.id)}
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
            onChange={(e) => handleInputChange('isDefault', e.target.checked)}
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
