import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useMemo, useState, useRef, useEffect } from 'react'
import type { Id } from '../../convex/_generated/dataModel'
import { ChevronDown, ChevronUp, X, MessageSquare, Calendar, Search } from 'lucide-react'
import PrioritySelector from '../components/PrioritySelector'

// Componente Avatar con Tooltip (riutilizzabile per Owner e Requester)
function OwnerAvatar({ 
  owner, 
  size = 'sm', 
  onClick,
  clickTitle = 'Clicca per cambiare owner'
}: { 
  owner: { _id: string; name: string; picture?: string; pictureUrl?: string } | null | undefined
  size?: 'sm' | 'md'
  onClick?: () => void
  clickTitle?: string
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
        className={`${size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'} rounded-full overflow-hidden ${bgColor} flex items-center justify-center text-white font-medium ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={onClick}
        title={onClick ? clickTitle : owner.name}
      >
        {(owner.picture ?? owner.pictureUrl) ? (
          <img src={owner.picture ?? owner.pictureUrl} alt={owner.name} className="w-full h-full object-cover" />
        ) : (
          initials
        )}
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

// Modal per cambio requester
interface RequesterChangeModalProps {
  isOpen: boolean
  keyDevTitle: string
  keyDevReadableId: string
  currentRequester: { _id: string; name: string } | null | undefined
  users: Array<{ _id: string; name: string }> | undefined
  onConfirm: (requesterId: Id<'users'>) => Promise<void>
  onCancel: () => void
  isLoading: boolean
  error: string
}

function RequesterChangeModal({
  isOpen,
  keyDevTitle,
  keyDevReadableId,
  currentRequester,
  users,
  onConfirm,
  onCancel,
  isLoading,
  error
}: RequesterChangeModalProps) {
  const [selectedRequesterId, setSelectedRequesterId] = useState<string>(() => currentRequester?._id || '')

  if (!isOpen) return null

  const handleConfirm = async () => {
    if (!selectedRequesterId) return
    await onConfirm(selectedRequesterId as Id<'users'>)
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Cambia Requester
        </h3>

        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <span className="font-medium">{keyDevReadableId}</span> - {keyDevTitle}
          </p>
          {currentRequester && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Requester attuale: <span className="font-medium">{currentRequester.name}</span>
            </p>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Seleziona nuovo requester
          </label>
          <select
            value={selectedRequesterId}
            onChange={(e) => setSelectedRequesterId(e.target.value)}
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 disabled:opacity-50"
          >
            {!currentRequester && <option value="">Seleziona un requester...</option>}
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
            disabled={isLoading || !selectedRequesterId}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Salvataggio...' : 'Conferma'}
          </button>
        </div>
      </div>
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
  FrontValidated: 'Mese Stabilito',
  InProgress: 'In Corso',
  Done: 'Completato',
  Checked: 'Controllato'
}

const getStatusLabel = (
  status: string,
  showWarning: boolean
): string => {
  const label = statusLabels[status] ?? status
  if (status === 'MockupDone' && showWarning) {
    return `${label} ⚠`
  }
  return label
}

// Ordine degli stati per la visualizzazione
const statusOrder = ['Draft', 'MockupDone', 'Rejected', 'Approved', 'FrontValidated', 'InProgress', 'Done', 'Checked']

// Colonne ordinabili
type SortField = 'priority' | 'title' | 'status' | 'month' | 'department' | 'team' | 'requester' | 'owner' | 'notes'

// Header colonna ordinabile
function SortableHeader({
  label,
  field,
  currentSortField,
  sortDir,
  onSort,
  className = '',
  center
}: {
  label: string
  field: SortField
  currentSortField: SortField
  sortDir: 'asc' | 'desc'
  onSort: (f: SortField) => void
  className?: string
  center?: boolean
}) {
  const isActive = currentSortField === field
  return (
    <th
      className={`px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100 select-none cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors ${className} ${center ? 'text-center' : 'text-left'}`}
      onClick={() => onSort(field)}
    >
      <div className={`flex items-center gap-1 ${center ? 'justify-center' : ''}`}>
        {label}
        {isActive ? (
          sortDir === 'asc' ? (
            <ChevronUp size={14} className="shrink-0" />
          ) : (
            <ChevronDown size={14} className="shrink-0" />
          )
        ) : (
          <ChevronDown size={14} className="shrink-0 opacity-40" />
        )}
      </div>
    </th>
  )
}

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

  // Stato per il modal di cambio requester
  const [requesterChangeModal, setRequesterChangeModal] = useState<{
    isOpen: boolean
    keyDevId: Id<'keydevs'> | null
    keyDevTitle: string
    keyDevReadableId: string
    currentRequesterId: Id<'users'> | null | undefined
  }>({
    isOpen: false,
    keyDevId: null,
    keyDevTitle: '',
    keyDevReadableId: '',
    currentRequesterId: null
  })
  const [requesterChangeLoading, setRequesterChangeLoading] = useState(false)
  const [requesterChangeError, setRequesterChangeError] = useState('')

  // Ordinamento tabella: default priorità (1,2,3,4,0)
  const [sortField, setSortField] = useState<SortField>('priority')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  // Di default mostra tutti i mesi senza filtro
  // Se search.month non è presente, mostra tutti i mesi
  // Se search.month === 'all', mostra tutti i mesi
  // Se search.month è un valore specifico, mostra solo quel mese
  const showAllMonths = !search.month || search.month === 'all'
  const selectedMonth = search.month && search.month !== 'all' ? search.month : undefined

  // Modalità ricerca: quando c'è query, la ricerca è backend e resetta tutti i filtri
  const searchQuery = search.query?.trim()
  const isSearchMode = !!searchQuery

  // Query di ricerca backend (full-text su title e readableId) - indipendente dai filtri
  const searchResults = useQuery(
    api.keydevs.search,
    isSearchMode ? { q: searchQuery } : 'skip'
  )

  // Query per keydevs filtrati per mese (tutti gli stati con monthRef)
  // Skip quando in modalità ricerca per efficienza
  const keydevsByMonth = useQuery(
    api.keydevs.listByMonth, 
    !isSearchMode && selectedMonth ? { monthRef: selectedMonth } : 'skip'
  )
  // Query per tutti i keydevs quando "Tutti i mesi" è selezionato
  // Skip quando in modalità ricerca per efficienza
  const allKeydevs = useQuery(api.keydevs.listAll, !isSearchMode && showAllMonths ? {} : 'skip')
  
  const departments = useQuery(api.departments.list)
  const teams = useQuery(api.teams.list)
  const users = useQuery(api.users.listUsers)

  // Mappa userId -> user (come CoreAppsList) per pictureUrl/picture negli avatar
  const usersMap = useMemo(() => {
    if (!users) return new Map<Id<'users'>, { name: string; picture?: string }>()
    return new Map(users.map(u => [u._id, { name: u.name, picture: u.pictureUrl ?? u.picture }]))
  }, [users])

  const updateStatus = useMutation(api.keydevs.updateStatus)
  const updateMonth = useMutation(api.keydevs.updateMonth)
  const assignOwner = useMutation(api.keydevs.assignOwner)
  const assignRequester = useMutation(api.keydevs.assignRequester)
  
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
  // In modalità ricerca usa searchResults (backend), altrimenti listAll/listByMonth
  const keydevs = useMemo(() => {
    let combined: typeof allKeydevs = []
    
    if (isSearchMode) {
      combined = searchResults || []
    } else if (showAllMonths) {
      combined = allKeydevs || []
    } else {
      combined = keydevsByMonth || []
    }
    
    // Ordina per priorità: 1 (Urgent) per primi, poi 2, 3, 4, 0 (No priority)
    return [...combined].sort((a, b) => {
      const priorityA = a.priority ?? 0
      const priorityB = b.priority ?? 0
      if (priorityA === 0 && priorityB !== 0) return 1
      if (priorityB === 0 && priorityA !== 0) return -1
      if (priorityA === 0 && priorityB === 0) return 0
      return priorityA - priorityB
    })
  }, [isSearchMode, searchResults, showAllMonths, allKeydevs, keydevsByMonth])

  const keydevIdsForQuestions = useMemo(
    () => (keydevs || []).map((kd) => kd._id),
    [keydevs]
  )
  const questionsStatusByKeyDev = useQuery(
    api.keydevQuestions.getStatusByKeyDevIds,
    keydevIdsForQuestions.length > 0 ? { keyDevIds: keydevIdsForQuestions } : 'skip'
  )
  
  // Calcola i contatori basandosi sui keydevs filtrati (dept/team/owner)
  // Questo assicura che i contatori corrispondano ai keydevs visibili nella lista
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    
    // Applica i filtri base (mese, dept, team, owner) per calcolare i contatori corretti
    let filteredForCounts = keydevs || []
    
    if (search.dept) {
      filteredForCounts = filteredForCounts.filter((kd) => kd.deptId === search.dept)
    }
    if (search.team) {
      filteredForCounts = filteredForCounts.filter((kd) => kd.teamId === search.team)
    }
    if (search.owner) {
      filteredForCounts = search.owner === '__no_owner__'
        ? filteredForCounts.filter((kd) => !kd.ownerId)
        : filteredForCounts.filter((kd) => kd.ownerId === search.owner)
    }
    if (search.requester) {
      filteredForCounts = filteredForCounts.filter((kd) => kd.requesterId === search.requester)
    }
    
    // Conta gli stati nei keydevs filtrati
    for (const kd of filteredForCounts) {
      counts[kd.status] = (counts[kd.status] || 0) + 1
    }
    
    return counts
  }, [keydevs, search.dept, search.team, search.owner, search.requester])

  // Normalizza gli status selezionati (può essere stringa o array)
  const selectedStatuses = useMemo(() => {
    if (!search.status) return []
    if (Array.isArray(search.status)) return search.status
    return [search.status]
  }, [search.status])

  // Applica i filtri base (mese, dept, team, status, owner) per calcolare i contatori
  // In modalità ricerca (search.query) i risultati sono già dal backend, nessun filtro da applicare
  const baseFilteredKeyDevs = useMemo(() => {
    if (!keydevs) return []
    if (isSearchMode) return keydevs
    let result = keydevs
    if (search.dept) result = result.filter((kd) => kd.deptId === search.dept)
    if (search.team) result = result.filter((kd) => kd.teamId === search.team)
    if (selectedStatuses.length > 0) {
      result = result.filter((kd) => selectedStatuses.includes(kd.status))
    }
    if (search.owner) {
      result = search.owner === '__no_owner__'
        ? result.filter((kd) => !kd.ownerId)
        : result.filter((kd) => kd.ownerId === search.owner)
    }
    if (search.requester) {
      result = result.filter((kd) => kd.requesterId === search.requester)
    }
    return result
  }, [keydevs, isSearchMode, search.dept, search.team, search.owner, search.requester, selectedStatuses])

  // filteredKeyDevs: in modalità ricerca = baseFilteredKeyDevs (già da backend); altrimenti = baseFilteredKeyDevs
  const filteredKeyDevs = baseFilteredKeyDevs

  // Ordinamento: applica sort a filteredKeyDevs (default priorità asc = 1,2,3,4,0)
  const sortedKeyDevs = useMemo(() => {
    const list = [...filteredKeyDevs]
    const mult = sortDir === 'asc' ? 1 : -1

    const priorityOrder = (p: number) => (p === 0 ? 999 : p)
    const statusOrderIdx = (s: string) => {
      const i = statusOrder.indexOf(s)
      return i >= 0 ? i : 999
    }

    list.sort((a, b) => {
      switch (sortField) {
        case 'priority': {
          const pa = priorityOrder(a.priority ?? 0)
          const pb = priorityOrder(b.priority ?? 0)
          return mult * (pa - pb)
        }
        case 'title':
          return mult * (a.title || '').localeCompare(b.title || '')
        case 'status':
          return mult * (statusOrderIdx(a.status) - statusOrderIdx(b.status))
        case 'month':
          return mult * (a.monthRef || '').localeCompare(b.monthRef || '')
        case 'department': {
          const da = departments?.find((d) => d._id === a.deptId)?.name || ''
          const db = departments?.find((d) => d._id === b.deptId)?.name || ''
          return mult * da.localeCompare(db)
        }
        case 'team': {
          const ta = teams?.find((t) => t._id === a.teamId)?.name || ''
          const tb = teams?.find((t) => t._id === b.teamId)?.name || ''
          return mult * ta.localeCompare(tb)
        }
        case 'requester': {
          const ra = users?.find((u) => u._id === a.requesterId)?.name || ''
          const rb = users?.find((u) => u._id === b.requesterId)?.name || ''
          return mult * ra.localeCompare(rb)
        }
        case 'owner': {
          const oa = users?.find((u) => u._id === a.ownerId)?.name || ''
          const ob = users?.find((u) => u._id === b.ownerId)?.name || ''
          return mult * oa.localeCompare(ob)
        }
        case 'notes': {
          const na = a.notesCount ?? 0
          const nb = b.notesCount ?? 0
          return mult * (na - nb)
        }
        default:
          return 0
      }
    })
    return list
  }, [filteredKeyDevs, sortField, sortDir, departments, teams, users])

  // Contatori owner per i keydevs filtrati (manca solo owner) - per popolare gli avatar
  const ownerCounts = useMemo(() => {
    if (!keydevs) return {} as Record<string, number>
    let filtered = keydevs
    if (search.dept) filtered = filtered.filter((kd) => kd.deptId === search.dept)
    if (search.team) filtered = filtered.filter((kd) => kd.teamId === search.team)
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter((kd) => selectedStatuses.includes(kd.status))
    }
    if (search.requester) {
      filtered = filtered.filter((kd) => kd.requesterId === search.requester)
    }
    const counts: Record<string, number> = {}
    for (const kd of filtered) {
      const id = kd.ownerId || '__no_owner__'
      counts[id] = (counts[id] ?? 0) + 1
    }
    return counts
  }, [keydevs, search.dept, search.team, search.requester, selectedStatuses])

  // Contatori requester per i keydevs filtrati - per popolare gli avatar
  const requesterCounts = useMemo(() => {
    if (!keydevs) return {} as Record<string, number>
    let filtered = keydevs
    if (search.dept) filtered = filtered.filter((kd) => kd.deptId === search.dept)
    if (search.team) filtered = filtered.filter((kd) => kd.teamId === search.team)
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter((kd) => selectedStatuses.includes(kd.status))
    }
    if (search.owner) {
      filtered = search.owner === '__no_owner__'
        ? filtered.filter((kd) => !kd.ownerId)
        : filtered.filter((kd) => kd.ownerId === search.owner)
    }
    const counts: Record<string, number> = {}
    for (const kd of filtered) {
      const id = kd.requesterId
      counts[id] = (counts[id] ?? 0) + 1
    }
    return counts
  }, [keydevs, search.dept, search.team, search.owner, selectedStatuses])

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

  // Quando l'utente usa la ricerca: resetta tutti gli altri filtri (backend search è indipendente)
  const handleSearchChange = (value: string) => {
    const trimmed = value.trim()
    if (trimmed) {
      updateSearch({
        query: trimmed,
        month: 'all',
        dept: undefined,
        team: undefined,
        status: undefined,
        owner: undefined,
        requester: undefined
      })
    } else {
      updateSearch({ query: undefined })
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
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

  // Handler per aprire il modal di cambio requester
  const handleOpenRequesterChangeModal = (kd: {
    _id: Id<'keydevs'>
    title: string
    readableId: string
    requesterId: Id<'users'>
  }) => {
    setRequesterChangeError('')
    setRequesterChangeModal({
      isOpen: true,
      keyDevId: kd._id,
      keyDevTitle: kd.title,
      keyDevReadableId: kd.readableId,
      currentRequesterId: kd.requesterId
    })
  }

  // Handler per confermare il cambio requester
  const handleConfirmRequesterChange = async (requesterId: Id<'users'>) => {
    if (!requesterChangeModal.keyDevId) return

    setRequesterChangeLoading(true)
    setRequesterChangeError('')

    try {
      await assignRequester({
        id: requesterChangeModal.keyDevId,
        requesterId
      })
      handleCloseRequesterChangeModal()
    } catch (err) {
      setRequesterChangeError(err instanceof Error ? err.message : 'Errore durante il cambio requester')
    } finally {
      setRequesterChangeLoading(false)
    }
  }

  // Handler per chiudere il modal di cambio requester
  const handleCloseRequesterChangeModal = () => {
    setRequesterChangeModal({
      isOpen: false,
      keyDevId: null,
      keyDevTitle: '',
      keyDevReadableId: '',
      currentRequesterId: null
    })
    setRequesterChangeError('')
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

  const hasMockupDone = (statusCounts?.MockupDone ?? 0) > 0

  // Testo del pulsante dropdown
  const dropdownButtonText = useMemo(() => {
    if (selectedStatuses.length === 0) {
      return 'Tutti gli stati'
    }
    if (selectedStatuses.length === 1) {
      return getStatusLabel(selectedStatuses[0], hasMockupDone)
    }
    return `${selectedStatuses.length} stati selezionati`
  }, [selectedStatuses, hasMockupDone])

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
          <div className="shrink-0 w-full sm:w-auto sm:min-w-[400px] lg:min-w-[500px]">
            <div className="relative">
              <Search 
                size={20} 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Cerca per titolo o ID... (resetta i filtri)"
                value={search.query || ''}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-base shadow-sm hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
              />
            </div>
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
                    const label = getStatusLabel(key, hasMockupDone)
                    const isSelected = selectedStatuses.includes(key)
                    const count = statusCounts?.[key] || 0
                    
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
                {/* Filtra per Owner e Requester - Mobile */}
                <div className="border-t border-gray-200 dark:border-gray-700 p-2">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 px-2">Filtra per Owner</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {Object.entries(ownerCounts)
                      .filter(([, count]) => count > 0)
                      .sort(([, a], [, b]) => b - a)
                      .map(([ownerId]) => {
                        const owner = ownerId === '__no_owner__' ? null : (usersMap.get(ownerId as Id<'users'>) ? { _id: ownerId, name: usersMap.get(ownerId as Id<'users'>)!.name, picture: usersMap.get(ownerId as Id<'users'>)?.picture } : null)
                        const isSelected = search.owner === ownerId
                        return (
                          <button
                            key={ownerId}
                            type="button"
                            onClick={() => {
                              updateSearch({ owner: isSelected ? undefined : ownerId })
                              if (isSelected) setDropdownOpen(false)
                            }}
                            className={`rounded-full p-0.5 transition-all ${
                              isSelected ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-800' : 'hover:opacity-80'
                            }`}
                            title={owner ? `${owner.name} (${ownerCounts[ownerId]})` : `Senza owner (${ownerCounts[ownerId]})`}
                          >
                            <OwnerAvatar owner={owner} size="sm" />
                            <span className="sr-only">{owner ? owner.name : 'Senza owner'}</span>
                          </button>
                        )
                      })}
                  </div>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 mt-3 px-2">Filtra per Requester</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {Object.entries(requesterCounts)
                      .filter(([, count]) => count > 0)
                      .sort(([, a], [, b]) => b - a)
                      .map(([requesterId]) => {
                        const requester = usersMap.get(requesterId as Id<'users'>) ? { _id: requesterId, name: usersMap.get(requesterId as Id<'users'>)!.name, picture: usersMap.get(requesterId as Id<'users'>)?.picture } : null
                        const isSelected = search.requester === requesterId
                        return (
                          <button
                            key={requesterId}
                            type="button"
                            onClick={() => {
                              updateSearch({ requester: isSelected ? undefined : requesterId })
                              if (isSelected) setDropdownOpen(false)
                            }}
                            className={`rounded-full p-0.5 transition-all ${
                              isSelected ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-800' : 'hover:opacity-80'
                            }`}
                            title={requester ? `${requester.name} (${requesterCounts[requesterId]})` : `Requester (${requesterCounts[requesterId]})`}
                          >
                            <OwnerAvatar owner={requester} size="sm" />
                            <span className="sr-only">{requester ? requester.name : 'Requester'}</span>
                          </button>
                        )
                      })}
                    {selectedMonth && !showAllMonths && (
                      <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-200 dark:border-gray-600">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Filtro mese: <span className="font-semibold">
                            {(() => {
                              const monthOpt = monthOptions.find(opt => opt.value === selectedMonth)
                              return monthOpt?.label || formatMonthShort(selectedMonth)
                            })()}
                          </span>
                        </span>
                        <button
                          onClick={() => {
                            updateSearch({ month: 'all' })
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                          title="Rimuovi filtro mese"
                        >
                          <X size={16} />
                          Rimuovi
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {selectedStatuses.length > 0 && (
                      <button
                        onClick={() => {
                          updateSearch({ status: undefined })
                          setDropdownOpen(false)
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                      >
                        <X size={14} />
                        Rimuovi tutti i filtri per stato
                      </button>
                    )}
                    {search.owner && (
                      <button
                        onClick={() => {
                          updateSearch({ owner: undefined })
                          setDropdownOpen(false)
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                      >
                        <X size={14} />
                        Rimuovi filtro owner
                      </button>
                    )}
                    {search.requester && (
                      <button
                        onClick={() => {
                          updateSearch({ requester: undefined })
                          setDropdownOpen(false)
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                      >
                        <X size={14} />
                        Rimuovi filtro requester
                      </button>
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
              const label = getStatusLabel(key, hasMockupDone)
              const isSelected = selectedStatuses.includes(key)
              const count = statusCounts?.[key] || 0
              return (
                <button
                  key={key}
                  onClick={() => toggleStatus(key)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    isSelected
                      ? `${statusColors[key]} ring-2 ring-offset-2 ring-gray-600 dark:ring-gray-400 shadow-md font-semibold`
                      : `${statusColors[key]} opacity-70 hover:opacity-100`
                  }`}
                >
                  {label}
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
          {/* Filtra per Owner e Requester - Desktop (stessa riga, requester allineato a destra) */}
          <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filtra per Owner
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {Object.entries(ownerCounts)
                  .filter(([, count]) => count > 0)
                  .sort(([, a], [, b]) => b - a)
                  .map(([ownerId]) => {
                    const owner = ownerId === '__no_owner__' ? null : (usersMap.get(ownerId as Id<'users'>) ? { _id: ownerId, name: usersMap.get(ownerId as Id<'users'>)!.name, picture: usersMap.get(ownerId as Id<'users'>)?.picture } : null)
                    const isSelected = search.owner === ownerId
                    const count = ownerCounts[ownerId] ?? 0
                    return (
                      <button
                        key={ownerId}
                        type="button"
                        onClick={() => updateSearch({ owner: isSelected ? undefined : ownerId })}
                        className={`rounded-full p-0.5 transition-all ${
                          isSelected ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-800' : 'hover:opacity-80'
                        }`}
                        title={owner ? `${owner.name} (${count})` : `Senza owner (${count})`}
                      >
                        <OwnerAvatar owner={owner} size="sm" />
                        {count > 0 && (
                          <span className="sr-only">
                            {owner ? owner.name : 'Senza owner'} - {count} KeyDev
                          </span>
                        )}
                      </button>
                    )
                  })}
                {selectedMonth && !showAllMonths && (
                  <div className="flex items-center gap-2 ml-2 pl-3 border-l border-gray-200 dark:border-gray-600">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Filtro mese attivo: <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {(() => {
                          const monthOpt = monthOptions.find(opt => opt.value === selectedMonth)
                          return monthOpt?.label || formatMonthShort(selectedMonth)
                        })()}
                      </span>
                    </span>
                    <button
                      onClick={() => updateSearch({ month: 'all' })}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                      title="Rimuovi filtro mese"
                    >
                      <X size={16} />
                      Rimuovi
                    </button>
                  </div>
                )}
                {search.owner && (
                  <button
                    onClick={() => updateSearch({ owner: undefined })}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                    title="Rimuovi filtro owner"
                  >
                    <X size={14} />
                    Rimuovi filtro owner
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filtra per Requester
              </label>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {Object.entries(requesterCounts)
                  .filter(([, count]) => count > 0)
                  .sort(([, a], [, b]) => b - a)
                  .map(([requesterId]) => {
                    const requester = usersMap.get(requesterId as Id<'users'>) ? { _id: requesterId, name: usersMap.get(requesterId as Id<'users'>)!.name, picture: usersMap.get(requesterId as Id<'users'>)?.picture } : null
                    const isSelected = search.requester === requesterId
                    const count = requesterCounts[requesterId] ?? 0
                    return (
                      <button
                        key={requesterId}
                        type="button"
                        onClick={() => updateSearch({ requester: isSelected ? undefined : requesterId })}
                        className={`rounded-full p-0.5 transition-all ${
                          isSelected ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-800' : 'hover:opacity-80'
                        }`}
                        title={requester ? `${requester.name} (${count})` : `Requester (${count})`}
                      >
                        <OwnerAvatar owner={requester} size="sm" />
                        {count > 0 && (
                          <span className="sr-only">
                            {requester ? requester.name : 'Requester'} - {count} KeyDev
                          </span>
                        )}
                      </button>
                    )
                  })}
                {search.requester && (
                  <button
                    onClick={() => updateSearch({ requester: undefined })}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                    title="Rimuovi filtro requester"
                  >
                    <X size={14} />
                    Rimuovi filtro requester
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            {selectedStatuses.length > 0 && (
              <button
                onClick={() => updateSearch({ status: undefined })}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 underline"
              >
                Rimuovi tutti i filtri per stato
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KeyDev List - Card View (Mobile) */}
      <div className="md:hidden space-y-3">
        {sortedKeyDevs.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center text-gray-500 dark:text-gray-400">
            Nessuno Sviluppo Chiave trovato per i filtri selezionati
          </div>
        ) : (
          sortedKeyDevs.map((kd) => {
            const isMockupDone = kd.status === 'MockupDone'
            return (
              <div
                key={kd._id}
                onClick={() => navigate({ to: '/keydevs/$id', params: { id: kd.readableId } })}
                className={`rounded-lg shadow p-4 hover:shadow-md transition-shadow cursor-pointer border ${
                  isMockupDone
                    ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700/70'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                }`}
              >
                {/* Header con ID e Stato */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-gray-500 dark:text-gray-400 font-mono text-xs">{kd.readableId}</span>
                      {(() => {
                        const qStatus = questionsStatusByKeyDev?.[String(kd._id)]
                        if (!qStatus || qStatus.total === 0) return null
                        const missingQuestions = qStatus.missing ?? Math.max(0, qStatus.total - qStatus.validated)
                        return (
                          <Link
                            to="/keydevs/$id/questions"
                            params={{ id: kd.readableId }}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors"
                            title={`Questions mancanti ${missingQuestions}/${qStatus.total}`}
                          >
                            <span className="text-xs font-semibold">{missingQuestions}/{qStatus.total}</span>
                          </Link>
                        )
                      })()}
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
                              {getStatusLabel(status, hasMockupDone)}
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
                    <span className="font-medium">Requester:</span>
                    <div onClick={(e) => e.stopPropagation()}>
                      <OwnerAvatar
                        owner={kd.requesterId && usersMap.get(kd.requesterId) ? { _id: kd.requesterId, name: usersMap.get(kd.requesterId)!.name, picture: usersMap.get(kd.requesterId)?.picture } : null}
                        size="sm"
                        onClick={() => handleOpenRequesterChangeModal(kd)}
                        clickTitle="Clicca per cambiare requester"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Owner:</span>
                    <div onClick={(e) => e.stopPropagation()}>
                      <OwnerAvatar 
                        owner={kd.ownerId && usersMap.get(kd.ownerId) ? { _id: kd.ownerId, name: usersMap.get(kd.ownerId)!.name, picture: usersMap.get(kd.ownerId)?.picture } : null}
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
                <SortableHeader label="Titolo" field="title" currentSortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Stato" field="status" currentSortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Mese" field="month" currentSortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Priorità" field="priority" currentSortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Dipartimento" field="department" currentSortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Team" field="team" currentSortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Requester" field="requester" currentSortField={sortField} sortDir={sortDir} onSort={handleSort} className="hidden lg:table-cell" center />
                <SortableHeader label="Owner" field="owner" currentSortField={sortField} sortDir={sortDir} onSort={handleSort} className="hidden lg:table-cell" center />
                <SortableHeader label="Note" field="notes" currentSortField={sortField} sortDir={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {sortedKeyDevs.map((kd) => (
                <tr
                  key={kd._id}
                  onClick={() => navigate({ to: '/keydevs/$id', params: { id: kd.readableId } })}
                  className={`cursor-pointer ${
                    kd.status === 'MockupDone'
                      ? 'bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 dark:text-gray-400 font-mono text-xs">{kd.readableId}</span>
                      <span>{kd.title}</span>
                      {(() => {
                        const qStatus = questionsStatusByKeyDev?.[String(kd._id)]
                        if (!qStatus || qStatus.total === 0) return null
                        const missingQuestions = qStatus.missing ?? Math.max(0, qStatus.total - qStatus.validated)
                        return (
                          <Link
                            to="/keydevs/$id/questions"
                            params={{ id: kd.readableId }}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors"
                            title={`Questions mancanti ${missingQuestions}/${qStatus.total}`}
                          >
                            <span className="text-xs font-semibold">{missingQuestions}/{qStatus.total}</span>
                          </Link>
                        )
                      })()}
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
                          {getStatusLabel(status, hasMockupDone)}
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
                        owner={kd.requesterId && usersMap.get(kd.requesterId) ? { _id: kd.requesterId, name: usersMap.get(kd.requesterId)!.name, picture: usersMap.get(kd.requesterId)?.picture } : null}
                        onClick={() => handleOpenRequesterChangeModal(kd)}
                        clickTitle="Clicca per cambiare requester"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm hidden lg:table-cell" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-center">
                      <OwnerAvatar 
                        owner={kd.ownerId && usersMap.get(kd.ownerId) ? { _id: kd.ownerId, name: usersMap.get(kd.ownerId)!.name, picture: usersMap.get(kd.ownerId)?.picture } : null}
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

        {sortedKeyDevs.length === 0 && (
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

      {/* Modal per cambio requester */}
      <RequesterChangeModal
        key={requesterChangeModal.keyDevId || 'requester-modal'}
        isOpen={requesterChangeModal.isOpen}
        keyDevTitle={requesterChangeModal.keyDevTitle}
        keyDevReadableId={requesterChangeModal.keyDevReadableId}
        currentRequester={users?.find(u => u._id === requesterChangeModal.currentRequesterId)}
        users={users}
        onConfirm={handleConfirmRequesterChange}
        onCancel={handleCloseRequesterChangeModal}
        isLoading={requesterChangeLoading}
        error={requesterChangeError}
      />
    </div>
  )
}
