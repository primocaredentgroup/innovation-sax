import { Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { MilestonesSection } from './MilestonesSection'

export function MilestonesDialog({
  isOpen,
  onClose,
  coreAppId,
  appName,
  appSlug,
  initialPercentComplete = 0
}: {
  isOpen: boolean
  onClose: () => void
  coreAppId: Id<'coreApps'>
  appName: string
  appSlug: string
  initialPercentComplete?: number
}) {
  const milestonesData = useQuery(
    api.coreAppMilestones.listByCoreApp,
    isOpen ? { coreAppId } : 'skip'
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6 border-b dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 wrap-break-word">
              Milestones - {appName}
            </h2>
            <Link
              to="/core-apps/$slug"
              params={{ slug: appSlug }}
              onClick={(e) => e.stopPropagation()}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-block"
            >
              Apri dettaglio completo →
            </Link>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shrink-0"
            aria-label="Chiudi"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 sm:p-6">
          <MilestonesSection
            coreAppId={coreAppId}
            milestonesData={milestonesData ?? undefined}
            showProgress={true}
            initialPercentComplete={initialPercentComplete}
          />
        </div>
      </div>
    </div>
  )
}
