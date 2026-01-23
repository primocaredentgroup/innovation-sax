import { Link, useParams } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
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

export default function CoreAppDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string }

  const coreApp = useQuery(api.coreApps.getById, { id: id as Id<'coreApps'> })
  const updates = useQuery(api.coreAppUpdates.listByCoreApp, {
    coreAppId: id as Id<'coreApps'>
  })

  if (!coreApp) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Caricamento...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link to="/core-apps" className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
          ← Torna alla lista
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{coreApp.name}</h1>
        <span className={`px-3 py-1 rounded-full text-sm ${statusColors[coreApp.status]}`}>
          {statusLabels[coreApp.status]}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Informazioni</h2>
            {coreApp.description && (
              <p className="text-gray-600 dark:text-gray-400 mb-4">{coreApp.description}</p>
            )}
            {coreApp.repoUrl && (
              <a
                href={coreApp.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              >
                {coreApp.repoUrl}
              </a>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Aggiornamenti Settimanali
            </h2>

            {updates && updates.length > 0 ? (
              <div className="space-y-6">
                {updates.map((update) => (
                  <div key={update._id} className="border-b dark:border-gray-700 pb-6 last:border-b-0 last:pb-0">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">
                        {update.title || `Settimana ${update.weekRef}`}
                      </h3>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{update.weekRef}</span>
                    </div>

                    <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden mb-3">
                      {update.loomUrl.includes('loom.com') ? (
                        <iframe
                          src={update.loomUrl.replace('/share/', '/embed/')}
                          frameBorder="0"
                          allowFullScreen
                          className="w-full h-full"
                        />
                      ) : (
                        <a
                          href={update.loomUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center w-full h-full text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                          Apri video →
                        </a>
                      )}
                    </div>

                    {update.notes && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">{update.notes}</p>
                    )}

                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                      {new Date(update.createdAt).toLocaleDateString('it-IT')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">Nessun aggiornamento disponibile</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-4">Progresso</h3>
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {coreApp.percentComplete}%
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    coreApp.percentComplete === 100
                      ? 'bg-green-500 dark:bg-green-600'
                      : coreApp.percentComplete > 50
                        ? 'bg-blue-500 dark:bg-blue-600'
                        : 'bg-yellow-500 dark:bg-yellow-600'
                  }`}
                  style={{ width: `${coreApp.percentComplete}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-4">Riepilogo</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Totale Aggiornamenti</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100">{updates?.length || 0}</dd>
              </div>
              {updates && updates.length > 0 && (
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Ultimo Aggiornamento</dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-100">{updates[0].weekRef}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
