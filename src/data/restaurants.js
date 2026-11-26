import { products } from './product'

export const restaurantInfo = [
  {
    id: 'r1',
    name: "Burger Boulevard",
    cuisine: "American, Burgers, Shakes",
    description: "Flame-grilled smash burgers, loaded fries and thick artisanal shakes.",
    rating: 4.6,
    totalRatings: "2.4K+ ratings",
    deliveryTime: "20-25 mins",
    deliveryMinutes: 25,
    startingPrice: 199,
    costForTwo: "₹400 for two",
    location: "Koramangala 4th Block",
    distance: "1.6 km",
    offer: "60% OFF UPTO ₹120",
    isPureVeg: false,
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: 'r2',
    name: "Slice Society",
    cuisine: "Italian, Pizzas, Pasta",
    description: "Hand-tossed sourdough pizzas with authentic Italian cheeses and toppings.",
    rating: 4.5,
    totalRatings: "1.8K+ ratings",
    deliveryTime: "25-30 mins",
    deliveryMinutes: 30,
    startingPrice: 249,
    costForTwo: "₹500 for two",
    location: "Indiranagar 100ft Road",
    distance: "2.3 km",
    offer: "ITEMS AT ₹179",
    isPureVeg: false,
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: 'r3',
    name: "The Sandwich Studio",
    cuisine: "Cafe, Sandwiches, Cold Brews",
    description: "Crispy grilled sourdough melts, deli subs and artisanal cold coffees.",
    rating: 4.4,
    totalRatings: "950+ ratings",
    deliveryTime: "15-20 mins",
    deliveryMinutes: 20,
    startingPrice: 149,
    costForTwo: "₹300 for two",
    location: "HSR Layout Sector 3",
    distance: "1.1 km",
    offer: "FREE DELIVERY",
    isPureVeg: false,
    image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: 'r4',
    name: "Crave Corner",
    cuisine: "Fast Food, Street Food, Wraps",
    description: "Street-style crispy bites, cheesy wraps, and late-night snacks.",
    rating: 4.3,
    totalRatings: "3.1K+ ratings",
    deliveryTime: "25-30 mins",
    deliveryMinutes: 30,
    startingPrice: 179,
    costForTwo: "₹350 for two",
    location: "BTM 2nd Stage",
    distance: "3.2 km",
    offer: "50% OFF UPTO ₹100",
    isPureVeg: false,
    image: "https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: 'r5',
    name: "Cheese Please",
    cuisine: "Continental, Pizzas, Burgers",
    description: "Triple-cheese burst pizzas, lava burgers, and mozzarella toasties.",
    rating: 4.7,
    totalRatings: "4.2K+ ratings",
    deliveryTime: "20-25 mins",
    deliveryMinutes: 25,
    startingPrice: 229,
    costForTwo: "₹450 for two",
    location: "Church Street",
    distance: "2.1 km",
    offer: "₹125 OFF ABOVE ₹199",
    isPureVeg: false,
    image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: 'r6',
    name: "Urban Bites",
    cuisine: "Street Food, Fusion, Beverages",
    description: "Modern street snacks, peri peri fries, and fresh fruit coolers.",
    rating: 4.2,
    totalRatings: "820+ ratings",
    deliveryTime: "30-35 mins",
    deliveryMinutes: 35,
    startingPrice: 129,
    costForTwo: "₹250 for two",
    location: "Kalyan Nagar",
    distance: "4.5 km",
    offer: "FLAT 20% OFF",
    isPureVeg: false,
    image: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: 'r7',
    name: "Green Fork Cafe",
    cuisine: "Pure Veg, Healthy, Cafe",
    description: "100% vegetarian goodness: avocado toasts, farm pizzas, and fresh juices.",
    rating: 4.5,
    totalRatings: "1.5K+ ratings",
    deliveryTime: "20-25 mins",
    deliveryMinutes: 25,
    startingPrice: 169,
    costForTwo: "₹350 for two",
    location: "Jayanagar 4th Block",
    distance: "1.9 km",
    offer: "ITEMS AT ₹129",
    isPureVeg: true,
    image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: 'r8',
    name: "Spice Route Express",
    cuisine: "North Indian, Tandoori, Rolls",
    description: "Tandoori chicken pizzas, spicy keema subs, and adrak elaichi chai.",
    rating: 4.4,
    totalRatings: "2.7K+ ratings",
    deliveryTime: "25-30 mins",
    deliveryMinutes: 30,
    startingPrice: 189,
    costForTwo: "₹400 for two",
    location: "MG Road Central",
    distance: "2.8 km",
    offer: "60% OFF UPTO ₹120",
    isPureVeg: false,
    image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: 'r9',
    name: "Midnight Munchies",
    cuisine: "Fast Food, Burgers, Desserts",
    description: "Late night cravings sorted: loaded double burgers and thick shakes.",
    rating: 4.1,
    totalRatings: "1.1K+ ratings",
    deliveryTime: "30-40 mins",
    deliveryMinutes: 35,
    startingPrice: 199,
    costForTwo: "₹400 for two",
    location: "Whitefield Main Road",
    distance: "5.1 km",
    offer: "FREE DELIVERY",
    isPureVeg: false,
    image: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: 'r10',
    name: "Crust & Craft",
    cuisine: "Italian, Gourmet Pizzas",
    description: "Wood-fired artisanal pizzas topped with burrata and black truffle glaze.",
    rating: 4.6,
    totalRatings: "3.4K+ ratings",
    deliveryTime: "25-30 mins",
    deliveryMinutes: 30,
    startingPrice: 279,
    costForTwo: "₹600 for two",
    location: "Lavelle Road",
    distance: "2.5 km",
    offer: "₹150 OFF ABOVE ₹299",
    isPureVeg: false,
    image: "https://images.unsplash.com/photo-1594007654729-407eedc4be65?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: 'r11',
    name: "Bun & Beyond",
    cuisine: "American, Gourmet Burgers",
    description: "Crispy fried buttermilk chicken and brioche smashed patties.",
    rating: 4.5,
    totalRatings: "2.9K+ ratings",
    deliveryTime: "20-25 mins",
    deliveryMinutes: 25,
    startingPrice: 159,
    costForTwo: "₹350 for two",
    location: "Koramangala 5th Block",
    distance: "1.4 km",
    offer: "ITEMS AT ₹139",
    isPureVeg: false,
    image: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: 'r12',
    name: "Fresh Press Cafe",
    cuisine: "Cafe, Sandwiches, Juices",
    description: "Toasted paninis, ABC detox cold-pressed juices, and fresh salads.",
    rating: 4.3,
    totalRatings: "780+ ratings",
    deliveryTime: "15-20 mins",
    deliveryMinutes: 20,
    startingPrice: 139,
    costForTwo: "₹300 for two",
    location: "Richmond Town",
    distance: "1.7 km",
    offer: "20% OFF",
    isPureVeg: false,
    image: "https://images.unsplash.com/photo-1619860860774-1e2e17343432?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: 'r13',
    name: "Chill & Sip",
    cuisine: "Beverages, Boba, Shakes",
    description: "Brown sugar boba pearls, creamy milkshakes, and chilled fruit fizz.",
    rating: 4.4,
    totalRatings: "1.9K+ ratings",
    deliveryTime: "15-20 mins",
    deliveryMinutes: 18,
    startingPrice: 99,
    costForTwo: "₹200 for two",
    location: "HSR Layout Sector 1",
    distance: "1.3 km",
    offer: "ITEMS AT ₹89",
    isPureVeg: true,
    image: "https://images.unsplash.com/photo-1558857563-b37cf5b6eb2a?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: 'r14',
    name: "Campus Cafe",
    cuisine: "Student Friendly, Burgers, Drinks",
    description: "Pocket-friendly student combos, crispy aloo burgers and cold coffee.",
    rating: 4.1,
    totalRatings: "3.8K+ ratings",
    deliveryTime: "20-25 mins",
    deliveryMinutes: 22,
    startingPrice: 89,
    costForTwo: "₹180 for two",
    location: "Marathahalli",
    distance: "3.7 km",
    offer: "FREE DELIVERY",
    isPureVeg: false,
    image: "https://images.unsplash.com/photo-1521305916504-4a1121188589?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: 'r15',
    name: "Flame Grill",
    cuisine: "American, Barbecue, Steaks",
    description: "Hickory-smoked BBQ chicken burgers, wings, and smoky sides.",
    rating: 4.6,
    totalRatings: "2.1K+ ratings",
    deliveryTime: "30-35 mins",
    deliveryMinutes: 32,
    startingPrice: 219,
    costForTwo: "₹500 for two",
    location: "Indiranagar 12th Main",
    distance: "2.6 km",
    offer: "FLAT ₹100 OFF",
    isPureVeg: false,
    image: "https://images.unsplash.com/photo-1550317138-10000687a72b?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: 'r16',
    name: "Pizza Parade",
    cuisine: "Italian, Family Pizzas",
    description: "Giant family pizzas, cheesy garlic breads, and pasta bowls.",
    rating: 4.5,
    totalRatings: "3.3K+ ratings",
    deliveryTime: "25-30 mins",
    deliveryMinutes: 28,
    startingPrice: 299,
    costForTwo: "₹650 for two",
    location: "Bellandur Outer Ring Road",
    distance: "4.1 km",
    offer: "50% OFF UPTO ₹100",
    isPureVeg: false,
    image: "https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: 'r17',
    name: "Snack Station",
    cuisine: "Snacks, Sandwiches, Chaat",
    description: "Mumbai grilled toasties, corn cheese melts, and masala cutting chai.",
    rating: 4.2,
    totalRatings: "640+ ratings",
    deliveryTime: "15-20 mins",
    deliveryMinutes: 18,
    startingPrice: 119,
    costForTwo: "₹220 for two",
    location: "Frazer Town",
    distance: "3.0 km",
    offer: "ITEMS AT ₹99",
    isPureVeg: true,
    image: "https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: 'r18',
    name: "The Daily Deli",
    cuisine: "Deli, Bagels, Sandwiches",
    description: "New York style bagels, pastrami sourdough, and club triple-deckers.",
    rating: 4.4,
    totalRatings: "1.2K+ ratings",
    deliveryTime: "20-25 mins",
    deliveryMinutes: 24,
    startingPrice: 179,
    costForTwo: "₹400 for two",
    location: "Cunningham Road",
    distance: "2.4 km",
    offer: "FREE DELIVERY",
    isPureVeg: false,
    image: "https://images.unsplash.com/photo-1554433607-66b5efe9d304?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: 'r19',
    name: "Pepper & Paneer",
    cuisine: "Pure Veg, North Indian, Pizzas",
    description: "100% pure veg kitchen serving rich paneer tikka pizzas and burgers.",
    rating: 4.6,
    totalRatings: "2.8K+ ratings",
    deliveryTime: "25-30 mins",
    deliveryMinutes: 28,
    startingPrice: 199,
    costForTwo: "₹420 for two",
    location: "Basavanagudi",
    distance: "3.4 km",
    offer: "60% OFF UPTO ₹120",
    isPureVeg: true,
    image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: 'r20',
    name: "Happy Hour Kitchen",
    cuisine: "Fast Food, Combos, Desserts",
    description: "Budget meals, combo boxes, crunchy sliders, and dessert frappes.",
    rating: 4.3,
    totalRatings: "1.6K+ ratings",
    deliveryTime: "20-25 mins",
    deliveryMinutes: 22,
    startingPrice: 149,
    costForTwo: "₹300 for two",
    location: "Electronic City Phase 1",
    distance: "6.2 km",
    offer: "ITEMS AT ₹119",
    isPureVeg: false,
    image: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?auto=format&fit=crop&w=600&q=80"
  }
]

