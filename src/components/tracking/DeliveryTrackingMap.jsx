import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Default fallback coordinates (Bengaluru - Koramangala to HSR Layout)
const DEFAULT_RESTAURANT = {
  name: 'BiteBox Central Kitchen (Koramangala)',
  lat: 12.9352,
  lng: 77.6245,
};

const DEFAULT_CUSTOMER = {
  name: 'Delivery Address',
  lat: 12.9121,
  lng: 77.6446,
};

const DEFAULT_ROUTE = [
  [12.9352, 77.6245],
  [12.9328, 77.6280],
  [12.9275, 77.6322],
  [12.9230, 77.6365],
  [12.9185, 77.6402],
  [12.9145, 77.6428],
  [12.9121, 77.6446],
];

export default function DeliveryTrackingMap({
  order = {},
  tracking = {},
  partner = null,
  orderStatus = 'placed',
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const partnerMarkerRef = useRef(null);
  const routePolylineRef = useRef(null);

  const [mapReady, setMapReady] = useState(false);

  // Extract coordinates safely
  const restaurant = tracking?.restaurantLocation || DEFAULT_RESTAURANT;
  const customer = tracking?.customerLocation || DEFAULT_CUSTOMER;
  const partnerLoc = tracking?.partnerLocation || {
    lat: restaurant.lat,
    lng: restaurant.lng,
    speedKmh: 0,
    heading: 'At Restaurant',
  };
  const routeCoords = tracking?.routeCoordinates || DEFAULT_ROUTE;
  const etaMinutes = tracking?.etaMinutes ?? (orderStatus === 'delivered' ? 0 : 25);
  const isDemo = tracking?.isDemoMode ?? true;

  // 1. Initialize Leaflet Map on mount
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Prevent duplicate map instances
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: false, // Prevent page scrolling trap
    });

    mapInstanceRef.current = map;

    // OpenStreetMap standard tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Custom HTML DivIcons for clear modern presentation without missing asset bugs
    const restaurantIcon = L.divIcon({
      className: 'custom-map-marker restaurant-marker',
      html: `
        <div class="marker-pin restaurant-pin">
          <span class="marker-emoji">🏪</span>
        </div>
        <div class="marker-label">BiteBox Kitchen</div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 40],
      popupAnchor: [0, -36],
    });

    const customerIcon = L.divIcon({
      className: 'custom-map-marker customer-marker',
      html: `
        <div class="marker-pin customer-pin">
          <span class="marker-emoji">🏠</span>
        </div>
        <div class="marker-label">Delivery Address</div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 40],
      popupAnchor: [0, -36],
    });

    const partnerIcon = L.divIcon({
      className: 'custom-map-marker partner-marker',
      html: `
        <div class="marker-pulse-ring"></div>
        <div class="marker-pin partner-pin">
          <span class="marker-emoji">🛵</span>
        </div>
        <div class="marker-label rider-name">${partner?.name ? partner.name.split(' ')[0] : 'Valet'}</div>
      `,
      iconSize: [48, 48],
      iconAnchor: [24, 42],
      popupAnchor: [0, -38],
    });

    // Add Restaurant Marker
    L.marker([restaurant.lat, restaurant.lng], { icon: restaurantIcon })
      .addTo(map)
      .bindPopup(`<strong>${restaurant.name || 'BiteBox Central Kitchen'}</strong><br/>Order preparation hub`);

    // Add Customer Marker
    L.marker([customer.lat, customer.lng], { icon: customerIcon })
      .addTo(map)
      .bindPopup(`<strong>${order?.deliveryAddress?.fullName || 'Your Address'}</strong><br/>${order?.deliveryAddress?.area || 'Destination'}`);

    // Add Delivery Partner Marker
    const partnerMarker = L.marker([partnerLoc.lat, partnerLoc.lng], {
      icon: partnerIcon,
      zIndexOffset: 1000,
    }).addTo(map);

    partnerMarker.bindPopup(
      `<strong>${partner?.name || 'Delivery Partner'}</strong><br/>${partner?.vehicleType || 'Motorcycle'}<br/>Rating: ⭐ ${partner?.rating || 4.8}`
    );
    partnerMarkerRef.current = partnerMarker;

    // Route shadow / casing line
    L.polyline(routeCoords, {
      color: '#ffffff',
      weight: 8,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    // Primary route line in BiteBox orange
    const routeLine = L.polyline(routeCoords, {
      color: '#FC8019',
      weight: 5,
      opacity: 0.95,
      dashArray: orderStatus === 'delivered' ? null : '8, 8',
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    routePolylineRef.current = routeLine;

    // Fit bounds nicely with padding
    const bounds = L.latLngBounds([
      [restaurant.lat, restaurant.lng],
      [customer.lat, customer.lng],
      [partnerLoc.lat, partnerLoc.lng],
    ]);
    map.fitBounds(bounds, { padding: [45, 45], maxZoom: 15 });

    setMapReady(true);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Smoothly update partner position and route styling as orders progress
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !partnerMarkerRef.current) return;

    const newLatLng = L.latLng(partnerLoc.lat, partnerLoc.lng);
    partnerMarkerRef.current.setLatLng(newLatLng);

    // Update popup description if partner changes
    if (partner?.name) {
      partnerMarkerRef.current.setPopupContent(
        `<strong>${partner.name}</strong><br/>${partner.vehicleType} (${partner.vehicleNumber})<br/>⭐ ${partner.rating} (${partner.completedDeliveries}+ deliveries)`
      );
    }

    // When status changes to delivered, solid orange line
    if (routePolylineRef.current) {
      if (orderStatus === 'delivered') {
        routePolylineRef.current.setStyle({ dashArray: null, color: '#198754' });
      } else {
        routePolylineRef.current.setStyle({ dashArray: '8, 8', color: '#FC8019' });
      }
    }
  }, [mapReady, partnerLoc.lat, partnerLoc.lng, partner, orderStatus]);

  // Center map on delivery partner
  const handleCenterOnRider = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView([partnerLoc.lat, partnerLoc.lng], 15, {
      animate: true,
      duration: 0.8,
    });
  };

  // Reset to full route view
  const handleFitRoute = () => {
    if (!mapInstanceRef.current) return;
    const bounds = L.latLngBounds([
      [restaurant.lat, restaurant.lng],
      [customer.lat, customer.lng],
      [partnerLoc.lat, partnerLoc.lng],
    ]);
    mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], animate: true });
  };

  return (
    <section className="delivery-map-section" aria-label="Live Delivery Tracking Map">
      {/* Top Map Header & Controls */}
      <div className="delivery-map-header">
        <div className="map-header-left">
          {isDemo && (
            <span className="demo-gps-pill" title="Simulated GPS coordinate telemetry for demonstration">
              <span className="pulse-dot">●</span> Demo GPS — simulated location
            </span>
          )}
          <span className="map-movement-status">
            {orderStatus === 'out_for_delivery'
              ? '🛵 Rider is moving along delivery route'
              : orderStatus === 'delivered'
                ? '✅ Rider arrived at destination'
                : '👨‍🍳 Food preparing at kitchen'}
          </span>
        </div>

        <div className="map-header-controls">
          <button
            type="button"
            className="map-control-btn"
            onClick={handleCenterOnRider}
            title="Center map on delivery valet"
          >
            🎯 Center on Rider
          </button>
          <button
            type="button"
            className="map-control-btn"
            onClick={handleFitRoute}
            title="View entire delivery route"
          >
            🗺️ Entire Route
          </button>
        </div>
      </div>

      {/* Leaflet Map Canvas Container */}
      <div className="delivery-map-viewport">
        <div ref={mapContainerRef} className="leaflet-map-canvas" />

        {/* Floating Live Telemetry Overlay Card */}
        <div className="map-telemetry-card">
          <div className="telemetry-item">
            <span className="telemetry-label">ESTIMATED ARRIVAL</span>
            <strong className="telemetry-value highlight">
              {orderStatus === 'delivered' ? 'Delivered' : `${etaMinutes} mins`}
            </strong>
          </div>
          <div className="telemetry-divider" />
          <div className="telemetry-item">
            <span className="telemetry-label">SPEED</span>
            <strong className="telemetry-value">
              {orderStatus === 'out_for_delivery' ? `${partnerLoc.speedKmh || 28} km/h` : '0 km/h'}
            </strong>
          </div>
          <div className="telemetry-divider" />
          <div className="telemetry-item">
            <span className="telemetry-label">DISTANCE</span>
            <strong className="telemetry-value">
              {orderStatus === 'delivered' ? '0 km' : '4.2 km'}
            </strong>
          </div>
        </div>
      </div>

      {/* Map Legend */}
      <div className="map-legend-row">
        <div className="legend-item">
          <span className="legend-icon restaurant">🏪</span>
          <span>BiteBox Kitchen</span>
        </div>
        <div className="legend-item">
          <span className="legend-icon rider">🛵</span>
          <span>
            {partner?.name ? `${partner.name} (${partner.vehicleType})` : 'Delivery Valet'}
          </span>
        </div>
        <div className="legend-item">
          <span className="legend-icon customer">🏠</span>
          <span>Delivery Destination</span>
        </div>
      </div>
    </section>
  );
}
