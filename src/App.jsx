import { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './componets/Home'
import Header from './componets/Header'
import Pizza from './componets/Pizza'
import Burger from './componets/Burger'
import Sandwich from './componets/Sandwich'
import Beverages from './componets/Beverages'
import Cart from './componets/Cart'
import RestaurantDetails from './componets/RestaurantDetails'
import { CartContext } from './context/cartContext'
import './style.css'

function App() {
  const [cart, setCart] = useState([])
  const [isSqueezing, setIsSqueezing] = useState(false)

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
    <CartContext.Provider value={{ cart, setCart, isSqueezing }}>
      <BrowserRouter>
        <Header />

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/restaurant/:restaurantId" element={<RestaurantDetails />} />
          <Route path="/pizza" element={<Pizza />} />
          <Route path="/burger" element={<Burger />} />
          <Route path="/sandwich" element={<Sandwich />} />
          <Route path="/beverages" element={<Beverages />} />
          <Route path="/cart" element={<Cart />} />
        </Routes>
      </BrowserRouter>
    </CartContext.Provider>
  )
}

export default App
