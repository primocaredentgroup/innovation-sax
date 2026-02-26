import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { MilestonesDialog } from '../components/MilestonesDialog'

// Componente Avatar con Tooltip - cliccabile per cambiare owner/referente
function OwnerAvatar({
  owner,
  size = 'sm',
  onClick,
  clickTitle
}: {
  owner: { _id: string; name: string; picture?: string } | null | undefined
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

  const initials = owner.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

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
        title={onClick ? (clickTitle ?? (owner ? `Clicca per cambiare owner - ${owner.name}` : 'Clicca per cambiare owner')) : (owner?.name ?? 'Nessun owner')}
      >
        {owner.picture ? (
          <img src={owner.picture} alt={owner.name} className="w-full h-full rounded-full object-cover" />
        ) : (
          initials
        )}
      </div>
      {showTooltip && !onClick && (
        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 dark:bg-gray-700 rounded shadow-lg whitespace-nowrap">
          {owner.name}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
        </div>
      )}
    </div>
  )
}

// Modal per cambio owner
function OwnerChangeModal({
  isOpen,
  appName,
  appSlug,
  currentOwner,
  users,
  onConfirm,
  onCancel,
  isLoading,
  error
}: {
  isOpen: boolean
  appName: string
  appSlug: string
  currentOwner: { _id: string; name: string } | null | undefined
  users: Array<{ _id: string; name: string }> | undefined
  onConfirm: (ownerId: Id<'users'> | undefined) => Promise<void>
  onCancel: () => void
  isLoading: boolean
  error: string
}) {
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>(() => currentOwner?._id || '')

  if (!isOpen) return null

  const handleConfirm = async () => {
    await onConfirm(selectedOwnerId ? (selectedOwnerId as Id<'users'>) : undefined)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Cambia Owner
        </h3>

        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <span className="font-medium">{appSlug}</span> - {appName}
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
            <option value="">Nessun owner</option>
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
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Salvataggio...' : 'Conferma'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Modal per cambio referente business
function BusinessRefChangeModal({
  isOpen,
  appName,
  appSlug,
  currentBusinessRef,
  users,
  onConfirm,
  onCancel,
  isLoading,
  error
}: {
  isOpen: boolean
  appName: string
  appSlug: string
  currentBusinessRef: { _id: string; name: string } | null | undefined
  users: Array<{ _id: string; name: string }> | undefined
  onConfirm: (businessRefId: Id<'users'> | undefined) => Promise<void>
  onCancel: () => void
  isLoading: boolean
  error: string
}) {
  const [selectedBusinessRefId, setSelectedBusinessRefId] = useState<string>(() => currentBusinessRef?._id || '')

  if (!isOpen) return null

  const handleConfirm = async () => {
    await onConfirm(selectedBusinessRefId ? (selectedBusinessRefId as Id<'users'>) : undefined)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Cambia Referente Business
        </h3>

        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <span className="font-medium">{appSlug}</span> - {appName}
          </p>
          {currentBusinessRef && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Referente attuale: <span className="font-medium">{currentBusinessRef.name}</span>
            </p>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Seleziona referente business
          </label>
          <select
            value={selectedBusinessRefId}
            onChange={(e) => setSelectedBusinessRefId(e.target.value)}
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 disabled:opacity-50"
          >
            <option value="">Nessun referente</option>
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
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Salvataggio...' : 'Conferma'}
          </button>
        </div>
      </div>
    </div>
  )
}

const statusColors: Record<string, string> = {
  Planning: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
  InProgress: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
  Completed: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
}

const statusLabels: Record<string, string> = {
  Planning: 'In Pianificazione',
  InProgress: 'In Corso',
  Completed: 'Completato'
}

// Verifica se l'ultimo aggiornamento è stato nei primi 7 giorni (verde, altrimenti rosso)
function isRecentUpdate(createdAt: number | undefined): boolean {
  if (createdAt == null) return false
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  return createdAt >= sevenDaysAgo
}

type SortField = 'priority' | 'name' | 'category' | 'status' | 'owner' | 'businessRef' | 'weight' | 'progress' | 'lastUpdate'
type SortDirection = 'asc' | 'desc'
type CoreAppStatus = keyof typeof statusLabels
type StatusFilter = CoreAppStatus | 'All'
type OwnerFilterValue = Id<'users'> | '__no_owner__'

function parseOwnerFilterFromSearch(ownerParam: unknown): Array<OwnerFilterValue> {
  const rawValues =
    typeof ownerParam === 'string'
      ? ownerParam.split(',')
      : Array.isArray(ownerParam)
        ? ownerParam.flatMap((value) => String(value).split(','))
        : []

  const normalized: Array<OwnerFilterValue> = []
  const seen = new Set<string>()

  for (const value of rawValues) {
    const trimmedValue = value.trim()
    if (!trimmedValue || seen.has(trimmedValue)) continue
    seen.add(trimmedValue)
    normalized.push(trimmedValue === '__no_owner__' ? '__no_owner__' : (trimmedValue as Id<'users'>))
  }

  return normalized
}

export default function CoreAppsListPage() {
  const search = useSearch({ strict: false })
  const navigate = useNavigate()
  const coreApps = useQuery(api.coreApps.list)
  const categories = useQuery(api.coreAppsCategories.list)
  const users = useQuery(api.users.listUsers)
  const updateCoreApp = useMutation(api.coreApps.update)
  const setPriority = useMutation(api.coreApps.setPriority)
  const coreAppIdsForQuestions = useMemo(() => (coreApps || []).map((app) => app._id), [coreApps])
  const questionsStatusByCoreApp = useQuery(
    api.coreAppQuestions.getStatusByCoreAppIds,
    coreAppIdsForQuestions.length > 0 ? { coreAppIds: coreAppIdsForQuestions } : 'skip'
  )

  // Stato per la categoria selezionata (null = tutte)
  const [selectedCategoryId, setSelectedCategoryId] = useState<Id<'coreAppsCategories'> | null>(null)
  
  // Stato per il filtro owner (array vuoto = tutti)
  const [selectedOwnerIds, setSelectedOwnerIds] = useState<Array<OwnerFilterValue>>(() =>
    parseOwnerFilterFromSearch(search.owner)
  )
  
  // Stato per la ricerca
  const [searchQuery, setSearchQuery] = useState('')
  
  // Stato per il filtro status (default: In Corso)
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>(() => {
    const statusFromSearch = typeof search.status === 'string' ? search.status : undefined
    if (statusFromSearch === 'All' || (statusFromSearch && Object.prototype.hasOwnProperty.call(statusLabels, statusFromSearch))) {
      return statusFromSearch as StatusFilter
    }
    return 'All'
  })

  // Sincronizza lo stato locale quando arrivano nuovi filtri dalla URL.
  useEffect(() => {
    setSelectedOwnerIds(parseOwnerFilterFromSearch(search.owner))

    const statusFromSearch = typeof search.status === 'string' ? search.status : undefined
    if (statusFromSearch === 'All' || (statusFromSearch && Object.prototype.hasOwnProperty.call(statusLabels, statusFromSearch))) {
      setSelectedStatus(statusFromSearch as StatusFilter)
    } else {
      setSelectedStatus('All')
    }
  }, [search.owner, search.status])

  // Stato per il modal di cambio owner
  const [ownerChangeModal, setOwnerChangeModal] = useState<{
    isOpen: boolean
    coreAppId: Id<'coreApps'> | null
    appName: string
    appSlug: string
    currentOwnerId: Id<'users'> | null | undefined
  }>({
    isOpen: false,
    coreAppId: null,
    appName: '',
    appSlug: '',
    currentOwnerId: null
  })
  const [ownerChangeLoading, setOwnerChangeLoading] = useState(false)
  const [ownerChangeError, setOwnerChangeError] = useState('')

  // Stato per il modal di cambio referente business
  const [businessRefChangeModal, setBusinessRefChangeModal] = useState<{
    isOpen: boolean
    coreAppId: Id<'coreApps'> | null
    appName: string
    appSlug: string
    currentBusinessRefId: Id<'users'> | null | undefined
  }>({
    isOpen: false,
    coreAppId: null,
    appName: '',
    appSlug: '',
    currentBusinessRefId: null
  })
  const [businessRefChangeLoading, setBusinessRefChangeLoading] = useState(false)
  const [businessRefChangeError, setBusinessRefChangeError] = useState('')
  
  // Stato per editing priority inline
  const [editingPriorityId, setEditingPriorityId] = useState<Id<'coreApps'> | null>(null)
  const [tempPriorityValue, setTempPriorityValue] = useState<number>(0)
  const [editingWeightId, setEditingWeightId] = useState<Id<'coreApps'> | null>(null)
  const [tempWeightValue, setTempWeightValue] = useState<number>(1)
  
  // Stato per l'ordinamento (default: priority ascendente)
  const [sortField, setSortField] = useState<SortField>('priority')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [showProgressTooltip, setShowProgressTooltip] = useState(false)

  // Stato per il dialog milestones
  const [milestonesDialog, setMilestonesDialog] = useState<{
    isOpen: boolean
    coreAppId: Id<'coreApps'> | null
    appName: string
    appSlug: string
    percentComplete: number
  }>({
    isOpen: false,
    coreAppId: null,
    appName: '',
    appSlug: '',
    percentComplete: 0
  })
  
  // Mappa userId -> user per trovare velocemente gli owner
  const usersMap = useMemo(() => {
    if (!users) return new Map<Id<'users'>, { name: string; picture?: string }>()
    return new Map(users.map(u => [u._id, { name: u.name, picture: u.pictureUrl ?? u.picture }]))
  }, [users])

  // Mappa categoryId -> category per trovare velocemente le categorie
  const categoriesMap = useMemo(() => {
    if (!categories) return new Map<Id<'coreAppsCategories'>, { name: string; slug: string }>()
    return new Map(categories.map(c => [c._id, { name: c.name, slug: c.slug }]))
  }, [categories])

  const selectedOwnerIdSet = useMemo(() => new Set(selectedOwnerIds), [selectedOwnerIds])

  // Gestione ordinamento
  const handleSort = (field: SortField, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (sortField === field) {
      // Se clicchi sulla stessa colonna, inverte la direzione
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // Se clicchi su una colonna diversa, imposta quella come campo di ordinamento con direzione asc
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Handler per aprire il modal di cambio owner
  const handleOpenOwnerChangeModal = (app: { _id: Id<'coreApps'>; name: string; slug: string; ownerId?: Id<'users'> }) => {
    setOwnerChangeError('')
    setOwnerChangeModal({
      isOpen: true,
      coreAppId: app._id,
      appName: app.name,
      appSlug: app.slug,
      currentOwnerId: app.ownerId
    })
  }

  // Handler per confermare il cambio owner
  const handleConfirmOwnerChange = async (ownerId: Id<'users'> | undefined) => {
    if (!ownerChangeModal.coreAppId) return

    setOwnerChangeLoading(true)
    setOwnerChangeError('')

    try {
      await updateCoreApp({
        id: ownerChangeModal.coreAppId,
        ownerId: ownerId
      })
      setOwnerChangeModal({
        isOpen: false,
        coreAppId: null,
        appName: '',
        appSlug: '',
        currentOwnerId: null
      })
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
      coreAppId: null,
      appName: '',
      appSlug: '',
      currentOwnerId: null
    })
    setOwnerChangeError('')
  }

  // Handler per aprire il modal di cambio referente business
  const handleOpenBusinessRefChangeModal = (app: { _id: Id<'coreApps'>; name: string; slug: string; businessRefId?: Id<'users'> }) => {
    setBusinessRefChangeError('')
    setBusinessRefChangeModal({
      isOpen: true,
      coreAppId: app._id,
      appName: app.name,
      appSlug: app.slug,
      currentBusinessRefId: app.businessRefId
    })
  }

  // Handler per confermare il cambio referente business
  const handleConfirmBusinessRefChange = async (businessRefId: Id<'users'> | undefined) => {
    if (!businessRefChangeModal.coreAppId) return

    setBusinessRefChangeLoading(true)
    setBusinessRefChangeError('')

    try {
      await updateCoreApp({
        id: businessRefChangeModal.coreAppId,
        businessRefId: businessRefId
      })
      setBusinessRefChangeModal({
        isOpen: false,
        coreAppId: null,
        appName: '',
        appSlug: '',
        currentBusinessRefId: null
      })
    } catch (err) {
      setBusinessRefChangeError(err instanceof Error ? err.message : 'Errore durante il cambio referente business')
    } finally {
      setBusinessRefChangeLoading(false)
    }
  }

  // Handler per chiudere il modal di cambio referente business
  const handleCloseBusinessRefChangeModal = () => {
    setBusinessRefChangeModal({
      isOpen: false,
      coreAppId: null,
      appName: '',
      appSlug: '',
      currentBusinessRefId: null
    })
    setBusinessRefChangeError('')
  }

  // Handler per avviare editing priority
  const handleStartEditPriority = (app: { _id: Id<'coreApps'>; priority?: number }, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingPriorityId(app._id)
    setTempPriorityValue(app.priority ?? 0)
  }

  // Handler per salvare priority
  const handleSavePriority = async (appId: Id<'coreApps'>) => {
    if (editingPriorityId !== appId) return
    const value = Math.max(0, Math.floor(tempPriorityValue))
    try {
      await setPriority({ id: appId, priority: value })
      setEditingPriorityId(null)
    } catch {
      // Mantieni in editing in caso di errore
    }
  }

  // Handler per avviare editing weight
  const handleStartEditWeight = (app: { _id: Id<'coreApps'>; weight?: number }, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingWeightId(app._id)
    setTempWeightValue(app.weight ?? 1)
  }

  // Handler per salvare weight
  const handleSaveWeight = async (appId: Id<'coreApps'>) => {
    if (editingWeightId !== appId) return
    const value = Math.max(1, Math.min(10, Math.floor(tempWeightValue)))
    try {
      await updateCoreApp({ id: appId, weight: value })
      setEditingWeightId(null)
    } catch {
      // Mantieni in editing in caso di errore
    }
  }

  // App filtrate da categoria + owner + ricerca (base per i contatori status)
  const appsMatchingOwnerAndSearch = useMemo(() => {
    if (!coreApps) return []
    let apps = selectedCategoryId === null 
      ? coreApps 
      : coreApps.filter(app => app.categoryId === selectedCategoryId)
    
    // Filtra per owner
    if (selectedOwnerIdSet.size > 0) {
      apps = apps.filter((app) => {
        const ownerKey = (app.ownerId ?? '__no_owner__') as OwnerFilterValue
        return selectedOwnerIdSet.has(ownerKey)
      })
    }
    
    // Filtra per search query (nome e slug)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      apps = apps.filter(
        app =>
          app.name.toLowerCase().includes(q) ||
          app.slug.toLowerCase().includes(q)
      )
    }
    return apps
  }, [coreApps, selectedCategoryId, selectedOwnerIdSet, searchQuery])

  // Filtra le app in base a categoria, owner, status e ricerca
  const filteredApps = useMemo(() => {
    let apps = appsMatchingOwnerAndSearch
    if (selectedStatus !== 'All') {
      apps = apps.filter(app => app.status === selectedStatus)
    }
    
    // Applica l'ordinamento
    const sortedApps = [...apps].sort((a, b) => {
      let comparison = 0
      
      switch (sortField) {
        case 'priority': {
          const pA = a.priority ?? 999999
          const pB = b.priority ?? 999999
          comparison = pA - pB
          break
        }
        case 'name':
          comparison = a.name.localeCompare(b.name, 'it', { sensitivity: 'base' })
          break
        case 'category': {
          const categoryA = a.categoryId ? categoriesMap.get(a.categoryId)?.name || 'zzz' : 'zzz'
          const categoryB = b.categoryId ? categoriesMap.get(b.categoryId)?.name || 'zzz' : 'zzz'
          comparison = categoryA.localeCompare(categoryB, 'it', { sensitivity: 'base' })
          break
        }
        case 'status':
          comparison = a.status.localeCompare(b.status, 'it', { sensitivity: 'base' })
          break
        case 'owner': {
          const ownerA = a.ownerId ? usersMap.get(a.ownerId)?.name || 'zzz' : 'zzz'
          const ownerB = b.ownerId ? usersMap.get(b.ownerId)?.name || 'zzz' : 'zzz'
          comparison = ownerA.localeCompare(ownerB, 'it', { sensitivity: 'base' })
          break
        }
        case 'businessRef': {
          const refA = a.businessRefId ? usersMap.get(a.businessRefId)?.name || 'zzz' : 'zzz'
          const refB = b.businessRefId ? usersMap.get(b.businessRefId)?.name || 'zzz' : 'zzz'
          comparison = refA.localeCompare(refB, 'it', { sensitivity: 'base' })
          break
        }
        case 'weight':
          comparison = (a.weight ?? 1) - (b.weight ?? 1)
          break
        case 'progress':
          comparison = a.percentComplete - b.percentComplete
          break
        case 'lastUpdate':
          // Ordina per data: senza aggiornamento va in fondo
          if (!a.lastUpdate && !b.lastUpdate) comparison = 0
          else if (!a.lastUpdate) comparison = 1
          else if (!b.lastUpdate) comparison = -1
          else comparison = a.lastUpdate.createdAt - b.lastUpdate.createdAt
          break
      }
      
      return sortDirection === 'asc' ? comparison : -comparison
    })
    
    return sortedApps
  }, [appsMatchingOwnerAndSearch, selectedStatus, sortField, sortDirection, categoriesMap, usersMap])

  // Progresso totale pesato (calcolato al volo sui risultati filtrati)
  const weightedTotalProgress = useMemo(() => {
    if (filteredApps.length === 0) return 0

    let totalWeight = 0
    let weightedProgressSum = 0

    for (const app of filteredApps) {
      const rawWeight = app.weight ?? 1
      const normalizedWeight = Math.min(10, Math.max(1, Math.floor(rawWeight)))
      totalWeight += normalizedWeight
      weightedProgressSum += app.percentComplete * normalizedWeight
    }

    if (totalWeight === 0) return 0
    return weightedProgressSum / totalWeight
  }, [filteredApps])

  const progressPoints = useMemo(() => {
    let totalPossiblePoints = 0
    let completedPoints = 0

    for (const app of filteredApps) {
      const rawWeight = app.weight ?? 1
      const normalizedWeight = Math.min(10, Math.max(1, Math.floor(rawWeight)))
      totalPossiblePoints += normalizedWeight
      completedPoints += normalizedWeight * (app.percentComplete / 100)
    }

    return { totalPossiblePoints, completedPoints }
  }, [filteredApps])

  // Contatori status con gli altri filtri attivi (escluso il filtro status)
  const statusCounts = useMemo(() => {
    const counts: Record<CoreAppStatus, number> = {
      Planning: 0,
      InProgress: 0,
      Completed: 0
    }
    for (const app of appsMatchingOwnerAndSearch) {
      counts[app.status] += 1
    }
    return counts
  }, [appsMatchingOwnerAndSearch])

  // Contatori owner con filtri categoria + status + ricerca (escludendo il filtro owner)
  const ownerCounts = useMemo(() => {
    if (!coreApps) return {} as Record<string, number>
    const appsByCategory = selectedCategoryId === null
      ? coreApps
      : coreApps.filter(app => app.categoryId === selectedCategoryId)
    const appsByStatus = selectedStatus === 'All'
      ? appsByCategory
      : appsByCategory.filter(app => app.status === selectedStatus)
    const apps = searchQuery.trim()
      ? appsByStatus.filter((app) => {
          const q = searchQuery.trim().toLowerCase()
          return app.name.toLowerCase().includes(q) || app.slug.toLowerCase().includes(q)
        })
      : appsByStatus
    const counts: Record<string, number> = {}
    for (const app of apps) {
      const id = app.ownerId || '__no_owner__'
      counts[id] = (counts[id] ?? 0) + 1
    }
    return counts
  }, [coreApps, selectedCategoryId, selectedStatus, searchQuery])

  // Conta le app per categoria con gli altri filtri attivi (owner + status + ricerca)
  const appCountByCategory = useMemo(() => {
    if (!coreApps) return new Map<Id<'coreAppsCategories'> | 'uncategorized', number>()
    let apps = coreApps
    if (selectedOwnerIdSet.size > 0) {
      apps = apps.filter((app) => {
        const ownerKey = (app.ownerId ?? '__no_owner__') as OwnerFilterValue
        return selectedOwnerIdSet.has(ownerKey)
      })
    }
    if (selectedStatus !== 'All') {
      apps = apps.filter(app => app.status === selectedStatus)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      apps = apps.filter(
        app =>
          app.name.toLowerCase().includes(q) ||
          app.slug.toLowerCase().includes(q)
      )
    }
    const counts = new Map<Id<'coreAppsCategories'> | 'uncategorized', number>()
    for (const app of apps) {
      const key = app.categoryId || 'uncategorized'
      counts.set(key, (counts.get(key) || 0) + 1)
    }
    return counts
  }, [coreApps, selectedOwnerIdSet, selectedStatus, searchQuery])

  const totalAppsForCategoryTabs = useMemo(() => {
    let total = 0
    for (const count of appCountByCategory.values()) {
      total += count
    }
    return total
  }, [appCountByCategory])

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      {/* Header responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Applicazioni Core</h1>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as StatusFilter)}
            className="w-full sm:w-44 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            aria-label="Filtra per status"
          >
            <option value="All">Tutti ({appsMatchingOwnerAndSearch.length})</option>
            <option value="Planning">{statusLabels.Planning} ({statusCounts.Planning})</option>
            <option value="InProgress">{statusLabels.InProgress} ({statusCounts.InProgress}) ★</option>
            <option value="Completed">{statusLabels.Completed} ({statusCounts.Completed})</option>
          </select>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 self-start sm:self-auto">
          <div className="relative px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center gap-2">
              <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Progresso totale pesato</p>
              <button
                type="button"
                onClick={() => setShowProgressTooltip((prev) => !prev)}
                className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60"
                aria-label="Mostra spiegazione calcolo progresso pesato"
                title="Mostra spiegazione"
              >
                ?
              </button>
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {weightedTotalProgress.toFixed(1)}%
            </p>
            {showProgressTooltip && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowProgressTooltip(false)}
                />
                <div className="absolute right-0 top-full mt-2 z-20 w-72 max-w-[80vw] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl p-3 text-xs text-gray-700 dark:text-gray-200">
                  <p className="font-semibold mb-2">Come viene calcolato</p>
                  <p className="mb-2">
                    Progresso pesato = (somma di <code>percentuale x peso</code>) / (somma dei pesi).
                  </p>
                  <p className="mb-1">
                    Punti possibili totali: <span className="font-semibold">{progressPoints.totalPossiblePoints.toFixed(1)}</span>
                  </p>
                  <p>
                    Punti completati: <span className="font-semibold">{progressPoints.completedPoints.toFixed(1)}</span>
                  </p>
                </div>
              </>
            )}
          </div>
          <Link
            to="/core-apps/new"
            className="px-4 py-2 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 font-medium rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors border border-blue-600 dark:border-blue-500 text-sm sm:text-base whitespace-nowrap self-start sm:self-auto"
          >
            + Nuova Applicazione Core
          </Link>
        </div>
      </div>

      {/* Tab categorie + Filtro owner + Search */}
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Tab per categorie */}
          {categories && categories.length > 0 && (
            <div className="flex-1 overflow-x-auto scrollbar-hide min-w-0">
              <div className="flex gap-2 min-w-max pb-2">
                <button
                  onClick={() => setSelectedCategoryId(null)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    selectedCategoryId === null
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Tutte
                  <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                    selectedCategoryId === null ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-600'
                  }`}>
                    {totalAppsForCategoryTabs}
                  </span>
                </button>
                {categories.map((category) => (
                  <button
                    key={category._id}
                    onClick={() => setSelectedCategoryId(category._id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                      selectedCategoryId === category._id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {category.name}
                    <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                      selectedCategoryId === category._id
                        ? 'bg-white/20'
                        : 'bg-gray-200 dark:bg-gray-600'
                    }`}>
                      {appCountByCategory.get(category._id) || 0}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="shrink-0 w-full sm:w-auto flex flex-col sm:flex-row gap-2 sm:items-center">
            {/* Search input */}
            <div className="w-full sm:w-64">
              <div className="relative">
                <input
                  type="search"
                  placeholder="Cerca core apps..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Filtra per Owner */}
        {Object.keys(ownerCounts).length > 0 && (
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Filtra per Owner
              </label>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                {filteredApps.length} / {coreApps?.length ?? 0} app
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {Object.entries(ownerCounts)
                .filter(([, count]) => count > 0)
                .sort(([, a], [, b]) => b - a)
                .map(([ownerId]) => {
                  const owner = ownerId === '__no_owner__'
                    ? null
                    : usersMap.get(ownerId as Id<'users'>)
                      ? { _id: ownerId, name: usersMap.get(ownerId as Id<'users'>)!.name, picture: usersMap.get(ownerId as Id<'users'>)?.picture }
                      : null
                  const ownerFilterValue = ownerId as OwnerFilterValue
                  const isSelected = selectedOwnerIdSet.has(ownerFilterValue)
                  const count = ownerCounts[ownerId] ?? 0
                  return (
                    <button
                      key={ownerId}
                      type="button"
                      onClick={() =>
                        setSelectedOwnerIds((currentValues) =>
                          isSelected
                            ? currentValues.filter((value) => value !== ownerFilterValue)
                            : [...currentValues, ownerFilterValue]
                        )
                      }
                      className={`rounded-full p-0.5 transition-all ${
                        isSelected ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-800' : 'hover:opacity-80'
                      }`}
                      title={owner ? `${owner.name} (${count})` : `Senza owner (${count})`}
                    >
                      <OwnerAvatar owner={owner} size="sm" />
                      <span className="sr-only">
                        {owner ? owner.name : 'Senza owner'} - {count} app
                      </span>
                    </button>
                  )
                })}
              {selectedOwnerIds.length > 0 && (
                <button
                  onClick={() => setSelectedOwnerIds([])}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                  title="Rimuovi filtro owner"
                >
                  <X size={14} />
                  Rimuovi filtro owner
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tabella desktop */}
      <div className="hidden md:block overflow-x-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                  onClick={(e) => handleSort('priority', e)}
                >
                  <div className="flex items-center gap-2">
                    #
                    {sortField === 'priority' && (
                      <span className="text-blue-600 dark:text-blue-400">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                  onClick={(e) => handleSort('name', e)}
                >
                  <div className="flex items-center gap-2">
                    Nome
                    {sortField === 'name' && (
                      <span className="text-blue-600 dark:text-blue-400">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                  onClick={(e) => handleSort('category', e)}
                >
                  <div className="flex items-center gap-2">
                    Categoria
                    {sortField === 'category' && (
                      <span className="text-blue-600 dark:text-blue-400">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                  onClick={(e) => handleSort('status', e)}
                >
                  <div className="flex items-center gap-2">
                    Status
                    {sortField === 'status' && (
                      <span className="text-blue-600 dark:text-blue-400">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                  onClick={(e) => handleSort('owner', e)}
                >
                  <div className="flex items-center gap-2">
                    Owner
                    {sortField === 'owner' && (
                      <span className="text-blue-600 dark:text-blue-400">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                  onClick={(e) => handleSort('businessRef', e)}
                >
                  <div className="flex items-center gap-2">
                    Referente Business
                    {sortField === 'businessRef' && (
                      <span className="text-blue-600 dark:text-blue-400">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                  onClick={(e) => handleSort('weight', e)}
                >
                  <div className="flex items-center gap-2">
                    Peso
                    {sortField === 'weight' && (
                      <span className="text-blue-600 dark:text-blue-400">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                  onClick={(e) => handleSort('progress', e)}
                >
                  <div className="flex items-center gap-2">
                    Progresso
                    {sortField === 'progress' && (
                      <span className="text-blue-600 dark:text-blue-400">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                  onClick={(e) => handleSort('lastUpdate', e)}
                >
                  <div className="flex items-center gap-2">
                    Ultimo Aggiornamento
                    {sortField === 'lastUpdate' && (
                      <span className="text-blue-600 dark:text-blue-400">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredApps && filteredApps.length > 0 ? (
                filteredApps.map((app) => (
                  <tr
                    key={app._id}
                    onClick={() => navigate({ to: '/core-apps/$slug', params: { slug: app.slug } })}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                  >
                    <td
                      className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-600 dark:text-gray-400"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {editingPriorityId === app._id ? (
                        <input
                          type="number"
                          min={0}
                          value={tempPriorityValue}
                          onChange={(e) => setTempPriorityValue(Number(e.target.value))}
                          onBlur={() => handleSavePriority(app._id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSavePriority(app._id)
                            if (e.key === 'Escape') setEditingPriorityId(null)
                          }}
                          className="w-14 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                      ) : (
                        <button
                          onClick={(e) => handleStartEditPriority(app, e)}
                          className="hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded transition-colors cursor-pointer text-left w-full min-w-[2rem]"
                          title="Clicca per modificare"
                        >
                          {app.priority ?? '-'}
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Link
                          to="/core-apps/$slug"
                          params={{ slug: app.slug }}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          {app.name}
                        </Link>
                        <a
                          href={`/core-apps/${app.slug}/notes`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                          title={`${app.notesCount || 0} nota${(app.notesCount || 0) !== 1 ? 'e' : ''}`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          {(app.notesCount || 0) > 0 && (
                            <span className="text-xs font-semibold">{app.notesCount || 0}</span>
                          )}
                        </a>
                        {(() => {
                          const qStatus = questionsStatusByCoreApp?.[String(app._id)]
                          if (!qStatus || qStatus.total === 0) return null
                          return (
                            <Link
                              to="/core-apps/$slug/questions"
                              params={{ slug: app.slug }}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors"
                              title={`Questions validate ${qStatus.validated}/${qStatus.total}`}
                            >
                              <span className="text-xs font-semibold">{qStatus.validated}/{qStatus.total}</span>
                            </Link>
                          )
                        })()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {app.categoryId && categoriesMap.get(app.categoryId) ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                          {categoriesMap.get(app.categoryId)?.name}
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 font-medium">
                          Nessuna categoria
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${statusColors[app.status]}`}>
                        {statusLabels[app.status]}
                      </span>
                    </td>
                    <td
                      className="px-6 py-4 whitespace-nowrap"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenOwnerChangeModal(app)
                      }}
                    >
                      <div className="flex items-center justify-center cursor-pointer hover:opacity-80">
                        <OwnerAvatar
                          owner={app.ownerId && usersMap.get(app.ownerId) ? { _id: app.ownerId, name: usersMap.get(app.ownerId)!.name, picture: usersMap.get(app.ownerId)?.picture } : null}
                          onClick={() => handleOpenOwnerChangeModal(app)}
                        />
                      </div>
                    </td>
                    <td
                      className="px-6 py-4 whitespace-nowrap"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenBusinessRefChangeModal(app)
                      }}
                    >
                      <div className="flex items-center justify-center cursor-pointer hover:opacity-80">
                        <OwnerAvatar
                          owner={app.businessRefId && usersMap.get(app.businessRefId) ? { _id: app.businessRefId, name: usersMap.get(app.businessRefId)!.name, picture: usersMap.get(app.businessRefId)?.picture } : null}
                          onClick={() => handleOpenBusinessRefChangeModal(app)}
                          clickTitle="Clicca per cambiare referente business"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingWeightId === app._id ? (
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={tempWeightValue}
                          onChange={(e) => setTempWeightValue(Number(e.target.value))}
                          onFocus={(e) => e.target.select()}
                          onBlur={() => handleSaveWeight(app._id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveWeight(app._id)
                            if (e.key === 'Escape') setEditingWeightId(null)
                          }}
                          className="w-14 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                      ) : (
                        <button
                          onClick={(e) => handleStartEditWeight(app, e)}
                          className="hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded transition-colors cursor-pointer text-left w-full min-w-[2rem]"
                          title="Clicca per modificare"
                        >
                          {app.weight ?? 1}
                        </button>
                      )}
                    </td>
                    <td
                      className="px-6 py-4 whitespace-nowrap cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        setMilestonesDialog({
                          isOpen: true,
                          coreAppId: app._id,
                          appName: app.name,
                          appSlug: app.slug,
                          percentComplete: app.percentComplete
                        })
                      }}
                      title="Clicca per gestire le milestones"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 w-12">
                          {app.percentComplete}%
                        </span>
                        <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              app.percentComplete === 100
                                ? 'bg-green-500 dark:bg-green-600'
                                : app.percentComplete > 50
                                  ? 'bg-blue-500 dark:bg-blue-600'
                                  : 'bg-yellow-500 dark:bg-yellow-600'
                            }`}
                            style={{ width: `${app.percentComplete}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {app.lastUpdate ? (
                        <div className="text-sm">
                          <div className={`font-medium ${
                            isRecentUpdate(app.lastUpdate.createdAt)
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {new Date(app.lastUpdate.createdAt).toLocaleDateString('it-IT', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {app.lastUpdate.weekRef}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-red-600 dark:text-red-400">Nessun aggiornamento</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    {searchQuery.trim()
                      ? selectedCategoryId !== null
                        ? 'Nessun risultato per la ricerca in questa categoria'
                        : 'Nessun risultato per la ricerca'
                      : selectedCategoryId !== null
                        ? 'Nessuna Applicazione Core in questa categoria'
                        : 'Nessuna Applicazione Core presente'
                    }
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schede mobile */}
      <div className="md:hidden grid gap-4">
        {filteredApps?.map((app) => (
          <Link
            key={app._id}
            to="/core-apps/$slug"
            params={{ slug: app.slug }}
            className="block bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  {editingPriorityId === app._id ? (
                    <input
                      type="number"
                      min={0}
                      value={tempPriorityValue}
                      onChange={(e) => setTempPriorityValue(Number(e.target.value))}
                      onBlur={() => handleSavePriority(app._id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSavePriority(app._id)
                        if (e.key === 'Escape') setEditingPriorityId(null)
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-14 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0"
                      autoFocus
                    />
                  ) : (
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleStartEditPriority(app, e)
                      }}
                      className="text-sm font-medium text-gray-600 dark:text-gray-400 shrink-0 hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded transition-colors"
                      title="Clicca per modificare"
                    >
                      #{app.priority ?? '-'}
                    </button>
                  )}
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 wrap-break-word">{app.name}</h3>
                    <a
                      href={`/core-apps/${app.slug}/notes`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                      title={`${app.notesCount || 0} nota${(app.notesCount || 0) !== 1 ? 'e' : ''}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      {(app.notesCount || 0) > 0 && (
                        <span className="text-xs font-semibold">{app.notesCount || 0}</span>
                      )}
                    </a>
                    {(() => {
                      const qStatus = questionsStatusByCoreApp?.[String(app._id)]
                      if (!qStatus || qStatus.total === 0) return null
                      return (
                        <Link
                          to="/core-apps/$slug/questions"
                          params={{ slug: app.slug }}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors"
                          title={`Questions validate ${qStatus.validated}/${qStatus.total}`}
                        >
                          <span className="text-xs font-semibold">{qStatus.validated}/{qStatus.total}</span>
                        </Link>
                      )
                    })()}
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${statusColors[app.status]}`}>
                    {statusLabels[app.status]}
                  </span>
                  {editingWeightId === app._id ? (
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={tempWeightValue}
                      onChange={(e) => setTempWeightValue(Number(e.target.value))}
                      onFocus={(e) => e.target.select()}
                      onBlur={() => handleSaveWeight(app._id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveWeight(app._id)
                        if (e.key === 'Escape') setEditingWeightId(null)
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-14 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0"
                      autoFocus
                    />
                  ) : (
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleStartEditWeight(app, e)
                      }}
                      className="px-2 py-1 text-xs rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors whitespace-nowrap"
                      title="Clicca per modificare il peso"
                    >
                      Peso: {app.weight ?? 1}
                    </button>
                  )}
                  {/* Badge categoria */}
                  {app.categoryId && categoriesMap.get(app.categoryId) ? (
                    <span className="px-2 py-1 text-xs rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 whitespace-nowrap">
                      {categoriesMap.get(app.categoryId)?.name}
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 font-medium whitespace-nowrap">
                      Nessuna categoria
                    </span>
                  )}
                </div>
                {/* Owner - cliccabile per cambiare */}
                <div
                  className="flex items-center gap-2 mt-2 cursor-pointer hover:opacity-80"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleOpenOwnerChangeModal(app)
                  }}
                >
                  <OwnerAvatar
                    owner={app.ownerId && usersMap.get(app.ownerId) ? { _id: app.ownerId, name: usersMap.get(app.ownerId)!.name, picture: usersMap.get(app.ownerId)?.picture } : null}
                    size="sm"
                    onClick={() => handleOpenOwnerChangeModal(app)}
                  />
                  <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    Owner: {app.ownerId && usersMap.get(app.ownerId) ? usersMap.get(app.ownerId)?.name : 'Nessuno'}
                  </span>
                </div>
                {/* Referente Business - cliccabile per cambiare */}
                <div
                  className="flex items-center gap-2 mt-2 cursor-pointer hover:opacity-80"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleOpenBusinessRefChangeModal(app)
                  }}
                >
                  <OwnerAvatar
                    owner={app.businessRefId && usersMap.get(app.businessRefId) ? { _id: app.businessRefId, name: usersMap.get(app.businessRefId)!.name, picture: usersMap.get(app.businessRefId)?.picture } : null}
                    size="sm"
                    onClick={() => handleOpenBusinessRefChangeModal(app)}
                    clickTitle="Clicca per cambiare referente business"
                  />
                  <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    Referente Business: {app.businessRefId && usersMap.get(app.businessRefId) ? usersMap.get(app.businessRefId)?.name : 'Nessuno'}
                  </span>
                </div>
                {app.repoUrl && (
                  <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 mt-2 break-all">{app.repoUrl}</p>
                )}
                {app.lastUpdate ? (
                  <p className={`text-xs sm:text-sm mt-2 font-medium wrap-break-word ${
                    isRecentUpdate(app.lastUpdate.createdAt)
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    Ultimo aggiornamento: {new Date(app.lastUpdate.createdAt).toLocaleDateString('it-IT', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })} ({app.lastUpdate.weekRef})
                  </p>
                ) : (
                  <p className="text-xs sm:text-sm mt-2 font-medium text-red-600 dark:text-red-400">
                    Nessun aggiornamento
                  </p>
                )}
              </div>
              <div
                className="sm:ml-6 sm:text-right shrink-0 cursor-pointer hover:opacity-80"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setMilestonesDialog({
                    isOpen: true,
                    coreAppId: app._id,
                    appName: app.name,
                    appSlug: app.slug,
                    percentComplete: app.percentComplete
                  })
                }}
                title="Clicca per gestire le milestones"
              >
                <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {app.percentComplete}%
                </div>
                <div className="w-full sm:w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                  <div
                    className={`h-2 rounded-full ${
                      app.percentComplete === 100
                        ? 'bg-green-500 dark:bg-green-600'
                        : app.percentComplete > 50
                          ? 'bg-blue-500 dark:bg-blue-600'
                          : 'bg-yellow-500 dark:bg-yellow-600'
                    }`}
                    style={{ width: `${app.percentComplete}%` }}
                  />
                </div>
              </div>
            </div>
          </Link>
        ))}

        {filteredApps?.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 sm:p-8 text-center text-gray-500 dark:text-gray-400">
            {searchQuery.trim()
              ? selectedCategoryId !== null
                ? 'Nessun risultato per la ricerca in questa categoria'
                : 'Nessun risultato per la ricerca'
              : selectedCategoryId !== null
                ? 'Nessuna Applicazione Core in questa categoria'
                : 'Nessuna Applicazione Core presente'
            }
          </div>
        )}
      </div>

      {/* Modal per cambio owner */}
      <OwnerChangeModal
        key={ownerChangeModal.coreAppId || 'owner-modal'}
        isOpen={ownerChangeModal.isOpen}
        appName={ownerChangeModal.appName}
        appSlug={ownerChangeModal.appSlug}
        currentOwner={users?.find((u) => u._id === ownerChangeModal.currentOwnerId)}
        users={users}
        onConfirm={handleConfirmOwnerChange}
        onCancel={handleCloseOwnerChangeModal}
        isLoading={ownerChangeLoading}
        error={ownerChangeError}
      />

      {/* Modal per cambio referente business */}
      <BusinessRefChangeModal
        key={businessRefChangeModal.coreAppId || 'businessref-modal'}
        isOpen={businessRefChangeModal.isOpen}
        appName={businessRefChangeModal.appName}
        appSlug={businessRefChangeModal.appSlug}
        currentBusinessRef={users?.find((u) => u._id === businessRefChangeModal.currentBusinessRefId)}
        users={users}
        onConfirm={handleConfirmBusinessRefChange}
        onCancel={handleCloseBusinessRefChangeModal}
        isLoading={businessRefChangeLoading}
        error={businessRefChangeError}
      />

      {/* Dialog milestones */}
      {milestonesDialog.coreAppId && (
        <MilestonesDialog
          isOpen={milestonesDialog.isOpen}
          onClose={() =>
            setMilestonesDialog({
              isOpen: false,
              coreAppId: null,
              appName: '',
              appSlug: '',
              percentComplete: 0
            })
          }
          coreAppId={milestonesDialog.coreAppId}
          appName={milestonesDialog.appName}
          appSlug={milestonesDialog.appSlug}
          initialPercentComplete={milestonesDialog.percentComplete}
        />
      )}
    </div>
  )
}
