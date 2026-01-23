import { Outlet, Link, useNavigate, useLocation } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { useConvexAuth, Authenticated, useMutation, useQuery } from 'convex/react'
import { useAuth0 } from '@auth0/auth0-react'
import { useEffect, useMemo } from 'react'
import { api } from '../../convex/_generated/api'
import DarkModeToggle from './DarkModeToggle'

export default function RootLayout() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const { user, logout } = useAuth0()
  const getOrCreateUser = useMutation(api.users.getOrCreateUser)
  const currentUser = useQuery(api.users.getCurrentUser)
  const isAdmin = useQuery(api.users.isCurrentUserAdmin)
  const navigate = useNavigate()
  const location = useLocation()
  const isLoginPage = location.pathname === '/login'

  const currentMonth = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      getOrCreateUser()
      // Se l'utente è autenticato e sta sulla pagina di login, reindirizzalo alla home
      if (isLoginPage) {
        navigate({ to: '/' })
      }
    } else if (!isLoading && !isAuthenticated && !isLoginPage) {
      // Se l'utente non è autenticato e non sta già sulla pagina di login, reindirizzalo
      navigate({ to: '/login' })
    }
  }, [isAuthenticated, isLoading, isLoginPage, getOrCreateUser, navigate])

  // Se siamo sulla pagina di login, mostra solo il contenuto senza sidebar
  if (isLoginPage) {
    return (
      <>
        <Outlet />
        {import.meta.env.DEV && <TanStackRouterDevtools />}
      </>
    )
  }

  // Mostra solo il loading se stiamo ancora caricando l'autenticazione
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-sm text-gray-500 dark:text-gray-400">Caricamento...</div>
      </div>
    )
  }

  // Se non è autenticato, non mostrare nulla (sarà reindirizzato)
  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <aside className="fixed left-0 top-0 h-full w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 p-4">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Innovation Sucks</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Gestione Sviluppi Chiave</p>
        </div>

        <nav className="space-y-1">
          <Link
            to="/"
            className="block px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 [&.active]:bg-blue-50 dark:[&.active]:bg-blue-900/30 [&.active]:text-blue-700 dark:[&.active]:text-blue-400"
          >
            Dashboard
          </Link>
          <Link
            to="/keydevs"
            search={{ month: currentMonth }}
            className="block px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 [&.active]:bg-blue-50 dark:[&.active]:bg-blue-900/30 [&.active]:text-blue-700 dark:[&.active]:text-blue-400"
          >
            Sviluppi Chiave
          </Link>
          <Link
            to="/core-apps"
            className="block px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 [&.active]:bg-blue-50 dark:[&.active]:bg-blue-900/30 [&.active]:text-blue-700 dark:[&.active]:text-blue-400"
          >
            Applicazioni Core
          </Link>
          <Link
            to="/profile"
            className="block px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 [&.active]:bg-blue-50 dark:[&.active]:bg-blue-900/30 [&.active]:text-blue-700 dark:[&.active]:text-blue-400"
          >
            Profilo
          </Link>
          {isAdmin === true && (
            <>
              <Link
                to="/admin"
                className="block px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 [&.active]:bg-blue-50 dark:[&.active]:bg-blue-900/30 [&.active]:text-blue-700 dark:[&.active]:text-blue-400"
              >
                Amministrazione
              </Link>
              <Link
                to="/admin/planning"
                className="block px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 [&.active]:bg-blue-50 dark:[&.active]:bg-blue-900/30 [&.active]:text-blue-700 dark:[&.active]:text-blue-400"
              >
                Planning
              </Link>
              <Link
                to="/admin/users"
                className="block px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 [&.active]:bg-blue-50 dark:[&.active]:bg-blue-900/30 [&.active]:text-blue-700 dark:[&.active]:text-blue-400"
              >
                Gestione Utenti
              </Link>
            </>
          )}
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <div className="mb-4 flex justify-center">
            <DarkModeToggle />
          </div>
          <Authenticated>
            <div className="flex items-center gap-3">
              {user?.picture && (
                <img src={user.picture} alt="Avatar" className="w-8 h-8 rounded-full" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{currentUser?.roles?.join(', ') || 'Requester'}</p>
              </div>
              <button
                onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
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
