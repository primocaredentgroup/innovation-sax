import { Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Authenticated, Unauthenticated } from 'convex/react'

export default function AdminRejectedPage() {
  const currentUser = useQuery(api.users.getCurrentUser)
  const rejectedKeyDevs = useQuery(api.keydevs.listRejected)
  const departments = useQuery(api.departments.list)
  const categories = useQuery(api.categories.list)
  const users = useQuery(api.users.listUsers)

  const isAdmin = currentUser?.role === 'Admin'

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">PR Rifiutate - Audit Trail</h1>

      <Unauthenticated>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">Accedi per visualizzare questa pagina.</p>
        </div>
      </Unauthenticated>

      <Authenticated>
        {!isAdmin ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-800">Solo gli amministratori possono accedere a questa pagina.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rejectedKeyDevs && rejectedKeyDevs.length > 0 ? (
              rejectedKeyDevs.map((kd) => (
                <div
                  key={kd._id}
                  className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-gray-900">{kd.title}</h3>
                        <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                          Rifiutato
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">{kd.desc}</p>

                      <div className="grid grid-cols-4 gap-4 mt-4 text-sm">
                        <div>
                          <span className="text-gray-500">Mese:</span>
                          <span className="ml-2 font-medium">{kd.monthRef}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Dipartimento:</span>
                          <span className="ml-2 font-medium">
                            {departments?.find((d) => d._id === kd.deptId)?.name || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Categoria:</span>
                          <span className="ml-2 font-medium">
                            {categories?.find((c) => c._id === kd.categoryId)?.name || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Requester:</span>
                          <span className="ml-2 font-medium">
                            {users?.find((u) => u._id === kd.requesterId)?.name || 'N/A'}
                          </span>
                        </div>
                      </div>

                      {kd.mockupRepoUrl && (
                        <div className="mt-4 p-3 bg-gray-50 rounded">
                          <div className="flex items-center gap-4 text-sm">
                            <a
                              href={kd.mockupRepoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800"
                            >
                              {kd.mockupRepoUrl}
                            </a>
                            {kd.prNumber && (
                              <span className="text-gray-500">PR #{kd.prNumber} (chiusa)</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <Link
                      to="/keydevs/$id"
                      params={{ id: kd._id }}
                      className="ml-4 px-4 py-2 text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded-md hover:bg-blue-50"
                    >
                      Vedi Dettagli
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <div className="text-green-600 mb-2">
                  <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-gray-600">Nessuna PR rifiutata</p>
              </div>
            )}
          </div>
        )}
      </Authenticated>
    </div>
  )
}
