import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useMemo, useState, useRef, useEffect } from 'react'
import type { Id } from '../../convex/_generated/dataModel'
import { ChevronDown, X, MessageSquare, Calendar } from 'lucide-react'
import PrioritySelector from '../components/PrioritySelector'

// Componente Avatar con Tooltip
function OwnerAvatar({ 
  owner, 
  size = 'sm', 
  onClick 
}: { 
  owner: { _id: string; name: string } | null | undefined
  size?: 'sm' | 'md'
  onClick?: () => void
}) {
  const [showTooltip, setShowTooltip] = useState(false)
  
  if (!owner) {
    return (
      <div 
        className={`${size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'} rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-400 ${onClick ? 'cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-500' : ''}`}
        title="Nessun owner"
        onClick={onClick}
      >
        ?
      </div>
    )
  }
  
  // Genera iniziali dal nome
  const initials = owner.name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
  
  // Genera un colore basato sul nome
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 
    'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-red-500'
  ]
  const colorIndex = owner.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
  const bgColor = colors[colorIndex]
  
  return (
    <div className="relative">
      <div 
        className={`${size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'} rounded-full ${bgColor} flex items-center justify-center text-white font-medium ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={onClick}
        title={onClick ? 'Clicca per cambiare owner' : owner.name}
      >
        {initials}
      </div>
      {showTooltip && !onClick && (
        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 dark:bg-gray-700 rounded shadow-lg whitespace-nowrap">
          {owner.name}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
        </div>
      )}
    </div>
  )
}

// Modal per cambio owner
interface OwnerChangeModalProps {
  isOpen: boolean
  keyDevTitle: string
  keyDevReadableId: string
  currentOwner: { _id: string; name: string } | null | undefined
  users: Array<{ _id: string; name: string }> | undefined
  onConfirm: (ownerId: Id<'users'>) => Promise<void>
  onCancel: () => void
  isLoading: boolean
  error: string
}

function OwnerChangeModal({ 
  isOpen, 
  keyDevTitle, 
  keyDevReadableId,
  currentOwner,
  users,
  onConfirm, 
  onCancel,
  isLoading,
  error
}: OwnerChangeModalProps) {
  // Inizializza lo stato con il currentOwner
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>(() => currentOwner?._id || '')
  
  if (!isOpen) return null
  
  const handleConfirm = async () => {
    if (!selectedOwnerId) {
      return
    }
    await onConfirm(selectedOwnerId as Id<'users'>)
  }
  
  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Cambia Owner
        </h3>
        
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <span className="font-medium">{keyDevReadableId}</span> - {keyDevTitle}
          </p>
          {currentOwner && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Owner attuale: <span className="font-medium">{currentOwner.name}</span>
            </p>
          )}
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Seleziona nuovo owner
          </label>
          <select
            value={selectedOwnerId}
            onChange={(e) => setSelectedOwnerId(e.target.value)}
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 disabled:opacity-50"
          >
            {!currentOwner && <option value="">Seleziona un owner...</option>}
            {users?.map((user) => (
              <option key={user._id} value={user._id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}
        
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
          >
            Annulla
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || !selectedOwnerId}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Salvataggio...' : 'Conferma'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Tipo per lo status
type KeyDevStatus = 'Draft' | 'MockupDone' | 'Approved' | 'Rejected' | 'FrontValidated' | 'InProgress' | 'Done' | 'Checked'

const statusColors: Record<string, string> = {
  Draft: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
  MockupDone: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
  Approved: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
  Rejected: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
  FrontValidated: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
  InProgress: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
  Done: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300',
  Checked: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300'
}

const statusLabels: Record<string, string> = {
  Draft: 'Bozza',
  MockupDone: 'Mockup Terminato',
  Rejected: 'Rifiutato',
  Approved: 'Approvato',
  FrontValidated: 'Front Validato',
  InProgress: 'In Corso',
  Done: 'Completato',
  Checked: 'Controllato'
}

// Stati che non hanno filtro per mese (appaiono sempre)
const statusesWithoutMonthFilter = ['MockupDone', 'Rejected', 'Approved']

// Ordine degli stati per la visualizzazione
const statusOrder = ['Draft', 'MockupDone', 'Rejected', 'Approved', 'FrontValidated', 'InProgress', 'Done', 'Checked']

// Helper per ottenere solo gli stati precedenti (incluso quello attuale)
const getPreviousStatuses = (currentStatus: string): string[] => {
  const currentIndex = statusOrder.indexOf(currentStatus)
  if (currentIndex === -1) return statusOrder
  return statusOrder.slice(0, currentIndex + 1)
}

export default function KeyDevsListPage() {
  const search = useSearch({ strict: false })
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [monthDropdownOpen, setMonthDropdownOpen] = useState(false)
  const monthDropdownRef = useRef<HTMLDivElement>(null)
  
  // Stato per il modal di cambio owner
  const [ownerChangeModal, setOwnerChangeModal] = useState<{
    isOpen: boolean
    keyDevId: Id<'keydevs'> | null
    keyDevTitle: string
    keyDevReadableId: string
    currentOwnerId: Id<'users'> | null | undefined
  }>({
    isOpen: false,
    keyDevId: null,
    keyDevTitle: '',
    keyDevReadableId: '',
    currentOwnerId: null
  })
  const [ownerChangeLoading, setOwnerChangeLoading] = useState(false)
  const [ownerChangeError, setOwnerChangeError] = useState('')

  const currentMonth = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }, [])

  const selectedMonth = search.month === 'all' ? undefined : (search.month || currentMonth)
  const showAllMonths = search.month === 'all'

  // Query per keydevs filtrati per mese (Draft, FrontValidated, InProgress, Done)
  const keydevsByMonth = useQuery(
    api.keydevs.listByMonth, 
    selectedMonth ? { monthRef: selectedMonth } : 'skip'
  )
  // Query per keydevs senza filtro mese (MockupDone, Rejected, Approved)
  const keydevsWithoutMonth = useQuery(api.keydevs.listWithoutMonthFilter)
  // Query per tutti i keydevs quando "Tutti i mesi" è selezionato
  const allKeydevs = useQuery(api.keydevs.listAll, showAllMonths ? {} : 'skip')
  
  const departments = useQuery(api.departments.list)
  const teams = useQuery(api.teams.list)
  const users = useQuery(api.users.listUsers)
  const updateStatus = useMutation(api.keydevs.updateStatus)
  const updateMonth = useMutation(api.keydevs.updateMonth)
  const assignOwner = useMutation(api.keydevs.assignOwner)
  
  // Query per budget e mese (solo se un mese specifico è selezionato)
  const budgetAllocations = useQuery(
    api.budget.getByMonth, 
    selectedMonth ? { monthRef: selectedMonth } : 'skip'
  )
  const monthData = useQuery(
    api.months.getByRef, 
    selectedMonth ? { monthRef: selectedMonth } : 'skip'
  )
  
  // Query per contatori totali quando "Tutti i mesi" è selezionato
  const selectedDeptId: Id<'departments'> | undefined = search.dept ? (search.dept as Id<'departments'>) : undefined
  const totalPhaseCounts = useQuery(
    api.keydevs.getTotalPhaseCounts, 
    showAllMonths ? { deptId: selectedDeptId } : 'skip'
  )
  
  // Combina i keydevs e ordina per priorità (urgenti per primi)
  const keydevs = useMemo(() => {
    let combined: typeof allKeydevs = []
    
    if (showAllMonths) {
      // Quando "Tutti i mesi" è selezionato, mostra tutti i keydevs
      combined = allKeydevs || []
    } else {
      const byMonthFiltered = (keydevsByMonth || []).filter(
        (kd) => !statusesWithoutMonthFilter.includes(kd.status)
      )
      const withoutMonth = keydevsWithoutMonth || []
      combined = [...byMonthFiltered, ...withoutMonth]
    }
    
    // Ordina per priorità: 1 (Urgent) per primi, poi 2, 3, 4, 0 (No priority)
    // Se la priorità è undefined, trattala come 0 (No priority)
    return [...combined].sort((a, b) => {
      const priorityA = a.priority ?? 0
      const priorityB = b.priority ?? 0
      
      // Ordine: 1, 2, 3, 4, 0
      // Se la priorità è 0, va alla fine
      if (priorityA === 0 && priorityB !== 0) return 1
      if (priorityB === 0 && priorityA !== 0) return -1
      if (priorityA === 0 && priorityB === 0) return 0
      
      // Altrimenti ordina normalmente (1, 2, 3, 4)
      return priorityA - priorityB
    })
  }, [showAllMonths, allKeydevs, keydevsByMonth, keydevsWithoutMonth])
  
  // Calcola i contatori basandosi sui keydevs filtrati per team/dipartimento
  // Questo assicura che i contatori corrispondano ai keydevs visibili nella lista
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    
    // Applica i filtri base (mese, dept, team) per calcolare i contatori corretti
    let filteredForCounts = keydevs || []
    
    if (search.dept) {
      filteredForCounts = filteredForCounts.filter((kd) => kd.deptId === search.dept)
    }
    if (search.team) {
      filteredForCounts = filteredForCounts.filter((kd) => kd.teamId === search.team)
    }
    
    // Conta gli stati nei keydevs filtrati
    for (const kd of filteredForCounts) {
      counts[kd.status] = (counts[kd.status] || 0) + 1
    }
    
    return counts
  }, [keydevs, search.dept, search.team])

  // Normalizza gli status selezionati (può essere stringa o array)
  const selectedStatuses = useMemo(() => {
    if (!search.status) return []
    if (Array.isArray(search.status)) return search.status
    return [search.status]
  }, [search.status])

  // Applica i filtri base (mese, dept, team, status) per calcolare i contatori
  // Di default esclude "Draft" (Bozza) se non ci sono filtri di stato selezionati
  const baseFilteredKeyDevs = useMemo(() => {
    if (!keydevs) return []
    let result = keydevs

    if (search.dept) {
      result = result.filter((kd) => kd.deptId === search.dept)
    }
    if (search.team) {
      result = result.filter((kd) => kd.teamId === search.team)
    }
    if (selectedStatuses.length > 0) {
      result = result.filter((kd) => selectedStatuses.includes(kd.status))
    } else {
      // Di default escludi "Draft" (Bozza) quando non ci sono filtri di stato selezionati
      result = result.filter((kd) => kd.status !== 'Draft')
    }

    return result
  }, [keydevs, search.dept, search.team, selectedStatuses])

  // Filter keydevs based on search params
  // La ricerca testuale include sempre i Draft anche se sono nascosti dalla tabella
  const filteredKeyDevs = useMemo(() => {
    let result = baseFilteredKeyDevs
    
    // Applica filtro di ricerca testuale se presente
    if (search.query && search.query.trim()) {
      const queryLower = search.query.toLowerCase().trim()
      
      // Se non ci sono filtri di stato selezionati, cerca anche nei Draft nascosti
      if (selectedStatuses.length === 0) {
        // Crea un set con gli ID già inclusi per evitare duplicati
        const includedIds = new Set(result.map(kd => kd._id))
        
        // Cerca nei Draft che sono stati esclusi di default
        const draftKeyDevs = (keydevs || []).filter((kd) => {
          // Applica gli stessi filtri base (dept, team) ma solo per Draft
          if (kd.status !== 'Draft') return false
          if (search.dept && kd.deptId !== search.dept) return false
          if (search.team && kd.teamId !== search.team) return false
          
          // Cerca nella query
          const titleMatch = kd.title.toLowerCase().includes(queryLower)
          const readableIdMatch = kd.readableId.toLowerCase().includes(queryLower)
          return titleMatch || readableIdMatch
        })
        
        // Aggiungi i Draft trovati alla ricerca
        result = [...result, ...draftKeyDevs.filter(kd => !includedIds.has(kd._id))]
      }
      
      // Applica il filtro di ricerca sui risultati visibili
      result = result.filter((kd) => {
        const titleMatch = kd.title.toLowerCase().includes(queryLower)
        const readableIdMatch = kd.readableId.toLowerCase().includes(queryLower)
        return titleMatch || readableIdMatch
      })
    }
    
    return result
  }, [baseFilteredKeyDevs, search.query, search.dept, search.team, selectedStatuses, keydevs])

  // Calcola l'utilizzo del budget (slot occupati vs slot massimi disponibili)
  const budgetUtilization = useMemo(() => {
    // Se "Tutti i mesi" è selezionato, non mostrare il budget utilization
    if (showAllMonths) {
      return { occupiedSlots: 0, budgetAssigned: 0, maxSlots: 0, competitionSlots: 0, percentage: 0, remainingSlots: 0 }
    }
    
    const occupiedStatuses = ['FrontValidated', 'InProgress', 'Done', 'Checked']
    
    // Filtra keydevs per stati che occupano slot E per dipartimento/team se selezionati
    // Usa keydevsByMonth per avere solo i keydevs del mese corrente
    const relevantKeydevs = (keydevsByMonth || []).filter(kd => 
      occupiedStatuses.includes(kd.status) && 
      (!search.dept || kd.deptId === search.dept) &&
      (!search.team || kd.teamId === search.team)
    )
    
    // Somma pesi (default weight = 1 se non specificato)
    const occupiedSlots = relevantKeydevs.reduce((sum, kd) => sum + (kd.weight ?? 1), 0)
    
    // Budget assegnato ai dipartimenti (filtrato per dipartimento/team se selezionati)
    const budgetAssigned = budgetAllocations?.filter(b => 
      (!search.dept || b.deptId === search.dept) &&
      (!search.team || b.teamId === search.team)
    ).reduce((sum, b) => sum + b.maxAlloc, 0) ?? 0
    
    // Slot massimi disponibili (totalKeyDev del mese) - numero sviluppatori
    const maxSlots = monthData?.totalKeyDev ?? 0
    
    // Slot in competizione: differenza tra allocati e massimi (se allocati > massimi)
    const competitionSlots = Math.max(0, budgetAssigned - maxSlots)
    
    // Percentuale basata sui slot massimi reali (non sul budget assegnato)
    const percentage = maxSlots > 0 ? (occupiedSlots / maxSlots) * 100 : 0
    
    // Slot rimanenti per raggiungere il massimo
    const remainingSlots = Math.max(0, maxSlots - occupiedSlots)
    
    return { occupiedSlots, budgetAssigned, maxSlots, competitionSlots, percentage, remainingSlots }
  }, [showAllMonths, keydevsByMonth, budgetAllocations, monthData, search.dept, search.team])

  // Generate month options
  const monthOptions = useMemo(() => {
    const options = []
    const now = new Date()
    for (let i = -6; i <= 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const ref = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const label = date.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
      options.push({ value: ref, label })
    }
    return options
  }, [])

  // Ottieni i contatori per tutte le fasi per tutti i mesi visibili nel dropdown
  const monthRefs = useMemo(() => monthOptions.map(opt => opt.value), [monthOptions])
  const phaseCountsByMonth = useQuery(api.keydevs.getPhaseCountsByMonths, { 
    monthRefs,
    deptId: selectedDeptId
  })
  
  // Ottieni i dati di budget e slot occupati per tutti i mesi visibili nel dropdown
  const selectedTeamId: Id<'teams'> | undefined = search.team ? (search.team as Id<'teams'>) : undefined
  const budgetUtilizationByMonth = useQuery(api.keydevs.getBudgetUtilizationByMonths, {
    monthRefs,
    deptId: selectedDeptId,
    teamId: selectedTeamId
  })

  const updateSearch = (updates: Record<string, string | string[] | undefined>) => {
    navigate({
      to: '/keydevs',
      search: { ...search, ...updates }
    })
  }

  const toggleStatus = (status: string) => {
    const currentStatuses = selectedStatuses
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter((s) => s !== status)
      : [...currentStatuses, status]
    
    updateSearch({ status: newStatuses.length > 0 ? newStatuses : undefined })
  }
  
  // Genera opzioni mese per la colonna mese (dropdown inline)
  const inlineMonthOptions = useMemo(() => {
    const options = []
    const now = new Date()
    // Include 4 mesi passati, mese corrente e 6 mesi futuri
    for (let i = -4; i <= 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const ref = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const label = date.toLocaleDateString('it-IT', { month: 'short', year: 'numeric' })
      options.push({ value: ref, label })
    }
    return options
  }, [])
  
  // Handler per aprire il modal di cambio owner
  const handleOpenOwnerChangeModal = (kd: {
    _id: Id<'keydevs'>
    title: string
    readableId: string
    ownerId?: Id<'users'>
  }) => {
    setOwnerChangeError('')
    setOwnerChangeModal({
      isOpen: true,
      keyDevId: kd._id,
      keyDevTitle: kd.title,
      keyDevReadableId: kd.readableId,
      currentOwnerId: kd.ownerId
    })
  }
  
  // Handler per confermare il cambio owner
  const handleConfirmOwnerChange = async (ownerId: Id<'users'>) => {
    if (!ownerChangeModal.keyDevId) return
    
    setOwnerChangeLoading(true)
    setOwnerChangeError('')
    
    try {
      await assignOwner({
        id: ownerChangeModal.keyDevId,
        ownerId: ownerId
      })
      
      // Chiudi il modal dopo successo
      handleCloseOwnerChangeModal()
    } catch (err) {
      setOwnerChangeError(err instanceof Error ? err.message : 'Errore durante il cambio owner')
    } finally {
      setOwnerChangeLoading(false)
    }
  }
  
  // Handler per chiudere il modal di cambio owner
  const handleCloseOwnerChangeModal = () => {
    setOwnerChangeModal({
      isOpen: false,
      keyDevId: null,
      keyDevTitle: '',
      keyDevReadableId: '',
      currentOwnerId: null
    })
    setOwnerChangeError('')
  }
  
  // Formatta il mese per la visualizzazione
  const formatMonthShort = (monthRef: string | undefined) => {
    if (!monthRef) return '-'
    const [year, month] = monthRef.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1, 1)
    return date.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' })
  }

  const selectedTeam = search.team || null

  // Chiudi dropdown quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(event.target as Node)) {
        setMonthDropdownOpen(false)
      }
    }

    if (dropdownOpen || monthDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdownOpen, monthDropdownOpen])

  // Testo del pulsante dropdown
  const dropdownButtonText = useMemo(() => {
    if (selectedStatuses.length === 0) {
      return 'Tutti gli stati'
    }
    if (selectedStatuses.length === 1) {
      return statusLabels[selectedStatuses[0]]
    }
    return `${selectedStatuses.length} stati selezionati`
  }, [selectedStatuses])

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:flex-wrap">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Sviluppi Chiave di</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative" ref={monthDropdownRef}>
              <button
                type="button"
                onClick={() => setMonthDropdownOpen(!monthDropdownOpen)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 text-base sm:text-lg font-semibold flex items-center gap-2"
              >
                <span>
                  {showAllMonths 
                    ? 'Tutti i mesi' 
                    : (() => {
                        const monthOpt = monthOptions.find(opt => opt.value === selectedMonth)
                        const budgetData = budgetUtilizationByMonth?.[selectedMonth || '']
                        if (monthOpt && budgetData) {
                          const occupied = budgetData.occupiedSlots % 1 === 0 
                            ? budgetData.occupiedSlots 
                            : budgetData.occupiedSlots.toFixed(2)
                          return `${monthOpt.label} (${occupied} di ${budgetData.maxSlots})`
                        }
                        return monthOpt?.label || 'Seleziona mese'
                      })()}
                </span>
                <ChevronDown 
                  size={20} 
                  className={`text-gray-500 dark:text-gray-400 transition-transform ${monthDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {monthDropdownOpen && (
                <div className="absolute z-50 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-[400px] overflow-y-auto min-w-[280px]">
                  <div className="p-2 space-y-1">
                    {/* Opzione "Tutti i mesi" */}
                    <button
                      onClick={() => {
                        updateSearch({ month: 'all' })
                        setMonthDropdownOpen(false)
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left ${
                        showAllMonths ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Tutti i mesi
                      </span>
                      <div className="flex items-center gap-2 ml-2">
                        {totalPhaseCounts && (
                          <>
                            {totalPhaseCounts.FrontValidated > 0 && (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 font-semibold">
                                {totalPhaseCounts.FrontValidated}
                              </span>
                            )}
                            {totalPhaseCounts.InProgress > 0 && (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 font-semibold">
                                {totalPhaseCounts.InProgress}
                              </span>
                            )}
                            {totalPhaseCounts.Done > 0 && (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 font-semibold">
                                {totalPhaseCounts.Done}
                              </span>
                            )}
                            {totalPhaseCounts.Checked > 0 && (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 font-semibold">
                                {totalPhaseCounts.Checked}
                              </span>
                            )}
                          </>
                        )}
                        {showAllMonths && (
                          <span className="text-blue-600 dark:text-blue-400">✓</span>
                        )}
                      </div>
                    </button>
                    
                    {/* Separatore */}
                    <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                    
                    {/* Opzioni mesi */}
                    {monthOptions.map((opt) => {
                      const counts = phaseCountsByMonth?.[opt.value]
                      const frontValidated = counts?.FrontValidated || 0
                      const inProgress = counts?.InProgress || 0
                      const done = counts?.Done || 0
                      const checked = counts?.Checked || 0
                      const isSelected = !showAllMonths && selectedMonth === opt.value
                      const budgetData = budgetUtilizationByMonth?.[opt.value]
                      const occupiedSlots = budgetData?.occupiedSlots || 0
                      const maxSlots = budgetData?.maxSlots || 0
                      
                      // Formatta il valore degli slot occupati
                      const occupiedDisplay = occupiedSlots % 1 === 0 
                        ? occupiedSlots 
                        : occupiedSlots.toFixed(2)
                      
                      return (
                        <button
                          key={opt.value}
                          onClick={() => {
                            updateSearch({ month: opt.value })
                            setMonthDropdownOpen(false)
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left ${
                            isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                          }`}
                        >
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {opt.label} ({occupiedDisplay} di {maxSlots})
                          </span>
                          <div className="flex items-center gap-2 ml-2">
                            {frontValidated > 0 && (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 font-semibold">
                                {frontValidated}
                              </span>
                            )}
                            {inProgress > 0 && (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 font-semibold">
                                {inProgress}
                              </span>
                            )}
                            {done > 0 && (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 font-semibold">
                                {done}
                              </span>
                            )}
                            {checked > 0 && (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 font-semibold">
                                {checked}
                              </span>
                            )}
                            {isSelected && (
                              <span className="text-blue-600 dark:text-blue-400">✓</span>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
            <span className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 hidden sm:inline">per</span>
            <select
              value={search.dept || ''}
              onChange={(e) => updateSearch({ dept: e.target.value || undefined })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 text-base sm:text-lg font-semibold"
            >
              <option value="">Tutti i dipartimenti</option>
              {departments?.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Link
          to="/keydevs/new"
          className="px-3 sm:px-4 py-2 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 font-medium rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors border border-blue-600 dark:border-blue-500 text-sm sm:text-base whitespace-nowrap self-start sm:self-auto"
        >
          + Nuovo Sviluppo Chiave
        </Link>
      </div>

      {/* Budget Utilization Card - Solo quando un mese specifico è selezionato */}
      {!showAllMonths && (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Slot occupati:</span>
              <span className="ml-2 font-semibold text-gray-900 dark:text-gray-100">
                {budgetUtilization.occupiedSlots % 1 === 0 
                  ? budgetUtilization.occupiedSlots 
                  : budgetUtilization.occupiedSlots.toFixed(2)}
                <span className="text-gray-400 dark:text-gray-500">/{budgetUtilization.maxSlots}</span>
              </span>
            </div>
            <div>
              <Link 
                to="/admin/planning"
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                Slot allocati ai dipartimenti:
              </Link>
              <span className="ml-2 font-semibold text-gray-900 dark:text-gray-100">
                {budgetUtilization.budgetAssigned}
              </span>
              {budgetUtilization.competitionSlots > 0 && (
                <span className="ml-2 text-sm font-medium text-orange-600 dark:text-orange-400 block sm:inline">
                  ({budgetUtilization.competitionSlots} in competizione)
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Utilizzo:</span>
            <span className={`text-lg font-bold ${
              budgetUtilization.percentage >= 100 
                ? 'text-green-600 dark:text-green-400' 
                : budgetUtilization.percentage >= 50
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-red-600 dark:text-red-400'
            }`}>
              {budgetUtilization.percentage.toFixed(0)}%
            </span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${
              budgetUtilization.percentage >= 100 
                ? 'bg-green-500' 
                : budgetUtilization.percentage >= 50
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(budgetUtilization.percentage, 100)}%` }}
          />
        </div>
        {/* Warning se gli slot allocati ai dipartimenti non corrispondono al budget */}
        {budgetUtilization.maxSlots > 0 && budgetUtilization.budgetAssigned !== budgetUtilization.maxSlots && (
          <p className="mt-2 text-sm font-medium text-yellow-600 dark:text-yellow-400">
            ⚠️ Mancano {Math.abs(budgetUtilization.budgetAssigned - budgetUtilization.maxSlots)} slot da allocare!
          </p>
        )}
        {budgetUtilization.percentage < 100 && budgetUtilization.maxSlots > 0 && (
          <p className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
            {budgetUtilization.competitionSlots > 0 ? (
              <>
                <span className="font-medium">Attenzione:</span> {budgetUtilization.competitionSlots} dipartiment{budgetUtilization.competitionSlots === 1 ? 'o' : 'i'} perderanno lo slot. 
                Valida il front rapidamente per assicurarti di non essere tra quelli esclusi!
              </>
            ) : (
              <>
                Rimangono {budgetUtilization.remainingSlots % 1 === 0 
                  ? budgetUtilization.remainingSlots 
                  : budgetUtilization.remainingSlots.toFixed(2)} slot disponibili. 
                Valida il front per occupare il tuo slot!
              </>
            )}
          </p>
        )}
        {budgetUtilization.percentage >= 100 && (
          <p className="mt-2 text-sm text-green-600 dark:text-green-400 font-medium">
            Tutti gli slot disponibili sono stati occupati!
          </p>
        )}
      </div>
      )}

      {/* Team Tabs and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 p-4 border-b border-gray-200 dark:border-gray-700">
          {/* Team Tabs */}
          <div className="flex overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex-1 min-w-0">
            <button
              onClick={() => updateSearch({ team: undefined })}
              className={`px-4 sm:px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                selectedTeam === null
                  ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              Tutti i team
            </button>
            {teams?.map((team) => (
              <button
                key={team._id}
                onClick={() => updateSearch({ team: team._id })}
                className={`px-4 sm:px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  selectedTeam === team._id
                    ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {team.name}
              </button>
            ))}
          </div>
          
          {/* Search Input */}
          <div className="shrink-0 w-full sm:w-auto sm:min-w-[250px]">
            <input
              type="text"
              placeholder="Cerca per titolo o ID..."
              value={search.query || ''}
              onChange={(e) => updateSearch({ query: e.target.value || undefined })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 mb-6 space-y-4">

        {/* Status Filters - Dropdown (Mobile) */}
        <div className="md:hidden" ref={dropdownRef}>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Filtra per Stato
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:border-blue-500 dark:hover:border-blue-500 transition-colors text-left"
            >
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {dropdownButtonText}
              </span>
              <ChevronDown 
                size={20} 
                className={`text-gray-500 dark:text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-[320px] overflow-y-auto">
                <div className="p-2 space-y-1">
                  {statusOrder.map((key) => {
                    const label = statusLabels[key]
                    const isSelected = selectedStatuses.includes(key)
                    const count = statusCounts?.[key] || 0
                    const hasNoMonthFilter = statusesWithoutMonthFilter.includes(key)
                    
                    return (
                      <label
                        key={key}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                          isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleStatus(key)}
                          className="w-4 h-4 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-2"
                        />
                        <div className="flex-1 flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${statusColors[key]}`}>
                            {label}
                          </span>
                          {hasNoMonthFilter && (
                            <span className="text-xs text-gray-500 dark:text-gray-400" title="Non filtrato per mese">*</span>
                          )}
                          {count > 0 && (
                            <span className="ml-auto text-xs font-medium text-gray-500 dark:text-gray-400">
                              ({count})
                            </span>
                          )}
                        </div>
                      </label>
                    )
                  })}
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 p-2">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500 dark:text-gray-400 px-2">
                        * Stati non filtrati per mese
                      </p>
                      {selectedStatuses.length > 0 && (
                        <button
                          onClick={() => {
                            updateSearch({ status: undefined })
                            setDropdownOpen(false)
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                        >
                          <X size={14} />
                          Rimuovi filtri
                        </button>
                      )}
                    </div>
                    {selectedStatuses.length === 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 px-2 italic">
                        Nota: Gli sviluppi in "Bozza" sono nascosti di default. Seleziona "Bozza" per visualizzarli.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status Filters - Tag Style (Desktop) */}
        <div className="hidden md:block">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Filtra per Stato
          </label>
          <div className="flex flex-wrap gap-2">
            {statusOrder.map((key) => {
              const label = statusLabels[key]
              const isSelected = selectedStatuses.includes(key)
              const count = statusCounts?.[key] || 0
              const hasNoMonthFilter = statusesWithoutMonthFilter.includes(key)
              return (
                <button
                  key={key}
                  onClick={() => toggleStatus(key)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    isSelected
                      ? `${statusColors[key]} ring-2 ring-offset-2 ring-gray-600 dark:ring-gray-400 shadow-md font-semibold`
                      : `${statusColors[key]} opacity-70 hover:opacity-100`
                  }`}
                  title={hasNoMonthFilter ? 'Questo stato non è filtrato per mese' : undefined}
                >
                  {label}
                  {hasNoMonthFilter && <span className="ml-1 text-xs opacity-60">*</span>}
                  {count > 0 && (
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                      isSelected ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900' : 'bg-gray-700 dark:bg-gray-300 text-white dark:text-gray-900'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            * Stati non filtrati per mese
          </p>
          {selectedStatuses.length === 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">
              Nota: Gli sviluppi in "Bozza" sono nascosti di default. Clicca sul filtro "Bozza" per visualizzarli.
            </p>
          )}
          {selectedStatuses.length > 0 && (
            <button
              onClick={() => updateSearch({ status: undefined })}
              className="mt-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 underline"
            >
              Rimuovi tutti i filtri
            </button>
          )}
        </div>
      </div>

      {/* KeyDev List - Card View (Mobile) */}
      <div className="md:hidden space-y-3">
        {filteredKeyDevs.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center text-gray-500 dark:text-gray-400">
            Nessuno Sviluppo Chiave trovato per i filtri selezionati
          </div>
        ) : (
          filteredKeyDevs.map((kd) => {
            return (
              <div
                key={kd._id}
                onClick={() => navigate({ to: '/keydevs/$id', params: { id: kd.readableId } })}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-md transition-shadow cursor-pointer border border-gray-200 dark:border-gray-700"
              >
                {/* Header con ID e Stato */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-gray-500 dark:text-gray-400 font-mono text-xs">{kd.readableId}</span>
                      <div onClick={(e) => e.stopPropagation()}>
                        <select
                          value={kd.status}
                          onChange={async (e) => {
                            try {
                              await updateStatus({ id: kd._id, status: e.target.value as KeyDevStatus })
                            } catch (error) {
                              alert(error instanceof Error ? error.message : 'Errore nel cambio di stato')
                            }
                          }}
                          className={`px-2 py-1 text-xs rounded-full border-0 ${statusColors[kd.status]} cursor-pointer`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {getPreviousStatuses(kd.status).map((status) => (
                            <option key={status} value={status} className="bg-white dark:bg-gray-800">
                              {statusLabels[status]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div onClick={(e) => e.stopPropagation()}>
                        <PrioritySelector 
                          keyDevId={kd._id} 
                          currentPriority={kd.priority}
                          compact={true}
                        />
                      </div>
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 wrap-break-word">
                      {kd.title}
                    </h3>
                  </div>
                </div>

                {/* Informazioni aggiuntive */}
                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Dipartimento:</span>
                    <span>{departments?.find((d) => d._id === kd.deptId)?.name || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Team:</span>
                    <span>{teams?.find((t) => t._id === kd.teamId)?.name || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Owner:</span>
                    <div onClick={(e) => e.stopPropagation()}>
                      <OwnerAvatar 
                        owner={users?.find(u => u._id === kd.ownerId)} 
                        size="sm"
                        onClick={() => handleOpenOwnerChangeModal(kd)}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400" onClick={(e) => e.stopPropagation()}>
                    <span className="font-medium">Mese:</span>
                    {['Draft', 'MockupDone', 'Approved'].includes(kd.status) ? (
                      <select
                        value={kd.monthRef || ''}
                        onChange={async (e) => {
                          const newValue = e.target.value
                          // Se il valore è uguale a quello attuale, non fare nulla
                          if (newValue === (kd.monthRef || '')) return
                          try {
                            // Cambia direttamente il mese senza dialog
                            await updateMonth({
                              id: kd._id,
                              monthRef: newValue || null // null per rimuovere il mese
                            })
                          } catch (err) {
                            alert(err instanceof Error ? err.message : 'Errore durante il cambio mese')
                          }
                        }}
                        className={`px-2 py-1 text-xs border rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 cursor-pointer ${
                          kd.monthRef 
                            ? 'border-gray-300 dark:border-gray-600' 
                            : 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                        title="Seleziona o cambia mese"
                      >
                        <option value="">Nessun mese</option>
                        {inlineMonthOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className={kd.monthRef ? '' : 'text-gray-400 dark:text-gray-500 italic'}>
                        {kd.monthRef ? formatMonthShort(kd.monthRef) : 'Non assegnato'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Note */}
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
                  <Link
                    to="/keydevs/$id/notes"
                    params={{ id: kd.readableId }}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                    title={`${kd.notesCount || 0} nota${(kd.notesCount || 0) !== 1 ? 'e' : ''}`}
                  >
                    <MessageSquare size={16} />
                    <span className="text-xs font-medium">Note</span>
                    {(kd.notesCount || 0) > 0 && (
                      <span className="text-xs font-semibold bg-blue-200 dark:bg-blue-800 px-1.5 py-0.5 rounded-full">
                        {kd.notesCount || 0}
                      </span>
                    )}
                  </Link>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* KeyDev List Table (Desktop) */}
      <div className="hidden md:block bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Titolo</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Stato</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Mese</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Priorità</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Dipartimento</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Team</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 dark:text-gray-100 hidden lg:table-cell">Owner</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredKeyDevs.map((kd) => (
                <tr
                  key={kd._id}
                  onClick={() => navigate({ to: '/keydevs/$id', params: { id: kd.readableId } })}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 dark:text-gray-400 font-mono text-xs">{kd.readableId}</span>
                      <span>{kd.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={kd.status}
                      onChange={async (e) => {
                        try {
                          await updateStatus({ id: kd._id, status: e.target.value as KeyDevStatus })
                        } catch (error) {
                          alert(error instanceof Error ? error.message : 'Errore nel cambio di stato')
                        }
                      }}
                      className={`px-2 py-1 text-xs rounded-full border-0 ${statusColors[kd.status]} cursor-pointer`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {getPreviousStatuses(kd.status).map((status) => (
                        <option key={status} value={status} className="bg-white dark:bg-gray-800">
                          {statusLabels[status]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
                    {/* Colonna Mese: dropdown per stati che possono prenotare, visualizzazione per altri */}
                    {['Draft', 'MockupDone', 'Approved'].includes(kd.status) ? (
                      <select
                        value={kd.monthRef || ''}
                        onChange={async (e) => {
                          const newValue = e.target.value
                          // Se il valore è uguale a quello attuale, non fare nulla
                          if (newValue === (kd.monthRef || '')) return
                          try {
                            // Cambia direttamente il mese senza dialog
                            await updateMonth({
                              id: kd._id,
                              monthRef: newValue || null // null per rimuovere il mese
                            })
                          } catch (err) {
                            alert(err instanceof Error ? err.message : 'Errore durante il cambio mese')
                          }
                        }}
                        className={`px-2 py-1 text-xs border rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 cursor-pointer ${
                          kd.monthRef 
                            ? 'border-gray-300 dark:border-gray-600' 
                            : 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                        title="Seleziona o cambia mese"
                      >
                        <option value="">Nessun mese</option>
                        {inlineMonthOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className={`text-xs ${kd.monthRef ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500 italic'}`}>
                        {kd.monthRef ? (
                          <span className="flex items-center gap-1">
                            <Calendar size={12} className="text-gray-400" />
                            {formatMonthShort(kd.monthRef)}
                          </span>
                        ) : '-'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
                    <PrioritySelector 
                      keyDevId={kd._id} 
                      currentPriority={kd.priority}
                      compact={true}
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                    {departments?.find((d) => d._id === kd.deptId)?.name || 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                    {teams?.find((t) => t._id === kd.teamId)?.name || 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-sm hidden lg:table-cell" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-center">
                      <OwnerAvatar 
                        owner={users?.find(u => u._id === kd.ownerId)} 
                        onClick={() => handleOpenOwnerChangeModal(kd)}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
                    <Link
                      to="/keydevs/$id/notes"
                      params={{ id: kd.readableId }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                      title={`${kd.notesCount || 0} nota${(kd.notesCount || 0) !== 1 ? 'e' : ''}`}
                    >
                      <MessageSquare size={16} />
                      {(kd.notesCount || 0) > 0 && (
                        <span className="text-xs font-semibold">{kd.notesCount || 0}</span>
                      )}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredKeyDevs.length === 0 && (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            Nessuno Sviluppo Chiave trovato per i filtri selezionati
          </div>
        )}
      </div>
      
      {/* Modal per cambio owner */}
      <OwnerChangeModal
        key={ownerChangeModal.keyDevId || 'owner-modal'}
        isOpen={ownerChangeModal.isOpen}
        keyDevTitle={ownerChangeModal.keyDevTitle}
        keyDevReadableId={ownerChangeModal.keyDevReadableId}
        currentOwner={users?.find(u => u._id === ownerChangeModal.currentOwnerId)}
        users={users}
        onConfirm={handleConfirmOwnerChange}
        onCancel={handleCloseOwnerChangeModal}
        isLoading={ownerChangeLoading}
        error={ownerChangeError}
      />
    </div>
  )
}
