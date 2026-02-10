import { Link, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { useMemo, useState } from 'react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

// Componente Avatar con Tooltip - cliccabile per cambiare owner
function OwnerAvatar({
  owner,
  size = 'sm',
  onClick
}: {
  owner: { _id: string; name: string; picture?: string } | null | undefined
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
        title={onClick ? 'Clicca per cambiare owner' : owner.name}
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

// Helper per calcolare il numero della settimana ISO
function getISOWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return { year: d.getUTCFullYear(), week: weekNo }
}

// Helper per ottenere la settimana corrente in formato ISO
function getCurrentWeekRef(): string {
  const now = new Date()
  const { year, week } = getISOWeek(now)
  return `${year}-W${week.toString().padStart(2, '0')}`
}

// Helper per ottenere la settimana precedente in formato ISO
function getPreviousWeekRef(): string {
  const now = new Date()
  now.setDate(now.getDate() - 7)
  const { year, week } = getISOWeek(now)
  return `${year}-W${week.toString().padStart(2, '0')}`
}

// Verifica se l'ultimo aggiornamento è nella settimana corrente o precedente
function isRecentUpdate(weekRef: string | undefined): boolean {
  if (!weekRef) return false
  const currentWeek = getCurrentWeekRef()
  const previousWeek = getPreviousWeekRef()
  return weekRef === currentWeek || weekRef === previousWeek
}

type SortField = 'name' | 'category' | 'status' | 'owner' | 'progress' | 'lastUpdate'
type SortDirection = 'asc' | 'desc'

export default function CoreAppsListPage() {
  const navigate = useNavigate()
  const coreApps = useQuery(api.coreApps.list)
  const categories = useQuery(api.coreAppsCategories.list)
  const users = useQuery(api.users.listUsers)
  const updateCoreApp = useMutation(api.coreApps.update)

  // Stato per la categoria selezionata (null = tutte)
  const [selectedCategoryId, setSelectedCategoryId] = useState<Id<'coreAppsCategories'> | null>(null)

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
  
  // Stato per l'ordinamento
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  
  // Mappa userId -> user per trovare velocemente gli owner
  const usersMap = useMemo(() => {
    if (!users) return new Map<Id<'users'>, { name: string; picture?: string }>()
    return new Map(users.map(u => [u._id, { name: u.name, picture: u.picture }]))
  }, [users])

  // Mappa categoryId -> category per trovare velocemente le categorie
  const categoriesMap = useMemo(() => {
    if (!categories) return new Map<Id<'coreAppsCategories'>, { name: string; slug: string }>()
    return new Map(categories.map(c => [c._id, { name: c.name, slug: c.slug }]))
  }, [categories])

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

  // Filtra le app in base alla categoria selezionata
  const filteredApps = useMemo(() => {
    if (!coreApps) return []
    const apps = selectedCategoryId === null 
      ? coreApps 
      : coreApps.filter(app => app.categoryId === selectedCategoryId)
    
    // Applica l'ordinamento
    const sortedApps = [...apps].sort((a, b) => {
      let comparison = 0
      
      switch (sortField) {
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
  }, [coreApps, selectedCategoryId, sortField, sortDirection, categoriesMap, usersMap])

  // Conta le app per categoria (per mostrare il badge)
  const appCountByCategory = useMemo(() => {
    if (!coreApps) return new Map<Id<'coreAppsCategories'> | 'uncategorized', number>()
    const counts = new Map<Id<'coreAppsCategories'> | 'uncategorized', number>()
    for (const app of coreApps) {
      const key = app.categoryId || 'uncategorized'
      counts.set(key, (counts.get(key) || 0) + 1)
    }
    return counts
  }, [coreApps])

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      {/* Header responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Applicazioni Core</h1>
        <Link
          to="/core-apps/new"
          className="px-4 py-2 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 font-medium rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors border border-blue-600 dark:border-blue-500 text-sm sm:text-base whitespace-nowrap self-start sm:self-auto"
        >
          + Nuova Applicazione Core
        </Link>
      </div>

      {/* Filtro categorie - Desktop: dropdown, Mobile: tab */}
      {categories && categories.length > 0 && (
        <>
          {/* Filtro dropdown per desktop */}
          <div className="hidden md:block mb-6">
            <div className="flex items-center gap-3">
              <label htmlFor="category-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Filtra per categoria:
              </label>
              <select
                id="category-filter"
                value={selectedCategoryId || ''}
                onChange={(e) => setSelectedCategoryId(e.target.value ? (e.target.value as Id<'coreAppsCategories'>) : null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                <option value="">Tutte ({coreApps?.length || 0})</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name} ({appCountByCategory.get(category._id) || 0})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tab per categorie - Solo mobile */}
          <div className="md:hidden mb-6 overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 min-w-max pb-2">
              {/* Tab "Tutte" */}
              <button
                onClick={() => setSelectedCategoryId(null)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  selectedCategoryId === null
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Tutte
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-white/20">
                  {coreApps?.length || 0}
                </span>
              </button>
              
              {/* Tab per ogni categoria */}
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
        </>
      )}

      {/* Tabella desktop */}
      <div className="hidden md:block overflow-x-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
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
                      <div className="flex items-center gap-2 cursor-pointer hover:opacity-80">
                        <OwnerAvatar
                          owner={app.ownerId && usersMap.get(app.ownerId) ? { _id: app.ownerId, name: usersMap.get(app.ownerId)!.name, picture: usersMap.get(app.ownerId)?.picture } : null}
                          onClick={() => handleOpenOwnerChangeModal(app)}
                        />
                        {app.ownerId && usersMap.get(app.ownerId) ? (
                          <span className="text-sm text-gray-900 dark:text-gray-100">
                            {usersMap.get(app.ownerId)?.name}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
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
                            isRecentUpdate(app.lastUpdate.weekRef)
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
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    {selectedCategoryId !== null 
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
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${statusColors[app.status]}`}>
                    {statusLabels[app.status]}
                  </span>
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
                {app.repoUrl && (
                  <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 mt-2 break-all">{app.repoUrl}</p>
                )}
                {app.lastUpdate ? (
                  <p className={`text-xs sm:text-sm mt-2 font-medium wrap-break-word ${
                    isRecentUpdate(app.lastUpdate.weekRef)
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
              <div className="sm:ml-6 sm:text-right shrink-0">
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
            {selectedCategoryId !== null 
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
    </div>
  )
}
