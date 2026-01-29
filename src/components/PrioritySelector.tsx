import { useState, useRef, useEffect } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { 
  Minus, 
  AlertCircle, 
  BarChart3, 
  BarChart2, 
  BarChart,
  Check
} from 'lucide-react'

type Priority = 0 | 1 | 2 | 3 | 4

interface PriorityConfig {
  label: string
  icon: typeof Minus
  color: string
  bgColor: string
  textColor: string
}

const priorityConfig: Record<Priority, PriorityConfig> = {
  0: {
    label: 'Nessuna priorità',
    icon: Minus,
    color: 'gray',
    bgColor: 'bg-gray-100 dark:bg-gray-700',
    textColor: 'text-gray-600 dark:text-gray-400'
  },
  1: {
    label: 'Urgente',
    icon: AlertCircle,
    color: 'orange',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    textColor: 'text-orange-800 dark:text-orange-300'
  },
  2: {
    label: 'Alta',
    icon: BarChart3,
    color: 'red',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-800 dark:text-red-300'
  },
  3: {
    label: 'Media',
    icon: BarChart2,
    color: 'yellow',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    textColor: 'text-yellow-800 dark:text-yellow-300'
  },
  4: {
    label: 'Bassa',
    icon: BarChart,
    color: 'blue',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-800 dark:text-blue-300'
  }
}

interface PrioritySelectorProps {
  keyDevId: Id<'keydevs'>
  currentPriority: Priority | undefined
  onPriorityChange?: () => void
  compact?: boolean // Se true, mostra solo l'icona senza testo
}

export default function PrioritySelector({ 
  keyDevId, 
  currentPriority = 0,
  onPriorityChange,
  compact = false
}: PrioritySelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const updatePriority = useMutation(api.keydevs.updatePriority)

  const currentConfig = priorityConfig[currentPriority ?? 0]
  const CurrentIcon = currentConfig.icon

  // Calcola la posizione del dropdown quando si apre
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      // Usa requestAnimationFrame per differire l'aggiornamento dello stato
      const frameId = requestAnimationFrame(() => {
        if (!buttonRef.current) return
        
        const rect = buttonRef.current.getBoundingClientRect()
        const dropdownHeight = 250 // Altezza approssimativa del dropdown
        const dropdownWidth = 240 // Larghezza del dropdown
        const spacing = 8 // Spazio tra il bottone e il dropdown
        const minTop = 10 // Margine minimo dal top dello schermo
        const minLeft = 10 // Margine minimo dal lato sinistro
        
        // Posiziona sempre sopra il bottone
        let top = rect.top - dropdownHeight - spacing
        
        // Se il dropdown andrebbe fuori dallo schermo in alto, posizionalo sotto
        if (top < minTop) {
          top = rect.bottom + spacing
        }
        
        // Calcola la posizione orizzontale
        let left = rect.left
        
        // Se il dropdown andrebbe fuori dallo schermo a destra, allinealo al bordo destro del bottone
        if (left + dropdownWidth > window.innerWidth - minLeft) {
          left = window.innerWidth - dropdownWidth - minLeft
        }
        
        // Se il dropdown andrebbe fuori dallo schermo a sinistra, posizionalo al minimo consentito
        if (left < minLeft) {
          left = minLeft
        }
        
        setDropdownPosition({
          top,
          left
        })
      })
      
      return () => cancelAnimationFrame(frameId)
    } else if (!isOpen) {
      // Resetta la posizione quando il dropdown si chiude, differendo l'aggiornamento
      const frameId = requestAnimationFrame(() => {
        setDropdownPosition(null)
      })
      return () => cancelAnimationFrame(frameId)
    }
  }, [isOpen])

  // Chiudi dropdown quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handlePrioritySelect = async (priority: Priority) => {
    const effectivePriority = currentPriority ?? 0
    if (priority === effectivePriority) {
      setIsOpen(false)
      return
    }

    try {
      await updatePriority({
        id: keyDevId,
        priority
      })
      setIsOpen(false)
      if (onPriorityChange) {
        onPriorityChange()
      }
    } catch (error) {
      console.error('Errore nell\'aggiornamento della priorità:', error)
    }
  }

  return (
    <>
      {/* Trigger button */}
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setIsOpen(!isOpen)
          }}
          className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border transition-all ${
            compact 
              ? `p-1.5 border-gray-300 dark:border-gray-600 ${currentConfig.bgColor} hover:shadow-md` 
              : `px-2 py-1 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700`
          }`}
          title={compact ? currentConfig.label : undefined}
        >
          <CurrentIcon 
            size={compact ? 18 : 18} 
            className={currentConfig.textColor}
          />
          {!compact && (
            <span className={`text-sm font-medium ${currentConfig.textColor}`}>
              {currentConfig.label}
            </span>
          )}
          {compact && (
            <svg 
              className={`w-3 h-3 ${currentConfig.textColor} transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>
      </div>

      {/* Dropdown menu - posizionato fixed rispetto al viewport */}
      {isOpen && dropdownPosition && (
        <div
          ref={dropdownRef}
          className="fixed z-[9999] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl min-w-[240px] overflow-hidden backdrop-blur-sm"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`
          }}
        >
          {/* Header */}
          <div className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
              Cambia priorità in...
            </span>
          </div>

          {/* Options */}
          <div className="py-1.5">
            {(Object.keys(priorityConfig).map(Number) as Priority[]).map((priority) => {
              const config = priorityConfig[priority]
              const Icon = config.icon
              const effectivePriority = currentPriority ?? 0
              const isSelected = priority === effectivePriority

              return (
                <button
                  key={priority}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handlePrioritySelect(priority)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-150 ${
                    isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500 dark:border-blue-400' : ''
                  }`}
                >
                  <Icon 
                    size={18} 
                    className={config.textColor}
                  />
                  <span className={`flex-1 text-sm font-medium ${config.textColor}`}>
                    {config.label}
                  </span>
                  {isSelected && (
                    <Check 
                      size={16} 
                      className="text-blue-600 dark:text-blue-400"
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
