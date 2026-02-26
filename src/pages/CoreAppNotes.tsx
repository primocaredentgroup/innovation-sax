import { Link, useParams, useSearch } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import NotesSection from '../components/NotesSection'

export default function CoreAppNotesPage() {
  const { slug } = useParams({ strict: false }) as { slug: string }
  const search = useSearch({ strict: false }) as {
    highlightedNote?: string
    milestoneId?: string
  }

  const coreApp = useQuery(api.coreApps.getBySlug, { slug })
  const milestonesData = useQuery(
    api.coreAppMilestones.listByCoreApp,
    coreApp ? { coreAppId: coreApp._id } : 'skip'
  )
  const users = useQuery(api.users.listUsers)
  const currentUser = useQuery(api.users.getCurrentUser)

  const milestoneIdFilter: Id<'coreAppMilestones'> | 'none' | undefined =
    search.milestoneId === 'none'
      ? 'none'
      : search.milestoneId
        ? (search.milestoneId as Id<'coreAppMilestones'>)
        : undefined

  if (!coreApp) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Caricamento...</div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 min-w-0">
          <Link
            to="/core-apps/$slug"
            params={{ slug }}
            className="text-sm sm:text-base text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 whitespace-nowrap"
          >
            ← Torna ai Dettagli
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
              Note - {coreApp.name}
            </h1>
          </div>
        </div>
      </div>

      {/* Notes Section */}
      <div className="w-full">
        <NotesSection
          coreAppId={coreApp._id}
          currentUser={currentUser}
          users={users}
          entityIdentifier={slug}
          highlightedNote={search.highlightedNote}
          milestoneIdFilter={milestoneIdFilter}
          milestones={milestonesData?.milestones}
          notesBasePath={`/core-apps/${slug}/notes`}
        />
      </div>
    </div>
  )
}
