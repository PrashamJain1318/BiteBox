import { useEffect, useRef, useState } from 'react';
import { useGoogleMaps, loadGoogleMaps } from './useGoogleMaps';

export default function AddressAutocomplete({
  onPlaceSelect = () => {},
  placeholder = 'Search delivery area, apartment, street or landmark...',
  initialValue = '',
  className = '',
}) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [inputValue, setInputValue] = useState(initialValue);
  const { isLoaded } = useGoogleMaps();

  useEffect(() => {
    setInputValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (!isLoaded || !inputRef.current) return;
    if (autocompleteRef.current) return;

    loadGoogleMaps()
      .then((maps) => {
        if (!inputRef.current || !maps.places) return;

        // Initialize Google Places Autocomplete
        const autocomplete = new maps.places.Autocomplete(inputRef.current, {
          types: ['geocode', 'establishment'],
          componentRestrictions: { country: 'in' }, // Default to India / national
          fields: ['formatted_address', 'geometry', 'place_id', 'address_components', 'name'],
        });

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (!place || !place.geometry || !place.geometry.location) {
            return;
          }

          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const fullAddress = place.formatted_address || place.name || '';
          const placeId = place.place_id || '';

          // Extract locality / area, city, pincode
          let area = '';
          let city = 'Mumbai';
          let pincode = '';

          if (Array.isArray(place.address_components)) {
            place.address_components.forEach((comp) => {
              if (comp.types.includes('sublocality_level_1') || comp.types.includes('sublocality')) {
                area = comp.long_name;
              } else if (comp.types.includes('locality')) {
                city = comp.long_name;
              } else if (comp.types.includes('postal_code')) {
                pincode = comp.long_name;
              }
            });
          }

          setInputValue(fullAddress);
          onPlaceSelect({
            fullAddress,
            placeId,
            coordinates: { lat, lng },
            area: area || place.name || '',
            city,
            pincode,
          });
        });

        autocompleteRef.current = autocomplete;
      })
      .catch((err) => {
        console.warn('Google Places Autocomplete initialization notice:', err.message);
      });

    return () => {
      if (typeof window !== 'undefined' && window.google?.maps?.event && autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
      autocompleteRef.current = null;
    };
  }, [isLoaded]);

  const handleClear = () => {
    setInputValue('');
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div className={`address-autocomplete-container ${className}`}>
      <span className="autocomplete-search-icon">🔍</span>
      <input
        ref={inputRef}
        type="text"
        className="address-autocomplete-input"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder={placeholder}
        aria-label="Search delivery address"
      />
      {inputValue && (
        <button
          type="button"
          className="autocomplete-clear-btn"
          onClick={handleClear}
          aria-label="Clear address search"
          title="Clear"
        >
          ✕
        </button>
      )}
    </div>
  );
}
