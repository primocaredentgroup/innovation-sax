import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function DarkModeToggle() {
  const [isDark, setIsDark] = useState(() => {
    // Controlla prima localStorage, poi la classe HTML, default dark mode
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme')
      if (savedTheme) {
        return savedTheme === 'dark'
      }
      // Se non c'è un tema salvato, usa dark mode come default
      return true
    }
    return true // Default dark mode
  })

  useEffect(() => {
    const htmlElement = document.documentElement
    
    if (isDark) {
      htmlElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      htmlElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [isDark])

  // Inizializza il tema al primo caricamento
  useEffect(() => {
    const htmlElement = document.documentElement
    const savedTheme = localStorage.getItem('theme')
    
    if (savedTheme) {
      if (savedTheme === 'dark') {
        htmlElement.classList.add('dark')
      } else {
        htmlElement.classList.remove('dark')
      }
    } else {
      // Default: dark mode
      htmlElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    }
  }, [])

  const toggleDarkMode = () => {
    setIsDark(!isDark)
  }

  return (
    <button
      onClick={toggleDarkMode}
      className="p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      aria-label={isDark ? 'Attiva modalità chiara' : 'Attiva modalità scura'}
    >
      {isDark ? (
        <Sun className="w-5 h-5" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </button>
  )
}
