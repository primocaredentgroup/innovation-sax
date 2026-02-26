import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { oembed } from '@loomhq/loom-embed'
import { MilestonesSection } from '../components/MilestonesSection'

const statusColors: Record<string, string> = {
  Planning: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
  InProgress: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
  Overdue: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
  Completed: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
}

const statusLabels: Record<string, string> = {
  Planning: 'In Pianificazione',
  InProgress: 'In Corso',
  Overdue: 'In Ritardo',
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
  onSave: (data: { loomUrl?: string; title: string; notes: string; weekRef: string; monthRef?: string }) => void
  initialData?: { loomUrl?: string; title: string; notes: string; weekRef: string; monthRef?: string }
  isEditing: boolean
}) {
  const [loomUrl, setLoomUrl] = useState(initialData?.loomUrl || '')
  const [title, setTitle] = useState(initialData?.title || '')
  const [notes, setNotes] = useState(initialData?.notes || '')
  const [weekRef, setWeekRef] = useState(initialData?.weekRef || getCurrentWeekRef())
  const [monthRef, setMonthRef] = useState(initialData?.monthRef || '')
  
  const months = useQuery(api.months.list)
  
  // Genera le opzioni per i mesi
  const monthOptions = useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonthNum = now.getMonth() + 1
    
    const pastMonths: string[] = []
    for (let i = 6; i >= 1; i--) {
      const date = new Date(currentYear, currentMonthNum - 1 - i, 1)
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      pastMonths.push(`${year}-${String(month).padStart(2, '0')}`)
    }
    
    const currentMonthRef = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`
    
    const futureMonths = months 
      ? months
          .map((m) => m.monthRef)
          .filter((m) => m > currentMonthRef)
          .sort()
      : []
    
    const allMonths = [...pastMonths, currentMonthRef, ...futureMonths]
    const uniqueMonths = Array.from(new Set(allMonths)).sort().reverse()
    
    return uniqueMonths
  }, [months])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ loomUrl: loomUrl || undefined, title, notes, weekRef, monthRef: monthRef || undefined })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6 border-b dark:border-gray-700">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">
            {isEditing ? 'Modifica Aggiornamento' : 'Nuovo Aggiornamento'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
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
              Mese di Riferimento
            </label>
            <select
              value={monthRef}
              onChange={(e) => setMonthRef(e.target.value)}
              className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">Nessun mese</option>
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
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

          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 whitespace-nowrap"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
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
  onSave: (data: { loomUrl?: string; title: string; notes: string; weekRef: string; monthRef?: string }) => void
  initialData?: { loomUrl?: string; title: string; notes: string; weekRef: string; monthRef?: string }
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
    monthRef?: string
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6 border-b dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 wrap-break-word">
              {update.title || `Aggiornamento ${update.weekRef}`}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Settimana {update.weekRef} - {new Date(update.createdAt).toLocaleDateString('it-IT')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 self-start sm:self-auto shrink-0"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 sm:p-6">
          {update.loomUrl && <LoomEmbed url={update.loomUrl} />}

          {update.notes && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Note</h3>
              <p className="text-gray-600 dark:text-gray-400 wrap-break-word">{update.notes}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:justify-between gap-3 mt-6 pt-4 border-t dark:border-gray-700">
            <button
              onClick={onDelete}
              className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg whitespace-nowrap self-start sm:self-auto"
            >
              Elimina
            </button>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 whitespace-nowrap"
              >
                Chiudi
              </button>
              <button
                onClick={onEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
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

function normalizeExternalUrl(url: string): string {
  const trimmedUrl = url.trim()
  if (!trimmedUrl) return ''
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmedUrl)) return trimmedUrl
  return `https://${trimmedUrl}`
}

