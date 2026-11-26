import { useState, useEffect } from 'react';

let googleMapsPromise = null;

/**
 * Dynamically load Google Maps JavaScript API with Places and Geometry libraries
 */
export function loadGoogleMaps(apiKey) {
  const key = apiKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (typeof window !== 'undefined' && window.google && window.google.maps) {
    return Promise.resolve(window.google.maps);
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  if (!key) {
    return Promise.reject(
      new Error('Google Maps API key is missing. Set VITE_GOOGLE_MAPS_API_KEY in .env.')
    );
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    // Check if script element already exists in document
    const existingScript = document.querySelector(
      'script[src*="maps.googleapis.com/maps/api/js"]'
    );

    if (existingScript) {
      if (window.google && window.google.maps) {
        return resolve(window.google.maps);
      }
      existingScript.addEventListener('load', () => {
        if (window.google && window.google.maps) {
          resolve(window.google.maps);
        } else {
          reject(new Error('Google Maps loaded but window.google.maps is undefined.'));
        }
      });
      existingScript.addEventListener('error', (e) => reject(e));
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      key
    )}&libraries=places,geometry&loading=async`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (window.google && window.google.maps) {
        resolve(window.google.maps);
      } else {
        reject(new Error('Google Maps SDK loaded but maps object is undefined.'));
      }
    };

    script.onerror = (err) => {
      googleMapsPromise = null;
      reject(err);
    };

    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

/**
 * React hook to access Google Maps SDK state
 */
export function useGoogleMaps() {
  const [isLoaded, setIsLoaded] = useState(
    typeof window !== 'undefined' && Boolean(window.google?.maps)
  );
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (isLoaded) return;

    let mounted = true;
    loadGoogleMaps()
      .then(() => {
        if (mounted) setIsLoaded(true);
      })
      .catch((err) => {
        if (mounted) setLoadError(err);
      });

    return () => {
      mounted = false;
    };
  }, [isLoaded]);

  return { isLoaded, loadError };
}
