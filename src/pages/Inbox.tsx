import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useMemo, useState } from 'react'
import { Search, Mail, MessageSquare, FileQuestion, ChevronDown, Inbox as InboxIcon, Loader2 } from 'lucide-react'

function useSinceTs(since: string | undefined): number {
  const [baseTs] = useState(() => Date.now())
  return useMemo(() => {
    if (!since || since === 'all') return 0
    if (since === '7d') return baseTs - 7 * 24 * 60 * 60 * 1000
    if (since === '30d') return baseTs - 30 * 24 * 60 * 60 * 1000
    return 0
  }, [since, baseTs])
}

export default function InboxPage() {
  const search = useSearch({ strict: false }) as {
    query?: string
    direction?: 'sent' | 'received'
    itemType?: 'note' | 'keydev_answer' | 'coreapp_answer'
    since?: string
    cursor?: string
  }
  const navigate = useNavigate()
  const [directionOpen, setDirectionOpen] = useState(false)
  const [typeOpen, setTypeOpen] = useState(false)
  const [sinceOpen, setSinceOpen] = useState(false)
  const [searchInput, setSearchInput] = useState(search.query ?? '')

  // In modalità ricerca: annulla tutti i filtri e la paginazione
  const isSearchMode = !!search.query?.trim()
  const effectiveDirection = isSearchMode ? undefined : (search.direction ?? 'received')
  const effectiveSince = isSearchMode ? undefined : (search.since ?? '7d')
  const effectiveLimit = isSearchMode ? 100 : 20
  const effectiveCursor = isSearchMode ? undefined : search.cursor

  const sinceTs = useSinceTs(effectiveSince)

  const pageItems = useQuery(api.inbox.listInboxItems, {
    searchQuery: search.query?.trim() || undefined,
    direction: effectiveDirection,
    itemType: isSearchMode ? undefined : search.itemType,
    sinceTs,
    limit: effectiveLimit,
    beforeTs: effectiveCursor ? parseInt(effectiveCursor, 10) : undefined
  })

  // Accumula gli item quando si usa "Carica altri" - sync state con query durante render
  const [accumulatedItems, setAccumulatedItems] = useState<NonNullable<typeof pageItems>>([])
  if (pageItems !== undefined) {
    if (!effectiveCursor) {
      if (
        accumulatedItems.length !== pageItems.length ||
        accumulatedItems[0]?.ts !== pageItems[0]?.ts
      ) {
        setAccumulatedItems(pageItems)
      }
    } else if (
      pageItems.length > 0 &&
      !accumulatedItems.some(
        (i) => i.itemId === pageItems[0].itemId && i.kind === pageItems[0].kind
      )
    ) {
      setAccumulatedItems((prev) => [...prev, ...pageItems])
    }
  }
  const inboxItems = !effectiveCursor ? pageItems : accumulatedItems

  const updateSearch = (updates: Record<string, string | undefined>) => {
    // Cambiando filtri si resetta la paginazione
    if ('direction' in updates || 'itemType' in updates || 'since' in updates) {
      updates.cursor = undefined
    }
    navigate({
      to: '/inbox',
      search: { ...search, ...updates }
    })
  }

  const handleSearchSubmit = () => {
    const query = searchInput.trim() || undefined
    // Ricerca testuale: annulla filtri e paginazione
    if (query) {
      updateSearch({
        query,
        direction: undefined,
        itemType: undefined,
        since: undefined,
        cursor: undefined
      })
    } else {
      updateSearch({
        query: undefined,
        direction: 'received',
        since: '7d',
        cursor: undefined
      })
    }
  }

  const hasMore =
    !isSearchMode &&
    pageItems !== undefined &&
    pageItems.length >= effectiveLimit
  const lastTs =
    inboxItems && inboxItems.length > 0
      ? inboxItems[inboxItems.length - 1].ts
      : undefined

  const directionLabel =
    (isSearchMode ? search.direction : search.direction ?? 'received') === 'sent'
      ? 'Inviati'
      : (isSearchMode ? search.direction : search.direction ?? 'received') === 'received'
        ? 'Ricevuti'
        : 'Tutti'

  const typeLabel =
    search.itemType === 'note'
      ? 'Note'
      : search.itemType === 'keydev_answer'
        ? 'Risposte KeyDev'
        : search.itemType === 'coreapp_answer'
          ? 'Risposte CoreApp'
          : 'Tutti'

  const sinceLabel =
    (isSearchMode ? search.since : search.since ?? '7d') === '7d'
      ? 'Ultimi 7 giorni'
      : (isSearchMode ? search.since : search.since ?? '7d') === '30d'
        ? 'Ultimi 30 giorni'
        : 'Tutto'

  type InboxItem = NonNullable<typeof inboxItems>[number]
  const getContextLink = (item: InboxItem) => {
    if (item.kind === 'note') {
      if (item.entityRef.type === 'keydev') {
        return {
          to: '/keydevs/$id/notes',
          params: { id: item.entityRef.identifier },
          search: { highlightedNote: item.itemId }
        }
      }
      return {
        to: '/core-apps/$slug/notes',
        params: { slug: item.entityRef.identifier },
        search: { highlightedNote: item.itemId }
      }
    }
    // Risposte alle domande: link alla domanda con risposta evidenziata
    const questionId = item.questionId
    if (item.entityRef.type === 'keydev') {
      return {
        to: '/keydevs/$id/questions',
        params: { id: item.entityRef.identifier },
        search: {
          questionId: questionId ?? undefined,
          highlightedAnswer: item.itemId
        }
      }
    }
    return {
      to: '/core-apps/$slug/questions',
      params: { slug: item.entityRef.identifier },
      search: {
        questionId: questionId ?? undefined,
        highlightedAnswer: item.itemId
      }
    }
  }

  const getKindIcon = (kind: string) => {
    if (kind === 'note') return <MessageSquare size={18} />
    if (kind === 'keydev_answer') return <FileQuestion size={18} />
    return <MessageSquare size={18} />
  }

  const getKindLabel = (kind: string) => {
    if (kind === 'note') return 'Nota'
    if (kind === 'keydev_answer') return 'Risposta KeyDev'
    return 'Risposta CoreApp'
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
        <InboxIcon size={28} />
        Inbox
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Note e risposte alle domande ricevute o inviate. Tutte le tue comunicazioni in un unico posto.
      </p>

      {/* Barra filtri */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Ricerca */}
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
              placeholder="Cerca nel contenuto..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Filtro direzione */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setDirectionOpen(!directionOpen)
                  setTypeOpen(false)
                  setSinceOpen(false)
                }}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <Mail size={16} />
                {directionLabel}
                <ChevronDown size={16} />
              </button>
              {directionOpen && (
                <div className="absolute top-full left-0 mt-1 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10 py-1">
                  {[
                    { value: undefined, label: 'Tutti' },
                    { value: 'sent' as const, label: 'Inviati' },
                    { value: 'received' as const, label: 'Ricevuti' }
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => {
                        updateSearch({ direction: opt.value })
                        setDirectionOpen(false)
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Filtro tipo */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setTypeOpen(!typeOpen)
                  setDirectionOpen(false)
                  setSinceOpen(false)
                }}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                {getKindIcon(search.itemType ?? 'note')}
                {typeLabel}
                <ChevronDown size={16} />
              </button>
              {typeOpen && (
                <div className="absolute top-full left-0 mt-1 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10 py-1">
                  {[
                    { value: undefined, label: 'Tutti' },
                    { value: 'note' as const, label: 'Note' },
                    { value: 'keydev_answer' as const, label: 'Risposte KeyDev' },
                    { value: 'coreapp_answer' as const, label: 'Risposte CoreApp' }
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => {
                        updateSearch({ itemType: opt.value })
                        setTypeOpen(false)
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-2"
                    >
                      {getKindIcon(opt.value ?? 'note')}
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Filtro periodo */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setSinceOpen(!sinceOpen)
                  setDirectionOpen(false)
                  setTypeOpen(false)
                }}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                {sinceLabel}
                <ChevronDown size={16} />
              </button>
              {sinceOpen && (
                <div className="absolute top-full left-0 mt-1 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10 py-1">
                  {[
                    { value: undefined, label: 'Tutto' },
                    { value: '7d' as const, label: 'Ultimi 7 giorni' },
                    { value: '30d' as const, label: 'Ultimi 30 giorni' }
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => {
                        updateSearch({ since: opt.value })
                        setSinceOpen(false)
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleSearchSubmit}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium"
            >
              Cerca
            </button>
          </div>
        </div>
      </div>

      {/* Lista elementi */}
      <div className="space-y-4">
        {inboxItems === undefined ? (
          <div className="flex justify-center py-12 text-gray-500 dark:text-gray-400">
            Caricamento...
          </div>
        ) : inboxItems.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center text-gray-500 dark:text-gray-400">
            Nessuna comunicazione trovata con i filtri selezionati.
          </div>
        ) : (
          <>
          {inboxItems.map((item) => (
            <Link
              key={`${item.kind}-${item.itemId}-${item.direction}`}
              {...getContextLink(item)}
              className="block bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-300 dark:hover:border-blue-600 transition-colors cursor-pointer"
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                      item.direction === 'sent'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                    }`}
                  >
                    {item.direction === 'sent' ? 'Inviato' : 'Ricevuto'}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    {getKindIcon(item.kind)}
                    {getKindLabel(item.kind)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {item.authorName}
                    </span>
                    {item.direction === 'sent' && item.recipients?.length
                      ? ` → ${item.recipients.join(', ')}`
                      : ''}
                  </p>
                  {item.questionText && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 italic">
                      "{item.questionText}"
                    </p>
                  )}
                  <p className="mt-1 text-gray-700 dark:text-gray-300 line-clamp-2">
                    {item.body}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      {item.entityRef.type === 'keydev'
                        ? `${item.entityRef.identifier}: ${item.entityRef.title}`
                        : item.entityRef.title}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(item.ts).toLocaleDateString('it-IT', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
          {hasMore && lastTs !== undefined && (
            <div className="flex justify-center pt-6">
              <button
                type="button"
                onClick={() => updateSearch({ cursor: String(lastTs) })}
                disabled={pageItems === undefined}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2"
              >
                {pageItems === undefined ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : null}
                Carica altri
              </button>
            </div>
          )}
          </>
        )}
      </div>
    </div>
  )
}
