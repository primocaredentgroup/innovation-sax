import { createRouter, createRootRoute, createRoute } from '@tanstack/react-router'
import { z } from 'zod'

// Import layout
import RootLayout from './components/RootLayout'

// Import pages
import DashboardPage from './pages/Dashboard'
import KeyDevsListPage from './pages/KeyDevsList'
import KeyDevNewPage from './pages/KeyDevNew'
import KeyDevDetailPage from './pages/KeyDevDetail'
import KeyDevNotesPage from './pages/KeyDevNotes'
import KeyDevQuestionsPage from './pages/KeyDevQuestions'
import PlanningPage from './pages/Planning'
import CoreAppsListPage from './pages/CoreAppsList'
import CoreAppDetailPage from './pages/CoreAppDetail'
import CoreAppNotesPage from './pages/CoreAppNotes'
import CoreAppNewPage from './pages/CoreAppNew'
import CoreAppUpdateNewPage from './pages/CoreAppUpdateNew'
import ProfilePage from './pages/Profile'
import UsersManagementPage from './pages/UsersManagement'
import AdminPage from './pages/Admin'
import AgentsPage from './pages/Agents'
import AgentSkillDetailPage from './pages/AgentSkillDetail'
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
  component: KeyDevsListPage,
  validateSearch: z.object({
    month: z.string().optional(),
    dept: z.string().optional(),
    team: z.string().optional(),
    status: z.union([z.string(), z.array(z.string())]).optional(),
    query: z.string().optional(),
    owner: z.string().optional()
  })
})

const keydevNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/keydevs/new',
  component: KeyDevNewPage,
  validateSearch: z.object({
    title: z.string().optional(),
    description: z.string().optional()
  })
})

const keydevDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/keydevs/$id',
  component: KeyDevDetailPage
})

const keydevNotesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/keydevs/$id/notes',
  component: KeyDevNotesPage,
  validateSearch: z.object({
    highlightedNote: z.string().optional()
  })
})

const keydevQuestionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/keydevs/$id/questions',
  component: KeyDevQuestionsPage,
  validateSearch: z.object({
    questionId: z.string().optional(),
    highlightedAnswer: z.string().optional(),
    answersPage: z.union([z.string(), z.number()]).optional()
  })
})

const planningRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/planning',
  component: PlanningPage
})

const coreAppsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/core-apps',
  component: CoreAppsListPage,
  validateSearch: z.object({
    owner: z.string().optional(),
    status: z.string().optional()
  })
})

const coreAppDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/core-apps/$slug',
  component: CoreAppDetailPage
})

const coreAppNotesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/core-apps/$slug/notes',
  component: CoreAppNotesPage,
  validateSearch: z.object({
    highlightedNote: z.string().optional()
  })
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

const agentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/agents',
  component: AgentsPage
})

const agentSkillDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/agents/skills/$skillId',
  component: AgentSkillDetailPage
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
  keydevNewRoute,
  keydevDetailRoute,
  keydevNotesRoute,
  keydevQuestionsRoute,
  planningRoute,
  coreAppsRoute,
  coreAppNewRoute,
  coreAppDetailRoute,
  coreAppNotesRoute,
  coreAppUpdateNewRoute,
  profileRoute,
  usersManagementRoute,
  adminRoute,
  agentsRoute,
  agentSkillDetailRoute,
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
