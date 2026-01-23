import { Outlet, Link } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { useConvexAuth, Authenticated, Unauthenticated, AuthLoading, useMutation, useQuery } from 'convex/react'
import { useAuth0 } from '@auth0/auth0-react'
import { useEffect, useMemo } from 'react'
import { api } from '../../convex/_generated/api'

export default function RootLayout() {
  const { isAuthenticated } = useConvexAuth()
  const { user, loginWithRedirect, logout } = useAuth0()
  const getOrCreateUser = useMutation(api.users.getOrCreateUser)
  const currentUser = useQuery(api.users.getCurrentUser)

  const currentMonth = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      getOrCreateUser()
    }
  }, [isAuthenticated, getOrCreateUser])

  return (
    <div className="min-h-screen bg-gray-50">
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 p-4">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-gray-900">Innovation Sucks</h1>
          <p className="text-sm text-gray-500">KeyDev Management</p>
        </div>

        <nav className="space-y-1">
          <Link
            to="/"
            className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 [&.active]:bg-blue-50 [&.active]:text-blue-700"
          >
            Dashboard
          </Link>
          <Link
            to="/keydevs"
            search={{ month: currentMonth }}
            className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 [&.active]:bg-blue-50 [&.active]:text-blue-700"
          >
            KeyDevs
          </Link>
          <Link
            to="/planning"
            className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 [&.active]:bg-blue-50 [&.active]:text-blue-700"
          >
            Planning
          </Link>
          <Link
            to="/core-apps"
            className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 [&.active]:bg-blue-50 [&.active]:text-blue-700"
          >
            Core Apps
          </Link>
          <Link
            to="/profile"
            className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 [&.active]:bg-blue-50 [&.active]:text-blue-700"
          >
            Profilo
          </Link>
          {currentUser?.role === 'Admin' && (
            <Link
              to="/admin/rejected"
              className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 [&.active]:bg-blue-50 [&.active]:text-blue-700"
            >
              PR Rifiutate
            </Link>
          )}
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <AuthLoading>
            <div className="text-sm text-gray-500">Caricamento...</div>
          </AuthLoading>

          <Unauthenticated>
            <button
              onClick={() => loginWithRedirect()}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Accedi
            </button>
          </Unauthenticated>

          <Authenticated>
            <div className="flex items-center gap-3">
              {user?.picture && (
                <img src={user.picture} alt="Avatar" className="w-8 h-8 rounded-full" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 truncate">{currentUser?.role || 'Requester'}</p>
              </div>
              <button
                onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Esci
              </button>
            </div>
          </Authenticated>
        </div>
      </aside>

      <main className="ml-64 p-8">
        <Outlet />
      </main>

      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </div>
  )
}
