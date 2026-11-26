import { products } from './product.js';
import { SUPPORTED_CITIES } from './cities.js';

/**
 * City-specific curated demo restaurant profiles for all 11 Indian cities
 */
export const CITY_RESTAURANT_DEFINITIONS = [
  // 1. INDORE
  {
    citySlug: 'indore',
    restaurants: [
      {
        id: 'idr-r1',
        name: 'Sarafa Night Chaat & Sweets',
        cuisine: 'Street Food, Chaat, Desserts',
        description: 'Demo Restaurant: Famous Indore Sarafa Bazaar specialties: Bhutte ka Kees, Garadu, and Jalebi.',
        rating: 4.8,
        totalRatings: '3.4K+ ratings',
        deliveryTime: '20-25 mins',
        deliveryMinutes: 22,
        startingPrice: 99,
        costForTwo: '₹250 for two',
        location: 'Sarafa Bazaar',
        distance: '1.2 km',
        offer: 'FLAT 20% OFF',
        isPureVeg: true,
        deliveryRadiusKm: 10,
        coordinates: { lat: 22.7180, lng: 75.8540 },
        image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80',
        categories: ['sandwich', 'beverages'],
      },
      {
        id: 'idr-r2',
        name: 'Chappan Dukan Food Street',
        cuisine: 'Fast Food, Burgers, Shakes',
        description: 'Demo Restaurant: Iconic Chappan Dukan hotdogs, crispy burgers, and cold brews.',
        rating: 4.6,
        totalRatings: '2.9K+ ratings',
        deliveryTime: '25-30 mins',
        deliveryMinutes: 26,
        startingPrice: 149,
        costForTwo: '₹350 for two',
        location: 'Chappan Dukan, New Palasia',
        distance: '2.1 km',
        offer: '60% OFF UPTO ₹120',
        isPureVeg: false,
        deliveryRadiusKm: 12,
        coordinates: { lat: 22.7230, lng: 75.8790 },
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
        categories: ['burger', 'beverages', 'pizza'],
      },
      {
        id: 'idr-r3',
        name: 'Nafees Biryani & Kebabs',
        cuisine: 'Mughlai, Biryani, North Indian',
        description: 'Demo Restaurant: Authentic slow-cooked dum biryani, mutton seekh kebabs, and rumali rotis.',
        rating: 4.5,
        totalRatings: '4.1K+ ratings',
        deliveryTime: '30-35 mins',
        deliveryMinutes: 32,
        startingPrice: 229,
        costForTwo: '₹550 for two',
        location: 'Old Palasia',
        distance: '3.4 km',
        offer: 'ITEMS AT ₹199',
        isPureVeg: false,
        deliveryRadiusKm: 12,
        coordinates: { lat: 22.7260, lng: 75.8890 },
        image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80',
        categories: ['biryani', 'beverages'],
      },
      {
        id: 'idr-r4',
        name: 'Vijay Nagar Bistro & Pizzeria',
        cuisine: 'Italian, Pizzas, Pasta',
        description: 'Demo Restaurant: Stone-oven pizzas, garlic breadsticks, and iced coffees.',
        rating: 4.4,
        totalRatings: '1.7K+ ratings',
        deliveryTime: '25-30 mins',
        deliveryMinutes: 28,
        startingPrice: 199,
        costForTwo: '₹450 for two',
        location: 'Vijay Nagar Square',
        distance: '4.1 km',
        offer: 'FREE DELIVERY',
        isPureVeg: false,
        deliveryRadiusKm: 10,
        coordinates: { lat: 22.7533, lng: 75.8937 },
        image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
        categories: ['pizza', 'beverages'],
      },
    ],
  },

  // 2. AHMEDABAD
  {
    citySlug: 'ahmedabad',
    restaurants: [
      {
        id: 'amd-r1',
        name: 'Manek Chowk Street Feast',
        cuisine: 'Street Food, Sandwiches, Fast Food',
        description: 'Demo Restaurant: Gwalior dosa, chocolate sandwiches, and butter-loaded bhaji pav.',
        rating: 4.7,
        totalRatings: '3.8K+ ratings',
        deliveryTime: '20-25 mins',
        deliveryMinutes: 24,
        startingPrice: 129,
        costForTwo: '₹300 for two',
        location: 'Manek Chowk',
        distance: '1.5 km',
        offer: 'FLAT ₹50 OFF',
        isPureVeg: true,
        deliveryRadiusKm: 12,
        coordinates: { lat: 23.0242, lng: 72.5898 },
        image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80',
        categories: ['sandwich', 'beverages'],
      },
      {
        id: 'amd-r2',
        name: 'Gordhan Heritage Gujarati Thali',
        cuisine: 'Gujarati, North Indian, Pure Veg',
        description: 'Demo Restaurant: Traditional Gujarati delicacies, dhokla, fafda, and shrikhand.',
        rating: 4.8,
        totalRatings: '5.2K+ ratings',
        deliveryTime: '30-35 mins',
        deliveryMinutes: 32,
        startingPrice: 249,
        costForTwo: '₹600 for two',
        location: 'Bodakdev, SG Highway',
        distance: '3.8 km',
        offer: '15% OFF ON ALL ORDERS',
        isPureVeg: true,
        deliveryRadiusKm: 10,
        coordinates: { lat: 23.0373, lng: 72.5120 },
        image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
        categories: ['desserts', 'beverages'],
      },
      {
        id: 'amd-r3',
        name: 'Sabarmati Riverfront Cafe',
        cuisine: 'Cafe, Pizzas, Burgers',
        description: 'Demo Restaurant: Riverfront views, artisanal pizza slices, and loaded burgers.',
        rating: 4.5,
        totalRatings: '2.1K+ ratings',
        deliveryTime: '25-30 mins',
        deliveryMinutes: 27,
        startingPrice: 179,
        costForTwo: '₹400 for two',
        location: 'Navrangpura Riverfront',
        distance: '2.4 km',
        offer: 'FREE DELIVERY',
        isPureVeg: false,
        deliveryRadiusKm: 10,
        coordinates: { lat: 23.0350, lng: 72.5600 },
        image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=600&q=80',
        categories: ['pizza', 'burger'],
      },
    ],
  },

  // 3. MUMBAI
  {
    citySlug: 'mumbai',
    restaurants: [
      {
        id: 'bom-r1',
        name: 'Bandra Burger Co.',
        cuisine: 'American, Gourmet Burgers, Fries',
        description: 'Demo Restaurant: Juicy smash patties, truffle fries, and artisanal malt milkshakes.',
        rating: 4.7,
        totalRatings: '4.8K+ ratings',
        deliveryTime: '20-25 mins',
        deliveryMinutes: 22,
        startingPrice: 199,
        costForTwo: '₹500 for two',
        location: 'Linking Road, Bandra West',
        distance: '1.2 km',
        offer: '50% OFF UPTO ₹100',
        isPureVeg: false,
        deliveryRadiusKm: 12,
        coordinates: { lat: 19.0607, lng: 72.8362 },
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
        categories: ['burger', 'beverages'],
      },
      {
        id: 'bom-r2',
        name: 'Juhu Beach Pav Bhaji & Chaat',
        cuisine: 'Street Food, Fast Food, Snacks',
        description: 'Demo Restaurant: Extra butter pav bhaji, tawa pulao, and fresh sugarcane coolers.',
        rating: 4.6,
        totalRatings: '6.2K+ ratings',
        deliveryTime: '25-30 mins',
        deliveryMinutes: 26,
        startingPrice: 119,
        costForTwo: '₹300 for two',
        location: 'Juhu Tara Road',
        distance: '3.1 km',
        offer: 'FLAT ₹40 OFF',
        isPureVeg: true,
        deliveryRadiusKm: 10,
        coordinates: { lat: 19.0988, lng: 72.8264 },
        image: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=600&q=80',
        categories: ['sandwich', 'beverages'],
      },
      {
        id: 'bom-r3',
        name: 'Colaba Woodfire Pizzeria',
        cuisine: 'Italian, Gourmet Pizzas, Pasta',
        description: 'Demo Restaurant: Authentic Napoletana sourdough pizzas and tiramisu.',
        rating: 4.8,
        totalRatings: '3.1K+ ratings',
        deliveryTime: '30-35 mins',
        deliveryMinutes: 30,
        startingPrice: 279,
        costForTwo: '₹650 for two',
        location: 'Colaba Causeway',
        distance: '4.6 km',
        offer: 'FREE DELIVERY',
        isPureVeg: false,
        deliveryRadiusKm: 12,
        coordinates: { lat: 18.9220, lng: 72.8347 },
        image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
        categories: ['pizza', 'desserts'],
      },
    ],
  },

  // 4. NAGPUR
  {
    citySlug: 'nagpur',
    restaurants: [
      {
        id: 'nag-r1',
        name: 'Saoji Highway Spice Kitchen',
        cuisine: 'Saoji, North Indian, Biryani',
        description: 'Demo Restaurant: Fierce Saoji masala gravies, tandoori rotis, and spiced mutton biryani.',
        rating: 4.7,
        totalRatings: '2.5K+ ratings',
        deliveryTime: '25-30 mins',
        deliveryMinutes: 28,
        startingPrice: 199,
        costForTwo: '₹450 for two',
        location: 'Dharampeth',
        distance: '1.8 km',
        offer: '60% OFF UPTO ₹120',
        isPureVeg: false,
        deliveryRadiusKm: 10,
        coordinates: { lat: 21.1438, lng: 79.0673 },
        image: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=600&q=80',
        categories: ['biryani', 'beverages'],
      },
      {
        id: 'nag-r2',
        name: 'Orange City Grill & Burger Bar',
        cuisine: 'Fast Food, Burgers, Wraps',
        description: 'Demo Restaurant: Crispy chicken burgers, loaded wedges, and orange zest shakes.',
        rating: 4.4,
        totalRatings: '1.6K+ ratings',
        deliveryTime: '20-25 mins',
        deliveryMinutes: 23,
        startingPrice: 139,
        costForTwo: '₹300 for two',
        location: 'Sitabuldi Central',
        distance: '2.2 km',
        offer: 'FREE DELIVERY',
        isPureVeg: false,
        deliveryRadiusKm: 12,
        coordinates: { lat: 21.1470, lng: 79.0830 },
        image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&q=80',
        categories: ['burger', 'pizza'],
      },
    ],
  },

  // 5. DELHI
  {
    citySlug: 'delhi',
    restaurants: [
      {
        id: 'del-r1',
        name: 'Chandni Chowk Paratha & Chaat',
        cuisine: 'North Indian, Street Food, Pure Veg',
        description: 'Demo Restaurant: Ghee-fried parathas, dahi bhalle, chole kulche, and lassi.',
        rating: 4.8,
        totalRatings: '6.4K+ ratings',
        deliveryTime: '20-25 mins',
        deliveryMinutes: 22,
        startingPrice: 119,
        costForTwo: '₹300 for two',
        location: 'Old Delhi, Chandni Chowk',
        distance: '2.5 km',
        offer: 'FLAT 20% OFF',
        isPureVeg: true,
        deliveryRadiusKm: 12,
        coordinates: { lat: 28.6562, lng: 77.2310 },
        image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80',
        categories: ['sandwich', 'beverages'],
      },
      {
        id: 'del-r2',
        name: 'Connaught Place Burger Bar',
        cuisine: 'American, Fast Food, Shakes',
        description: 'Demo Restaurant: Signature CP smash burgers, peri peri wings, and cold coffee.',
        rating: 4.6,
        totalRatings: '3.9K+ ratings',
        deliveryTime: '25-30 mins',
        deliveryMinutes: 26,
        startingPrice: 179,
        costForTwo: '₹450 for two',
        location: 'Connaught Place Inner Circle',
        distance: '1.4 km',
        offer: '50% OFF UPTO ₹100',
        isPureVeg: false,
        deliveryRadiusKm: 10,
        coordinates: { lat: 28.6328, lng: 77.2197 },
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
        categories: ['burger', 'beverages'],
      },
      {
        id: 'del-r3',
        name: 'Daryaganj Royal Butter Chicken',
        cuisine: 'Mughlai, North Indian, Biryani',
        description: 'Demo Restaurant: Slow-simmered butter chicken, dal makhani, and garlic butter naan.',
        rating: 4.7,
        totalRatings: '5.1K+ ratings',
        deliveryTime: '30-35 mins',
        deliveryMinutes: 30,
        startingPrice: 249,
        costForTwo: '₹600 for two',
        location: 'Daryaganj Heritage',
        distance: '3.2 km',
        offer: 'ITEMS AT ₹199',
        isPureVeg: false,
        deliveryRadiusKm: 12,
        coordinates: { lat: 28.6430, lng: 77.2410 },
        image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80',
        categories: ['biryani', 'pizza'],
      },
    ],
  },

  // 6. RAIPUR
  {
    citySlug: 'raipur',
    restaurants: [
      {
        id: 'rai-r1',
        name: 'Telibandha Marine Drive Bites',
        cuisine: 'Fast Food, Cafe, Shakes',
        description: 'Demo Restaurant: Quick lakeside bites, grilled sandwiches, and loaded fries.',
        rating: 4.5,
        totalRatings: '1.4K+ ratings',
        deliveryTime: '20-25 mins',
        deliveryMinutes: 22,
        startingPrice: 129,
        costForTwo: '₹280 for two',
        location: 'Telibandha Lake',
        distance: '1.5 km',
        offer: 'FLAT ₹50 OFF',
        isPureVeg: false,
        deliveryRadiusKm: 10,
        coordinates: { lat: 21.2380, lng: 81.6620 },
        image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&q=80',
        categories: ['burger', 'sandwich', 'beverages'],
      },
      {
        id: 'rai-r2',
        name: 'Chhattisgarhi Swad & Tandoor',
        cuisine: 'North Indian, Tandoori, Biryani',
        description: 'Demo Restaurant: Traditional thalis, tandoori rotis, and fragrant biryanis.',
        rating: 4.6,
        totalRatings: '2.1K+ ratings',
        deliveryTime: '25-30 mins',
        deliveryMinutes: 28,
        startingPrice: 189,
        costForTwo: '₹400 for two',
        location: 'Pandri Cloth Market',
        distance: '2.8 km',
        offer: 'FREE DELIVERY',
        isPureVeg: false,
        deliveryRadiusKm: 12,
        coordinates: { lat: 21.2590, lng: 81.6490 },
        image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80',
        categories: ['biryani', 'pizza'],
      },
    ],
  },

  // 7. NEEMUCH
  {
    citySlug: 'neemuch',
    restaurants: [
      {
        id: 'nee-r1',
        name: 'Neemuch Food Court & Shakes',
        cuisine: 'Fast Food, Burgers, Cafe',
        description: 'Demo Restaurant: Freshly toasted burgers, grilled sandwiches, and chocolate shakes.',
        rating: 4.4,
        totalRatings: '950+ ratings',
        deliveryTime: '15-20 mins',
        deliveryMinutes: 18,
        startingPrice: 99,
        costForTwo: '₹220 for two',
        location: 'Station Road',
        distance: '0.9 km',
        offer: 'FLAT 20% OFF',
        isPureVeg: true,
        deliveryRadiusKm: 8,
        coordinates: { lat: 24.4680, lng: 74.8720 },
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
        categories: ['burger', 'sandwich', 'beverages'],
      },
      {
        id: 'nee-r2',
        name: 'Malwa Dhaba & Family Rasoi',
        cuisine: 'North Indian, Dal Bafla, Pure Veg',
        description: 'Demo Restaurant: Hot dal bafla, sev tamatar, garlic naan, and sweet gulab jamun.',
        rating: 4.6,
        totalRatings: '1.2K+ ratings',
        deliveryTime: '20-25 mins',
        deliveryMinutes: 24,
        startingPrice: 149,
        costForTwo: '₹300 for two',
        location: 'Gandhi Nagar Main Road',
        distance: '1.8 km',
        offer: 'ITEMS AT ₹99',
        isPureVeg: true,
        deliveryRadiusKm: 10,
        coordinates: { lat: 24.4790, lng: 74.8620 },
        image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
        categories: ['desserts', 'beverages'],
      },
    ],
  },

  // 8. KOLKATA
  {
    citySlug: 'kolkata',
    restaurants: [
      {
        id: 'kol-r1',
        name: 'Park Street Woodfire Crust',
        cuisine: 'Italian, Pizzas, Continental',
        description: 'Demo Restaurant: Thin-crust woodfired pizzas, creamy pastas, and classic English breakfast.',
        rating: 4.8,
        totalRatings: '4.2K+ ratings',
        deliveryTime: '25-30 mins',
        deliveryMinutes: 28,
        startingPrice: 229,
        costForTwo: '₹550 for two',
        location: 'Park Street Area',
        distance: '1.6 km',
        offer: 'FREE DELIVERY',
        isPureVeg: false,
        deliveryRadiusKm: 10,
        coordinates: { lat: 22.5510, lng: 88.3520 },
        image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
        categories: ['pizza', 'desserts'],
      },
      {
        id: 'kol-r2',
        name: 'Ballygunge Kathi Roll Hub',
        cuisine: 'Rolls, Street Food, Fast Food',
        description: 'Demo Restaurant: Double egg chicken kathi rolls, paneer wraps, and lemon soda.',
        rating: 4.7,
        totalRatings: '5.8K+ ratings',
        deliveryTime: '15-20 mins',
        deliveryMinutes: 19,
        startingPrice: 99,
        costForTwo: '₹220 for two',
        location: 'Ballygunge Circular Road',
        distance: '2.1 km',
        offer: 'FLAT 20% OFF',
        isPureVeg: false,
        deliveryRadiusKm: 12,
        coordinates: { lat: 22.5280, lng: 88.3650 },
        image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80',
        categories: ['sandwich', 'burger'],
      },
      {
        id: 'kol-r3',
        name: 'Royal Kolkata Dum Biryani',
        cuisine: 'Mughlai, Biryani, Awadhi',
        description: 'Demo Restaurant: Aromatic Kolkata biryani with golden potato, boiled egg, and chaap.',
        rating: 4.9,
        totalRatings: '7.1K+ ratings',
        deliveryTime: '30-35 mins',
        deliveryMinutes: 32,
        startingPrice: 249,
        costForTwo: '₹500 for two',
        location: 'Esplanade Central',
        distance: '3.3 km',
        offer: '60% OFF UPTO ₹120',
        isPureVeg: false,
        deliveryRadiusKm: 12,
        coordinates: { lat: 22.5640, lng: 88.3510 },
        image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80',
        categories: ['biryani', 'beverages'],
      },
    ],
  },

  // 9. BENGALURU
  {
    citySlug: 'bengaluru',
    restaurants: [
      {
        id: 'blr-r1',
        name: 'Burger Boulevard',
        cuisine: 'American, Burgers, Shakes',
        description: 'Demo Restaurant: Flame-grilled smash burgers, loaded fries and thick artisanal shakes.',
        rating: 4.7,
        totalRatings: '3.9K+ ratings',
        deliveryTime: '20-25 mins',
        deliveryMinutes: 24,
        startingPrice: 199,
        costForTwo: '₹400 for two',
        location: 'Koramangala 4th Block',
        distance: '1.6 km',
        offer: '60% OFF UPTO ₹120',
        isPureVeg: false,
        deliveryRadiusKm: 10,
        coordinates: { lat: 12.9352, lng: 77.6245 },
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
        categories: ['burger', 'beverages'],
      },
      {
        id: 'blr-r2',
        name: 'Slice Society',
        cuisine: 'Italian, Pizzas, Pasta',
        description: 'Demo Restaurant: Hand-tossed sourdough pizzas with authentic Italian cheeses and toppings.',
        rating: 4.6,
        totalRatings: '2.8K+ ratings',
        deliveryTime: '25-30 mins',
        deliveryMinutes: 28,
        startingPrice: 249,
        costForTwo: '₹500 for two',
        location: 'Indiranagar 100ft Road',
        distance: '2.3 km',
        offer: 'ITEMS AT ₹179',
        isPureVeg: false,
        deliveryRadiusKm: 12,
        coordinates: { lat: 12.9784, lng: 77.6408 },
        image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
        categories: ['pizza', 'desserts'],
      },
      {
        id: 'blr-r3',
        name: 'The Sandwich Studio',
        cuisine: 'Cafe, Sandwiches, Cold Brews',
        description: 'Demo Restaurant: Crispy grilled sourdough melts, deli subs and artisanal cold coffees.',
        rating: 4.5,
        totalRatings: '1.5K+ ratings',
        deliveryTime: '15-20 mins',
        deliveryMinutes: 19,
        startingPrice: 149,
        costForTwo: '₹300 for two',
        location: 'HSR Layout Sector 3',
        distance: '1.1 km',
        offer: 'FREE DELIVERY',
        isPureVeg: false,
        deliveryRadiusKm: 10,
        coordinates: { lat: 12.9116, lng: 77.6389 },
        image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80',
        categories: ['sandwich', 'beverages'],
      },
      {
        id: 'blr-r4',
        name: 'Green Fork Cafe',
        cuisine: 'Pure Veg, Healthy, Cafe',
        description: 'Demo Restaurant: 100% vegetarian goodness: avocado toasts, farm pizzas, and fresh juices.',
        rating: 4.6,
        totalRatings: '2.2K+ ratings',
        deliveryTime: '20-25 mins',
        deliveryMinutes: 25,
        startingPrice: 169,
        costForTwo: '₹350 for two',
        location: 'Jayanagar 4th Block',
        distance: '2.2 km',
        offer: 'ITEMS AT ₹129',
        isPureVeg: true,
        deliveryRadiusKm: 10,
        coordinates: { lat: 12.9250, lng: 77.5938 },
        image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
        categories: ['sandwich', 'beverages', 'desserts'],
      },
    ],
  },

  // 10. CHENNAI
  {
    citySlug: 'chennai',
    restaurants: [
      {
        id: 'che-r1',
        name: 'Marina Coastal Grills & Bites',
        cuisine: 'Seafood, Fast Food, Grills',
        description: 'Demo Restaurant: Crispy fried seafood, chicken rolls, and chilled nannari sarbath.',
        rating: 4.6,
        totalRatings: '3.1K+ ratings',
        deliveryTime: '20-25 mins',
        deliveryMinutes: 24,
        startingPrice: 149,
        costForTwo: '₹350 for two',
        location: 'Besant Nagar Beach',
        distance: '1.7 km',
        offer: 'FLAT 20% OFF',
        isPureVeg: false,
        deliveryRadiusKm: 10,
        coordinates: { lat: 13.0002, lng: 80.2668 },
        image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&q=80',
        categories: ['burger', 'sandwich'],
      },
      {
        id: 'che-r2',
        name: 'Anna Nagar Pizza Co.',
        cuisine: 'Italian, Pizzas, Pasta',
        description: 'Demo Restaurant: Handcrafted sourdough pizzas, cheesy garlic bread, and iced teas.',
        rating: 4.5,
        totalRatings: '2.4K+ ratings',
        deliveryTime: '25-30 mins',
        deliveryMinutes: 28,
        startingPrice: 199,
        costForTwo: '₹450 for two',
        location: 'Anna Nagar 2nd Avenue',
        distance: '2.8 km',
        offer: 'ITEMS AT ₹179',
        isPureVeg: false,
        deliveryRadiusKm: 12,
        coordinates: { lat: 13.0850, lng: 80.2100 },
        image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
        categories: ['pizza', 'beverages'],
      },
    ],
  },

  // 11. HYDERABAD
  {
    citySlug: 'hyderabad',
    restaurants: [
      {
        id: 'hyd-r1',
        name: 'Charminar Dum Biryani House',
        cuisine: 'Hyderabadi, Biryani, Mughlai',
        description: 'Demo Restaurant: Legendary Hyderabadi mutton and chicken dum biryani with mirchi ka salan.',
        rating: 4.9,
        totalRatings: '8.5K+ ratings',
        deliveryTime: '25-30 mins',
        deliveryMinutes: 26,
        startingPrice: 229,
        costForTwo: '₹500 for two',
        location: 'Charminar Heritage',
        distance: '2.2 km',
        offer: '60% OFF UPTO ₹120',
        isPureVeg: false,
        deliveryRadiusKm: 12,
        coordinates: { lat: 17.3616, lng: 78.4747 },
        image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80',
        categories: ['biryani', 'beverages'],
      },
      {
        id: 'hyd-r2',
        name: 'Banjara Hills Burger Club',
        cuisine: 'American, Gourmet Burgers, Fries',
        description: 'Demo Restaurant: Premium Brioche burgers, onion rings, and double chocolate shakes.',
        rating: 4.7,
        totalRatings: '3.6K+ ratings',
        deliveryTime: '20-25 mins',
        deliveryMinutes: 22,
        startingPrice: 189,
        costForTwo: '₹450 for two',
        location: 'Banjara Hills Road 12',
        distance: '1.9 km',
        offer: 'FLAT ₹50 OFF',
        isPureVeg: false,
        deliveryRadiusKm: 10,
        coordinates: { lat: 17.4156, lng: 78.4350 },
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
        categories: ['burger', 'beverages'],
      },
    ],
  },
];

