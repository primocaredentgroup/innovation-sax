import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { oembed } from '@loomhq/loom-embed'

const statusColors: Record<string, string> = {
  Planning: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
  InProgress: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
  Completed: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
}

const statusLabels: Record<string, string> = {
  Planning: 'In Pianificazione',
  InProgress: 'In Corso',
  Completed: 'Completato'
}

// Componente per l'embed Loom
function LoomEmbed({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null)

  // Reset state quando l'URL cambia
  const needsLoad = url !== loadedUrl

  useEffect(() => {
    if (!containerRef.current || !url || !needsLoad) return

    let isCancelled = false

    oembed(url, { width: 640 })
      .then((result) => {
        if (isCancelled) return
        if (containerRef.current && result.html) {
          containerRef.current.innerHTML = result.html
        }
        setLoading(false)
        setError(null)
        setLoadedUrl(url)
      })
      .catch((err) => {
        if (isCancelled) return
        console.error('Loom embed error:', err)
        setError('Impossibile caricare il video Loom')
        setLoading(false)
        setLoadedUrl(url)
      })

    return () => {
      isCancelled = true
    }
  }, [url, needsLoad])

  if (error) {
    return (
      <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-2">{error}</p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Apri in Loom
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
      {loading && (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-gray-500 dark:text-gray-400">Caricamento video...</div>
        </div>
      )}
      <div ref={containerRef} className={`w-full h-full ${loading ? 'hidden' : ''}`} />
    </div>
  )
}

// Form interno per il Dialog (si re-monta quando cambia la key)
function UpdateDialogForm({
  onClose,
  onSave,
  initialData,
  isEditing
}: {
  onClose: () => void
  onSave: (data: { loomUrl?: string; title: string; notes: string; weekRef: string }) => void
  initialData?: { loomUrl?: string; title: string; notes: string; weekRef: string }
  isEditing: boolean
}) {
  const [loomUrl, setLoomUrl] = useState(initialData?.loomUrl || '')
  const [title, setTitle] = useState(initialData?.title || '')
  const [notes, setNotes] = useState(initialData?.notes || '')
  const [weekRef, setWeekRef] = useState(initialData?.weekRef || getCurrentWeekRef())

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ loomUrl: loomUrl || undefined, title, notes, weekRef })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {isEditing ? 'Modifica Aggiornamento' : 'Nuovo Aggiornamento'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Settimana *
            </label>
            <input
              type="text"
              value={weekRef}
              onChange={(e) => setWeekRef(e.target.value)}
              placeholder="es. 2026-W04"
              className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              URL Video Loom *
            </label>
            <input
              type="url"
              value={loomUrl}
              onChange={(e) => setLoomUrl(e.target.value)}
              placeholder="https://www.loom.com/share/..."
              className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Titolo
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titolo dell'aggiornamento"
              className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Note
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Note aggiuntive sull'aggiornamento..."
              rows={3}
              className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none"
            />
          </div>

          {/* Preview Loom */}
          {loomUrl && loomUrl.includes('loom.com') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Anteprima
              </label>
              <LoomEmbed url={loomUrl} />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {isEditing ? 'Salva Modifiche' : 'Crea Aggiornamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Wrapper che gestisce la visibilità e usa key per forzare re-mount
function UpdateDialog({
  isOpen,
  onClose,
  onSave,
  initialData,
  isEditing
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (data: { loomUrl?: string; title: string; notes: string; weekRef: string }) => void
  initialData?: { loomUrl?: string; title: string; notes: string; weekRef: string }
  isEditing: boolean
}) {
  if (!isOpen) return null

  // Usa la key per forzare il re-mount del form quando i dati cambiano
  const formKey = initialData ? JSON.stringify(initialData) : 'new'

  return (
    <UpdateDialogForm
      key={formKey}
      onClose={onClose}
      onSave={onSave}
      initialData={initialData}
      isEditing={isEditing}
    />
  )
}

// Dialog per visualizzare un update
function ViewUpdateDialog({
  isOpen,
  onClose,
  update,
  onEdit,
  onDelete
}: {
  isOpen: boolean
  onClose: () => void
  update: {
    _id: Id<'coreAppUpdates'>
    weekRef: string
    loomUrl?: string
    title?: string
    notes?: string
    createdAt: number
  } | null
  onEdit: () => void
  onDelete: () => void
}) {
  if (!isOpen || !update) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {update.title || `Aggiornamento ${update.weekRef}`}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Settimana {update.weekRef} - {new Date(update.createdAt).toLocaleDateString('it-IT')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {update.loomUrl && <LoomEmbed url={update.loomUrl} />}

          {update.notes && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Note</h3>
              <p className="text-gray-600 dark:text-gray-400">{update.notes}</p>
            </div>
          )}

          <div className="flex justify-between mt-6 pt-4 border-t dark:border-gray-700">
            <button
              onClick={onDelete}
              className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
            >
              Elimina
            </button>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Chiudi
              </button>
              <button
                onClick={onEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Modifica
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper per ottenere la settimana corrente in formato ISO
function getCurrentWeekRef(): string {
  const now = new Date()
  const year = now.getFullYear()
  const startOfYear = new Date(year, 0, 1)
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7)
  return `${year}-W${weekNumber.toString().padStart(2, '0')}`
}

export default function CoreAppDetailPage() {
  const { slug } = useParams({ strict: false }) as { slug: string }

  const coreApp = useQuery(api.coreApps.getBySlug, { slug })
  const updates = useQuery(
    api.coreAppUpdates.listByCoreApp,
    coreApp ? { coreAppId: coreApp._id } : 'skip'
  )

  const updateUpdate = useMutation(api.coreAppUpdates.update)
  const deleteUpdate = useMutation(api.coreAppUpdates.remove)
  const updateCoreApp = useMutation(api.coreApps.update)

  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  type UpdateType = NonNullable<typeof updates>[number]
  const [selectedUpdate, setSelectedUpdate] = useState<UpdateType | null>(null)
  
  // Stati per l'editing della percentuale e dell'URL
  const [isEditingPercent, setIsEditingPercent] = useState(false)
  const [isEditingHubUrl, setIsEditingHubUrl] = useState(false)
  const [tempPercent, setTempPercent] = useState<number>(0)
  const [tempHubUrl, setTempHubUrl] = useState<string>('')

  // Usa valori derivati quando non si sta editando, altrimenti usa lo stato locale
  const currentPercent = isEditingPercent ? tempPercent : (coreApp?.percentComplete || 0)
  const currentHubUrl = isEditingHubUrl ? tempHubUrl : (coreApp?.hubMilestonesUrl || '')

  // Inizializza lo stato locale quando si entra in modalità editing
  const startEditingPercent = useCallback(() => {
    if (coreApp) {
      setTempPercent(coreApp.percentComplete)
      setIsEditingPercent(true)
    }
  }, [coreApp])

  const startEditingHubUrl = useCallback(() => {
    if (coreApp) {
      setTempHubUrl(coreApp.hubMilestonesUrl || '')
      setIsEditingHubUrl(true)
    }
  }, [coreApp])

  const handleEditUpdate = useCallback(async (data: { loomUrl?: string; title: string; notes: string; weekRef: string }) => {
    if (!selectedUpdate) return
    await updateUpdate({
      id: selectedUpdate._id,
      loomUrl: data.loomUrl,
      title: data.title || undefined,
      notes: data.notes || undefined
    })
    setIsEditDialogOpen(false)
    setIsViewDialogOpen(false)
    setSelectedUpdate(null)
  }, [selectedUpdate, updateUpdate])

  const handleDeleteUpdate = useCallback(async () => {
    if (!selectedUpdate) return
    if (!confirm('Sei sicuro di voler eliminare questo aggiornamento?')) return
    await deleteUpdate({ id: selectedUpdate._id })
    setIsViewDialogOpen(false)
    setSelectedUpdate(null)
  }, [selectedUpdate, deleteUpdate])

  const openViewDialog = useCallback((update: NonNullable<typeof updates>[number]) => {
    setSelectedUpdate(update)
    setIsViewDialogOpen(true)
  }, [])

  const openEditFromView = useCallback(() => {
    setIsViewDialogOpen(false)
    setIsEditDialogOpen(true)
  }, [])

  const handleSavePercent = useCallback(async () => {
    if (!coreApp) return
    const percent = Math.max(0, Math.min(100, tempPercent))
    await updateCoreApp({
      id: coreApp._id,
      percentComplete: percent
    })
    setIsEditingPercent(false)
  }, [coreApp, tempPercent, updateCoreApp])

  const handleSaveHubUrl = useCallback(async () => {
    if (!coreApp) return
    await updateCoreApp({
      id: coreApp._id,
      hubMilestonesUrl: tempHubUrl.trim() || undefined
    })
    setIsEditingHubUrl(false)
  }, [coreApp, tempHubUrl, updateCoreApp])

  if (!coreApp) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Caricamento...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link to="/core-apps" className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
          ← Torna alla lista
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{coreApp.name}</h1>
        <span className={`px-3 py-1 rounded-full text-sm ${statusColors[coreApp.status]}`}>
          {statusLabels[coreApp.status]}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Informazioni</h2>
            {coreApp.description && (
              <p className="text-gray-600 dark:text-gray-400 mb-4">{coreApp.description}</p>
            )}
            {coreApp.repoUrl && (
              <a
                href={coreApp.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              >
                {coreApp.repoUrl}
              </a>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                Aggiornamenti Settimanali
              </h2>
              <Link
                to="/core-apps/$slug/updates/new"
                params={{ slug }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm inline-block"
              >
                + Nuovo Aggiornamento
              </Link>
            </div>

            {updates && updates.length > 0 ? (
              <div className="space-y-4">
                {updates.map((update) => (
                  <div
                    key={update._id}
                    onClick={() => openViewDialog(update)}
                    className="border dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-medium text-gray-900 dark:text-gray-100">
                            {update.title || `Settimana ${update.weekRef}`}
                          </h3>
                          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
                            {update.weekRef}
                          </span>
                        </div>
                        {update.notes && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                            {update.notes}
                          </p>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 ml-4">
                        {new Date(update.createdAt).toLocaleDateString('it-IT')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">Nessun aggiornamento disponibile</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-4">Progresso</h3>
            <div className="text-center">
              {isEditingPercent ? (
                <div className="space-y-3">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={tempPercent}
                    onChange={(e) => setTempPercent(Number(e.target.value))}
                    className="text-4xl font-bold text-gray-900 dark:text-gray-100 bg-transparent border-b-2 border-blue-500 dark:border-blue-400 text-center w-24 focus:outline-none"
                    autoFocus
                    onBlur={handleSavePercent}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSavePercent()
                      } else if (e.key === 'Escape') {
                        setIsEditingPercent(false)
                      }
                    }}
                  />
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={handleSavePercent}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Salva
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingPercent(false)
                      }}
                      className="px-3 py-1 text-sm bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
                    >
                      Annulla
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={startEditingPercent}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  title="Clicca per modificare"
                >
                  <div className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    {currentPercent}%
                  </div>
                </div>
              )}
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mt-2">
                <div
                  className={`h-3 rounded-full transition-all ${
                    currentPercent === 100
                      ? 'bg-green-500 dark:bg-green-600'
                      : currentPercent > 50
                        ? 'bg-blue-500 dark:bg-blue-600'
                        : 'bg-yellow-500 dark:bg-yellow-600'
                  }`}
                  style={{ width: `${currentPercent}%` }}
                />
              </div>
              
              {/* Campo Hub Milestones URL */}
              <div className="mt-4 pt-4 border-t dark:border-gray-700">
                {isEditingHubUrl ? (
                  <div className="space-y-2">
                    <input
                      type="url"
                      value={tempHubUrl}
                      onChange={(e) => setTempHubUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 text-sm border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                      onBlur={handleSaveHubUrl}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveHubUrl()
                        } else if (e.key === 'Escape') {
                          setIsEditingHubUrl(false)
                        }
                      }}
                    />
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={handleSaveHubUrl}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Salva
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingHubUrl(false)
                        }}
                        className="px-3 py-1 text-xs bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
                      >
                        Annulla
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {currentHubUrl ? (
                      <a
                        href={currentHubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm break-all inline-block max-w-full truncate"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {currentHubUrl}
                      </a>
                    ) : (
                      <button
                        onClick={startEditingHubUrl}
                        className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 text-sm underline"
                      >
                        + Aggiungi link milestone
                      </button>
                    )}
                    {currentHubUrl && (
                      <button
                        onClick={startEditingHubUrl}
                        className="ml-2 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
                        title="Modifica URL"
                      >
                        ✏️
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-4">Riepilogo</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Totale Aggiornamenti</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100">{updates?.length || 0}</dd>
              </div>
              {updates && updates.length > 0 && (
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Ultimo Aggiornamento</dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-100">{updates[0].weekRef}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>

      {/* Dialog per visualizzare un update */}
      <ViewUpdateDialog
        isOpen={isViewDialogOpen}
        onClose={() => {
          setIsViewDialogOpen(false)
          setSelectedUpdate(null)
        }}
        update={selectedUpdate}
        onEdit={openEditFromView}
        onDelete={handleDeleteUpdate}
      />

      {/* Dialog per modificare un update */}
      <UpdateDialog
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false)
          setSelectedUpdate(null)
        }}
        onSave={handleEditUpdate}
        initialData={selectedUpdate ? {
          loomUrl: selectedUpdate.loomUrl || '',
          title: selectedUpdate.title || '',
          notes: selectedUpdate.notes || '',
          weekRef: selectedUpdate.weekRef
        } : undefined}
        isEditing={true}
      />
    </div>
  )
}
