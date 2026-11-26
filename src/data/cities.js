/**
 * 11 Supported Indian Cities for BiteBox Platform
 */
export const SUPPORTED_CITIES = [
  {
    name: 'Indore',
    slug: 'indore',
    state: 'Madhya Pradesh',
    country: 'India',
    isActive: true,
    isPopular: true,
    coordinates: { lat: 22.7196, lng: 75.8577 },
    popularAreas: ['Vijay Nagar', 'Palasia', 'Chappan Dukan', 'Sarafa Bazaar', 'Bhawarkua', 'Ranjeet Hanuman'],
    aliases: ['indore', 'indur'],
  },
  {
    name: 'Ahmedabad',
    slug: 'ahmedabad',
    state: 'Gujarat',
    country: 'India',
    isActive: true,
    isPopular: true,
    coordinates: { lat: 23.0225, lng: 72.5714 },
    popularAreas: ['Navrangpura', 'Bodakdev', 'Satellite', 'Manek Chowk', 'Vastrapur', 'Prahlad Nagar'],
    aliases: ['ahmedabad', 'amdavad', 'ahmadabad'],
  },
  {
    name: 'Mumbai',
    slug: 'mumbai',
    state: 'Maharashtra',
    country: 'India',
    isActive: true,
    isPopular: true,
    coordinates: { lat: 19.0760, lng: 72.8777 },
    popularAreas: ['Bandra West', 'Andheri West', 'Juhu', 'Powai', 'Dadar', 'BKC', 'Colaba'],
    aliases: ['mumbai', 'bombay'],
  },
  {
    name: 'Nagpur',
    slug: 'nagpur',
    state: 'Maharashtra',
    country: 'India',
    isActive: true,
    isPopular: true,
    coordinates: { lat: 21.1458, lng: 79.0882 },
    popularAreas: ['Dharampeth', 'Sitabuldi', 'Sadar', 'Ramdaspeth', 'Pratap Nagar', 'Civil Lines'],
    aliases: ['nagpur'],
  },
  {
    name: 'Delhi',
    slug: 'delhi',
    state: 'Delhi',
    country: 'India',
    isActive: true,
    isPopular: true,
    coordinates: { lat: 28.6139, lng: 77.2090 },
    popularAreas: ['Connaught Place', 'Hauz Khas', 'Chandni Chowk', 'Saket', 'Lajpat Nagar', 'Karol Bagh'],
    aliases: ['delhi', 'new delhi', 'ncr'],
  },
  {
    name: 'Raipur',
    slug: 'raipur',
    state: 'Chhattisgarh',
    country: 'India',
    isActive: true,
    isPopular: true,
    coordinates: { lat: 21.2514, lng: 81.6296 },
    popularAreas: ['Telibandha', 'Pandri', 'Shankar Nagar', 'Civil Lines', 'Samta Colony', 'VIP Road'],
    aliases: ['raipur'],
  },
  {
    name: 'Neemuch',
    slug: 'neemuch',
    state: 'Madhya Pradesh',
    country: 'India',
    isActive: true,
    isPopular: true,
    coordinates: { lat: 24.4752, lng: 74.8694 },
    popularAreas: ['Station Road', 'Gandhi Nagar', 'Scheme No. 36', 'Vikas Nagar', 'Bagha Hana'],
    aliases: ['neemuch', 'nimach'],
  },
  {
    name: 'Kolkata',
    slug: 'kolkata',
    state: 'West Bengal',
    country: 'India',
    isActive: true,
    isPopular: true,
    coordinates: { lat: 22.5726, lng: 88.3639 },
    popularAreas: ['Park Street', 'Salt Lake', 'Ballygunge', 'New Town', 'Esplanade', 'Howrah'],
    aliases: ['kolkata', 'calcutta'],
  },
  {
    name: 'Bengaluru',
    slug: 'bengaluru',
    state: 'Karnataka',
    country: 'India',
    isActive: true,
    isPopular: true,
    coordinates: { lat: 12.9716, lng: 77.5946 },
    popularAreas: ['Koramangala', 'Indiranagar', 'HSR Layout', 'Whitefield', 'Church Street', 'Jayanagar', 'MG Road'],
    aliases: ['bengaluru', 'bangalore'],
  },
  {
    name: 'Chennai',
    slug: 'chennai',
    state: 'Tamil Nadu',
    country: 'India',
    isActive: true,
    isPopular: true,
    coordinates: { lat: 13.0827, lng: 80.2707 },
    popularAreas: ['Anna Nagar', 'T. Nagar', 'Adyar', 'Mylapore', 'Besant Nagar', 'Nungambakkam'],
    aliases: ['chennai', 'madras'],
  },
  {
    name: 'Hyderabad',
    slug: 'hyderabad',
    state: 'Telangana',
    country: 'India',
    isActive: true,
    isPopular: true,
    coordinates: { lat: 17.3850, lng: 78.4867 },
    popularAreas: ['Banjara Hills', 'Jubilee Hills', 'Hitech City', 'Madhapur', 'Gachibowli', 'Charminar'],
    aliases: ['hyderabad', 'secunderabad'],
  },
];

export const DEFAULT_CITY = SUPPORTED_CITIES.find((c) => c.slug === 'bengaluru') || SUPPORTED_CITIES[0];

/**
 * Match a raw detected city name against supported cities
 */
export function matchSupportedCity(rawName) {
  if (!rawName || typeof rawName !== 'string') return null;
  const clean = rawName.trim().toLowerCase();

  return (
    SUPPORTED_CITIES.find(
      (c) =>
        c.name.toLowerCase() === clean ||
        c.slug === clean ||
        c.aliases.some((alias) => clean.includes(alias) || alias.includes(clean))
    ) || null
  );
}
