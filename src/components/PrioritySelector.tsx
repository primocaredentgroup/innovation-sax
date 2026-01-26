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
    label: 'No priority',
    icon: Minus,
    color: 'gray',
    bgColor: 'bg-gray-100 dark:bg-gray-700',
    textColor: 'text-gray-600 dark:text-gray-400'
  },
  1: {
    label: 'Urgent',
    icon: AlertCircle,
    color: 'orange',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    textColor: 'text-orange-800 dark:text-orange-300'
  },
  2: {
    label: 'High',
    icon: BarChart3,
    color: 'red',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-800 dark:text-red-300'
  },
  3: {
    label: 'Medium',
    icon: BarChart2,
    color: 'yellow',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    textColor: 'text-yellow-800 dark:text-yellow-300'
  },
  4: {
    label: 'Low',
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
  const dropdownRef = useRef<HTMLDivElement>(null)
  const updatePriority = useMutation(api.keydevs.updatePriority)

  const currentConfig = priorityConfig[currentPriority ?? 0]
  const CurrentIcon = currentConfig.icon

  // Chiudi dropdown quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className={`flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
          compact ? 'p-1' : ''
        }`}
        title={compact ? currentConfig.label : undefined}
      >
        <CurrentIcon 
          size={compact ? 16 : 18} 
          className={currentConfig.textColor}
        />
        {!compact && (
          <span className={`text-sm font-medium ${currentConfig.textColor}`}>
            {currentConfig.label}
          </span>
        )}
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg min-w-[240px] overflow-hidden">
          {/* Header */}
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Change priority to...
            </span>
          </div>

          {/* Options */}
          <div className="py-1">
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
                  className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <Icon 
                    size={18} 
                    className={config.textColor}
                  />
                  <span className={`flex-1 text-sm font-medium ${config.textColor}`}>
                    {config.label}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {priority}
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
    </div>
  )
}
