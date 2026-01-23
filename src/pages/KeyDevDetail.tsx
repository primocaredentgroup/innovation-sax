import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState, useMemo } from 'react'
import type { Id } from '../../convex/_generated/dataModel'

// Tipo per i ruoli
type Role = 'Requester' | 'BusinessValidator' | 'TechValidator' | 'Admin'

// Helper per verificare ruoli
const hasRole = (roles: Role[] | undefined, role: Role): boolean => {
  if (!roles) return false
  return roles.includes(role)
}

const isAdmin = (roles: Role[] | undefined): boolean => hasRole(roles, 'Admin')

const statusColors: Record<string, string> = {
  Draft: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
  MockupDone: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
  Approved: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
  Rejected: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
  FrontValidated: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
  InProgress: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
  Done: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300'
}

const statusLabels: Record<string, string> = {
  Draft: 'Bozza',
  MockupDone: 'Mockup Terminato',
  Approved: 'Approvato',
  Rejected: 'Rifiutato',
  FrontValidated: 'Front Validato',
  InProgress: 'In Corso',
  Done: 'Completato'
}

// Descrizioni del flusso per ogni stato
const statusDescriptions: Record<string, string> = {
  Draft: 'Crea o aggiungi il mockupRepoUrl per passare a "Mockup Terminato"',
  MockupDone: 'In attesa di approvazione da parte di un TechValidator',
  Approved: 'In attesa di validazione frontend da parte del BusinessValidator del dipartimento',
  Rejected: 'Rifiutato dal TechValidator - vedere motivo',
  FrontValidated: 'In attesa che un TechValidator prenda in carico lo sviluppo',
  InProgress: 'In sviluppo - l\'owner può dichiararlo completato',
  Done: 'Completato'
}