// Build comprehensive restaurant objects with full menu items
export const ALL_CITIES_RESTAURANTS = CITY_RESTAURANT_DEFINITIONS.flatMap(
  (cityDef, cityIdx) => {
    const cityMeta = SUPPORTED_CITIES.find((c) => c.slug === cityDef.citySlug) || {
      name: cityDef.citySlug,
      state: 'India',
      country: 'India',
    };

    return cityDef.restaurants.map((rest, restIdx) => {
      const targetCategories = rest.categories || ['burger', 'pizza', 'beverages'];
      const matchedProducts = products.filter((p) =>
        targetCategories.includes(p.category)
      );

      const menu = (matchedProducts.length > 0 ? matchedProducts : products.slice(0, 8)).map(
        (prod, prodIdx) => ({
          ...prod,
          id: 20000 + cityIdx * 1000 + restIdx * 100 + prodIdx,
          restaurantId: rest.id,
          restaurantName: rest.name,
          city: cityMeta.name,
          citySlug: cityDef.citySlug,
          price: Math.max(
            49,
            Math.round(
              (prod.price * (0.85 + (cityIdx % 3) * 0.05 + (restIdx % 3) * 0.04)) / 5
            ) * 5
          ),
        })
      );

      return {
        ...rest,
        restaurantId: rest.id,
        slug: rest.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        city: cityMeta.name,
        citySlug: cityDef.citySlug,
        state: cityMeta.state,
        country: 'India',
        isActive: true,
        isAvailable: true,
        isDemoData: true,
        menu,
      };
    });
  }
);

