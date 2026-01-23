import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useAuth0 } from '@auth0/auth0-react'
import { Authenticated, Unauthenticated } from 'convex/react'

export default function ProfilePage() {
  const { user, loginWithRedirect } = useAuth0()
  const currentUser = useQuery(api.users.getCurrentUser)
  const departments = useQuery(api.departments.list)

  const githubClientId = import.meta.env.VITE_GITHUB_CLIENT_ID
  const githubRedirectUri = `${window.location.origin}/api/github/callback`
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${githubClientId}&redirect_uri=${encodeURIComponent(githubRedirectUri)}&scope=repo`

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Profilo</h1>

      <Unauthenticated>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 mb-4">Accedi per vedere il tuo profilo</p>
          <button
            onClick={() => loginWithRedirect()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Accedi con Auth0
          </button>
        </div>
      </Unauthenticated>

      <Authenticated>
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Informazioni Utente</h2>
            <div className="flex items-start gap-4">
              {user?.picture && (
                <img src={user.picture} alt="Avatar" className="w-16 h-16 rounded-full" />
              )}
              <div className="flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">Nome</label>
                    <p className="font-medium">{currentUser?.name || user?.name}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Email</label>
                    <p className="font-medium">{currentUser?.email || user?.email}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Ruolo</label>
                    <p className="font-medium">
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        currentUser?.role === 'Admin'
                          ? 'bg-purple-100 text-purple-800'
                          : currentUser?.role === 'BusinessValidator'
                            ? 'bg-green-100 text-green-800'
                            : currentUser?.role === 'TechValidator'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                      }`}>
                        {currentUser?.role || 'Requester'}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Dipartimento</label>
                    <p className="font-medium">
                      {currentUser?.deptId
                        ? departments?.find((d) => d._id === currentUser.deptId)?.name || 'N/A'
                        : 'Non assegnato'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Connessione GitHub</h2>
            {currentUser?.githubLogin ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  <span className="font-medium text-gray-900">@{currentUser.githubLogin}</span>
                </div>
                <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                  Connesso
                </span>
              </div>
            ) : (
              <div>
                <p className="text-gray-600 mb-4">
                  Connetti il tuo account GitHub per creare e gestire i repository dei mockup.
                </p>
                <a
                  href={githubAuthUrl}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  Connetti GitHub
                </a>
              </div>
            )}
          </div>
        </div>
      </Authenticated>
    </div>
  )
}
