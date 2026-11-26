import { useEffect, useRef, useState } from 'react';
import { useGoogleMaps, loadGoogleMaps } from './useGoogleMaps';

// Default coordinates: Bandra West / Koramangala
const DEFAULT_CENTER = { lat: 19.0607, lng: 72.8362 };

export default function GoogleMap({
  center = DEFAULT_CENTER,
  zoom = 16,
  markerPosition = DEFAULT_CENTER,
  draggable = true,
  onMarkerDragEnd = () => {},
  onMapClick = () => {},
  className = '',
  children,
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerInstanceRef = useRef(null);

  const { isLoaded, loadError } = useGoogleMaps();
  const [internalError, setInternalError] = useState(null);

  // Initialize Google Map
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;
    if (mapInstanceRef.current) return;

    loadGoogleMaps()
      .then((maps) => {
        if (!mapRef.current) return;

        const map = new maps.Map(mapRef.current, {
          center: { lat: center.lat, lng: center.lng },
          zoom,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: 'greedy',
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels.icon',
              stylers: [{ visibility: 'off' }],
            },
            {
              featureType: 'transit',
              elementType: 'all',
              stylers: [{ visibility: 'off' }],
            },
          ],
        });

        // Custom BiteBox Orange Marker Pin
        const marker = new maps.Marker({
          position: { lat: markerPosition.lat, lng: markerPosition.lng },
          map,
          draggable,
          animation: maps.Animation.DROP,
          title: 'Delivery Destination (Drag to adjust)',
          icon: {
            path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
            fillColor: '#ff5200',
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: '#ffffff',
            scale: 2,
            anchor: new maps.Point(12, 22),
          },
        });

        marker.addListener('dragend', () => {
          const pos = marker.getPosition();
          if (pos) {
            onMarkerDragEnd({ lat: pos.lat(), lng: pos.lng() });
          }
        });

        map.addListener('click', (e) => {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          marker.setPosition({ lat, lng });
          onMapClick({ lat, lng });
          onMarkerDragEnd({ lat, lng });
        });

        mapInstanceRef.current = map;
        markerInstanceRef.current = marker;
      })
      .catch((err) => {
        setInternalError(err);
      });

    return () => {
      if (markerInstanceRef.current) {
        markerInstanceRef.current.setMap(null);
        markerInstanceRef.current = null;
      }
      mapInstanceRef.current = null;
    };
  }, [isLoaded]);

  // Update center when center prop changes
  useEffect(() => {
    if (mapInstanceRef.current && center) {
      mapInstanceRef.current.panTo({ lat: center.lat, lng: center.lng });
    }
  }, [center.lat, center.lng]);

  // Update marker position when markerPosition prop changes
  useEffect(() => {
    if (markerInstanceRef.current && markerPosition) {
      markerInstanceRef.current.setPosition({
        lat: markerPosition.lat,
        lng: markerPosition.lng,
      });
    }
  }, [markerPosition.lat, markerPosition.lng]);

  if (loadError || internalError) {
    return (
      <div className={`google-map-fallback-wrap ${className}`}>
        <div className="google-map-fallback-banner">
          <span className="fallback-icon">📍</span>
          <div>
            <strong>Interactive Map Offline / Key Restricted</strong>
            <p>
              Google Maps API ({loadError?.message || internalError?.message || 'Access notice'}).
              You can still search your location or enter your address below.
            </p>
          </div>
        </div>
        <div className="google-map-mock-canvas">
          <div className="mock-map-pin">
            <span>📍</span>
            <strong>Selected Coordinates</strong>
            <small>
              {markerPosition.lat.toFixed(4)}, {markerPosition.lng.toFixed(4)}
            </small>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={`google-map-loading-skeleton ${className}`}>
        <div className="status-spinner" />
        <p>Loading Google Maps Platform...</p>
      </div>
    );
  }

  return (
    <div className={`google-map-wrapper ${className}`}>
      <div ref={mapRef} className="google-map-container" />
      {children}
    </div>
  );
}
