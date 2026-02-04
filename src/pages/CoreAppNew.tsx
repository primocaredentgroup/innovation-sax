import { Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState, useEffect } from 'react'
import type { Id } from '../../convex/_generated/dataModel'

export default function CoreAppNewPage() {
  const navigate = useNavigate()
  const createCoreApp = useMutation(api.coreApps.create)
  const users = useQuery(api.users.listUsers)
  const categories = useQuery(api.coreAppsCategories.list)

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [repoUrl, setRepoUrl] = useState('')
  const [ownerId, setOwnerId] = useState<Id<'users'> | ''>('')
  const [categoryId, setCategoryId] = useState<Id<'coreAppsCategories'> | ''>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdId, setCreatedId] = useState<Id<'coreApps'> | null>(null)

  // Query per ottenere lo slug della core app appena creata
  const createdApp = useQuery(
    api.coreApps.getById,
    createdId ? { id: createdId } : 'skip'
  )

  // Naviga alla pagina di dettaglio quando abbiamo lo slug
  useEffect(() => {
    if (createdApp && createdId) {
      navigate({ to: '/core-apps/$slug', params: { slug: createdApp.slug } })
    }
  }, [createdApp, createdId, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      if (!name.trim()) {
        setError('Il nome è obbligatorio')
        setIsSubmitting(false)
        return
      }

      if (!ownerId) {
        setError('L\'owner è obbligatorio')
        setIsSubmitting(false)
        return
      }

      const id = await createCoreApp({
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
        repoUrl: repoUrl.trim() || undefined,
        ownerId,
        categoryId: categoryId || undefined
      })

      // Imposta l'id creato per attivare la query e la navigazione
      setCreatedId(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante la creazione dell\'Applicazione Core')
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link
          to="/core-apps"
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
        >
          ← Torna alla lista
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Nuova Applicazione Core</h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              placeholder="Es. Dashboard Analytics"
            />
          </div>

          <div>
            <label
              htmlFor="owner"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Owner <span className="text-red-500">*</span>
            </label>
            <select
              id="owner"
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value as Id<'users'> | '')}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              <option value="">Seleziona un owner...</option>
              {users?.map((user) => (
                <option key={user._id} value={user._id}>
                  {user.name} {user.email ? `(${user.email})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="category"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Categoria (opzionale)
            </label>
            <select
              id="category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value as Id<'coreAppsCategories'> | '')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              <option value="">Nessuna categoria</option>
              {categories?.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Gli utenti iscritti alla categoria riceveranno notifiche sugli aggiornamenti
            </p>
          </div>

          <div>
            <label
              htmlFor="slug"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Slug (opzionale)
            </label>
            <input
              type="text"
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              placeholder="Es. dashboard-analytics (generato automaticamente se vuoto)"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Se lasciato vuoto, verrà generato automaticamente dal nome
            </p>
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Descrizione (opzionale)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              placeholder="Descrizione dell'Applicazione Core..."
            />
          </div>

          <div>
            <label
              htmlFor="repoUrl"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              URL Repository (opzionale)
            </label>
            <input
              type="url"
              id="repoUrl"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              placeholder="https://github.com/..."
            />
          </div>

          <div className="flex items-center gap-4 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Creazione...' : 'Crea Applicazione Core'}
            </button>
            <Link
              to="/core-apps"
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium transition-colors"
            >
              Annulla
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
