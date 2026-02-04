import { Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { useMemo, useState } from 'react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

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
  const coreApps = useQuery(api.coreApps.list)
  const categories = useQuery(api.coreAppsCategories.list)
  const users = useQuery(api.users.listUsers)
  
  // Stato per la categoria selezionata (null = tutte)
  const [selectedCategoryId, setSelectedCategoryId] = useState<Id<'coreAppsCategories'> | null>(null)
  
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
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        to="/core-apps/$slug"
                        params={{ slug: app.slug }}
                        className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        {app.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {app.categoryId && categoriesMap.get(app.categoryId) ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                          {categoriesMap.get(app.categoryId)?.name}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${statusColors[app.status]}`}>
                        {statusLabels[app.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {app.ownerId && usersMap.get(app.ownerId) ? (
                        <div className="flex items-center gap-2">
                          {usersMap.get(app.ownerId)?.picture && (
                            <img 
                              src={usersMap.get(app.ownerId)?.picture} 
                              alt={usersMap.get(app.ownerId)?.name} 
                              className="w-6 h-6 rounded-full"
                            />
                          )}
                          <span className="text-sm text-gray-900 dark:text-gray-100">
                            {usersMap.get(app.ownerId)?.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                      )}
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
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 wrap-break-word">{app.name}</h3>
                  <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${statusColors[app.status]}`}>
                    {statusLabels[app.status]}
                  </span>
                  {/* Badge categoria */}
                  {app.categoryId && categoriesMap.get(app.categoryId) && (
                    <span className="px-2 py-1 text-xs rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 whitespace-nowrap">
                      {categoriesMap.get(app.categoryId)?.name}
                    </span>
                  )}
                </div>
                {/* Owner */}
                {app.ownerId && usersMap.get(app.ownerId) && (
                  <div className="flex items-center gap-2 mt-2">
                    {usersMap.get(app.ownerId)?.picture && (
                      <img 
                        src={usersMap.get(app.ownerId)?.picture} 
                        alt={usersMap.get(app.ownerId)?.name} 
                        className="w-5 h-5 rounded-full"
                      />
                    )}
                    <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      Owner: {usersMap.get(app.ownerId)?.name}
                    </span>
                  </div>
                )}
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
    </div>
  )
}
