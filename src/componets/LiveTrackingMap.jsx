import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { loadGoogleMaps } from '../components/maps/useGoogleMaps';
import '../style.css';

/**
 * LiveTrackingMap Component
 * High-performance, resilient live order tracking map supporting both
 * Google Maps and Leaflet OSM tiles, with real-time rider GPS telemetry.
 */
export default function LiveTrackingMap({
  tracking = null,
  activeStep = 1,
  orderId = '',
}) {
  const mapContainerRef = useRef(null);
  const mapEngineRef = useRef(null); // 'google' | 'leaflet' | 'canvas'
  const googleMapInstanceRef = useRef(null);
  const leafletMapInstanceRef = useRef(null);

  // Markers and Polylines refs
  const markersRef = useRef({
    kitchen: null,
    destination: null,
    rider: null,
    routePolyline: null,
  });

  const [mapEngine, setMapEngine] = useState('loading'); // 'google' | 'leaflet' | 'canvas' | 'loading'
  const [telemetry, setTelemetry] = useState({
    distanceLeftKm: 0,
    speedKmh: 24,
    statusText: 'Locating courier...',
  });

  // Safe fallback coordinates
  const waypoints = tracking?.route || [
    [12.9352, 77.6245],
    [12.9338, 77.628],
    [12.9315, 77.632],
    [12.9298, 77.6355],
    [12.9279, 77.6385],
  ];

  const restaurant = tracking?.restaurant || {
    lat: waypoints[0][0],
    lng: waypoints[0][1],
    name: 'BiteBox Partner Kitchen',
  };

  const destination = tracking?.destination || {
    lat: waypoints[waypoints.length - 1][0],
    lng: waypoints[waypoints.length - 1][1],
    address: 'Delivery Destination',
  };

  const riderLoc = tracking?.currentLocation || {
    lat: waypoints[0][0],
    lng: waypoints[0][1],
  };

  const partnerName = tracking?.deliveryPartner?.name || 'BiteBox Valet Rider';

  // Distance calculator helper
  const computeDistance = useCallback((lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }, []);

  // Update telemetry details
  useEffect(() => {
    if (riderLoc && destination) {
      const dist = computeDistance(
        riderLoc.lat,
        riderLoc.lng,
        destination.lat,
        destination.lng
      );

      let text = 'Partner Assigned';
      if (activeStep === 1) text = 'Order Placed • Valet being assigned';
      else if (activeStep === 2) text = 'Order Confirmed • Valet reached restaurant';
      else if (activeStep === 3) text = 'Food Preparing in Kitchen';
      else if (activeStep === 4) text = `Rider is on the way • ${dist} km away`;
      else if (activeStep === 5) text = 'Delivered • Enjoy your meal!';

      setTelemetry({
        distanceLeftKm: dist,
        speedKmh: activeStep === 4 ? 26 : 0,
        statusText: text,
      });
    }
  }, [riderLoc, destination, activeStep, computeDistance]);

  // Center on Rider action
  const handleCenterRider = () => {
    if (mapEngineRef.current === 'google' && googleMapInstanceRef.current && riderLoc) {
      googleMapInstanceRef.current.panTo({ lat: riderLoc.lat, lng: riderLoc.lng });
      googleMapInstanceRef.current.setZoom(16);
    } else if (mapEngineRef.current === 'leaflet' && leafletMapInstanceRef.current && riderLoc) {
      leafletMapInstanceRef.current.setView([riderLoc.lat, riderLoc.lng], 16, {
        animate: true,
      });
    }
  };

  // Fit Full Route action
  const handleFitRoute = () => {
    if (mapEngineRef.current === 'google' && googleMapInstanceRef.current && window.google) {
      const bounds = new window.google.maps.LatLngBounds();
      waypoints.forEach(([lat, lng]) => bounds.extend({ lat, lng }));
      googleMapInstanceRef.current.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
    } else if (mapEngineRef.current === 'leaflet' && leafletMapInstanceRef.current) {
      const bounds = L.latLngBounds(waypoints);
      leafletMapInstanceRef.current.fitBounds(bounds, { padding: [40, 40] });
    }
  };

  // 1. Initialize Map (Google Maps preferred, Leaflet fallback)
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    let isMounted = true;

    async function initMap() {
      // 1A. Try loading Google Maps JavaScript API
      try {
        const maps = await loadGoogleMaps();
        if (!isMounted || !mapContainerRef.current) return;

        // Clean previous instances
        container.innerHTML = '';
        const map = new maps.Map(container, {
          center: { lat: riderLoc.lat, lng: riderLoc.lng },
          zoom: 14,
          mapTypeId: maps.MapTypeId.ROADMAP,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }],
            },
            {
              featureType: 'road',
              elementType: 'geometry',
              stylers: [{ lightness: 20 }],
            },
          ],
        });

        // Route Polyline
        const routePath = waypoints.map(([lat, lng]) => ({ lat, lng }));
        const polyline = new maps.Polyline({
          path: routePath,
          geodesic: true,
          strokeColor: '#ff5200',
          strokeOpacity: 0.9,
          strokeWeight: 5,
          map,
        });

        // Kitchen Marker
        const kitchenMarker = new maps.Marker({
          position: { lat: restaurant.lat, lng: restaurant.lng },
          map,
          title: restaurant.name,
          label: {
            text: '🍴',
            fontSize: '18px',
          },
        });

        // Destination Marker
        const destMarker = new maps.Marker({
          position: { lat: destination.lat, lng: destination.lng },
          map,
          title: destination.address,
          label: {
            text: '🏠',
            fontSize: '18px',
          },
        });

        // Rider Marker
        const riderMarker = new maps.Marker({
          position: { lat: riderLoc.lat, lng: riderLoc.lng },
          map,
          title: partnerName,
          label: {
            text: '🛵',
            fontSize: '22px',
          },
          zIndex: 9999,
        });

        const bounds = new maps.LatLngBounds();
        routePath.forEach((pt) => bounds.extend(pt));
        map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });

        googleMapInstanceRef.current = map;
        mapEngineRef.current = 'google';
        markersRef.current = {
          kitchen: kitchenMarker,
          destination: destMarker,
          rider: riderMarker,
          routePolyline: polyline,
        };

        if (isMounted) setMapEngine('google');
        return;
      } catch (googleErr) {
        console.warn('Google Maps not available for live tracking, using Leaflet OSM:', googleErr.message);
      }

      // 1B. Fallback to Leaflet OpenStreetMap
      try {
        if (!isMounted || !mapContainerRef.current) return;

        // Clean container
        container.innerHTML = '';
        if (container._leaflet_id) {
          delete container._leaflet_id;
        }

        const map = L.map(container, {
          center: [riderLoc.lat, riderLoc.lng],
          zoom: 14,
          zoomControl: true,
          scrollWheelZoom: false,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);

        // Draw Polyline
        const polyline = L.polyline(waypoints, {
          color: '#ff5200',
          weight: 5,
          opacity: 0.88,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);

        // Kitchen Marker
        const kitchenIcon = L.divIcon({
          className: 'bitebox-map-marker kitchen-pin',
          html: `<div class="pin-bubble orange"><span>🍴</span></div><div class="pin-label">Kitchen</div>`,
          iconSize: [42, 54],
          iconAnchor: [21, 54],
        });
        const kitchenMarker = L.marker([restaurant.lat, restaurant.lng], { icon: kitchenIcon })
          .addTo(map)
          .bindPopup(`<strong>${restaurant.name}</strong><br/>Order Prepared Here`);

        // Destination Marker
        const destIcon = L.divIcon({
          className: 'bitebox-map-marker destination-pin',
          html: `<div class="pin-bubble green"><span>🏠</span></div><div class="pin-label">You</div>`,
          iconSize: [42, 54],
          iconAnchor: [21, 54],
        });
        const destMarker = L.marker([destination.lat, destination.lng], { icon: destIcon })
          .addTo(map)
          .bindPopup(`<strong>Delivery Destination</strong><br/>${destination.address}`);

        // Rider Marker
        const riderIcon = L.divIcon({
          className: 'bitebox-map-marker rider-pin',
          html: `
            <div class="rider-pin-wrap">
              <div class="rider-radar-wave"></div>
              <div class="pin-bubble rider"><span>🛵</span></div>
            </div>
            <div class="pin-label rider-name">${partnerName.split(' ')[0]}</div>
          `,
          iconSize: [46, 56],
          iconAnchor: [23, 56],
        });
        const riderMarker = L.marker([riderLoc.lat, riderLoc.lng], {
          icon: riderIcon,
          zIndexOffset: 1000,
        })
          .addTo(map)
          .bindPopup(`<strong>${partnerName}</strong><br/>🛵 Valet Rider`);

        const bounds = L.latLngBounds(waypoints);
        map.fitBounds(bounds, { padding: [40, 40] });

        setTimeout(() => {
          map.invalidateSize();
        }, 200);

        leafletMapInstanceRef.current = map;
        mapEngineRef.current = 'leaflet';
        markersRef.current = {
          kitchen: kitchenMarker,
          destination: destMarker,
          rider: riderMarker,
          routePolyline: polyline,
        };

        if (isMounted) setMapEngine('leaflet');
      } catch (leafletErr) {
        console.warn('Leaflet initialization warning:', leafletErr.message);
        if (isMounted) setMapEngine('canvas');
      }
    }

    initMap();

    // Resize observer to prevent grey boxes
    const resizeObserver = new ResizeObserver(() => {
      if (mapEngineRef.current === 'leaflet' && leafletMapInstanceRef.current) {
        leafletMapInstanceRef.current.invalidateSize();
      } else if (mapEngineRef.current === 'google' && googleMapInstanceRef.current && window.google) {
        window.google.maps.event.trigger(googleMapInstanceRef.current, 'resize');
      }
    });
    resizeObserver.observe(container);

    return () => {
      isMounted = false;
      resizeObserver.disconnect();
      if (leafletMapInstanceRef.current) {
        leafletMapInstanceRef.current.remove();
        leafletMapInstanceRef.current = null;
      }
      googleMapInstanceRef.current = null;
      mapEngineRef.current = null;
    };
  }, [orderId]); // Stable on orderId

  // 2. Real-time Rider Position & Telemetry Updates
  useEffect(() => {
    if (!riderLoc) return;

    if (mapEngineRef.current === 'google') {
      const { rider, routePolyline } = markersRef.current;
      if (rider && window.google) {
        rider.setPosition({ lat: riderLoc.lat, lng: riderLoc.lng });
      }
      if (routePolyline && waypoints) {
        routePolyline.setPath(waypoints.map(([lat, lng]) => ({ lat, lng })));
      }
    } else if (mapEngineRef.current === 'leaflet') {
      const { rider, routePolyline } = markersRef.current;
      if (rider) {
        rider.setLatLng([riderLoc.lat, riderLoc.lng]);
        const riderIcon = L.divIcon({
          className: 'bitebox-map-marker rider-pin',
          html: `
            <div class="rider-pin-wrap">
              <div class="rider-radar-wave"></div>
              <div class="pin-bubble rider"><span>🛵</span></div>
            </div>
            <div class="pin-label rider-name">${partnerName.split(' ')[0]}</div>
          `,
          iconSize: [46, 56],
          iconAnchor: [23, 56],
        });
        rider.setIcon(riderIcon);
      }
      if (routePolyline && waypoints) {
        routePolyline.setLatLngs(waypoints);
      }
    }
  }, [riderLoc, waypoints, partnerName]);

  return (
    <div className="live-tracking-map-wrapper">
      {/* Map Toolbar & Telemetry Header */}
      <div className="tracking-map-toolbar">
        <div className="telemetry-info-group">
          <div className="telemetry-status-badge">
            <span className="live-indicator-dot"></span>
            <strong>{telemetry.statusText}</strong>
          </div>
          <div className="telemetry-stats-row">
            <span className="stat-pill">
              📍 <strong>{telemetry.distanceLeftKm} km</strong> to doorstep
            </span>
            {telemetry.speedKmh > 0 && (
              <span className="stat-pill speed">
                ⚡ <strong>{telemetry.speedKmh} km/h</strong> speed
              </span>
            )}
            <span className="stat-pill engine-badge">
              {mapEngine === 'google' ? '🌐 Google Maps' : '🗺️ OpenStreetMap'}
            </span>
          </div>
        </div>

        <div className="map-actions-group">
          <button
            type="button"
            className="map-action-pill-btn"
            onClick={handleCenterRider}
            title="Focus camera on delivery rider"
          >
            🛵 Center on Rider
          </button>
          <button
            type="button"
            className="map-action-pill-btn"
            onClick={handleFitRoute}
            title="Fit full route between restaurant and delivery address"
          >
            🗺️ Fit Route
          </button>
        </div>
      </div>

      {/* Main Map Canvas Viewport */}
      <div className="tracking-map-viewport">
        <div
          ref={mapContainerRef}
          className="tracking-map-element"
          id="tracking-live-map-canvas"
        />

        {/* Floating Rider Status Widget */}
        <div className="rider-floating-hud">
          <div className="rider-hud-left">
            <span className="hud-rider-icon">🛵</span>
            <div>
              <strong>{partnerName}</strong>
              <p>
                {activeStep === 4
                  ? 'Moving towards your location'
                  : activeStep === 5
                  ? 'Order Delivered'
                  : 'At Restaurant Kitchen'}
              </p>
            </div>
          </div>
          <div className="rider-hud-coords">
            GPS: {riderLoc.lat.toFixed(4)}, {riderLoc.lng.toFixed(4)}
          </div>
        </div>
      </div>
    </div>
  );
}
