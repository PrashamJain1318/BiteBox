import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext({
  theme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
  isDark: false,
})

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      const savedTheme = localStorage.getItem('bitebox_theme')
      if (savedTheme === 'dark' || savedTheme === 'light') {
        return savedTheme
      }
    } catch {
      // LocalStorage access fallback
    }

    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
      return 'dark'
    }

    return 'light'
  })

  useEffect(() => {
    try {
      const root = document.documentElement
      root.setAttribute('data-theme', theme)
      document.body.classList.toggle('dark-theme', theme === 'dark')
      localStorage.setItem('bitebox_theme', theme)
    } catch {
      // ignore storage errors
    }
  }, [theme])

  // Respond to OS-level system theme changes if user hasn't explicitly set a preference
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemThemeChange = (e) => {
      try {
        const hasSaved = localStorage.getItem('bitebox_theme')
        if (!hasSaved) {
          setTheme(e.matches ? 'dark' : 'light')
        }
      } catch {
        // ignore
      }
    }

    mediaQuery.addEventListener('change', handleSystemThemeChange)
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange)
  }, [])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  return context || {
    theme: 'light',
    setTheme: () => {},
    toggleTheme: () => {},
    isDark: false,
  }
}
