import { useState, useEffect, useRef } from 'react'
import { products } from './data/product'
import { BrowserRouter, Routes, Route, NavLink, Link } from 'react-router-dom'
import Home from './componets/Home'
import './style.css'
import Pizza from './componets/Pizza'
import Burger from './componets/Burger'
import Sandwich from './componets/Sandwich'
import Beverages from './componets/Beverages'
import Cart from './componets/Cart'
import { CartContext } from './context/cartContext'

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

  console.log(products)
  return (
    <CartContext.Provider value={{ cart, setCart }}>
      <BrowserRouter>
        <nav className="food-nav" aria-label="Main navigation">
          <Link to="/" className="food-nav__brand">
            <span className="brand-icon">📦</span>
            <span>Bite<span className="brand-highlight">Box</span></span>
          </Link>

          <div className="food-nav__links">
            <NavLink to="/" end>Home</NavLink>
            <NavLink to="/pizza">Pizza</NavLink>
            <NavLink to="/burger">Burgers</NavLink>
            <NavLink to="/sandwich">Sandwich</NavLink>
            <NavLink to="/beverages">Beverages</NavLink>
            <NavLink
              to="/cart"
              className={({ isActive }) => `nav-cart-btn ${isActive ? 'active' : ''} ${isSqueezing ? 'squeeze-effect' : ''}`}
            >
              🛒 Cart
              <span className="nav-cart-badge">{totalCartItems}</span>
              {isSqueezing && <span className="cart-float-plus">+1</span>}
            </NavLink>
          </div>
        </nav>

        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/pizza' element={<Pizza />} />
          <Route path='/burger' element={<Burger />} />
          <Route path='/sandwich' element={<Sandwich />} />
          <Route path='/beverages' element={<Beverages />} />
          <Route path='/cart' element={<Cart />} />
        </Routes>

      </BrowserRouter>
    </CartContext.Provider>
  )
}

export default App
