import { createContext, useContext, useState, useCallback } from 'react'
import { SUPPORTED_CITIES, DEFAULT_CITY, matchSupportedCity } from '../data/cities'
import { apiFetch } from '../api/apiConfig'

const CityContext = createContext(null)

export const CITY_STORAGE_KEY = 'bitebox_selected_city'

export function CityProvider({ children }) {
  // Load saved city or fallback to Bengaluru
  const [selectedCity, setSelectedCityState] = useState(() => {
    try {
      const saved = localStorage.getItem(CITY_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        const matched = matchSupportedCity(parsed.slug || parsed.name)
        if (matched) return matched
      }
    } catch {
      // fallback
    }
    return DEFAULT_CITY
  })

  const [isDetectingLocation, setIsDetectingLocation] = useState(false)
  const [locationError, setLocationError] = useState(null)
  const [cartConflict, setCartConflict] = useState(null) // { pendingCity, currentCity, onConfirm, onCancel }

  // Set city and persist to localStorage
  const setSelectedCity = useCallback((city) => {
    if (!city) return
    const matched = typeof city === 'string' ? matchSupportedCity(city) : matchSupportedCity(city.slug || city.name)
    const cityToSet = matched || city
    setSelectedCityState(cityToSet)
    try {
      localStorage.setItem(CITY_STORAGE_KEY, JSON.stringify(cityToSet))
    } catch {
      // ignore
    }
  }, [])

  // Guarded city change with cart items check
  const changeCityWithCartCheck = useCallback((targetCity, cart = [], clearCartCallback = () => {}) => {
    const matchedTarget = typeof targetCity === 'string' ? matchSupportedCity(targetCity) : matchSupportedCity(targetCity.slug || targetCity.name)
    if (!matchedTarget) return { success: false, reason: 'unsupported' }

    if (matchedTarget.slug === selectedCity.slug) {
      return { success: true, changed: false }
    }

    // Check if cart has items
    if (Array.isArray(cart) && cart.length > 0) {
      return new Promise((resolve) => {
        setCartConflict({
          pendingCity: matchedTarget,
          currentCity: selectedCity,
          itemCount: cart.reduce((t, i) => t + (i.qty || 1), 0),
          onConfirm: () => {
            clearCartCallback()
            setSelectedCity(matchedTarget)
            setCartConflict(null)
            resolve({ success: true, changed: true, clearedCart: true })
          },
          onCancel: () => {
            setCartConflict(null)
            resolve({ success: false, cancelled: true })
          },
        })
      })
    }

    setSelectedCity(matchedTarget)
    return Promise.resolve({ success: true, changed: true })
  }, [selectedCity, setSelectedCity])

  // Detect current location via Browser Geolocation API
  const detectCurrentLocation = useCallback(async () => {
    setIsDetectingLocation(true)
    setLocationError(null)

    if (!('geolocation' in navigator)) {
      setIsDetectingLocation(false)
      const err = 'Geolocation is not supported by your browser.'
      setLocationError(err)
      return { success: false, message: err }
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords
          let detectedCityName = ''

          // 1. Try Google Maps Geocoder if loaded in browser
          if (window.google?.maps?.Geocoder) {
            try {
              const geocoder = new window.google.maps.Geocoder()
              const geocodeRes = await geocoder.geocode({
                location: { lat: latitude, lng: longitude },
              })
              if (geocodeRes.results && geocodeRes.results.length > 0) {
                for (const comp of geocodeRes.results[0].address_components) {
                  if (comp.types.includes('locality')) {
                    detectedCityName = comp.long_name
                    break
                  }
                  if (comp.types.includes('administrative_area_level_2')) {
                    detectedCityName = comp.long_name
                  }
                }
              }
            } catch {
              // fallback to backend
            }
          }

          // 2. Call backend /api/v1/cities/detect endpoint
          try {
            const res = await apiFetch('/cities/detect', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                latitude,
                longitude,
                cityName: detectedCityName || undefined,
              }),
            })
            const data = await res.json()

            setIsDetectingLocation(false)

            if (data.success && data.city && data.supported) {
              const matched = matchSupportedCity(data.city.slug || data.city.name) || data.city
              resolve({ success: true, city: matched, coordinates: { lat: latitude, lng: longitude } })
              return
            }

            if (data.supported === false) {
              const msg = `BiteBox is not available in ${data.detectedCity || 'your city'} yet.`
              setLocationError(msg)
              resolve({
                success: false,
                unsupported: true,
                detectedCity: data.detectedCity,
                message: msg,
              })
              return
            }
          } catch {
            // Local client-side fallback matching if backend fails
          }

          // 3. Client-side fallback: Match detected name or coordinates against SUPPORTED_CITIES
          const matched = matchSupportedCity(detectedCityName)
          setIsDetectingLocation(false)

          if (matched) {
            resolve({ success: true, city: matched, coordinates: { lat: latitude, lng: longitude } })
          } else {
            const msg = detectedCityName
              ? `BiteBox is not available in ${detectedCityName} yet.`
              : 'Unable to determine your city. Please choose from the supported cities.'
            setLocationError(msg)
            resolve({
              success: false,
              unsupported: true,
              detectedCity: detectedCityName,
              message: msg,
            })
          }
        },
        (error) => {
          setIsDetectingLocation(false)
          let msg = 'Failed to retrieve your location.'
          if (error.code === error.PERMISSION_DENIED) {
            msg = 'Location permission was denied. Please select your city manually.'
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            msg = 'Location position is currently unavailable.'
          } else if (error.code === error.TIMEOUT) {
            msg = 'Location request timed out. Please try again or select manually.'
          }
          setLocationError(msg)
          resolve({ success: false, message: msg, permissionDenied: error.code === error.PERMISSION_DENIED })
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      )
    })
  }, [])

  return (
    <CityContext.Provider
      value={{
        selectedCity,
        setSelectedCity,
        supportedCities: SUPPORTED_CITIES,
        popularCities: SUPPORTED_CITIES.filter((c) => c.isPopular),
        detectCurrentLocation,
        changeCityWithCartCheck,
        cartConflict,
        setCartConflict,
        isDetectingLocation,
        locationError,
        setLocationError,
      }}
    >
      {children}
    </CityContext.Provider>
  )
}

export function useCity() {
  const context = useContext(CityContext)
  if (!context) {
    throw new Error('useCity must be used within a CityProvider')
  }
  return context
}
