import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState, useMemo } from 'react'
import type { Id } from '../../convex/_generated/dataModel'

const statusColors: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-800',
  PendingBusinessApproval: 'bg-yellow-100 text-yellow-800',
  Approved: 'bg-green-100 text-green-800',
  Rejected: 'bg-red-100 text-red-800',
  FrontValidated: 'bg-blue-100 text-blue-800',
  InProgress: 'bg-purple-100 text-purple-800',
  Done: 'bg-emerald-100 text-emerald-800'
}

const statusLabels: Record<string, string> = {
  Draft: 'Bozza',
  PendingBusinessApproval: 'In Attesa Approvazione',
  Approved: 'Approvato',
  Rejected: 'Rifiutato',
  FrontValidated: 'Front Validato',
  InProgress: 'In Corso',
  Done: 'Completato'
}

export default function KeyDevDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string }
  const navigate = useNavigate()
  const isNew = id === 'new'

  const keydev = useQuery(
    api.keydevs.getById,
    isNew ? 'skip' : { id: id as Id<'keydevs'> }
  )
  const departments = useQuery(api.departments.list)
  const categories = useQuery(api.categories.list)
  const users = useQuery(api.users.listUsers)
  const currentUser = useQuery(api.users.getCurrentUser)
  const notes = useQuery(
    api.notes.listByKeyDev,
    isNew ? 'skip' : { keyDevId: id as Id<'keydevs'> }
  )
  const blockingLabels = useQuery(
    api.blockingLabels.listByKeyDev,
    isNew ? 'skip' : { keyDevId: id as Id<'keydevs'> }
  )

  const createKeyDev = useMutation(api.keydevs.create)
  const updateKeyDev = useMutation(api.keydevs.update)
  const updateStatus = useMutation(api.keydevs.updateStatus)
  const createMockupRepo = useMutation(api.github.createMockupRepo)
  const addNote = useMutation(api.notes.create)

  const currentMonth = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }, [])

  const [newNote, setNewNote] = useState('')
  const [noteType, setNoteType] = useState<'Comment' | 'Task' | 'Improvement'>('Comment')

  // Use keydev data or defaults for form - key resets the form when keydev changes
  const formKey = keydev?._id || 'new'

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const title = formData.get('title') as string
    const desc = formData.get('desc') as string
    const monthRef = formData.get('monthRef') as string
    const categoryId = formData.get('categoryId') as string
    const deptId = formData.get('deptId') as string

    if (isNew) {
      const newId = await createKeyDev({
        title,
        desc,
        monthRef,
        categoryId: categoryId as Id<'categories'>,
        deptId: deptId as Id<'departments'>
      })
      navigate({ to: '/keydevs/$id', params: { id: newId } })
    } else {
      await updateKeyDev({
        id: id as Id<'keydevs'>,
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
    if (!newNote.trim() || isNew) return
    await addNote({
      keyDevId: id as Id<'keydevs'>,
      body: newNote,
      type: noteType
    })
    setNewNote('')
  }

  const canApprove = currentUser?.role === 'BusinessValidator' || currentUser?.role === 'Admin'
  const canValidateFront = currentUser?.role === 'TechValidator' || currentUser?.role === 'Admin'

  if (!isNew && !keydev) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Caricamento...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link
          to="/keydevs"
          search={{ month: keydev?.monthRef || currentMonth }}
          className="text-gray-500 hover:text-gray-700"
        >
          ← Torna alla lista
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {isNew ? 'Nuovo KeyDev' : keydev?.title}
        </h1>
        {!isNew && keydev && (
          <span className={`px-3 py-1 rounded-full text-sm ${statusColors[keydev.status]}`}>
            {statusLabels[keydev.status]}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="col-span-2 space-y-6">
          <form key={formKey} onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Dettagli</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titolo</label>
                <input
                  type="text"
                  name="title"
                  defaultValue={keydev?.title || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
                <textarea
                  name="desc"
                  defaultValue={keydev?.desc || ''}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {isNew && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mese</label>
                    <input
                      type="month"
                      name="monthRef"
                      defaultValue={currentMonth}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dipartimento</label>
                    <select
                      name="deptId"
                      defaultValue=""
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Seleziona...</option>
                      {departments?.map((d) => (
                        <option key={d._id} value={d._id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                    <select
                      name="categoryId"
                      defaultValue=""
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {isNew ? 'Crea KeyDev' : 'Salva Modifiche'}
                </button>
              </div>
            </div>
          </form>

          {/* GitHub Section */}
          {!isNew && keydev && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                GitHub - Mockup Repository
              </h2>

              {keydev.mockupRepoUrl ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <a
                      href={keydev.mockupRepoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      {keydev.mockupRepoUrl}
                    </a>
                    {keydev.mockupTag && (
                      <span className="px-2 py-1 text-xs bg-gray-100 rounded">
                        {keydev.mockupTag}
                      </span>
                    )}
                  </div>

                  {keydev.prNumber && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">PR #{keydev.prNumber}</span>
                          <span className={`ml-2 px-2 py-1 text-xs rounded ${
                            keydev.prMerged
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {keydev.prMerged ? 'Merged' : 'In Review'}
                          </span>
                        </div>

                        {!keydev.prMerged && canApprove && (
                          <button
                            onClick={() => updateStatus({ id: keydev._id, status: 'Approved' })}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                          >
                            Approva e Merge
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {keydev.status === 'Draft' && (
                      <button
                        onClick={() => updateStatus({ id: keydev._id, status: 'PendingBusinessApproval' })}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
                      >
                        Richiedi Approvazione Business
                      </button>
                    )}

                    {keydev.status === 'Approved' && canValidateFront && (
                      <button
                        onClick={() => updateStatus({ id: keydev._id, status: 'FrontValidated' })}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Valida Frontend
                      </button>
                    )}

                    {keydev.status === 'FrontValidated' && (
                      <button
                        onClick={() => updateStatus({ id: keydev._id, status: 'InProgress' })}
                        className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                      >
                        Inizia Sviluppo
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-gray-600 mb-4">
                    Crea il repository del mockup React-TypeScript per questo KeyDev.
                  </p>
                  <button
                    onClick={handleCreateMockupRepo}
                    className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800"
                  >
                    Crea Mockup Repository
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {!isNew && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Note</h2>

              <div className="space-y-4">
                {notes?.map((note) => (
                  <div key={note._id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 text-xs rounded ${
                        note.type === 'Comment' ? 'bg-gray-200' :
                        note.type === 'Task' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {note.type}
                      </span>
                      <span className="text-sm text-gray-500">
                        {users?.find((u) => u._id === note.authorId)?.name || 'Utente'}
                      </span>
                      <span className="text-sm text-gray-400">
                        {new Date(note.ts).toLocaleString('it-IT')}
                      </span>
                    </div>
                    <p className="text-gray-700">{note.body}</p>
                  </div>
                ))}

                <div className="border-t pt-4">
                  <div className="flex gap-2 mb-2">
                    <select
                      value={noteType}
                      onChange={(e) => setNoteType(e.target.value as typeof noteType)}
                      className="px-3 py-2 border border-gray-300 rounded-md"
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
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <button
                      onClick={handleAddNote}
                      disabled={!newNote.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
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
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Informazioni</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-gray-500">Mese</dt>
                  <dd className="font-medium">{keydev.monthRef}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Dipartimento</dt>
                  <dd className="font-medium">
                    {departments?.find((d) => d._id === keydev.deptId)?.name || 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Categoria</dt>
                  <dd className="font-medium">
                    {categories?.find((c) => c._id === keydev.categoryId)?.name || 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Requester</dt>
                  <dd className="font-medium">
                    {users?.find((u) => u._id === keydev.requesterId)?.name || 'N/A'}
                  </dd>
                </div>
                {keydev.approvedAt && (
                  <div>
                    <dt className="text-sm text-gray-500">Approvato il</dt>
                    <dd className="font-medium">
                      {new Date(keydev.approvedAt).toLocaleDateString('it-IT')}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Label Bloccanti</h3>
              {blockingLabels && blockingLabels.length > 0 ? (
                <div className="space-y-2">
                  {blockingLabels.map((bl) => (
                    <div
                      key={bl._id}
                      className={`flex items-center justify-between px-3 py-2 rounded ${
                        bl.status === 'Open' ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
                      }`}
                    >
                      <span className={bl.status === 'Closed' ? 'line-through text-gray-400' : ''}>
                        {bl.label}
                      </span>
                      <span className={`text-xs ${bl.status === 'Open' ? 'text-red-600' : 'text-gray-400'}`}>
                        {bl.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Nessuna label bloccante</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
