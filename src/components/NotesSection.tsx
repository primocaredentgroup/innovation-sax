import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState, useMemo, useEffect } from 'react'
import type { Id } from '../../convex/_generated/dataModel'

// Tipo per i ruoli
type Role = 'Requester' | 'BusinessValidator' | 'TechValidator' | 'Admin'

// Helper per verificare ruoli
const hasRole = (roles: Role[] | undefined, role: Role): boolean => {
  if (!roles) return false
  return roles.includes(role)
}

const isAdmin = (roles: Role[] | undefined): boolean => hasRole(roles, 'Admin')

// Helper per rimuovere spazi dai nomi utente nella visualizzazione
const formatUserName = (name: string | undefined): string => {
  if (!name) return 'Utente'
  return name.replace(/\s+/g, '')
}

interface NotesSectionProps {
  keyDevId: Id<'keydevs'>
  currentUser: { _id: Id<'users'>; roles?: Role[] } | null | undefined
  users: Array<{ _id: Id<'users'>; name: string; email?: string }> | undefined
  showNotesPage: boolean
}

export default function NotesSection({ keyDevId, currentUser, users, showNotesPage }: NotesSectionProps) {
  const notes = useQuery(api.notes.listByKeyDev, showNotesPage ? { keyDevId } : 'skip')
  const addNote = useMutation(api.notes.create)
  const updateNote = useMutation(api.notes.update)
  const removeNote = useMutation(api.notes.remove)

  const [newNote, setNewNote] = useState('')
  
  // Stati per la funzionalità di menzione
  const [mentionQuery, setMentionQuery] = useState('')
  const [showMentionDropdown, setShowMentionDropdown] = useState(false)
  const [mentionPosition, setMentionPosition] = useState<{ start: number; end: number } | null>(null)
  
  // Stati per modifica ed eliminazione note
  const [editingNoteId, setEditingNoteId] = useState<Id<'notes'> | null>(null)
  const [editingNoteText, setEditingNoteText] = useState('')
  const [confirmDeleteNoteId, setConfirmDeleteNoteId] = useState<Id<'notes'> | null>(null)

  // Ruoli e permessi utente corrente
  const userRoles = currentUser?.roles as Role[] | undefined
  const userIsAdmin = isAdmin(userRoles)

  // Chiudi il dropdown quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showMentionDropdown && !target.closest('.mention-dropdown-container')) {
        setShowMentionDropdown(false)
        setMentionQuery('')
        setMentionPosition(null)
      }
    }

    if (showMentionDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showMentionDropdown])

  // Gestisce l'input della textarea per rilevare "@" (per nuova nota)
  const handleNoteInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    const cursorPosition = e.target.selectionStart
    
    setNewNote(value)
    
    // Cerca "@" prima del cursore
    const textBeforeCursor = value.substring(0, cursorPosition)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')
    
    if (lastAtIndex !== -1) {
      // Verifica che "@" non sia parte di una parola già completata (deve essere seguito da spazio o essere l'ultimo carattere)
      const charAfterAt = textBeforeCursor[lastAtIndex + 1]
      const isAtWordBoundary = lastAtIndex === 0 || textBeforeCursor[lastAtIndex - 1] === ' ' || textBeforeCursor[lastAtIndex - 1] === '\n'
      
      if (isAtWordBoundary && (charAfterAt === undefined || charAfterAt === ' ' || charAfterAt === '\n' || /[a-zA-Z0-9]/.test(charAfterAt))) {
        const query = textBeforeCursor.substring(lastAtIndex + 1)
        // Se c'è uno spazio dopo "@", chiudi il dropdown
        if (query.includes(' ') || query.includes('\n')) {
          setShowMentionDropdown(false)
          setMentionQuery('')
          setMentionPosition(null)
        } else {
          setMentionQuery(query)
          setShowMentionDropdown(true)
          setMentionPosition({ start: lastAtIndex, end: cursorPosition })
        }
      } else {
        setShowMentionDropdown(false)
        setMentionQuery('')
        setMentionPosition(null)
      }
    } else {
      setShowMentionDropdown(false)
      setMentionQuery('')
      setMentionPosition(null)
    }
  }

  // Filtra gli utenti in base alla query di menzione
  const filteredUsersForMention = useMemo(() => {
    if (!users || !mentionQuery) return users || []
    const query = mentionQuery.toLowerCase()
    return users.filter(user => 
      user.name.toLowerCase().includes(query) || 
      user.email?.toLowerCase().includes(query)
    ).slice(0, 10) // Limita a 10 risultati
  }, [users, mentionQuery])

  // Gestisce la selezione di un utente dal dropdown
  const handleSelectMention = (userName: string) => {
    if (!mentionPosition) return
    
    // Rimuovi spazi dal nome per la visualizzazione
    const formattedUserName = formatUserName(userName)
    
    const beforeMention = newNote.substring(0, mentionPosition.start)
    const afterMention = newNote.substring(mentionPosition.end)
    const newText = `${beforeMention}@${formattedUserName} ${afterMention}`
    
    setNewNote(newText)
    setShowMentionDropdown(false)
    setMentionQuery('')
    setMentionPosition(null)
    
    // Focus sulla textarea dopo un breve delay per aggiornare il cursore
    setTimeout(() => {
      const textarea = document.querySelector('textarea[placeholder*="commento"]') as HTMLTextAreaElement
      if (textarea) {
        const newCursorPos = mentionPosition.start + formattedUserName.length + 2 // +2 per "@" e spazio
        textarea.focus()
        textarea.setSelectionRange(newCursorPos, newCursorPos)
      }
    }, 0)
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return
    
    // Cerca tutte le menzioni nel testo pattern "@NomeUtente"
    const mentionedUserIds: Id<'users'>[] = []
    if (users) {
      const mentionPattern = /@(\w+)/g
      const matches = newNote.match(mentionPattern)
      if (matches) {
        const foundUserIds = new Set<Id<'users'>>()
        for (const match of matches) {
          const userName = match.substring(1) // Rimuovi "@"
          // Cerca l'utente sia con il nome originale che senza spazi
          const user = users.find(u => {
            const originalName = u.name.toLowerCase()
            const formattedName = formatUserName(u.name).toLowerCase()
            const emailMatch = u.email?.toLowerCase()
            return originalName === userName.toLowerCase() || 
                   formattedName === userName.toLowerCase() ||
                   emailMatch === userName.toLowerCase()
          })
          if (user && !foundUserIds.has(user._id)) {
            foundUserIds.add(user._id)
            mentionedUserIds.push(user._id)
          }
        }
      }
    }
    
    // Determina il tipo di nota: se ci sono menzioni valide, usa "Mention", altrimenti "Comment"
    const noteType: 'Comment' | 'Mention' = mentionedUserIds.length > 0 ? 'Mention' : 'Comment'
    
    await addNote({
      keyDevId,
      body: newNote,
      type: noteType,
      mentionedUserIds: mentionedUserIds.length > 0 ? mentionedUserIds : undefined
    })
    setNewNote('')
    setShowMentionDropdown(false)
    setMentionQuery('')
    setMentionPosition(null)
  }

  // Gestisce l'inizio della modifica di una nota
  const handleStartEditNote = (noteId: Id<'notes'>) => {
    const note = notes?.find(n => n._id === noteId)
    if (note) {
      setEditingNoteId(noteId)
      setEditingNoteText(note.body)
    }
  }

  // Gestisce l'annullamento della modifica
  const handleCancelEditNote = () => {
    setEditingNoteId(null)
    setEditingNoteText('')
    setShowMentionDropdown(false)
    setMentionQuery('')
    setMentionPosition(null)
  }

  // Gestisce il salvataggio della modifica
  const handleSaveEditNote = async (noteId: Id<'notes'>) => {
    if (!editingNoteText.trim()) return
    
    const note = notes?.find(n => n._id === noteId)
    if (!note) return

    // Cerca tutte le menzioni nel testo
    const mentionedUserIds: Id<'users'>[] = []
    if (users) {
      const mentionPattern = /@(\w+)/g
      const matches = editingNoteText.match(mentionPattern)
      if (matches) {
        const foundUserIds = new Set<Id<'users'>>()
        for (const match of matches) {
          const userName = match.substring(1)
          // Cerca l'utente sia con il nome originale che senza spazi
          const user = users.find(u => {
            const originalName = u.name.toLowerCase()
            const formattedName = formatUserName(u.name).toLowerCase()
            const emailMatch = u.email?.toLowerCase()
            return originalName === userName.toLowerCase() || 
                   formattedName === userName.toLowerCase() ||
                   emailMatch === userName.toLowerCase()
          })
          if (user && !foundUserIds.has(user._id)) {
            foundUserIds.add(user._id)
            mentionedUserIds.push(user._id)
          }
        }
      }
    }

    const noteType: 'Comment' | 'Mention' = mentionedUserIds.length > 0 ? 'Mention' : 'Comment'

    await updateNote({
      id: noteId,
      body: editingNoteText,
      type: noteType,
      mentionedUserIds: mentionedUserIds.length > 0 ? mentionedUserIds : undefined
    })
    
    setEditingNoteId(null)
    setEditingNoteText('')
    setShowMentionDropdown(false)
    setMentionQuery('')
    setMentionPosition(null)
  }

  // Gestisce il click sul pulsante elimina (mostra conferma)
  const handleDeleteNoteClick = (noteId: Id<'notes'>) => {
    setConfirmDeleteNoteId(noteId)
  }

  // Gestisce l'annullamento dell'eliminazione
  const handleCancelDeleteNote = () => {
    setConfirmDeleteNoteId(null)
  }

  // Gestisce la conferma dell'eliminazione
  const handleConfirmDeleteNote = async (noteId: Id<'notes'>) => {
    await removeNote({ id: noteId })
    setConfirmDeleteNoteId(null)
  }

  if (!showNotesPage) {
    return null
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Note</h2>

      <div className="space-y-4">
        {notes && notes.length > 0 ? (
          notes.map((note) => {
            const mentionedUsers = note.mentionedUserIds 
              ? note.mentionedUserIds.map(userId => users?.find(u => u._id === userId)).filter(Boolean)
              : []
            const isAuthor = note.authorId === currentUser?._id
            const canEdit = isAuthor || userIsAdmin
            const isEditing = editingNoteId === note._id
            const isConfirmDelete = confirmDeleteNoteId === note._id
            
            return (
              <div key={note._id} className={`p-4 rounded-lg ${
                note.type === 'Mention' 
                  ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' 
                  : 'bg-gray-50 dark:bg-gray-700/50'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      {formatUserName(users?.find((u) => u._id === note.authorId)?.name)}
                    </span>
                    {note.type === 'Mention' && mentionedUsers.length > 0 && (
                      <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded wrap-break-word">
                        Menzione → {mentionedUsers.map(u => formatUserName(u?.name)).filter(Boolean).join(', ')}
                      </span>
                    )}
                    <span className="text-xs sm:text-sm text-gray-400 dark:text-gray-500">
                      {new Date(note.ts).toLocaleString('it-IT')}
                    </span>
                  </div>
                  {canEdit && !isEditing && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => handleStartEditNote(note._id)}
                        className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 whitespace-nowrap"
                        title="Modifica nota"
                      >
                        ✏️ Modifica
                      </button>
                      {!isConfirmDelete && (
                        <button
                          onClick={() => handleDeleteNoteClick(note._id)}
                          className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 whitespace-nowrap"
                          title="Elimina nota"
                        >
                          🗑️ Elimina
                        </button>
                      )}
                      {isConfirmDelete && (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-red-600 dark:text-red-400">Confermi eliminazione?</span>
                          <button
                            onClick={() => handleConfirmDeleteNote(note._id)}
                            className="text-xs bg-red-600 dark:bg-red-700 text-white px-2 py-1 rounded hover:bg-red-700 dark:hover:bg-red-600 whitespace-nowrap"
                          >
                            Sì, elimina
                          </button>
                          <button
                            onClick={handleCancelDeleteNote}
                            className="text-xs bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-2 py-1 rounded hover:bg-gray-400 dark:hover:bg-gray-500 whitespace-nowrap"
                          >
                            Annulla
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {isEditing ? (
                  <div className="space-y-2">
                    <div className="relative mention-dropdown-container">
                      <textarea
                        value={editingNoteText}
                        onChange={(e) => {
                          const value = e.target.value
                          const cursorPosition = e.target.selectionStart
                          
                          setEditingNoteText(value)
                          
                          // Cerca "@" prima del cursore
                          const textBeforeCursor = value.substring(0, cursorPosition)
                          const lastAtIndex = textBeforeCursor.lastIndexOf('@')
                          
                          if (lastAtIndex !== -1) {
                            const charAfterAt = textBeforeCursor[lastAtIndex + 1]
                            const isAtWordBoundary = lastAtIndex === 0 || textBeforeCursor[lastAtIndex - 1] === ' ' || textBeforeCursor[lastAtIndex - 1] === '\n'
                            
                            if (isAtWordBoundary && (charAfterAt === undefined || charAfterAt === ' ' || charAfterAt === '\n' || /[a-zA-Z0-9]/.test(charAfterAt))) {
                              const query = textBeforeCursor.substring(lastAtIndex + 1)
                              if (query.includes(' ') || query.includes('\n')) {
                                setShowMentionDropdown(false)
                                setMentionQuery('')
                                setMentionPosition(null)
                              } else {
                                setMentionQuery(query)
                                setShowMentionDropdown(true)
                                setMentionPosition({ start: lastAtIndex, end: cursorPosition })
                              }
                            } else {
                              setShowMentionDropdown(false)
                              setMentionQuery('')
                              setMentionPosition(null)
                            }
                          } else {
                            setShowMentionDropdown(false)
                            setMentionQuery('')
                            setMentionPosition(null)
                          }
                        }}
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
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-100"
                        placeholder="Modifica il testo della nota... Usa @ per menzionare un utente"
                      />
                      {/* Dropdown per selezionare utenti durante la modifica */}
                      {showMentionDropdown && filteredUsersForMention && filteredUsersForMention.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                          {filteredUsersForMention.map((user) => (
                            <button
                              key={user._id}
                              type="button"
                              onClick={() => {
                                if (!mentionPosition) return
                                
                                // Rimuovi spazi dal nome per la visualizzazione
                                const formattedUserName = formatUserName(user.name)
                                
                                const beforeMention = editingNoteText.substring(0, mentionPosition.start)
                                const afterMention = editingNoteText.substring(mentionPosition.end)
                                const newText = `${beforeMention}@${formattedUserName} ${afterMention}`
                                
                                setEditingNoteText(newText)
                                setShowMentionDropdown(false)
                                setMentionQuery('')
                                setMentionPosition(null)
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              <span className="font-medium text-gray-900 dark:text-gray-100">{user.name}</span>
                              {user.email && (
                                <span className="text-sm text-gray-500 dark:text-gray-400">({user.email})</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => handleSaveEditNote(note._id)}
                        disabled={!editingNoteText.trim()}
                        className="px-3 py-1 text-sm bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
                      >
                        Salva
                      </button>
                      <button
                        onClick={handleCancelEditNote}
                        className="px-3 py-1 text-sm bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
                      >
                        Annulla
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-700 dark:text-gray-300">
                    {note.body.split(/(@\w+)/g).map((part, idx) => {
                      if (part.startsWith('@')) {
                        const userName = part.substring(1)
                        // Cerca l'utente sia con il nome originale che senza spazi
                        const user = users?.find(u => {
                          const originalName = u.name.toLowerCase()
                          const formattedName = formatUserName(u.name).toLowerCase()
                          const emailMatch = u.email?.toLowerCase()
                          return originalName === userName.toLowerCase() || 
                                 formattedName === userName.toLowerCase() ||
                                 emailMatch === userName.toLowerCase()
                        })
                        return user ? (
                          <span key={idx} className="font-medium text-blue-600 dark:text-blue-400">
                            {part}
                          </span>
                        ) : (
                          <span key={idx}>{part}</span>
                        )
                      }
                      return <span key={idx}>{part}</span>
                    })}
                  </p>
                )}
              </div>
            )
          })
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">
            Nessuna nota presente. Aggiungi la prima nota utilizzando il form qui sotto.
          </p>
        )}

        <div className="border-t dark:border-gray-700 pt-4">
          <div className="relative">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 relative mention-dropdown-container">
                <textarea
                  value={newNote}
                  onChange={handleNoteInput}
                  onKeyDown={(e) => {
                    // Gestisci Escape per chiudere il dropdown
                    if (e.key === 'Escape' && showMentionDropdown) {
                      setShowMentionDropdown(false)
                      setMentionQuery('')
                      setMentionPosition(null)
                    }
                    // Gestisci Enter per selezionare il primo utente nel dropdown
                    if (e.key === 'Enter' && showMentionDropdown && filteredUsersForMention.length > 0 && !e.shiftKey) {
                      e.preventDefault()
                      handleSelectMention(filteredUsersForMention[0].name)
                    }
                  }}
                  placeholder="Aggiungi un commento... Usa @ per menzionare un utente"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-100"
                />
                {/* Dropdown per selezionare utenti */}
                {showMentionDropdown && filteredUsersForMention && filteredUsersForMention.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredUsersForMention.map((user) => (
                      <button
                        key={user._id}
                        type="button"
                        onClick={() => handleSelectMention(user.name)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <span className="font-medium text-gray-900 dark:text-gray-100">{user.name}</span>
                        {user.email && (
                          <span className="text-sm text-gray-500 dark:text-gray-400">({user.email})</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={handleAddNote}
                disabled={!newNote.trim()}
                className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 whitespace-nowrap"
              >
                Aggiungi
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
