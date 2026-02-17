import { Link, useParams, useSearch } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { useState } from 'react'
import KeyDevQuestionsSection from '../components/KeyDevQuestionsSection'

type Role = 'Requester' | 'BusinessValidator' | 'TechValidator' | 'Admin'

const hasRole = (roles: Array<Role> | undefined, role: Role): boolean => {
  if (!roles) return false
  return roles.includes(role)
}

const isAdmin = (roles: Array<Role> | undefined): boolean => hasRole(roles, 'Admin')

function UserAvatar({ name, pictureUrl }: { name: string; pictureUrl?: string | null }) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
  const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-red-500']
  const colorIndex = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium overflow-hidden ${!pictureUrl ? colors[colorIndex] : ''}`}>
      {pictureUrl ? <img src={pictureUrl} alt={name} className="w-full h-full object-cover" /> : initials}
    </div>
  )
}

export default function KeyDevQuestionsPage() {
  const { id } = useParams({ strict: false }) as { id: string }
  const search = useSearch({ strict: false }) as {
    questionId?: string
    highlightedAnswer?: string
    answersPage?: string | number
  }
  const isReadableId = /^KD-\d+$/.test(id)

  const keydev = useQuery(
    isReadableId ? api.keydevs.getByReadableId : api.keydevs.getById,
    isReadableId ? { readableId: id } : { id: id as Id<'keydevs'> }
  )
  const users = useQuery(api.users.listUsers)
  const currentUser = useQuery(api.users.getCurrentUser)
  const assignOwner = useMutation(api.keydevs.assignOwner)
  const assignRequester = useMutation(api.keydevs.assignRequester)
  const questionsStatus = useQuery(
    api.keydevQuestions.getQuestionsStatus,
    keydev ? { keyDevId: keydev._id } : 'skip'
  )
  const startQuestions = useMutation(api.keydevQuestions.startQuestions)

  const userRoles = currentUser?.roles as Array<Role> | undefined
  const canStartQuestions = isAdmin(userRoles) || hasRole(userRoles, 'TechValidator')
  const canQuickAssign = isAdmin(userRoles) || hasRole(userRoles, 'TechValidator')
  const [isEditingRequester, setIsEditingRequester] = useState(false)
  const [isEditingOwner, setIsEditingOwner] = useState(false)
  const [questionSearchTerm, setQuestionSearchTerm] = useState('')

  if (!keydev) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Caricamento...</div>
      </div>
    )
  }

  const requester = users?.find((u) => u._id === keydev.requesterId)
  const owner = keydev.ownerId ? users?.find((u) => u._id === keydev.ownerId) : undefined

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 min-w-0">
          <Link
            to="/keydevs/$id"
            params={{ id }}
            className="text-sm sm:text-base text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 whitespace-nowrap"
          >
            ← Torna ai Dettagli
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
              Questions - {keydev.title}
            </h1>
            <span className="px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-mono bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 whitespace-nowrap">
              {keydev.readableId}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/keydevs/$id/notes"
            params={{ id }}
            className="px-3 py-2 rounded-md text-sm bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600"
          >
            Vai alle Note
          </Link>
        </div>
      </div>

      {questionsStatus?.total === 0 && keydev.status === 'MockupDone' && canStartQuestions && (
        <div className="mb-4 p-3 border rounded-lg border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20">
          <p className="text-sm text-yellow-900 dark:text-yellow-200 mb-3">
            Avvia il flusso Questions per popolare automaticamente le domande obbligatorie del template.
          </p>
          {!keydev.ownerId && (
            <p className="text-sm text-red-700 dark:text-red-300 mb-3">
              Devi assegnare un owner prima di avviare le Questions.
            </p>
          )}
          <button
            disabled={!keydev.ownerId}
            onClick={async () => {
              await startQuestions({ keyDevId: keydev._id })
            }}
            className="px-4 py-2 bg-yellow-600 dark:bg-yellow-700 text-white rounded-md hover:bg-yellow-700 dark:hover:bg-yellow-600 disabled:opacity-50"
          >
            Start Questions
          </button>
        </div>
      )}

      <div className="mb-4 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <button
            disabled={!canQuickAssign}
            onClick={() => {
              if (!canQuickAssign) return
              setIsEditingRequester((prev) => !prev)
              setIsEditingOwner(false)
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-70 disabled:cursor-not-allowed"
            title={canQuickAssign ? 'Clicca per cambiare requester' : 'Non hai permessi per cambiare requester'}
          >
            {requester ? (
              <UserAvatar name={requester.name} pictureUrl={requester.pictureUrl} />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600" />
            )}
            <div className="text-left">
              <p className="text-xs text-gray-500 dark:text-gray-400">Requester</p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{requester?.name || 'N/A'}</p>
            </div>
          </button>

          <div className="hidden sm:flex text-gray-400 dark:text-gray-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </div>
          <div className="sm:hidden text-gray-400 dark:text-gray-500 self-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m0 0l-5-5m5 5l5-5" />
            </svg>
          </div>

          <button
            disabled={!canQuickAssign}
            onClick={() => {
              if (!canQuickAssign) return
              setIsEditingOwner((prev) => !prev)
              setIsEditingRequester(false)
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-70 disabled:cursor-not-allowed"
            title={canQuickAssign ? 'Clicca per cambiare owner' : 'Non hai permessi per cambiare owner'}
          >
            {owner ? (
              <UserAvatar name={owner.name} pictureUrl={owner.pictureUrl} />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600" />
            )}
            <div className="text-left">
              <p className="text-xs text-gray-500 dark:text-gray-400">Owner</p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{owner?.name || 'Non assegnato'}</p>
            </div>
          </button>

          <div className="w-full sm:w-72 sm:ml-auto">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Filtro domande
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 dark:text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                value={questionSearchTerm}
                onChange={(e) => setQuestionSearchTerm(e.target.value)}
                placeholder="Cerca domanda o risposta validata"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
        </div>

        {isEditingRequester && canQuickAssign && (
          <div className="mt-3">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Cambia requester</label>
            <select
              value={keydev.requesterId}
              onChange={async (e) => {
                await assignRequester({
                  id: keydev._id,
                  requesterId: e.target.value as Id<'users'>
                })
                setIsEditingRequester(false)
              }}
              className="w-full sm:w-96 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-100"
            >
              {users?.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {isEditingOwner && canQuickAssign && (
          <div className="mt-3">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Cambia owner</label>
            <select
              value={keydev.ownerId || ''}
              onChange={async (e) => {
                if (!e.target.value) return
                await assignOwner({
                  id: keydev._id,
                  ownerId: e.target.value as Id<'users'>
                })
                setIsEditingOwner(false)
              }}
              className="w-full sm:w-96 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="" disabled>
                Seleziona owner
              </option>
              {users
                ?.filter((u) => hasRole(u.roles as Array<Role> | undefined, 'TechValidator') || isAdmin(u.roles as Array<Role> | undefined))
                .map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name}
                  </option>
                ))}
            </select>
          </div>
        )}
      </div>

      <KeyDevQuestionsSection
        keydev={keydev}
        keyDevRouteId={id}
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
