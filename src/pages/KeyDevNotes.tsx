import { Link, useParams, useSearch } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import NotesSection from '../components/NotesSection'

export default function KeyDevNotesPage() {
  const { id } = useParams({ strict: false }) as { id: string }
  const search = useSearch({ strict: false }) as { highlightedNote?: string }
  
  // Usa getByReadableId se l'id è un readableId (formato KD-XXX), altrimenti usa getById per retrocompatibilità
  const isReadableId = /^KD-\d+$/.test(id)
  const keydev = useQuery(
    isReadableId ? api.keydevs.getByReadableId : api.keydevs.getById,
    isReadableId ? { readableId: id } : { id: id as Id<'keydevs'> }
  )
  const users = useQuery(api.users.listUsers)
  const currentUser = useQuery(api.users.getCurrentUser)

  if (!keydev) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Caricamento...</div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6">
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
              Note - {keydev.title}
            </h1>
            <span className="px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-mono bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 whitespace-nowrap">
              {keydev.readableId}
            </span>
          </div>
        </div>
      </div>

      {/* Notes Section */}
      <div className="w-full">
        <NotesSection 
          keyDevId={keydev._id} 
          currentUser={currentUser} 
          users={users} 
          readableId={isReadableId ? id : keydev.readableId}
          highlightedNote={search.highlightedNote}
        />
      </div>
    </div>
  )
}
