import { Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Authenticated, Unauthenticated } from 'convex/react'

export default function AdminRejectedPage() {
  const currentUser = useQuery(api.users.getCurrentUser)
  const rejectedKeyDevs = useQuery(api.keydevs.listRejected)
  const departments = useQuery(api.departments.list)
  const teams = useQuery(api.teams.list)
  const users = useQuery(api.users.listUsers)

  const isAdmin = currentUser?.roles?.includes('Admin')

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">PR Rifiutate - Audit Trail</h1>

      <Unauthenticated>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <p className="text-gray-600 dark:text-gray-400">Accedi per visualizzare questa pagina.</p>
        </div>
      </Unauthenticated>

      <Authenticated>
        {!isAdmin ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <p className="text-red-800 dark:text-red-300">Solo gli amministratori possono accedere a questa pagina.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rejectedKeyDevs && rejectedKeyDevs.length > 0 ? (
              rejectedKeyDevs.map((kd) => (
                <div
                  key={kd._id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-l-4 border-red-500 dark:border-red-600"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{kd.title}</h3>
                        <span className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full">
                          Rifiutato
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{kd.desc}</p>

                      <div className="grid grid-cols-4 gap-4 mt-4 text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Mese:</span>
                          <span className="ml-2 font-medium">{kd.monthRef || 'Bozza (nessun mese)'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Dipartimento:</span>
                          <span className="ml-2 font-medium">
                            {departments?.find((d) => d._id === kd.deptId)?.name || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Team:</span>
                          <span className="ml-2 font-medium">
                            {teams?.find((t) => t._id === kd.teamId)?.name || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Requester:</span>
                          <span className="ml-2 font-medium">
                            {users?.find((u) => u._id === kd.requesterId)?.name || 'N/A'}
                          </span>
                        </div>
                      </div>

                      {kd.mockupRepoUrl && (
                        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded">
                          <div className="flex items-center gap-4 text-sm">
                            <a
                              href={kd.mockupRepoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                            >
                              {kd.mockupRepoUrl}
                            </a>
                            {kd.validatedMockupCommit && (
                              <span className="text-gray-500 dark:text-gray-400 font-mono text-xs">
                                Commit: {kd.validatedMockupCommit.substring(0, 7)}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <Link
                      to="/keydevs/$id"
                      params={{ id: kd.readableId }}
                      className="ml-4 px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30"
                    >
                      Vedi Dettagli
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                <div className="text-green-600 mb-2">
                  <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-gray-600 dark:text-gray-400">Nessuna PR rifiutata</p>
              </div>
            )}
          </div>
        )}
      </Authenticated>
    </div>
  )
}