const categories = [
  'burger', 'pizza', 'sandwich', 'beverages',
  'biryani', 'south-indian', 'north-indian', 'chinese',
  'pasta', 'rolls', 'cakes', 'desserts'
]

// Dynamically generate diverse items per restaurant across categories with distinct IDs
export const restaurants = restaurantInfo.map((restaurant, restaurantIndex) => {
  // Each restaurant gets 4-5 categories based on restaurantIndex
  const assignedCategories = [
    categories[(restaurantIndex * 2) % categories.length],
    categories[(restaurantIndex * 2 + 1) % categories.length],
    categories[(restaurantIndex * 2 + 2) % categories.length],
    categories[(restaurantIndex * 2 + 3) % categories.length],
  ]

  const menu = assignedCategories.flatMap((category, categoryIndex) => {
    const categoryProducts = products.filter((product) => product.category === category)
    if (!categoryProducts.length) return []

    // Select 3-4 distinct products per category for this restaurant
    const countToPick = Math.min(4, categoryProducts.length)
    const selected = []
    for (let i = 0; i < countToPick; i++) {
      const idx = (restaurantIndex * 3 + categoryIndex * 4 + i) % categoryProducts.length
      selected.push(categoryProducts[idx])
    }

    return selected.map((product, itemIndex) => ({
      ...product,
      id: 10000 + restaurantIndex * 100 + categoryIndex * 10 + itemIndex,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      price: Math.max(29, Math.round((product.price * (0.88 + (restaurantIndex % 5) * 0.05)) / 5) * 5),
    }))
  })

  return {
    ...restaurant,
    menu,
  }
})

export {
  ALL_CITIES_RESTAURANTS,
  getRestaurantsByCity,
  getRestaurantById,
  searchRestaurantsInCity,
} from './multiCityRestaurants'
