import { createRouter, createRootRoute, createRoute } from '@tanstack/react-router'

// Import layout
import RootLayout from './components/RootLayout'

// Import pages
import DashboardPage from './pages/Dashboard'
import KeyDevsListPage from './pages/KeyDevsList'
import KeyDevDetailPage from './pages/KeyDevDetail'
import PlanningPage from './pages/Planning'
import CoreAppsListPage from './pages/CoreAppsList'
import CoreAppDetailPage from './pages/CoreAppDetail'
import CoreAppNewPage from './pages/CoreAppNew'
import CoreAppUpdateNewPage from './pages/CoreAppUpdateNew'
import ProfilePage from './pages/Profile'
import UsersManagementPage from './pages/UsersManagement'
import AdminPage from './pages/Admin'
import LoginPage from './pages/Login'

// Define routes
const rootRoute = createRootRoute({
  component: RootLayout
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DashboardPage
})

const keydevsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/keydevs',
  component: KeyDevsListPage
})

const keydevDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/keydevs/$id',
  component: KeyDevDetailPage
})

const planningRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/planning',
  component: PlanningPage
})

const coreAppsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/core-apps',
  component: CoreAppsListPage
})

const coreAppDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/core-apps/$slug',
  component: CoreAppDetailPage
})

const coreAppUpdateNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/core-apps/$slug/updates/new',
  component: CoreAppUpdateNewPage
})

const coreAppNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/core-apps/new',
  component: CoreAppNewPage
})

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  component: ProfilePage
})

const usersManagementRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/users',
  component: UsersManagementPage
})

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  component: AdminPage
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage
})

// Create route tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  keydevsRoute,
  keydevDetailRoute,
  planningRoute,
  coreAppsRoute,
  coreAppDetailRoute,
  coreAppUpdateNewRoute,
  coreAppNewRoute,
  profileRoute,
  usersManagementRoute,
  adminRoute,
  loginRoute
])

// Create router
export const router = createRouter({ routeTree })

// Register router types
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
