import { useState, useCallback, useRef } from 'react';
import GoogleMap from './GoogleMap';
import AddressAutocomplete from './AddressAutocomplete';
import DeliveryAddressForm from './DeliveryAddressForm';
import { loadGoogleMaps } from './useGoogleMaps';

// Default initial location: Bandra West, Mumbai (or Bengaluru)
const DEFAULT_COORDS = { lat: 19.0607, lng: 72.8362 };

export default function DeliveryLocationPicker({
  isOpen = false,
  onClose = () => {},
  onAddressSaved = () => {},
  initialLocation = null,
}) {
  const [step, setStep] = useState(1); // 1: Map Picker, 2: Address Details Form
  const [markerCoords, setMarkerCoords] = useState(
    initialLocation?.coordinates || DEFAULT_COORDS
  );
  const [mapCenter, setMapCenter] = useState(
    initialLocation?.coordinates || DEFAULT_COORDS
  );
  const [selectedAddress, setSelectedAddress] = useState({
    fullAddress: initialLocation?.fullAddress || 'A-402, Sunshine Heights, Linking Road, Bandra West, Mumbai',
    area: initialLocation?.area || 'Bandra West',
    city: initialLocation?.city || 'Mumbai',
    pincode: initialLocation?.pincode || '400050',
    placeId: initialLocation?.placeId || '',
    coordinates: initialLocation?.coordinates || DEFAULT_COORDS,
  });

  const [isLocating, setIsLocating] = useState(false);
  const [geoNotice, setGeoNotice] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const geocoderRef = useRef(null);

  // Reverse geocode lat/lng to street address using Google Geocoding API
  const reverseGeocode = useCallback(async (coords) => {
    try {
      const maps = await loadGoogleMaps();
      if (!geocoderRef.current && maps.Geocoder) {
        geocoderRef.current = new maps.Geocoder();
      }

      if (geocoderRef.current) {
        geocoderRef.current.geocode(
          { location: { lat: coords.lat, lng: coords.lng } },
          (results, status) => {
            if (status === 'OK' && results && results[0]) {
              const res = results[0];
              let area = '';
              let city = '';
              let state = 'Maharashtra';
              let pincode = '';
              let route = '';

              if (Array.isArray(res.address_components)) {
                res.address_components.forEach((c) => {
                  if (
                    c.types.includes('sublocality_level_1') ||
                    c.types.includes('sublocality') ||
                    c.types.includes('sublocality_level_2') ||
                    c.types.includes('neighborhood')
                  ) {
                    if (!area) area = c.long_name;
                  } else if (c.types.includes('locality')) {
                    city = c.long_name;
                  } else if (c.types.includes('administrative_area_level_2') && !city) {
                    city = c.long_name;
                  } else if (c.types.includes('administrative_area_level_1')) {
                    state = c.long_name;
                  } else if (c.types.includes('postal_code')) {
                    pincode = c.long_name;
                  } else if (c.types.includes('route')) {
                    route = c.long_name;
                  }
                });
              }

              if (!city) city = 'Mumbai';
              if (!area) area = route || city;

              setSelectedAddress({
                fullAddress: res.formatted_address,
                placeId: res.place_id || '',
                area,
                city,
                state,
                pincode,
                coordinates: coords,
              });
            } else {
              // Graceful fallback coordinate representation
              setSelectedAddress((prev) => ({
                ...prev,
                coordinates: coords,
                fullAddress: `Selected Location (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`,
              }));
            }
          }
        );
      }
    } catch {
      setSelectedAddress((prev) => ({
        ...prev,
        coordinates: coords,
      }));
    }
  }, []);

  // When marker is dragged or map is clicked
  const handleMarkerDragEnd = (coords) => {
    setMarkerCoords(coords);
    reverseGeocode(coords);
  };

  // When user selects a place from Autocomplete
  const handlePlaceSelect = (place) => {
    if (place.coordinates) {
      setMarkerCoords(place.coordinates);
      setMapCenter(place.coordinates);
      setSelectedAddress(place);
    }
  };

  // Browser Geolocation API
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoNotice('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setGeoNotice('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setMarkerCoords(coords);
        setMapCenter(coords);
        reverseGeocode(coords);
      },
      (err) => {
        setIsLocating(false);
        let msg = 'Could not determine location.';
        if (err.code === 1) {
          msg = 'Location permission denied. Please search your address or pick on map.';
        } else if (err.code === 2) {
          msg = 'Location unavailable. Please search manually.';
        } else if (err.code === 3) {
          msg = 'Location request timed out. Please try again or search manually.';
        }
        setGeoNotice(msg);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Save address callback
  const handleSaveAddress = async (formData) => {
    setIsSaving(true);
    try {
      await onAddressSaved(formData);
      onClose();
      setStep(1);
    } catch (err) {
      alert(err.message || 'Failed to save address.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="delivery-picker-modal-backdrop" role="dialog" aria-modal="true">
      <div className="delivery-picker-modal-card">
        {/* Modal Header */}
        <div className="delivery-picker-header">
          <div className="picker-title-wrap">
            <span className="picker-badge-icon">📍</span>
            <div>
              <h2>{step === 1 ? 'Choose Delivery Location' : 'Complete Delivery Address'}</h2>
              <p>
                {step === 1
                  ? 'Search, drag the pin, or use current location to mark your doorstep'
                  : 'Add house/flat number and contact phone for the delivery partner'}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="picker-close-btn"
            onClick={onClose}
            aria-label="Close delivery picker"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* STEP 1: INTERACTIVE MAP & SEARCH */}
        {step === 1 && (
          <div className="picker-step-map-view">
            {/* Search Bar & Current Location Button */}
            <div className="picker-toolbar">
              <AddressAutocomplete
                onPlaceSelect={handlePlaceSelect}
                initialValue={selectedAddress.fullAddress}
              />
              <button
                type="button"
                className="use-current-location-btn"
                onClick={handleUseCurrentLocation}
                disabled={isLocating}
                title="Detect my current GPS location"
              >
                <span>{isLocating ? '⏳' : '🎯'}</span>
                <span>{isLocating ? 'Locating...' : 'Use My Current Location'}</span>
              </button>
            </div>

            {geoNotice && (
              <div className="picker-geo-alert">
                <span>⚠️</span>
                <span>{geoNotice}</span>
              </div>
            )}

            {/* Interactive Map Viewport */}
            <div className="picker-map-viewport-frame">
              <GoogleMap
                center={mapCenter}
                markerPosition={markerCoords}
                onMarkerDragEnd={handleMarkerDragEnd}
                onMapClick={handleMarkerDragEnd}
                zoom={16}
                className="picker-google-map"
              />
              <div className="map-pin-drag-hint">
                <span>💡 Tip: Drag the red pin directly to your building or entrance</span>
              </div>
            </div>

            {/* Selected Address Preview & Confirmation Card */}
            <div className="picker-location-preview-card">
              <div className="preview-info-col">
                <span className="preview-label">DELIVERING TO</span>
                <strong className="preview-address-title">
                  {selectedAddress.area || 'Selected Location'}
                </strong>
                <p className="preview-full-address">{selectedAddress.fullAddress}</p>
                <small className="preview-coords-text">
                  Coordinates: {markerCoords.lat.toFixed(5)}, {markerCoords.lng.toFixed(5)}
                </small>
              </div>

              <button
                type="button"
                className="confirm-location-btn"
                onClick={() => setStep(2)}
              >
                Confirm Location & Enter House No. →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: ADDRESS DETAILS FORM */}
        {step === 2 && (
          <div className="picker-step-form-view">
            <DeliveryAddressForm
              selectedLocation={{
                ...selectedAddress,
                coordinates: markerCoords,
              }}
              initialValues={initialLocation || {}}
              onSave={handleSaveAddress}
              onBackToMap={() => setStep(1)}
              isSaving={isSaving}
            />
          </div>
        )}
      </div>
    </div>
  );
}
