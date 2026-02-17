import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import QuestionLabelsInput from './QuestionLabelsInput'
import { useQuestionsDomainAdapter } from './useQuestionsDomainAdapter'
import type { QuestionDomain, QuestionParticipantConfig, Role, UserLite } from './types'

const ANSWERS_PER_PAGE = 3

type QuestionsSectionProps = {
  domain: QuestionDomain
  entityId: string
  routeTo: '/keydevs/$id/questions' | '/core-apps/$slug/questions'
  routeParamKey: 'id' | 'slug'
  routeParamValue: string
  participants: QuestionParticipantConfig
  users: Array<UserLite> | undefined
  currentUser: { _id: Id<'users'>; roles?: Array<Role> } | null | undefined
  questionSearchTerm?: string
  questionIdFromSearch?: string
  highlightedAnswerFromSearch?: string
  answersPageFromSearch?: string | number
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
    if (user) found.add(user._id)
  }
  return Array.from(found)
}

export default function QuestionsSection({
  domain,
  entityId,
  routeTo,
  routeParamKey,
  routeParamValue,
  participants,
  users,
  currentUser,
  questionSearchTerm,
  questionIdFromSearch,
  highlightedAnswerFromSearch,
  answersPageFromSearch
}: QuestionsSectionProps) {
  const navigate = useNavigate()
  const routeSearch = useSearch({ strict: false }) as {
    questionId?: string
    highlightedAnswer?: string
    answersPage?: string | number
  }

  const {
    questions,
    questionsStatus,
    availableLabels,
    labelsByQuestion,
    createQuestion,
    createAnswer,
    updateAnswer,
    validateAnswer,
    addLabel,
    removeLabel
  } = useQuestionsDomainAdapter({ domain, entityId })

  const [newQuestionText, setNewQuestionText] = useState('')
  const [isCreateQuestionDialogOpen, setIsCreateQuestionDialogOpen] = useState(false)
  const [activeQuestionsTab, setActiveQuestionsTab] = useState<'red' | 'validated'>('red')
  const [answerBody, setAnswerBody] = useState('')
  const [recipientRole, setRecipientRole] = useState<'owner' | 'requester'>('owner')
  const [mentionQuery, setMentionQuery] = useState('')
  const [showMentionDropdown, setShowMentionDropdown] = useState(false)
  const [mentionPosition, setMentionPosition] = useState<{ start: number; end: number } | null>(null)
  const [showCopyToast, setShowCopyToast] = useState(false)
  const [copyToastError, setCopyToastError] = useState(false)
  const [editingAnswerId, setEditingAnswerId] = useState<string | null>(null)
  const [editingAnswerBody, setEditingAnswerBody] = useState('')
  const [editingAnswerRecipientRole, setEditingAnswerRecipientRole] = useState<'owner' | 'requester'>('owner')
  const [labelsFilter, setLabelsFilter] = useState<string>('all')
  const lastAppliedHighlightRef = useRef<string | null>(null)
  const copyToastTimeoutRef = useRef<number | null>(null)

  const activeQuestionId = questionIdFromSearch || null
  const highlightedAnswerId = highlightedAnswerFromSearch || null
  const parsedAnswersPage = Number.parseInt(String(answersPageFromSearch ?? '1'), 10)
  const answersPage = Number.isFinite(parsedAnswersPage) && parsedAnswersPage > 0 ? parsedAnswersPage : 1

  const answers = useQuery(
    domain === 'keydev' ? api.keydevQuestions.listAnswersByQuestion : api.coreAppQuestions.listAnswersByQuestion,
    activeQuestionId
      ? domain === 'keydev'
        ? { questionId: activeQuestionId as Id<'keyDevQuestions'> }
        : { questionId: activeQuestionId as Id<'coreAppQuestions'> }
      : 'skip'
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

  const isOwner = !!participants.ownerId && currentUser?._id === participants.ownerId
  const isCurrentUserAdmin = (currentUser?.roles || []).includes('Admin')
  const ownerName = users?.find((u) => u._id === participants.ownerId)?.name || 'Owner'
  const requesterName = users?.find((u) => u._id === participants.requesterId)?.name || ownerName
  const normalizedSearchTerm = questionSearchTerm?.trim().toLowerCase() || ''

  const questionsFilteredByText = useMemo(() => {
    if (!questions) return []
    let result = questions
    if (normalizedSearchTerm) {
      result = result.filter((question) => {
        const textMatch = question.text.toLowerCase().includes(normalizedSearchTerm)
        const sourceMatch = question.source.toLowerCase().includes(normalizedSearchTerm)
        const validatedAnswerMatch = question.validatedAnswer?.body.toLowerCase().includes(normalizedSearchTerm) || false
        return textMatch || sourceMatch || validatedAnswerMatch
      })
    }
    if (labelsFilter !== 'all') {
      result = result.filter((question) => {
        const labels = labelsByQuestion[question._id] || []
        return labels.some((label) => String(label._id) === labelsFilter)
      })
    }
    return result
  }, [questions, normalizedSearchTerm, labelsFilter, labelsByQuestion])

  const sortedQuestions = useMemo(() => {
    return [...questionsFilteredByText].sort((a, b) => {
      const aLabel = (labelsByQuestion[a._id] || [])[0]?.label?.toLowerCase() || ''
      const bLabel = (labelsByQuestion[b._id] || [])[0]?.label?.toLowerCase() || ''
      if (aLabel !== bLabel) return aLabel.localeCompare(bLabel, 'it')
      return a.text.localeCompare(b.text, 'it')
    })
  }, [questionsFilteredByText, labelsByQuestion])

  const redQuestions = useMemo(
    () => sortedQuestions.filter((question) => question.validatedAnswerId === undefined),
    [sortedQuestions]
  )
  const validatedQuestions = useMemo(
    () => sortedQuestions.filter((question) => question.validatedAnswerId !== undefined),
    [sortedQuestions]
  )
  const visibleQuestions = activeQuestionsTab === 'red' ? redQuestions : validatedQuestions

  const updateDialogSearch = useCallback((updates: { questionId?: string; highlightedAnswer?: string; answersPage?: string }) => {
    navigate({
      to: routeTo as never,
      params: { [routeParamKey]: routeParamValue } as never,
      search: {
        ...routeSearch,
        questionId: updates.questionId,
        highlightedAnswer: updates.highlightedAnswer,
        answersPage: updates.answersPage
      } as never
    })
  }, [navigate, routeParamKey, routeParamValue, routeSearch, routeTo])

  const resetAnswerComposer = () => {
    setAnswerBody('')
    setRecipientRole('owner')
    setMentionQuery('')
    setMentionPosition(null)
    setShowMentionDropdown(false)
  }

  const closeAnswersDialog = () => {
    resetAnswerComposer()
    setEditingAnswerId(null)
    setEditingAnswerBody('')
    setEditingAnswerRecipientRole('owner')
    updateDialogSearch({ questionId: undefined, highlightedAnswer: undefined, answersPage: undefined })
  }

  const triggerCopyToast = (isError: boolean) => {
    if (copyToastTimeoutRef.current !== null) window.clearTimeout(copyToastTimeoutRef.current)
    setCopyToastError(isError)
    setShowCopyToast(true)
    copyToastTimeoutRef.current = window.setTimeout(() => {
      setShowCopyToast(false)
      copyToastTimeoutRef.current = null
    }, 3000)
  }

  const openAnswersDialog = (questionId: string) => {
    resetAnswerComposer()
    setEditingAnswerId(null)
    setEditingAnswerBody('')
    setEditingAnswerRecipientRole('owner')
    updateDialogSearch({ questionId, highlightedAnswer: undefined, answersPage: '1' })
  }

  useEffect(() => {
    if (!activeQuestionId || !highlightedAnswerId) {
      lastAppliedHighlightRef.current = null
      return
    }
  }, [activeQuestionId, highlightedAnswerId])

  useEffect(() => () => {
    if (copyToastTimeoutRef.current !== null) window.clearTimeout(copyToastTimeoutRef.current)
  }, [])

  useEffect(() => {
    if (!activeQuestionId || !highlightedAnswerId || !answers || answers.length === 0) return

    const highlightKey = `${activeQuestionId}:${highlightedAnswerId}`
    if (lastAppliedHighlightRef.current === highlightKey) return

    const answerIndex = answers.findIndex((answer) => String(answer._id) === highlightedAnswerId)
    if (answerIndex === -1) return

    const targetPage = Math.floor(answerIndex / ANSWERS_PER_PAGE) + 1
    if (targetPage === answersPage) {
      lastAppliedHighlightRef.current = highlightKey
      return
    }

    lastAppliedHighlightRef.current = highlightKey
    updateDialogSearch({
      questionId: activeQuestionId,
      highlightedAnswer: highlightedAnswerId,
      answersPage: String(targetPage)
    })
  }, [answers, activeQuestionId, highlightedAnswerId, answersPage, updateDialogSearch])

  const handleSelectMention = (userName: string) => {
    if (!mentionPosition) return
    const formatted = formatUserName(userName)
    const before = answerBody.substring(0, mentionPosition.start)
    const after = answerBody.substring(mentionPosition.end)
    setAnswerBody(`${before}@${formatted} ${after}`)
    setMentionQuery('')
    setMentionPosition(null)
    setShowMentionDropdown(false)
  }

  const handleAnswerInput = (value: string, cursorPosition: number) => {
    setAnswerBody(value)
    const textBeforeCursor = value.substring(0, cursorPosition)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')
    if (lastAtIndex === -1) return setShowMentionDropdown(false)
    const query = textBeforeCursor.substring(lastAtIndex + 1)
    if (query.includes(' ') || query.includes('\n')) return setShowMentionDropdown(false)
    setMentionQuery(query)
    setMentionPosition({ start: lastAtIndex, end: cursorPosition })
    setShowMentionDropdown(true)
  }

  const createQuestionWithLabels = async () => {
    if (!newQuestionText.trim()) return
    await createQuestion(newQuestionText.trim())
    setNewQuestionText('')
    setIsCreateQuestionDialogOpen(false)
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-end gap-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Questions</h2>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Filtro per label</label>
                <select
                  value={labelsFilter}
                  onChange={(e) => setLabelsFilter(e.target.value)}
                  className="w-44 px-2.5 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="all">Tutte</option>
                  {availableLabels.map((label) => (
                    <option key={label._id} value={label._id}>
                      {label.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
              <span className="font-semibold">Regole:</span>
              <span>Tutti possono aggiungere Q/A, solo l&apos;owner può validare una risposta.</span>
            </p>
            {questionsStatus && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Totali: {questionsStatus.total} - Validate: {questionsStatus.validated} - Mancanti: {Math.max(0, questionsStatus.total - questionsStatus.validated)}
              </p>
            )}
          </div>
          <button
            onClick={() => setIsCreateQuestionDialogOpen(true)}
            className="px-3 py-1.5 text-sm bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 whitespace-nowrap"
          >
            + Nuova domanda
          </button>
        </div>
      </div>

      <div className="mb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveQuestionsTab('red')}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeQuestionsTab === 'red'
                ? 'border-red-500 text-red-700 dark:text-red-300'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            Rosse ({redQuestions.length})
          </button>
          <button
            onClick={() => setActiveQuestionsTab('validated')}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeQuestionsTab === 'validated'
                ? 'border-green-500 text-green-700 dark:text-green-300'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            Validate ({validatedQuestions.length})
          </button>
        </div>
      </div>

      <div className="space-y-2.5">
        {visibleQuestions.length > 0 ? (
          visibleQuestions.map((question) => {
            const isValidated = question.validatedAnswerId !== undefined
            const questionLabels = (labelsByQuestion[question._id] || []).map((label) => ({
              _id: String(label._id),
              value: label.value,
              label: label.label
            }))
            return (
              <div
                key={question._id}
                className={`p-3 rounded-lg border ${
                  isValidated
                    ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                    : 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
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

                <div className="flex flex-col lg:flex-row lg:items-start gap-2 lg:gap-3">
                  <button
                    type="button"
                    onClick={() => openAnswersDialog(question._id)}
                    className="text-left text-sm text-gray-900 dark:text-gray-100 hover:underline flex-1 min-w-0"
                  >
                    {question.text}
                  </button>
                  <div className="lg:max-w-[48%] w-full">
                    <QuestionLabelsInput
                      availableLabels={availableLabels}
                      selectedLabels={questionLabels}
                      onAddLabel={async (labelText) => addLabel(question._id, labelText)}
                      onRemoveLabel={async (labelId) => removeLabel(question._id, labelId)}
                    />
                  </div>
                </div>

                {question.validatedAnswer && (
                  <div className="mt-2.5 p-2.5 rounded bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-700">
                    <p className="text-xs font-semibold text-green-800 dark:text-green-300 mb-1">Risposta validata</p>
                    <p className="text-sm text-green-900 dark:text-green-200">{question.validatedAnswer.body}</p>
                  </div>
                )}

                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => openAnswersDialog(question._id)}
                    className="text-xs text-blue-700 dark:text-blue-300 hover:underline"
                  >
                    Apri risposte
                  </button>
                </div>
              </div>
            )
          })
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">
            Nessuna domanda trovata con i filtri correnti.
          </p>
        )}
      </div>

      {isCreateQuestionDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={(e) => {
          if (e.target === e.currentTarget) setIsCreateQuestionDialogOpen(false)
        }}>
          <div className="w-full max-w-xl rounded-lg bg-white dark:bg-gray-800 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Nuova domanda</h3>
              <button onClick={() => setIsCreateQuestionDialogOpen(false)} className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">✕</button>
            </div>
            <div className="px-5 py-4">
              <input
                type="text"
                value={newQuestionText}
                onChange={(e) => setNewQuestionText(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    await createQuestionWithLabels()
                  }
                }}
                placeholder="Inserisci una nuova domanda..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-100"
                autoFocus
              />
            </div>
            <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
              <button
                onClick={() => setIsCreateQuestionDialogOpen(false)}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
              >
                Annulla
              </button>
              <button
                onClick={createQuestionWithLabels}
                disabled={!newQuestionText.trim()}
                className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
              >
                Crea domanda
              </button>
            </div>
          </div>
        </div>
      )}

      {activeQuestionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={(e) => {
          if (e.target === e.currentTarget) closeAnswersDialog()
        }}>
          <div className="w-full max-w-3xl max-h-[85vh] overflow-visible rounded-lg bg-white dark:bg-gray-800 shadow-xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">Dialog risposte</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{activeQuestion?.text}</p>
              </div>
              <button onClick={closeAnswersDialog} className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {answers && answers.length > 0 ? (
                paginatedAnswers.map((answer) => {
                  const senderName = users?.find((u) => u._id === answer.senderId)?.name || 'Utente'
                  const isThisValidated = activeQuestion?.validatedAnswerId === String(answer._id)
                  const isHighlighted = highlightedAnswerId === String(answer._id)
                  const isEditingThisAnswer = editingAnswerId === String(answer._id)
                  const isAnswerEditable = !isThisValidated && !!currentUser && (answer.senderId === currentUser._id || isCurrentUserAdmin)
                  return (
                    <div
                      key={String(answer._id)}
                      className={`p-3 rounded border ${
                        isHighlighted
                          ? 'border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                          : isThisValidated
                          ? 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{formatUserName(senderName)}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            → {answer.recipientRole === 'owner' ? ownerName : requesterName}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">{new Date(answer.ts).toLocaleString('it-IT')}</span>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            const answerParams = new URLSearchParams({
                              questionId: String(activeQuestionId),
                              highlightedAnswer: String(answer._id),
                              answersPage: String(currentAnswersPage)
                            })
                            const answerUrl = `${window.location.origin}${window.location.pathname}?${answerParams.toString()}`
                            updateDialogSearch({
                              questionId: activeQuestionId,
                              highlightedAnswer: String(answer._id),
                              answersPage: String(currentAnswersPage)
                            })
                            try {
                              await navigator.clipboard.writeText(answerUrl)
                              triggerCopyToast(false)
                            } catch {
                              triggerCopyToast(true)
                            }
                          }}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-300 hover:bg-gray-200/70 dark:hover:bg-gray-700/70"
                          title="Copia link a questa risposta"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14a5 5 0 007.07 0l1.41-1.41a5 5 0 00-7.07-7.07L10 6m4 4a5 5 0 00-7.07 0L5.52 11.41a5 5 0 107.07 7.07L14 18" />
                          </svg>
                        </button>
                      </div>

                      {isEditingThisAnswer ? (
                        <div className="space-y-2">
                          <select
                            value={editingAnswerRecipientRole}
                            onChange={(e) => setEditingAnswerRecipientRole(e.target.value as 'owner' | 'requester')}
                            className="w-full sm:w-72 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-100 text-sm"
                          >
                            <option value="owner">Owner ({ownerName})</option>
                            <option value="requester">Requester ({requesterName})</option>
                          </select>
                          <textarea
                            value={editingAnswerBody}
                            onChange={(e) => setEditingAnswerBody(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-100"
                          />
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setEditingAnswerId(null)} className="px-3 py-1.5 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm rounded-md hover:bg-gray-400 dark:hover:bg-gray-500">Annulla</button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (!editingAnswerId || !editingAnswerBody.trim()) return
                                const mentionedUserIds = resolveMentionedUserIds(editingAnswerBody, users)
                                await updateAnswer({
                                  answerId: editingAnswerId,
                                  body: editingAnswerBody.trim(),
                                  recipientRole: editingAnswerRecipientRole,
                                  mentionedUserIds: mentionedUserIds.length > 0 ? mentionedUserIds : undefined
                                })
                                setEditingAnswerId(null)
                              }}
                              disabled={!editingAnswerBody.trim()}
                              className="px-3 py-1.5 bg-blue-600 dark:bg-blue-700 text-white text-sm rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
                            >
                              Salva modifica
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">{answer.body}</p>
                      )}

                      {!isEditingThisAnswer && (
                        <div className="mt-2 flex justify-end">
                          {isAnswerEditable && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingAnswerId(String(answer._id))
                                setEditingAnswerBody(answer.body)
                                setEditingAnswerRecipientRole(answer.recipientRole)
                              }}
                              className="text-xs text-blue-700 dark:text-blue-300 hover:underline"
                            >
                              Modifica risposta
                            </button>
                          )}
                        </div>
                      )}

                      {isOwner && (
                        <div className="mt-2">
                          <label className="inline-flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                            <input
                              type="radio"
                              name={`validated-answer-${activeQuestion?._id || ''}`}
                              checked={isThisValidated}
                              onChange={async () => {
                                if (!activeQuestion) return
                                await validateAnswer(activeQuestion._id, String(answer._id))
                              }}
                              className="w-4 h-4 text-green-600 border-gray-300 dark:border-gray-600 focus:ring-green-500"
                            />
                            <span>{isThisValidated ? 'Risposta validata' : 'Segna come risposta validata'}</span>
                          </label>
                        </div>
                      )}
                    </div>
                  )
                })
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">Nessuna risposta presente.</p>
              )}
            </div>

            <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700">
              <div className="mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Destinatario</label>
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
                  rows={3}
                  placeholder="Scrivi una risposta... usa @ per menzionare utenti"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-100"
                />
                {showMentionDropdown && filteredUsersForMention.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 bottom-full mb-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-56 overflow-auto">
                    {filteredUsersForMention.map((user) => (
                      <button key={String(user._id)} type="button" onClick={() => handleSelectMention(user.name)} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <span className="font-medium text-gray-900 dark:text-gray-100">{user.name}</span>
                        {user.email && <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">({user.email})</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button onClick={closeAnswersDialog} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500">Chiudi</button>
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

      {showCopyToast && (
        <div className="fixed bottom-4 right-4 z-[70] animate-in slide-in-from-bottom-2 fade-in">
          <div className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[280px] ${copyToastError ? 'bg-red-600 dark:bg-red-700 text-white' : 'bg-green-600 dark:bg-green-700 text-white'}`}>
            <div className="flex-1">
              <p className="font-medium">{copyToastError ? 'Copia non riuscita' : 'Link copiato!'}</p>
            </div>
            <button onClick={() => setShowCopyToast(false)} className="text-white/80 hover:text-white">✕</button>
          </div>
        </div>
      )}
    </div>
  )
}
