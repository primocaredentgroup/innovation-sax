import { Link, useParams, useSearch } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { useState } from 'react'
import { api } from '../../convex/_generated/api'
import QuestionsSection from '../components/questions/QuestionsSection'

export default function CoreAppQuestionsPage() {
  const { slug } = useParams({ strict: false }) as { slug: string }
  const search = useSearch({ strict: false }) as {
    questionId?: string
    highlightedAnswer?: string
    answersPage?: string | number
  }

  const coreApp = useQuery(api.coreApps.getBySlug, { slug })
  const users = useQuery(api.users.listUsers)
  const currentUser = useQuery(api.users.getCurrentUser)
  const startQuestions = useMutation(api.coreAppQuestions.startQuestions)
  const questionsStatus = useQuery(
    api.coreAppQuestions.getQuestionsStatus,
    coreApp ? { coreAppId: coreApp._id } : 'skip'
  )
  const [questionSearchTerm, setQuestionSearchTerm] = useState('')

  if (!coreApp) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Caricamento...</div>
      </div>
    )
  }

  const userRoles = currentUser?.roles || []
  const canStartQuestions = userRoles.includes('Admin') || userRoles.includes('TechValidator')

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/core-apps/$slug"
              params={{ slug }}
              className="text-sm sm:text-base text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 whitespace-nowrap"
            >
              ← Torna ai Dettagli
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
              Questions - {coreApp.name}
            </h1>
          </div>
          <div className="w-full sm:w-72">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Filtro domande</label>
            <input
              type="text"
              value={questionSearchTerm}
              onChange={(e) => setQuestionSearchTerm(e.target.value)}
              placeholder="Cerca domanda o risposta validata"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>
      </div>

      {questionsStatus?.total === 0 && canStartQuestions && (
        <div className="mb-4 p-3 border rounded-lg border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20">
          <p className="text-sm text-yellow-900 dark:text-yellow-200 mb-3">
            Avvia il flusso Questions per popolare automaticamente le domande da template CoreApp.
          </p>
          <button
            onClick={async () => {
              await startQuestions({ coreAppId: coreApp._id })
            }}
            className="px-4 py-2 bg-yellow-600 dark:bg-yellow-700 text-white rounded-md hover:bg-yellow-700 dark:hover:bg-yellow-600"
          >
            Start Questions
          </button>
        </div>
      )}

      <QuestionsSection
        domain="coreapp"
        entityId={String(coreApp._id)}
        routeTo="/core-apps/$slug/questions"
        routeParamKey="slug"
        routeParamValue={slug}
        participants={{ ownerId: coreApp.ownerId }}
        users={users}
        currentUser={currentUser}
        questionSearchTerm={questionSearchTerm}
        questionIdFromSearch={search.questionId}
        highlightedAnswerFromSearch={search.highlightedAnswer}
        answersPageFromSearch={search.answersPage}
      />
    </div>
  )
}
