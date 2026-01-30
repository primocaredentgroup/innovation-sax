import { Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { useMemo } from 'react'
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

export default function CoreAppsListPage() {
  const coreApps = useQuery(api.coreApps.list)
  const users = useQuery(api.users.listUsers)
  
  // Mappa userId -> user per trovare velocemente gli owner
  const usersMap = useMemo(() => {
    if (!users) return new Map<Id<'users'>, { name: string; picture?: string }>()
    return new Map(users.map(u => [u._id, { name: u.name, picture: u.picture }]))
  }, [users])

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

      <div className="grid gap-4">
        {coreApps?.map((app) => (
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
                </div>
                {app.description && (
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-2 wrap-break-word">{app.description}</p>
                )}
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

        {coreApps?.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 sm:p-8 text-center text-gray-500 dark:text-gray-400">
            Nessuna Applicazione Core presente
          </div>
        )}
      </div>
    </div>
  )
}
