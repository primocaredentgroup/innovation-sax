import { Outlet, Link, useNavigate, useLocation } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { useConvexAuth, Authenticated, useMutation, useQuery } from 'convex/react'
import { useAuth0 } from '@auth0/auth0-react'
import { useEffect, useMemo, useState } from 'react'
import { api } from '../../convex/_generated/api'
import DarkModeToggle from './DarkModeToggle'
import { Menu, X, ChevronLeft, ChevronRight } from 'lucide-react'

export default function RootLayout() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const { user, logout } = useAuth0()
  const getOrCreateUser = useMutation(api.users.getOrCreateUser)
  const currentUser = useQuery(api.users.getCurrentUser)
  const isAdmin = useQuery(api.users.isCurrentUserAdmin)
  const navigate = useNavigate()
  const location = useLocation()
  const isLoginPage = location.pathname === '/login'
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

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
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 z-50 ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        } ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full p-4">
          {/* Header con toggle */}
          <div className="mb-8 flex items-center justify-between">
            {!sidebarCollapsed && (
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Innovation Sax</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Gestione Sviluppi Chiave</p>
              </div>
            )}
            {sidebarCollapsed && (
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">IS</h1>
            )}
            {/* Toggle collapse button - solo su desktop */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex items-center justify-center w-8 h-8 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
              aria-label="Collassa sidebar"
            >
              {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
            {/* Close button - solo su mobile */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden flex items-center justify-center w-8 h-8 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
              aria-label="Chiudi sidebar"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="space-y-1 flex-1 overflow-y-auto">
            <Link
              to="/"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 [&.active]:bg-blue-50 dark:[&.active]:bg-blue-900/30 [&.active]:text-blue-700 dark:[&.active]:text-blue-400 ${
                sidebarCollapsed ? 'justify-center' : ''
              }`}
              title="Dashboard"
            >
              <span className="text-lg">📊</span>
              {!sidebarCollapsed && <span>Dashboard</span>}
            </Link>
            <Link
              to="/keydevs"
              search={{ month: currentMonth }}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 [&.active]:bg-blue-50 dark:[&.active]:bg-blue-900/30 [&.active]:text-blue-700 dark:[&.active]:text-blue-400 ${
                sidebarCollapsed ? 'justify-center' : ''
              }`}
              title="Sviluppi Chiave"
            >
              <span className="text-lg">🔑</span>
              {!sidebarCollapsed && <span>Sviluppi Chiave</span>}
            </Link>
            <Link
              to="/core-apps"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 [&.active]:bg-blue-50 dark:[&.active]:bg-blue-900/30 [&.active]:text-blue-700 dark:[&.active]:text-blue-400 ${
                sidebarCollapsed ? 'justify-center' : ''
              }`}
              title="Applicazioni Core"
            >
              <span className="text-lg">💻</span>
              {!sidebarCollapsed && <span>Applicazioni Core</span>}
            </Link>
            <Link
              to="/profile"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 [&.active]:bg-blue-50 dark:[&.active]:bg-blue-900/30 [&.active]:text-blue-700 dark:[&.active]:text-blue-400 ${
                sidebarCollapsed ? 'justify-center' : ''
              }`}
              title="Profilo"
            >
              <span className="text-lg">👤</span>
              {!sidebarCollapsed && <span>Profilo</span>}
            </Link>
            {isAdmin === true && (
              <>
                <Link
                  to="/admin"
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 [&.active]:bg-blue-50 dark:[&.active]:bg-blue-900/30 [&.active]:text-blue-700 dark:[&.active]:text-blue-400 ${
                    sidebarCollapsed ? 'justify-center' : ''
                  }`}
                  title="Amministrazione"
                >
                  <span className="text-lg">⚙️</span>
                  {!sidebarCollapsed && <span>Amministrazione</span>}
                </Link>
                <Link
                  to="/admin/planning"
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 [&.active]:bg-blue-50 dark:[&.active]:bg-blue-900/30 [&.active]:text-blue-700 dark:[&.active]:text-blue-400 ${
                    sidebarCollapsed ? 'justify-center' : ''
                  }`}
                  title="Planning"
                >
                  <span className="text-lg">📅</span>
                  {!sidebarCollapsed && <span>Planning</span>}
                </Link>
                <Link
                  to="/admin/users"
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 [&.active]:bg-blue-50 dark:[&.active]:bg-blue-900/30 [&.active]:text-blue-700 dark:[&.active]:text-blue-400 ${
                    sidebarCollapsed ? 'justify-center' : ''
                  }`}
                  title="Gestione Utenti"
                >
                  <span className="text-lg">👥</span>
                  {!sidebarCollapsed && <span>Gestione Utenti</span>}
                </Link>
              </>
            )}
          </nav>

          {/* Footer */}
          <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="mb-4 flex justify-center">
              <DarkModeToggle />
            </div>
            <Authenticated>
              {!sidebarCollapsed ? (
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
              ) : (
                <div className="flex flex-col items-center gap-2">
                  {user?.picture && (
                    <img src={user.picture} alt="Avatar" className="w-8 h-8 rounded-full" />
                  )}
                  <button
                    onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    title="Esci"
                  >
                    🚪
                  </button>
                </div>
              )}
            </Authenticated>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main
        className={`transition-all duration-300 ${
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
        } p-4 lg:p-8`}
      >
        {/* Mobile menu button */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden fixed top-4 left-4 z-30 p-2 bg-white dark:bg-gray-900 rounded-md shadow-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
          aria-label="Apri menu"
        >
          <Menu size={24} className="text-gray-700 dark:text-gray-300" />
        </button>
        <Outlet />
      </main>

      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </div>
  )
}
