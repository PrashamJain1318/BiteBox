import { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './componets/Home'
import Header from './componets/Header'
import CategoryPage from './componets/CategoryPage'
import Cart from './componets/Cart'
import RestaurantDetails from './componets/RestaurantDetails'
import Login from './componets/Login'
import Signup from './componets/Signup'
import ForgotPassword from './componets/ForgotPassword'
import ResetPassword from './componets/ResetPassword'
import Profile from './componets/Profile'
import ProtectedRoute from './componets/ProtectedRoute'
import { CartContext } from './context/cartContext'
import { AuthProvider } from './context/AuthContext'
import './style.css'

function App() {
  const [cart, setCart] = useState([])
  const [isSqueezing, setIsSqueezing] = useState(false)

  // Load existing cart from localStorage on mount so cart is NEVER lost
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('bitebox_cart')
      if (savedCart) {
        setCart(JSON.parse(savedCart))
      }
    } catch {
      // ignore
    }
  }, [])

  // Persist cart whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('bitebox_cart', JSON.stringify(cart))
    } catch {
      // ignore
    }
  }, [cart])

  const totalCartItems = cart.reduce((total, item) => total + (item.qty || 1), 0)
  const prevCountRef = useRef(totalCartItems)

  useEffect(() => {
    if (totalCartItems > prevCountRef.current) {
      setIsSqueezing(true)
      const timer = setTimeout(() => setIsSqueezing(false), 700)
      prevCountRef.current = totalCartItems
      return () => clearTimeout(timer)
    }
    prevCountRef.current = totalCartItems
  }, [totalCartItems])

  return (
    <AuthProvider>
      <CartContext.Provider value={{ cart, setCart, isSqueezing }}>
        <BrowserRouter>
          <Header />

          <Routes>
            {/* Public Restaurant & Browsing Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/restaurant/:restaurantId" element={<RestaurantDetails />} />

            {/* Authentication Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />

            {/* Protected Routes */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cart"
              element={
                <ProtectedRoute>
                  <Cart />
                </ProtectedRoute>
              }
            />

            {/* Category Product Routes */}
            <Route path="/category/:categoryId" element={<CategoryPage />} />
            <Route path="/biryani" element={<CategoryPage categoryId="biryani" />} />
            <Route path="/pizza" element={<CategoryPage categoryId="pizza" />} />
            <Route path="/burger" element={<CategoryPage categoryId="burger" />} />
            <Route path="/sandwich" element={<CategoryPage categoryId="sandwich" />} />
            <Route path="/beverages" element={<CategoryPage categoryId="beverages" />} />
            <Route path="/south-indian" element={<CategoryPage categoryId="south-indian" />} />
            <Route path="/north-indian" element={<CategoryPage categoryId="north-indian" />} />
            <Route path="/cakes" element={<CategoryPage categoryId="cakes" />} />
            <Route path="/desserts" element={<CategoryPage categoryId="desserts" />} />
            <Route path="/chinese" element={<CategoryPage categoryId="chinese" />} />
            <Route path="/pasta" element={<CategoryPage categoryId="pasta" />} />
            <Route path="/rolls" element={<CategoryPage categoryId="rolls" />} />
          </Routes>
        </BrowserRouter>
      </CartContext.Provider>
    </AuthProvider>
  )
}

export default App