export default function KeyDevDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string }
  const navigate = useNavigate()
  const isNew = id === 'new'

  // Usa getByReadableId se l'id è un readableId (formato KD-XXX), altrimenti usa getById per retrocompatibilità
  const isReadableId = /^KD-\d+$/.test(id)
  const keydev = useQuery(
    isReadableId ? api.keydevs.getByReadableId : api.keydevs.getById,
    isNew ? 'skip' : (isReadableId ? { readableId: id } : { id: id as Id<'keydevs'> })
  )
  const departments = useQuery(api.departments.list)
  const categories = useQuery(api.categories.list)
  const users = useQuery(api.users.listUsers)
  const currentUser = useQuery(api.users.getCurrentUser)
  const notes = useQuery(
    api.notes.listByKeyDev,
    isNew || !keydev ? 'skip' : { keyDevId: keydev._id }
  )
  const blockingLabels = useQuery(
    api.blockingLabels.listByKeyDev,
    isNew || !keydev ? 'skip' : { keyDevId: keydev._id }
  )

  const createKeyDev = useMutation(api.keydevs.create)
  const updateKeyDev = useMutation(api.keydevs.update)
  const updateStatus = useMutation(api.keydevs.updateStatus)
  const takeOwnership = useMutation(api.keydevs.takeOwnership)
  const markAsDone = useMutation(api.keydevs.markAsDone)
  const createMockupRepo = useMutation(api.github.createMockupRepo)
  const addNote = useMutation(api.notes.create)

  const currentMonth = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }, [])

  const [newNote, setNewNote] = useState('')
  const [noteType, setNoteType] = useState<'Comment' | 'Task' | 'Improvement'>('Comment')
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)

  // Use keydev data or defaults for form - key resets the form when keydev changes
  const formKey = keydev?._id || 'new'

  // Ruoli e permessi utente corrente
  const userRoles = currentUser?.roles as Role[] | undefined
  const userIsAdmin = isAdmin(userRoles)
  const userIsTechValidator = hasRole(userRoles, 'TechValidator')
  const userIsBusinessValidator = hasRole(userRoles, 'BusinessValidator')
  
  // Verifica se l'utente è il BusinessValidator del dipartimento del keydev
  const isBusinessValidatorOfDept = userIsBusinessValidator && currentUser?.deptId === keydev?.deptId
  
  // Verifica se l'utente è l'owner
  const isOwner = keydev?.ownerId === currentUser?._id

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const title = formData.get('title') as string
    const desc = formData.get('desc') as string
    const monthRefValue = formData.get('monthRef') as string
    const monthRef = monthRefValue && monthRefValue.trim() !== '' ? monthRefValue : undefined
    const categoryId = formData.get('categoryId') as string
    const deptId = formData.get('deptId') as string

    if (isNew) {
      const result = await createKeyDev({
        title,
        desc,
        monthRef,
        categoryId: categoryId as Id<'categories'>,
        deptId: deptId as Id<'departments'>
      })
      navigate({ to: '/keydevs/$id', params: { id: result.readableId } })
    } else {
      if (!keydev) return
      await updateKeyDev({
        id: keydev._id,
        title,
        desc
      })
    }
  }

  const handleCreateMockupRepo = async () => {
    if (!keydev) return
    await createMockupRepo({ keyDevId: keydev._id })
  }

  const handleAddNote = async () => {
    if (!newNote.trim() || isNew || !keydev) return
    await addNote({
      keyDevId: keydev._id,
      body: newNote,
      type: noteType
    })
    setNewNote('')
  }

  // Handler per rifiutare con motivo
  const handleReject = async () => {
    if (!keydev || !rejectionReason.trim()) return
    await updateStatus({ 
      id: keydev._id, 
      status: 'Rejected', 
      rejectionReason: rejectionReason.trim() 
    })
    setShowRejectForm(false)
    setRejectionReason('')
  }

  // Handler per prendere in carico
  const handleTakeOwnership = async () => {
    if (!keydev) return
    await takeOwnership({ id: keydev._id })
  }

  // Handler per dichiarare completato
  const handleMarkAsDone = async () => {
    if (!keydev) return
    await markAsDone({ id: keydev._id })
  }

  if (!isNew && !keydev) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Caricamento...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link
          to="/keydevs"
          search={{ month: keydev?.monthRef || currentMonth }}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
        >
          ← Torna alla lista
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {isNew ? 'Nuovo KeyDev' : keydev?.title}
        </h1>
        {!isNew && keydev && (
          <>
            <span className="px-3 py-1 rounded-md text-sm font-mono bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
              {keydev.readableId}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm ${statusColors[keydev.status]}`}>
              {statusLabels[keydev.status]}
            </span>
          </>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="col-span-2 space-y-6">
          <form key={formKey} onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Dettagli</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Titolo</label>
                <input
                  type="text"
                  name="title"
                  defaultValue={keydev?.title || ''}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrizione</label>
                <textarea
                  name="desc"
                  defaultValue={keydev?.desc || ''}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  required
                />
              </div>

              {isNew && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Mese <span className="text-gray-400 dark:text-gray-500 text-xs">(opzionale per bozze)</span>
                    </label>
                    <input
                      type="month"
                      name="monthRef"
                      defaultValue=""
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dipartimento</label>
                    <select
                      name="deptId"
                      defaultValue=""
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                      required
                    >
                      <option value="">Seleziona...</option>
                      {departments?.map((d) => (
                        <option key={d._id} value={d._id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoria</label>
                    <select
                      name="categoryId"
                      defaultValue=""
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                      required
                    >
                      <option value="">Seleziona...</option>
                      {categories?.map((c) => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
                >
                  {isNew ? 'Crea KeyDev' : 'Salva Modifiche'}
                </button>
              </div>
            </div>
          </form>

          {/* Stato e Flusso */}
          {!isNew && keydev && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                Stato e Flusso
              </h2>

              {/* Descrizione stato corrente */}
              <div className={`p-4 rounded-lg mb-4 ${
                keydev.status === 'Rejected' 
                  ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' 
                  : keydev.status === 'Done'
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
              }`}>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {statusDescriptions[keydev.status]}
                </p>
                
                {/* Mostra motivo rifiuto */}
                {keydev.status === 'Rejected' && keydev.rejectionReason && (
                  <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/30 rounded">
                    <p className="text-sm font-medium text-red-800 dark:text-red-300">Motivo del rifiuto:</p>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">{keydev.rejectionReason}</p>
                    {keydev.rejectedById && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                        Rifiutato da: {users?.find((u) => u._id === keydev.rejectedById)?.name || 'N/A'}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Azioni disponibili in base allo stato */}
              <div className="space-y-4">
                {/* Draft: Mostra creazione mockup repo */}
                {keydev.status === 'Draft' && !keydev.mockupRepoUrl && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Crea il repository del mockup React-TypeScript per questo KeyDev.
                    </p>
                    <button
                      onClick={handleCreateMockupRepo}
                      className="px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded-md hover:bg-gray-800 dark:hover:bg-gray-600"
                    >
                      Crea Mockup Repository
                    </button>
                  </div>
                )}

                {/* MockupDone: TechValidator può approvare o rifiutare */}
                {keydev.status === 'MockupDone' && (userIsTechValidator || userIsAdmin) && (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-4">
                      Come TechValidator, puoi approvare o rifiutare questo mockup dopo aver verificato la logica e il processo.
                    </p>
                    
                    {!showRejectForm ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateStatus({ id: keydev._id, status: 'Approved' })}
                          className="px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-md hover:bg-green-700 dark:hover:bg-green-600"
                        >
                          Approva Mockup
                        </button>
                        <button
                          onClick={() => setShowRejectForm(true)}
                          className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-600"
                        >
                          Rifiuta
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Inserisci il motivo del rifiuto (domande sulla logica, processo, ecc.)..."
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-gray-100"
                          required
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleReject}
                            disabled={!rejectionReason.trim()}
                            className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50"
                          >
                            Conferma Rifiuto
                          </button>
                          <button
                            onClick={() => {
                              setShowRejectForm(false)
                              setRejectionReason('')
                            }}
                            className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
                          >
                            Annulla
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Approved: BusinessValidator del dipartimento può validare */}
                {keydev.status === 'Approved' && (isBusinessValidatorOfDept || userIsAdmin) && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-sm text-green-800 dark:text-green-300 mb-4">
                      Come BusinessValidator del dipartimento, puoi validare il frontend.
                    </p>
                    <button
                      onClick={() => updateStatus({ id: keydev._id, status: 'FrontValidated' })}
                      className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
                    >
                      Valida Frontend
                    </button>
                  </div>
                )}

                {/* FrontValidated: TechValidator può prendere in carico */}
                {keydev.status === 'FrontValidated' && (userIsTechValidator || userIsAdmin) && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-300 mb-4">
                      Come TechValidator, puoi prendere in carico questo KeyDev e iniziare lo sviluppo.
                    </p>
                    <button
                      onClick={handleTakeOwnership}
                      className="px-4 py-2 bg-purple-600 dark:bg-purple-700 text-white rounded-md hover:bg-purple-700 dark:hover:bg-purple-600"
                    >
                      Prendi in Carico e Inizia Sviluppo
                    </button>
                  </div>
                )}

                {/* InProgress: Solo owner può dichiarare completato */}
                {keydev.status === 'InProgress' && (isOwner || userIsAdmin) && (
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                    <p className="text-sm text-purple-800 dark:text-purple-300 mb-4">
                      {isOwner ? 'Sei l\'owner di questo KeyDev. ' : ''}
                      Puoi dichiararlo completato quando lo sviluppo è terminato.
                    </p>
                    <button
                      onClick={handleMarkAsDone}
                      className="px-4 py-2 bg-emerald-600 dark:bg-emerald-700 text-white rounded-md hover:bg-emerald-700 dark:hover:bg-emerald-600"
                    >
                      Dichiara Completato
                    </button>
                  </div>
                )}

                {/* Done: Messaggio di completamento */}
                {keydev.status === 'Done' && (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                    <p className="text-sm text-emerald-800 dark:text-emerald-300">
                      Questo KeyDev è stato completato con successo!
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* GitHub Section */}
          {!isNew && keydev && keydev.mockupRepoUrl && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                GitHub - Mockup Repository
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Repository URL
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={keydev.mockupRepoUrl}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono text-sm"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(keydev.mockupRepoUrl || '')
                      }}
                      className="px-4 py-2 bg-gray-600 dark:bg-gray-700 text-white rounded-md hover:bg-gray-700 dark:hover:bg-gray-600 text-sm"
                      title="Copia URL"
                    >
                      Copia
                    </button>
                    <a
                      href={keydev.mockupRepoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 text-sm"
                      title="Apri in nuova scheda"
                    >
                      Apri
                    </a>
                  </div>
                </div>

                {keydev.mockupTag && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tag
                    </label>
                    <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded text-gray-800 dark:text-gray-200">
                      {keydev.mockupTag}
                    </span>
                  </div>
                )}

                {keydev.prNumber && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <span className="font-medium text-gray-900 dark:text-gray-100">PR #{keydev.prNumber}</span>
                      <span className={`px-2 py-1 text-xs rounded ${
                        keydev.prMerged
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                          : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                      }`}>
                        {keydev.prMerged ? 'Merged' : 'In Review'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {!isNew && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Note</h2>

              <div className="space-y-4">
                {notes?.map((note) => (
                  <div key={note._id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 text-xs rounded ${
                        note.type === 'Comment' ? 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200' :
                        note.type === 'Task' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                        'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                      }`}>
                        {note.type}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {users?.find((u) => u._id === note.authorId)?.name || 'Utente'}
                      </span>
                      <span className="text-sm text-gray-400 dark:text-gray-500">
                        {new Date(note.ts).toLocaleString('it-IT')}
                      </span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">{note.body}</p>
                  </div>
                ))}

                <div className="border-t dark:border-gray-700 pt-4">
                  <div className="flex gap-2 mb-2">
                    <select
                      value={noteType}
                      onChange={(e) => setNoteType(e.target.value as typeof noteType)}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-100"
                    >
                      <option value="Comment">Commento</option>
                      <option value="Task">Task</option>
                      <option value="Improvement">Miglioramento</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Aggiungi una nota..."
                      rows={2}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-100"
                    />
                    <button
                      onClick={handleAddNote}
                      disabled={!newNote.trim()}
                      className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
                    >
                      Aggiungi
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        {!isNew && keydev && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-4">Informazioni</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Mese</dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-100">
                    {keydev.monthRef || (
                      <span className="text-gray-400 dark:text-gray-500 italic">Nessun mese (Bozza)</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Dipartimento</dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-100">
                    {departments?.find((d) => d._id === keydev.deptId)?.name || 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Categoria</dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-100">
                    {categories?.find((c) => c._id === keydev.categoryId)?.name || 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Requester</dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-100">
                    {users?.find((u) => u._id === keydev.requesterId)?.name || 'N/A'}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Attori del Flusso */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-4">Attori del Flusso</h3>
              <dl className="space-y-3">
                {keydev.techValidatorId && (
                  <div>
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Approvato da (TechValidator)</dt>
                    <dd className="font-medium text-gray-900 dark:text-gray-100">
                      {users?.find((u) => u._id === keydev.techValidatorId)?.name || 'N/A'}
                    </dd>
                    {keydev.approvedAt && (
                      <dd className="text-xs text-gray-400 dark:text-gray-500">
                        {new Date(keydev.approvedAt).toLocaleDateString('it-IT')}
                      </dd>
                    )}
                  </div>
                )}
                {keydev.businessValidatorId && (
                  <div>
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Validato da (BusinessValidator)</dt>
                    <dd className="font-medium text-gray-900 dark:text-gray-100">
                      {users?.find((u) => u._id === keydev.businessValidatorId)?.name || 'N/A'}
                    </dd>
                    {keydev.frontValidatedAt && (
                      <dd className="text-xs text-gray-400 dark:text-gray-500">
                        {new Date(keydev.frontValidatedAt).toLocaleDateString('it-IT')}
                      </dd>
                    )}
                  </div>
                )}
                {keydev.ownerId && (
                  <div>
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Owner (Sviluppatore)</dt>
                    <dd className="font-medium text-purple-700 dark:text-purple-400">
                      {users?.find((u) => u._id === keydev.ownerId)?.name || 'N/A'}
                    </dd>
                  </div>
                )}
                {keydev.releasedAt && (
                  <div>
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Completato il</dt>
                    <dd className="font-medium text-emerald-700 dark:text-emerald-400">
                      {new Date(keydev.releasedAt).toLocaleDateString('it-IT')}
                    </dd>
                  </div>
                )}
                {!keydev.techValidatorId && !keydev.businessValidatorId && !keydev.ownerId && (
                  <p className="text-sm text-gray-400 dark:text-gray-500 italic">Nessun attore ancora coinvolto</p>
                )}
              </dl>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-4">Label Bloccanti</h3>
              {blockingLabels && blockingLabels.length > 0 ? (
                <div className="space-y-2">
                  {blockingLabels.map((bl) => (
                    <div
                      key={bl._id}
                      className={`flex items-center justify-between px-3 py-2 rounded ${
                        bl.status === 'Open' ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' : 'bg-gray-50 dark:bg-gray-700/50'
                      }`}
                    >
                      <span className={bl.status === 'Closed' ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}>
                        {bl.label}
                      </span>
                      <span className={`text-xs ${bl.status === 'Open' ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}`}>
                        {bl.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">Nessuna label bloccante</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
