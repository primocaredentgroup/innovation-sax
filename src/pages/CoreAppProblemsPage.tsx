import { useState } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { MilestonesSection } from '../components/MilestonesSection'
import { FileText, Plus } from 'lucide-react'

export default function CoreAppProblemsPage() {
  const { slug } = useParams({ strict: false }) as { slug: string }

  const coreApp = useQuery(api.coreApps.getBySlug, { slug })
  const milestonesData = useQuery(
    api.coreAppMilestones.listByCoreApp,
    coreApp ? { coreAppId: coreApp._id } : 'skip'
  )
  const problemsData = useQuery(
    api.coreAppProblems.listByCoreApp,
    coreApp ? { coreAppId: coreApp._id } : 'skip'
  )

  const createProblem = useMutation(api.coreAppProblems.create)
  const updateProblemStatus = useMutation(api.coreAppProblems.updateStatus)

  const [selectedMilestoneId, setSelectedMilestoneId] =
    useState<Id<'coreAppMilestones'> | null>(null)
  const [newProblemDescription, setNewProblemDescription] = useState('')

  const problems = selectedMilestoneId && problemsData
    ? (problemsData.problemsByMilestone[selectedMilestoneId] ?? [])
    : []
  const unresolvedCount = problemsData?.unresolvedCount ?? 0

  const handleAddProblem = async () => {
    if (!selectedMilestoneId || !newProblemDescription.trim()) return
    await createProblem({
      milestoneId: selectedMilestoneId,
      description: newProblemDescription.trim()
    })
    setNewProblemDescription('')
  }

  const handleToggleResolved = async (
    problemId: Id<'coreAppProblems'>,
    currentStatus: 'NOT_RESOLVED' | 'RESOLVED'
  ) => {
    await updateProblemStatus({
      id: problemId,
      status: currentStatus === 'RESOLVED' ? 'NOT_RESOLVED' : 'RESOLVED'
    })
  }

  if (!coreApp) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Caricamento...</div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-6">
        <Link
          to="/core-apps/$slug"
          params={{ slug }}
          className="text-sm sm:text-base text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 whitespace-nowrap"
        >
          ← Torna ai Dettagli
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
          Problemi - {coreApp.name}
        </h1>
      </div>

      <div className="mb-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
        <p className="text-lg font-semibold text-amber-800 dark:text-amber-200">
          {unresolvedCount} {unresolvedCount === 1 ? 'problema' : 'problemi'} da risolvere
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
            <MilestonesSection
              coreAppId={coreApp._id}
              milestonesData={milestonesData ?? undefined}
              showProgress={false}
              selectedMilestoneId={selectedMilestoneId}
              onMilestoneSelect={setSelectedMilestoneId}
            />
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
            {!selectedMilestoneId ? (
              <p className="text-gray-500 dark:text-gray-400 py-8 text-center">
                Seleziona una milestone dalla colonna a sinistra per visualizzare e gestire i problemi.
              </p>
            ) : (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase">
                  Problemi della milestone
                </h3>

                <div className="flex gap-2">
                  <textarea
                    value={newProblemDescription}
                    onChange={(e) => setNewProblemDescription(e.target.value)}
                    placeholder="Aggiungi un problema..."
                    rows={2}
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleAddProblem()
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddProblem}
                    disabled={!newProblemDescription.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    Aggiungi
                  </button>
                </div>

                <div className="space-y-3">
                  {problems.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                      Nessun problema per questa milestone.
                    </p>
                  ) : (
                    problems.map((problem) => (
                      <div
                        key={problem._id}
                        className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${
                          problem.status === 'RESOLVED'
                            ? 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 opacity-75'
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm ${
                              problem.status === 'RESOLVED'
                                ? 'line-through text-gray-500 dark:text-gray-400'
                                : 'text-gray-900 dark:text-gray-100'
                            }`}
                          >
                            {problem.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={`/core-apps/${slug}/notes?milestoneId=${problem.milestoneId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            title="Note"
                          >
                            <FileText className="w-4 h-4" />
                          </a>
                          <button
                            type="button"
                            onClick={() =>
                              handleToggleResolved(problem._id, problem.status)
                            }
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                              problem.status === 'RESOLVED'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50'
                            }`}
                          >
                            {problem.status === 'RESOLVED'
                              ? 'Completato'
                              : 'Da risolvere'}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
