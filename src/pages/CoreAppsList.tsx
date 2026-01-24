import { Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'

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

export default function CoreAppsListPage() {
  const coreApps = useQuery(api.coreApps.list)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Applicazioni Core</h1>
        <Link
          to="/core-apps/new"
          className="px-4 py-2 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 font-medium rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors border border-blue-600 dark:border-blue-500"
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
            className="block bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{app.name}</h3>
                  <span className={`px-2 py-1 text-xs rounded-full ${statusColors[app.status]}`}>
                    {statusLabels[app.status]}
                  </span>
                </div>
                {app.description && (
                  <p className="text-gray-600 dark:text-gray-400 mt-2">{app.description}</p>
                )}
                {app.repoUrl && (
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">{app.repoUrl}</p>
                )}
              </div>
              <div className="ml-6 text-right">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {app.percentComplete}%
                </div>
                <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center text-gray-500 dark:text-gray-400">
            Nessuna Applicazione Core presente
          </div>
        )}
      </div>
    </div>
  )
}