/**
 * Filter restaurants strictly by citySlug
 */
export function getRestaurantsByCity(citySlug) {
  if (!citySlug) return ALL_CITIES_RESTAURANTS;
  const clean = String(citySlug).trim().toLowerCase();
  return ALL_CITIES_RESTAURANTS.filter((r) => r.citySlug === clean && r.isActive);
}

/**
 * Get restaurant by ID (e.g. 'idr-r1', 'blr-r1')
 */
export function getRestaurantById(id) {
  if (!id) return null;
  const cleanId = String(id).trim();
  const mappedId = /^r\d+$/.test(cleanId) ? `blr-${cleanId}` : cleanId;
  return (
    ALL_CITIES_RESTAURANTS.find(
      (r) =>
        r.id === cleanId ||
        r.restaurantId === cleanId ||
        r.id === mappedId ||
        r.restaurantId === mappedId
    ) || null
  );
}

/**
 * Search restaurants strictly within a city
 */
export function searchRestaurantsInCity(query, citySlug) {
  const cityRestaurants = getRestaurantsByCity(citySlug);
  if (!query || !query.trim()) return cityRestaurants;

  const q = query.trim().toLowerCase();
  return cityRestaurants.filter((r) => {
    const matchesBasic =
      r.name.toLowerCase().includes(q) ||
      r.cuisine.toLowerCase().includes(q) ||
      r.location.toLowerCase().includes(q) ||
      (r.description && r.description.toLowerCase().includes(q));

    const matchesMenu = r.menu?.some(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        (m.desc && m.desc.toLowerCase().includes(q))
    );

    return matchesBasic || matchesMenu;
  });
}
