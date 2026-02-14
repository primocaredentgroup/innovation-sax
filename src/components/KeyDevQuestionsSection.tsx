import { useMemo, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

type Role = 'Requester' | 'BusinessValidator' | 'TechValidator' | 'Admin'

type UserLite = {
  _id: Id<'users'>
  name: string
  email?: string
}

type KeyDevLite = {
  _id: Id<'keydevs'>
  ownerId?: Id<'users'>
  requesterId: Id<'users'>
}

const formatUserName = (name: string | undefined): string => {
  if (!name) return 'Utente'
  return name.replace(/\s+/g, '')
}

function resolveMentionedUserIds(text: string, users: Array<UserLite> | undefined): Array<Id<'users'>> {
  if (!users || users.length === 0) return []
  const found = new Set<Id<'users'>>()
  const matches = text.match(/@(\w+)/g) || []
  for (const rawMention of matches) {
    const mention = rawMention.slice(1).toLowerCase()
    const user = users.find((u) => {
      const originalName = u.name.toLowerCase()
      const formattedName = formatUserName(u.name).toLowerCase()
      const email = u.email?.toLowerCase()
      return mention === originalName || mention === formattedName || mention === email
    })
    if (user) {
      found.add(user._id)
    }
  }
  return Array.from(found)
}

interface KeyDevQuestionsSectionProps {
  keydev: KeyDevLite
  users: Array<UserLite> | undefined
  currentUser: { _id: Id<'users'>; roles?: Array<Role> } | null | undefined
}

const ANSWERS_PER_PAGE = 3

export default function KeyDevQuestionsSection({ keydev, users, currentUser }: KeyDevQuestionsSectionProps) {
  const questions = useQuery(api.keydevQuestions.listByKeyDev, { keyDevId: keydev._id })
  const createQuestion = useMutation(api.keydevQuestions.createQuestion)
  const createAnswer = useMutation(api.keydevQuestions.createAnswer)
  const validateAnswer = useMutation(api.keydevQuestions.validateAnswer)

  const [newQuestionText, setNewQuestionText] = useState('')
  const [activeQuestionId, setActiveQuestionId] = useState<Id<'keyDevQuestions'> | null>(null)
  const [answerBody, setAnswerBody] = useState('')
  const [recipientRole, setRecipientRole] = useState<'owner' | 'requester'>('owner')
  const [mentionQuery, setMentionQuery] = useState('')
  const [showMentionDropdown, setShowMentionDropdown] = useState(false)
  const [mentionPosition, setMentionPosition] = useState<{ start: number; end: number } | null>(null)
  const [answersPage, setAnswersPage] = useState(1)

  const answers = useQuery(
    api.keydevQuestions.listAnswersByQuestion,
    activeQuestionId ? { questionId: activeQuestionId } : 'skip'
  )

  const activeQuestion = useMemo(
    () => questions?.find((q) => q._id === activeQuestionId),
    [questions, activeQuestionId]
  )

  const totalAnswerPages = Math.max(1, Math.ceil((answers?.length || 0) / ANSWERS_PER_PAGE))
  const currentAnswersPage = Math.min(answersPage, totalAnswerPages)
  const paginatedAnswers = useMemo(() => {
    if (!answers || answers.length === 0) return []
    const start = (currentAnswersPage - 1) * ANSWERS_PER_PAGE
    return answers.slice(start, start + ANSWERS_PER_PAGE)
  }, [answers, currentAnswersPage])

  const filteredUsersForMention = useMemo(() => {
    if (!users) return []
    if (!mentionQuery.trim()) return users.slice(0, 10)
    const query = mentionQuery.toLowerCase()
    return users
      .filter((user) => user.name.toLowerCase().includes(query) || user.email?.toLowerCase().includes(query))
      .slice(0, 10)
  }, [users, mentionQuery])

  const isOwner = currentUser?._id === keydev.ownerId
  const ownerName = users?.find((u) => u._id === keydev.ownerId)?.name || 'Owner'
  const requesterName = users?.find((u) => u._id === keydev.requesterId)?.name || 'Requester'

  const handleSelectMention = (userName: string) => {
    if (!mentionPosition) return
    const formatted = formatUserName(userName)
    const before = answerBody.substring(0, mentionPosition.start)
    const after = answerBody.substring(mentionPosition.end)
    const next = `${before}@${formatted} ${after}`
    setAnswerBody(next)
    setMentionQuery('')
    setMentionPosition(null)
    setShowMentionDropdown(false)
  }

  const handleAnswerInput = (value: string, cursorPosition: number) => {
    setAnswerBody(value)
    const textBeforeCursor = value.substring(0, cursorPosition)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')

    if (lastAtIndex === -1) {
      setShowMentionDropdown(false)
      setMentionQuery('')
      setMentionPosition(null)
      return
    }

    const charAfterAt = textBeforeCursor[lastAtIndex + 1]
    const isAtWordBoundary =
      lastAtIndex === 0 || textBeforeCursor[lastAtIndex - 1] === ' ' || textBeforeCursor[lastAtIndex - 1] === '\n'
    if (!isAtWordBoundary) {
      setShowMentionDropdown(false)
      setMentionQuery('')
      setMentionPosition(null)
      return
    }

    const query = textBeforeCursor.substring(lastAtIndex + 1)
    if (query.includes(' ') || query.includes('\n')) {
      setShowMentionDropdown(false)
      setMentionQuery('')
      setMentionPosition(null)
      return
    }

    if (charAfterAt === undefined || charAfterAt === ' ' || charAfterAt === '\n' || /[a-zA-Z0-9]/.test(charAfterAt)) {
      setMentionQuery(query)
      setMentionPosition({ start: lastAtIndex, end: cursorPosition })
      setShowMentionDropdown(true)
      return
    }

    setShowMentionDropdown(false)
    setMentionQuery('')
    setMentionPosition(null)
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Questions</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Tutti possono aggiungere domande e risposte. Solo l&apos;owner può validare una singola risposta per domanda.
        </p>
      </div>

      <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Nuova domanda
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={newQuestionText}
            onChange={(e) => setNewQuestionText(e.target.value)}
            placeholder="Inserisci una nuova domanda..."
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-100"
          />
          <button
            onClick={async () => {
              if (!newQuestionText.trim()) return
              await createQuestion({ keyDevId: keydev._id, text: newQuestionText.trim() })
              setNewQuestionText('')
            }}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 whitespace-nowrap"
          >
            Aggiungi domanda
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {questions && questions.length > 0 ? (
          questions.map((question) => {
            const isValidated = question.validatedAnswerId !== undefined
            return (
              <div
                key={question._id}
                className={`p-4 rounded-lg border ${
                  isValidated
                    ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                    : 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          isValidated
                            ? 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200'
                            : 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200'
                        }`}
                      >
                        {isValidated ? 'VALIDATA' : 'ROSSA'}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {question.source === 'Template' ? 'Template Admin' : 'Manuale'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 dark:text-gray-100">{question.text}</p>
                    {question.validatedAnswer && (
                      <div className="mt-3 p-3 rounded bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-700">
                        <p className="text-xs font-semibold text-green-800 dark:text-green-300 mb-1">
                          Risposta validata
                        </p>
                        <p className="text-sm text-green-900 dark:text-green-200">{question.validatedAnswer.body}</p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setActiveQuestionId(question._id)
                      setAnswersPage(1)
                      setAnswerBody('')
                      setRecipientRole('owner')
                      setMentionQuery('')
                      setMentionPosition(null)
                      setShowMentionDropdown(false)
                    }}
                    className="px-3 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-md hover:bg-gray-800 dark:hover:bg-gray-600 whitespace-nowrap"
                  >
                    Apri risposte
                  </button>
                </div>
              </div>
            )
          })
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">
            Nessuna domanda presente.
          </p>
        )}
      </div>

      {activeQuestionId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setActiveQuestionId(null)
            }
          }}
        >
          <div
            className="w-full max-w-3xl max-h-[85vh] overflow-visible rounded-lg bg-white dark:bg-gray-800 shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                  Dialog risposte
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {activeQuestion?.text}
                </p>
              </div>
              <button
                onClick={() => setActiveQuestionId(null)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {answers && answers.length > 0 ? (
                paginatedAnswers.map((answer) => {
                  const senderName = users?.find((u) => u._id === answer.senderId)?.name || 'Utente'
                  const isThisValidated = activeQuestion?.validatedAnswerId === answer._id
                  return (
                    <div
                      key={answer._id}
                      className={`p-3 rounded border ${
                        isThisValidated
                          ? 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40'
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {formatUserName(senderName)}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          → {answer.recipientRole === 'owner' ? ownerName : requesterName}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {new Date(answer.ts).toLocaleString('it-IT')}
                        </span>
                        {isThisValidated && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200">
                            VALIDATA
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
                        {answer.body}
                      </p>
                      {isOwner && (
                        <div className="mt-2">
                          <label className="inline-flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                            <input
                              type="radio"
                              name={`validated-answer-${activeQuestion?._id || ''}`}
                              checked={isThisValidated}
                              onChange={async () => {
                                if (!activeQuestion) return
                                await validateAnswer({
                                  questionId: activeQuestion._id,
                                  answerId: answer._id
                                })
                              }}
                              className="w-4 h-4 text-green-600 border-gray-300 dark:border-gray-600 focus:ring-green-500"
                            />
                            <span>
                              {isThisValidated ? 'Risposta validata' : 'Segna come risposta validata'}
                            </span>
                          </label>
                        </div>
                      )}
                    </div>
                  )
                })
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                  Nessuna risposta presente.
                </p>
              )}
              {answers && answers.length > ANSWERS_PER_PAGE && (
                <div className="pt-2 flex items-center justify-between">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Pagina {currentAnswersPage} di {totalAnswerPages} ({answers.length} risposte)
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setAnswersPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentAnswersPage === 1}
                      className="px-3 py-1.5 text-xs rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                    >
                      ← Precedente
                    </button>
                    <button
                      onClick={() => setAnswersPage((prev) => Math.min(totalAnswerPages, prev + 1))}
                      disabled={currentAnswersPage === totalAnswerPages}
                      className="px-3 py-1.5 text-xs rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                    >
                      Successiva →
                    </button>
                  </div>
                </div>
              )}
              {!isOwner && (
                <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                  Solo l&apos;owner può selezionare la risposta validata della domanda.
                </p>
              )}
            </div>

            <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700">
              <div className="mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Destinatario
                </label>
                <select
                  value={recipientRole}
                  onChange={(e) => setRecipientRole(e.target.value as 'owner' | 'requester')}
                  className="w-full sm:w-72 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="owner">Owner ({ownerName})</option>
                  <option value="requester">Requester ({requesterName})</option>
                </select>
              </div>
              <div className="relative mention-dropdown-container">
                <textarea
                  value={answerBody}
                  onChange={(e) => handleAnswerInput(e.target.value, e.target.selectionStart)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape' && showMentionDropdown) {
                      setShowMentionDropdown(false)
                      setMentionQuery('')
                      setMentionPosition(null)
                    }
                    if (e.key === 'Enter' && showMentionDropdown && filteredUsersForMention.length > 0 && !e.shiftKey) {
                      e.preventDefault()
                      handleSelectMention(filteredUsersForMention[0].name)
                    }
                  }}
                  rows={3}
                  placeholder="Scrivi una risposta... usa @ per menzionare utenti"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-100"
                />
                {showMentionDropdown && filteredUsersForMention.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 bottom-full mb-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-56 overflow-auto">
                    {filteredUsersForMention.map((user) => (
                      <button
                        type="button"
                        key={user._id}
                        onClick={() => handleSelectMention(user.name)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <span className="font-medium text-gray-900 dark:text-gray-100">{user.name}</span>
                        {user.email && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">({user.email})</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  onClick={() => setActiveQuestionId(null)}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
                >
                  Chiudi
                </button>
                <button
                  onClick={async () => {
                    if (!activeQuestionId || !answerBody.trim()) return
                    const mentionedUserIds = resolveMentionedUserIds(answerBody, users)
                    await createAnswer({
                      questionId: activeQuestionId,
                      body: answerBody.trim(),
                      recipientRole,
                      mentionedUserIds: mentionedUserIds.length > 0 ? mentionedUserIds : undefined
                    })
                    setAnswerBody('')
                    setMentionQuery('')
                    setMentionPosition(null)
                    setShowMentionDropdown(false)
                  }}
                  disabled={!answerBody.trim()}
                  className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
                >
                  Invia risposta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