export default function CoreAppDetailPage() {
  const { slug } = useParams({ strict: false }) as { slug: string }
  const navigate = useNavigate()

  const coreApp = useQuery(api.coreApps.getBySlug, { slug })
  const months = useQuery(api.months.list)
  const users = useQuery(api.users.listUsers)
  const categories = useQuery(api.coreAppsCategories.list)

  const owner = useMemo(() => {
    if (!users || !coreApp?.ownerId) return null
    return users.find(u => u._id === coreApp.ownerId) || null
  }, [users, coreApp])

  // Trova il referente business dalla lista utenti
  const businessRef = useMemo(() => {
    if (!users || !coreApp?.businessRefId) return null
    return users.find(u => u._id === coreApp.businessRefId) || null
  }, [users, coreApp])
  
  // Trova la categoria della CoreApp
  const category = useMemo(() => {
    if (!categories || !coreApp?.categoryId) return null
    return categories.find(c => c._id === coreApp.categoryId) || null
  }, [categories, coreApp])

  // Trova i subscribers della categoria
  const categorySubscribers = useMemo(() => {
    if (!users || !category?.subscriberIds) return []
    return users.filter(u => category.subscriberIds?.includes(u._id) ?? false)
  }, [users, category])
  
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  
  const updates = useQuery(
    api.coreAppUpdates.listByCoreApp,
    coreApp ? { 
      coreAppId: coreApp._id,
      monthRef: selectedMonth || undefined
    } : 'skip'
  )
  const questionsStatus = useQuery(
    api.coreAppQuestions.getQuestionsStatus,
    coreApp ? { coreAppId: coreApp._id } : 'skip'
  )
  const milestonesData = useQuery(
    api.coreAppMilestones.listByCoreApp,
    coreApp ? { coreAppId: coreApp._id } : 'skip'
  )
  const problemsData = useQuery(
    api.coreAppProblems.listByCoreApp,
    coreApp ? { coreAppId: coreApp._id } : 'skip'
  )

  const updateUpdate = useMutation(api.coreAppUpdates.update)
  const deleteUpdate = useMutation(api.coreAppUpdates.remove)
  const updateCoreApp = useMutation(api.coreApps.update)
  const removeCoreApp = useMutation(api.coreApps.remove)
  const setPriority = useMutation(api.coreApps.setPriority)
  const addCategorySubscriber = useMutation(api.coreAppsCategories.addSubscriber)
  const removeCategorySubscriber = useMutation(api.coreAppsCategories.removeSubscriber)

  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  type UpdateType = NonNullable<typeof updates>[number]
  const [selectedUpdate, setSelectedUpdate] = useState<UpdateType | null>(null)
  
  // Stati per l'editing della descrizione e delle milestones
  const [isEditingRepoUrl, setIsEditingRepoUrl] = useState(false)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false)
  const [tempRepoUrl, setTempRepoUrl] = useState<string>('')
  const [tempDescription, setTempDescription] = useState<string>('')
  const [isAddingSubscriber, setIsAddingSubscriber] = useState(false)
  const [selectedNewSubscriber, setSelectedNewSubscriber] = useState<Id<'users'> | ''>('')
  const [isEditingCategory, setIsEditingCategory] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState<Id<'coreAppsCategories'> | ''>('')
  const [isEditingOwner, setIsEditingOwner] = useState(false)
  const [selectedOwnerId, setSelectedOwnerId] = useState<Id<'users'> | ''>('')
  const [isEditingBusinessRef, setIsEditingBusinessRef] = useState(false)
  const [selectedBusinessRefId, setSelectedBusinessRefId] = useState<Id<'users'> | ''>('')
  const [isEditingPriority, setIsEditingPriority] = useState(false)
  const [tempPriority, setTempPriority] = useState<number>(0)
  const [isEditingWeight, setIsEditingWeight] = useState(false)
  const [tempWeight, setTempWeight] = useState<number>(1)
  const [isEditingName, setIsEditingName] = useState(false)
  const [tempName, setTempName] = useState('')
  
  // Genera le opzioni per i mesi (6 mesi passati + mese corrente + mesi futuri dal DB)
  const monthOptions = useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonthNum = now.getMonth() + 1
    
    // Genera i 6 mesi passati
    const pastMonths: string[] = []
    for (let i = 6; i >= 1; i--) {
      const date = new Date(currentYear, currentMonthNum - 1 - i, 1)
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      pastMonths.push(`${year}-${String(month).padStart(2, '0')}`)
    }
    
    // Mese corrente
    const currentMonthRef = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`
    
    // Mesi futuri dal database
    const futureMonths = months 
      ? months
          .map((m) => m.monthRef)
          .filter((m) => m > currentMonthRef)
          .sort()
      : []
    
    // Combina tutto: mesi passati + mese corrente + mesi futuri
    const allMonths = [...pastMonths, currentMonthRef, ...futureMonths]
    
    // Rimuovi duplicati e ordina (decrescente)
    const uniqueMonths = Array.from(new Set(allMonths)).sort().reverse()
    
    return uniqueMonths
  }, [months])

  // Usa valori derivati quando non si sta editando
  const currentRepoUrl = isEditingRepoUrl ? tempRepoUrl : (coreApp?.repoUrl || '')
  const currentRepoHref = normalizeExternalUrl(currentRepoUrl)
  const currentDescription = isEditingDescription ? tempDescription : (coreApp?.description || '')

  const startEditingRepoUrl = useCallback(() => {
    if (coreApp) {
      setTempRepoUrl(coreApp.repoUrl || '')
      setIsEditingRepoUrl(true)
    }
  }, [coreApp])

  const startEditingDescription = useCallback(() => {
    if (coreApp) {
      setTempDescription(coreApp.description || '')
      setIsEditingDescription(true)
    }
  }, [coreApp])

  const handleEditUpdate = useCallback(async (data: { loomUrl?: string; title: string; notes: string; weekRef: string; monthRef?: string }) => {
    if (!selectedUpdate) return
    await updateUpdate({
      id: selectedUpdate._id,
      loomUrl: data.loomUrl,
      title: data.title, // Passa la stringa vuota direttamente per permettere la cancellazione
      notes: data.notes, // Passa la stringa vuota direttamente per permettere la cancellazione
      monthRef: data.monthRef
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

  const handleSaveRepoUrl = useCallback(async () => {
    if (!coreApp) return
    await updateCoreApp({
      id: coreApp._id,
      repoUrl: tempRepoUrl.trim() || undefined
    })
    setIsEditingRepoUrl(false)
  }, [coreApp, tempRepoUrl, updateCoreApp])

  const handleSaveDescription = useCallback(async () => {
    if (!coreApp) return
    await updateCoreApp({
      id: coreApp._id,
      description: tempDescription.trim() || undefined
    })
    setIsEditingDescription(false)
  }, [coreApp, tempDescription, updateCoreApp])

  const handleStatusChange = useCallback(async (newStatus: 'Planning' | 'InProgress') => {
    if (!coreApp) return
    await updateCoreApp({
      id: coreApp._id,
      status: newStatus
    })
    setIsStatusDropdownOpen(false)
  }, [coreApp, updateCoreApp])

  const handleAddCategorySubscriber = useCallback(async () => {
    if (!category || !selectedNewSubscriber) return
    await addCategorySubscriber({
      id: category._id,
      userId: selectedNewSubscriber
    })
    setSelectedNewSubscriber('')
    setIsAddingSubscriber(false)
  }, [category, selectedNewSubscriber, addCategorySubscriber])

  const handleRemoveCategorySubscriber = useCallback(async (userId: Id<'users'>) => {
    if (!category) return
    await removeCategorySubscriber({
      id: category._id,
      userId
    })
  }, [category, removeCategorySubscriber])

  const handleSaveCategory = useCallback(async () => {
    if (!coreApp) return
    await updateCoreApp({
      id: coreApp._id,
      categoryId: selectedCategoryId || undefined
    })
    setIsEditingCategory(false)
  }, [coreApp, selectedCategoryId, updateCoreApp])

  const startEditingCategory = useCallback(() => {
    if (coreApp) {
      setSelectedCategoryId(coreApp.categoryId || '')
      setIsEditingCategory(true)
    }
  }, [coreApp])

  const startEditingOwner = useCallback(() => {
    if (coreApp) {
      setSelectedOwnerId(coreApp.ownerId || '')
      setIsEditingOwner(true)
    }
  }, [coreApp])

  const handleSaveOwner = useCallback(async () => {
    if (!coreApp) return
    await updateCoreApp({
      id: coreApp._id,
      ownerId: selectedOwnerId || undefined
    })
    setIsEditingOwner(false)
  }, [coreApp, selectedOwnerId, updateCoreApp])

  const startEditingBusinessRef = useCallback(() => {
    if (coreApp) {
      setSelectedBusinessRefId(coreApp.businessRefId || '')
      setIsEditingBusinessRef(true)
    }
  }, [coreApp])

  const handleSaveBusinessRef = useCallback(async () => {
    if (!coreApp) return
    await updateCoreApp({
      id: coreApp._id,
      businessRefId: selectedBusinessRefId || undefined
    })
    setIsEditingBusinessRef(false)
  }, [coreApp, selectedBusinessRefId, updateCoreApp])

  const startEditingPriority = useCallback(() => {
    if (coreApp) {
      setTempPriority(coreApp.priority ?? 0)
      setIsEditingPriority(true)
    }
  }, [coreApp])

  const handleSavePriority = useCallback(async () => {
    if (!coreApp) return
    const value = Math.max(0, Math.floor(tempPriority))
    await setPriority({ id: coreApp._id, priority: value })
    setIsEditingPriority(false)
  }, [coreApp, tempPriority, setPriority])

  const startEditingWeight = useCallback(() => {
    if (coreApp) {
      setTempWeight(coreApp.weight ?? 1)
      setIsEditingWeight(true)
    }
  }, [coreApp])

  const handleSaveWeight = useCallback(async () => {
    if (!coreApp) return
    const nextWeight = Math.max(1, Math.min(10, Math.floor(tempWeight)))
    await updateCoreApp({
      id: coreApp._id,
      weight: nextWeight
    })
    setIsEditingWeight(false)
  }, [coreApp, tempWeight, updateCoreApp])

  const startEditingName = useCallback(() => {
    if (coreApp) {
      setTempName(coreApp.name)
      setIsEditingName(true)
    }
  }, [coreApp])

  const handleSaveName = useCallback(async () => {
    if (!coreApp) return
    const nextName = tempName.trim()
    if (!nextName) return

    await updateCoreApp({
      id: coreApp._id,
      name: nextName
    })
    setIsEditingName(false)
  }, [coreApp, tempName, updateCoreApp])

  const handleDeleteCoreApp = useCallback(async () => {
    if (!coreApp) return
    if (!confirm("Sei sicuro di voler eliminare questa CoreApp? L'operazione non può essere annullata.")) return

    try {
      await removeCoreApp({ id: coreApp._id })
      navigate({ to: '/core-apps' })
    } catch (error) {
      alert(error instanceof Error ? error.message : "Errore durante l'eliminazione della CoreApp")
    }
  }, [coreApp, removeCoreApp, navigate])

  if (!coreApp) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Caricamento...</div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      {/* Header responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-6">
        <Link to="/core-apps" className="text-sm sm:text-base text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 whitespace-nowrap">
          ← Torna alla lista
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 min-w-0 flex-1">
          {isEditingName ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0 flex-1">
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                className="min-w-0 flex-1 px-3 py-1.5 text-xl sm:text-2xl font-bold border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName()
                  if (e.key === 'Escape') {
                    setTempName(coreApp.name)
                    setIsEditingName(false)
                  }
                }}
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveName}
                  disabled={!tempName.trim()}
                  className="px-3 py-1.5 text-xs sm:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
                >
                  Salva
                </button>
                <button
                  onClick={() => {
                    setTempName(coreApp.name)
                    setIsEditingName(false)
                  }}
                  className="px-3 py-1.5 text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 whitespace-nowrap"
                >
                  Annulla
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">{coreApp.name}</h1>
              <button
                onClick={startEditingName}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 whitespace-nowrap"
                title="Modifica nome"
                aria-label="Modifica nome"
              >
                ✏️
              </button>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={handleDeleteCoreApp}
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-300 dark:border-red-700 hover:border-red-400 dark:hover:border-red-600"
              title="Elimina CoreApp"
            >
              Elimina
            </button>
            {/* Link Note */}
            <Link
              to="/core-apps/$slug/notes"
              params={{ slug }}
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 hover:from-blue-700 hover:to-blue-800 dark:hover:from-blue-600 dark:hover:to-blue-700 shadow-md hover:shadow-lg text-white border border-blue-800 dark:border-blue-400"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span className="text-white">Note</span>
              {coreApp.notesCount !== undefined && coreApp.notesCount > 0 && (
                <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-white dark:bg-blue-800 text-blue-700 dark:text-white text-xs font-bold min-w-5 sm:min-w-6 flex items-center justify-center border border-blue-800 dark:border-blue-200">
                  {coreApp.notesCount}
                </span>
              )}
            </Link>
            <Link
              to="/core-apps/$slug/problems"
              params={{ slug }}
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-amber-600 to-amber-700 dark:from-amber-500 dark:to-amber-600 hover:from-amber-700 hover:to-amber-800 dark:hover:from-amber-600 dark:hover:to-amber-700 shadow-md hover:shadow-lg text-white border border-amber-800 dark:border-amber-300"
            >
              <span className="text-white">Problemi</span>
              {problemsData && problemsData.unresolvedCount > 0 && (
                <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-white dark:bg-amber-800 text-amber-700 dark:text-white text-xs font-bold min-w-5 sm:min-w-6 flex items-center justify-center border border-amber-800 dark:border-amber-200">
                  {problemsData.unresolvedCount}
                </span>
              )}
            </Link>
            <Link
              to="/core-apps/$slug/questions"
              params={{ slug }}
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-yellow-600 to-yellow-700 dark:from-yellow-500 dark:to-yellow-600 hover:from-yellow-700 hover:to-yellow-800 dark:hover:from-yellow-600 dark:hover:to-yellow-700 shadow-md hover:shadow-lg text-white border border-yellow-800 dark:border-yellow-300"
            >
              <span className="text-white">Questions</span>
              {questionsStatus && questionsStatus.total > 0 && (
                <span className="inline-flex items-center gap-1">
                  <span className="px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 text-[10px] sm:text-xs font-bold">
                    {questionsStatus.validated}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 text-[10px] sm:text-xs font-bold">
                    {Math.max(0, questionsStatus.total - questionsStatus.validated)}
                  </span>
                </span>
              )}
            </Link>
            {/* Status dropdown */}
            <div className="relative self-start sm:self-auto">
              <button
                onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                className={`px-3 py-1 rounded-full text-xs sm:text-sm ${statusColors[coreApp.status]} hover:opacity-80 transition-opacity cursor-pointer flex items-center gap-2 whitespace-nowrap`}
              >
                {statusLabels[coreApp.status]}
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isStatusDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsStatusDropdownOpen(false)}
                  />
                  <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 z-20 min-w-[180px]">
                    {(coreApp.status === 'Overdue'
                      ? (['Planning'] as Array<'Planning' | 'InProgress'>)
                      : (['Planning', 'InProgress'] as Array<'Planning' | 'InProgress'>)
                    ).map((status) => (
                      <button
                        key={status}
                        onClick={() => handleStatusChange(status)}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg ${
                          coreApp.status === status
                            ? `${statusColors[status]} font-medium`
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {statusLabels[status]}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Layout responsive: singola colonna su mobile, due colonne su desktop */}
      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="w-full lg:col-span-2 space-y-4 sm:space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Informazioni</h2>
            <div className="mb-4">
              {isEditingDescription ? (
                <div className="space-y-2">
                  <textarea
                    value={tempDescription}
                    onChange={(e) => setTempDescription(e.target.value)}
                    placeholder="Descrizione dell'applicazione..."
                    rows={4}
                    className="w-full px-3 py-2 text-sm border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setIsEditingDescription(false)
                      }
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveDescription}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 whitespace-nowrap"
                    >
                      Salva
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingDescription(false)
                      }}
                      className="px-3 py-1 text-sm bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-400 dark:hover:bg-gray-500 whitespace-nowrap"
                    >
                      Annulla
                    </button>
                  </div>
                </div>
              ) : (
                <div className="wrap-break-word">
                  {currentDescription ? (
                    <div className="flex items-start gap-2">
                      <p className="text-gray-600 dark:text-gray-400 flex-1 min-w-0">{currentDescription}</p>
                      <button
                        onClick={startEditingDescription}
                        className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 shrink-0"
                        title="Modifica descrizione"
                      >
                        ✏️
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={startEditingDescription}
                      className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 text-sm underline"
                    >
                      + Aggiungi descrizione
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Repository GitHub</h3>
              {isEditingRepoUrl ? (
                <div className="space-y-2">
                  <input
                    type="url"
                    value={tempRepoUrl}
                    onChange={(e) => setTempRepoUrl(e.target.value)}
                    placeholder="https://github.com/..."
                    className="w-full px-3 py-2 text-sm border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveRepoUrl()
                      } else if (e.key === 'Escape') {
                        setTempRepoUrl(coreApp.repoUrl || '')
                        setIsEditingRepoUrl(false)
                      }
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveRepoUrl}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 whitespace-nowrap"
                    >
                      Salva
                    </button>
                    <button
                      onClick={() => {
                        setTempRepoUrl(coreApp.repoUrl || '')
                        setIsEditingRepoUrl(false)
                      }}
                      className="px-3 py-1 text-sm bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-400 dark:hover:bg-gray-500 whitespace-nowrap"
                    >
                      Annulla
                    </button>
                  </div>
                </div>
              ) : (
                <div className="wrap-break-word">
                  {currentRepoUrl ? (
                    <div className="flex items-start gap-2">
                      <a
                        href={currentRepoHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm break-all flex-1 min-w-0"
                      >
                        {currentRepoUrl}
                      </a>
                      <button
                        onClick={startEditingRepoUrl}
                        className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 shrink-0"
                        title="Modifica repository"
                      >
                        ✏️
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={startEditingRepoUrl}
                      className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 text-sm underline"
                    >
                      + Aggiungi repository
                    </button>
                  )}
                </div>
              )}
            </div>
            
            {/* Owner - editabile come in KeyDevDetail */}
            <div className="mt-4 pt-4 border-t dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase">Owner</h3>
                {!isEditingOwner && (
                  <button
                    onClick={startEditingOwner}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    Modifica
                  </button>
                )}
              </div>
              {isEditingOwner ? (
                <div className="space-y-2">
                  <select
                    value={selectedOwnerId}
                    onChange={(e) => setSelectedOwnerId(e.target.value as Id<'users'> | '')}
                    className="w-full px-3 py-2 text-sm border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Nessun owner</option>
                    {users?.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveOwner}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 whitespace-nowrap"
                    >
                      Salva
                    </button>
                    <button
                      onClick={() => {
                        setSelectedOwnerId(coreApp.ownerId || '')
                        setIsEditingOwner(false)
                      }}
                      className="px-3 py-1 text-sm bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-400 dark:hover:bg-gray-500 whitespace-nowrap"
                    >
                      Annulla
                    </button>
                  </div>
                </div>
              ) : owner ? (
                <div className="flex items-center gap-2">
                  {(owner.pictureUrl ?? owner.picture) && (
                    <img 
                      src={owner.pictureUrl ?? owner.picture} 
                      alt={owner.name} 
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <p className="text-gray-900 dark:text-gray-100 font-medium">{owner.name}</p>
                    {owner.email && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">{owner.email}</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">Nessun owner assegnato</p>
              )}
            </div>

            {/* Referente Business */}
            <div className="mt-4 pt-4 border-t dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase">Referente Business</h3>
                {!isEditingBusinessRef && (
                  <button
                    onClick={startEditingBusinessRef}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    Modifica
                  </button>
                )}
              </div>
              {isEditingBusinessRef ? (
                <div className="space-y-2">
                  <select
                    value={selectedBusinessRefId}
                    onChange={(e) => setSelectedBusinessRefId(e.target.value as Id<'users'> | '')}
                    className="w-full px-3 py-2 text-sm border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Nessun referente</option>
                    {users?.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveBusinessRef}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 whitespace-nowrap"
                    >
                      Salva
                    </button>
                    <button
                      onClick={() => {
                        setSelectedBusinessRefId(coreApp.businessRefId || '')
                        setIsEditingBusinessRef(false)
                      }}
                      className="px-3 py-1 text-sm bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-400 dark:hover:bg-gray-500 whitespace-nowrap"
                    >
                      Annulla
                    </button>
                  </div>
                </div>
              ) : businessRef ? (
                <div className="flex items-center gap-2">
                  {(businessRef.pictureUrl ?? businessRef.picture) && (
                    <img 
                      src={businessRef.pictureUrl ?? businessRef.picture} 
                      alt={businessRef.name} 
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <p className="text-gray-900 dark:text-gray-100 font-medium">{businessRef.name}</p>
                    {businessRef.email && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">{businessRef.email}</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">Nessun referente assegnato</p>
              )}
            </div>
            
            {/* Categoria */}
            <div className="mt-4 pt-4 border-t dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase">Categoria</h3>
                {!isEditingCategory && (
                  <button
                    onClick={startEditingCategory}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    Modifica
                  </button>
                )}
              </div>
              
              {isEditingCategory ? (
                <div className="space-y-2">
                  <select
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value as Id<'coreAppsCategories'> | '')}
                    className="w-full px-3 py-2 text-sm border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Nessuna categoria</option>
                    {categories?.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveCategory}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Salva
                    </button>
                    <button
                      onClick={() => setIsEditingCategory(false)}
                      className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                    >
                      Annulla
                    </button>
                  </div>
                </div>
              ) : category ? (
                <div>
                  <span className="inline-block px-3 py-1 text-sm rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                    {category.name}
                  </span>
                  {category.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{category.description}</p>
                  )}
                  
                  {/* Iscritti alla categoria */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                        Iscritti alla categoria ({categorySubscribers.length})
                      </h4>
                      {!isAddingSubscriber && users && users.length > categorySubscribers.length && (
                        <button
                          onClick={() => setIsAddingSubscriber(true)}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                          + Aggiungi
                        </button>
                      )}
                    </div>
                    
                    {isAddingSubscriber && (
                      <div className="flex gap-2 mb-3">
                        <select
                          value={selectedNewSubscriber}
                          onChange={(e) => setSelectedNewSubscriber(e.target.value as Id<'users'> | '')}
                          className="flex-1 px-3 py-2 text-sm border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        >
                          <option value="">Seleziona utente...</option>
                          {users?.filter(u => !category.subscriberIds?.includes(u._id)).map((user) => (
                            <option key={user._id} value={user._id}>
                              {user.name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={handleAddCategorySubscriber}
                          disabled={!selectedNewSubscriber}
                          className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                          Aggiungi
                        </button>
                        <button
                          onClick={() => {
                            setIsAddingSubscriber(false)
                            setSelectedNewSubscriber('')
                          }}
                          className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                        >
                          Annulla
                        </button>
                      </div>
                    )}
                    
                    {categorySubscribers.length > 0 ? (
                      <div className="space-y-2">
                        {categorySubscribers.map((subscriber) => (
                          <div key={subscriber._id} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {(subscriber.pictureUrl ?? subscriber.picture) && (
                                <img 
                                  src={subscriber.pictureUrl ?? subscriber.picture} 
                                  alt={subscriber.name} 
                                  className="w-6 h-6 rounded-full object-cover"
                                />
                              )}
                              <span className="text-gray-900 dark:text-gray-100 text-sm">{subscriber.name}</span>
                            </div>
                            <button
                              onClick={() => handleRemoveCategorySubscriber(subscriber._id)}
                              className="text-red-500 hover:text-red-700 dark:hover:text-red-400 text-xs"
                              title="Rimuovi iscritto dalla categoria"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400 text-xs">Nessun iscritto alla categoria</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">Nessuna categoria assegnata</p>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                Aggiornamenti Settimanali
              </h2>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                <select
                  value={selectedMonth || ''}
                  onChange={(e) => setSelectedMonth(e.target.value || null)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Tutti i mesi</option>
                  {monthOptions.map((monthRef) => (
                    <option key={monthRef} value={monthRef}>
                      {monthRef}
                    </option>
                  ))}
                </select>
                <Link
                  to="/core-apps/$slug/updates/new"
                  params={{ slug }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm inline-block text-center whitespace-nowrap"
                >
                  + Nuovo Aggiornamento
                </Link>
              </div>
            </div>

            {updates && updates.length > 0 ? (
              <div className="space-y-4">
                {updates.map((update) => (
                  <div
                    key={update._id}
                    onClick={() => openViewDialog(update)}
                    className="border dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                          <h3 className="font-medium text-gray-900 dark:text-gray-100 wrap-break-word">
                            {update.title || `Settimana ${update.weekRef}`}
                          </h3>
                          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded whitespace-nowrap">
                            {update.weekRef}
                          </span>
                        </div>
                        {update.notes && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 wrap-break-word">
                            {update.notes}
                          </p>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 sm:ml-4 whitespace-nowrap">
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

        <div className="w-full lg:w-auto space-y-4 sm:space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
            <MilestonesSection
              coreAppId={coreApp._id}
              milestonesData={milestonesData ?? undefined}
              showProgress={true}
              initialPercentComplete={coreApp.percentComplete}
            />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-4">Riepilogo</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Peso (1-10)</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100">
                  {isEditingWeight ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={10}
                        step={1}
                        value={tempWeight}
                        onChange={(e) => setTempWeight(Number(e.target.value))}
                        className="w-20 px-2 py-1 text-sm border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveWeight()
                          if (e.key === 'Escape') setIsEditingWeight(false)
                        }}
                      />
                      <button
                        onClick={handleSaveWeight}
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Salva
                      </button>
                      <button
                        onClick={() => setIsEditingWeight(false)}
                        className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                      >
                        Annulla
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={startEditingWeight}
                      className="hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded transition-colors cursor-pointer text-left"
                      title="Clicca per modificare"
                    >
                      {coreApp.weight ?? 1}
                    </button>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Priorità</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100">
                  {isEditingPriority ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        value={tempPriority}
                        onChange={(e) => setTempPriority(Number(e.target.value))}
                        className="w-20 px-2 py-1 text-sm border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSavePriority()
                          if (e.key === 'Escape') setIsEditingPriority(false)
                        }}
                      />
                      <button
                        onClick={handleSavePriority}
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Salva
                      </button>
                      <button
                        onClick={() => setIsEditingPriority(false)}
                        className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                      >
                        Annulla
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={startEditingPriority}
                      className="hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded transition-colors cursor-pointer text-left"
                      title="Clicca per modificare"
                    >
                      {coreApp.priority ?? '-'}
                    </button>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Totale Aggiornamenti</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100">{updates?.length || 0}</dd>
              </div>
              {updates && updates.length > 0 && (
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Ultimo Aggiornamento</dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-100 wrap-break-word">{updates[0].weekRef}</dd>
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
          weekRef: selectedUpdate.weekRef,
          monthRef: selectedUpdate.monthRef || ''
        } : undefined}
        isEditing={true}
      />
    </div>
  )
}
