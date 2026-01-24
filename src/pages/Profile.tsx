import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useAuth0 } from '@auth0/auth0-react'
import { Authenticated, Unauthenticated } from 'convex/react'

export default function ProfilePage() {
  const { user, loginWithRedirect } = useAuth0()
  const currentUser = useQuery(api.users.getCurrentUser)
  const departments = useQuery(api.departments.list)

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Profilo</h1>

      <Unauthenticated>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <p className="text-gray-600 dark:text-gray-400 mb-4">Accedi per vedere il tuo profilo</p>
          <button
            onClick={() => loginWithRedirect()}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
          >
            Accedi con Auth0
          </button>
        </div>
      </Unauthenticated>

      <Authenticated>
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Informazioni Utente</h2>
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
              {user?.picture ? (
                <img src={user.picture} alt="Avatar" className="w-20 h-20 sm:w-16 sm:h-16 rounded-full shrink-0" />
              ) : (
                <div className="w-20 h-20 sm:w-16 sm:h-16 rounded-full bg-green-600 dark:bg-green-700 flex items-center justify-center shrink-0">
                  <span className="text-white text-2xl sm:text-xl font-semibold">
                    {(currentUser?.name || user?.name || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1 w-full min-w-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-4">
                  <div className="min-w-0">
                    <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">Nome</label>
                    <p className="font-medium wrap-break-word text-sm sm:text-base">{currentUser?.name || user?.name || 'N/A'}</p>
                  </div>
                  <div className="min-w-0">
                    <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">Email</label>
                    <p className="font-medium wrap-break-word text-sm sm:text-base">{currentUser?.email || user?.email || 'N/A'}</p>
                  </div>
                  <div className="min-w-0">
                    <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">Ruoli</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(currentUser?.roles || ['Requester']).map((role) => (
                        <span 
                          key={role}
                          className={`inline-flex px-2 py-1 text-xs rounded-full ${
                            role === 'Admin'
                              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                              : role === 'BusinessValidator'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                : role === 'TechValidator'
                                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                          }`}
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">Dipartimento</label>
                    <p className="font-medium wrap-break-word text-sm sm:text-base">
                      {currentUser?.deptId
                        ? departments?.find((d) => d._id === currentUser.deptId)?.name || 'N/A'
                        : 'Non assegnato'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Authenticated>
    </div>
  )
}
