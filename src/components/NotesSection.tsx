import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState, useMemo, useEffect, useRef } from 'react'
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

// Helper per rilevare URL nel testo e renderli cliccabili
const renderTextWithLinks = (text: string, users: Array<{ _id: Id<'users'>; name: string; email?: string }> | undefined) => {
  // Regex migliorata per rilevare URL (inclusi quelli con @ al loro interno)
  // Cattura URL che iniziano con http://, https://, o www.
  // Include anche caratteri speciali come @, ?, =, &, /, :, etc.
  const urlRegex = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi
  
  // Prima rileviamo gli URL per evitare di trattare "@" dentro gli URL come menzioni
  const urlMatches: Array<{ start: number; end: number; url: string }> = []
  let match
  const regex = new RegExp(urlRegex)
  
  while ((match = regex.exec(text)) !== null) {
    urlMatches.push({
      start: match.index,
      end: match.index + match[0].length,
      url: match[0]
    })
  }
  
  // Ora processiamo il testo, gestendo prima gli URL e poi le menzioni
  const elements: React.ReactNode[] = []
  let lastIndex = 0
  
  // Funzione helper per processare il testo normale (non URL) e trovare menzioni
  const processTextForMentions = (textPart: string, startOffset: number) => {
    const parts: React.ReactNode[] = []
    // Dividiamo per menzioni (@username) solo nel testo che non è parte di un URL
    const mentionParts = textPart.split(/(@\w+)/g)
    
    mentionParts.forEach((part, partIdx) => {
      if (part.startsWith('@')) {
        const userName = part.substring(1)
        const user = users?.find(u => {
          const originalName = u.name.toLowerCase()
          const formattedName = formatUserName(u.name).toLowerCase()
          const emailMatch = u.email?.toLowerCase()
          return originalName === userName.toLowerCase() || 
                 formattedName === userName.toLowerCase() ||
                 emailMatch === userName.toLowerCase()
        })
        if (user) {
          parts.push(
            <span key={`mention-${startOffset}-${partIdx}`} className="font-medium text-blue-600 dark:text-blue-400">
              {part}
            </span>
          )
        } else {
          parts.push(<span key={`text-${startOffset}-${partIdx}`}>{part}</span>)
        }
      } else if (part) {
        parts.push(<span key={`text-${startOffset}-${partIdx}`}>{part}</span>)
      }
    })
    
    return parts
  }
  
  // Processa il testo, alternando tra testo normale e URL
  urlMatches.forEach((urlMatch, urlIdx) => {
    // Aggiungi il testo prima dell'URL (con gestione menzioni)
    if (urlMatch.start > lastIndex) {
      const textBefore = text.substring(lastIndex, urlMatch.start)
      const mentionElements = processTextForMentions(textBefore, lastIndex)
      elements.push(...mentionElements)
    }
    
    // Aggiungi l'URL come link
    let url = urlMatch.url
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`
    }
    
    elements.push(
      <a
        key={`link-${urlIdx}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 dark:text-blue-400 hover:underline break-all"
      >
        {urlMatch.url}
      </a>
    )
    
    lastIndex = urlMatch.end
  })
  
  // Aggiungi il testo rimanente dopo l'ultimo URL (con gestione menzioni)
  if (lastIndex < text.length) {
    const textAfter = text.substring(lastIndex)
    const mentionElements = processTextForMentions(textAfter, lastIndex)
    elements.push(...mentionElements)
  }
  
  // Se non ci sono URL, processa tutto il testo per menzioni
  if (urlMatches.length === 0) {
    return processTextForMentions(text, 0)
  }
  
  return elements
}

interface NotesSectionProps {
  keyDevId?: Id<'keydevs'>
  coreAppId?: Id<'coreApps'>
  currentUser: { _id: Id<'users'>; roles?: Role[] } | null | undefined
  users: Array<{ _id: Id<'users'>; name: string; email?: string }> | undefined
  entityIdentifier?: string // readableId per keydevs o slug per coreApps
  highlightedNote?: string
}

export default function NotesSection({ keyDevId, coreAppId, currentUser, users, entityIdentifier, highlightedNote }: NotesSectionProps) {
  // Usa la query appropriata in base al tipo di entità
  const keyDevNotes = useQuery(
    api.notes.listByKeyDev,
    keyDevId ? { keyDevId } : 'skip'
  )
  const coreAppNotes = useQuery(
    api.notes.listByCoreApp,
    coreAppId ? { coreAppId } : 'skip'
  )
  const notes = keyDevId ? keyDevNotes : coreAppNotes
  const addNote = useMutation(api.notes.create)
  const updateNote = useMutation(api.notes.update)
  const removeNote = useMutation(api.notes.remove)
  const noteRefs = useRef<Map<Id<'notes'>, HTMLDivElement>>(new Map())
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [newNote, setNewNote] = useState('')
  
  // Stati per la funzionalità di menzione
  const [mentionQuery, setMentionQuery] = useState('')
  const [showMentionDropdown, setShowMentionDropdown] = useState(false)
  const [mentionPosition, setMentionPosition] = useState<{ start: number; end: number } | null>(null)
  
  // Stati per modifica ed eliminazione note
  const [editingNoteId, setEditingNoteId] = useState<Id<'notes'> | null>(null)
  const [editingNoteText, setEditingNoteText] = useState('')
  const [confirmDeleteNoteId, setConfirmDeleteNoteId] = useState<Id<'notes'> | null>(null)
  
  // Stati per la ricerca delle note
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAuthorId, setSelectedAuthorId] = useState<Id<'users'> | ''>('')
  
  // Stato per il toast di successo
  const [showToast, setShowToast] = useState(false)

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

  // Scroll alla nota evidenziata quando viene aperto il link
  useEffect(() => {
    if (highlightedNote && notes) {
      const noteId = highlightedNote as Id<'notes'>
      const noteElement = noteRefs.current.get(noteId)
      if (noteElement) {
        setTimeout(() => {
          noteElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
          // L'evidenziazione è già gestita dalla classe CSS, non serve aggiungere ring temporaneo
        }, 100)
      }
    }
  }, [highlightedNote, notes])

  // Funzione per copiare il link alla nota specifica
  const handleCopyNoteLink = async (noteId: Id<'notes'>) => {
    // Costruisci l'URL in base al tipo di entità
    let noteUrl: string
    if (keyDevId) {
      const identifier = entityIdentifier || keyDevId
      noteUrl = `${window.location.origin}/keydevs/${identifier}/notes?highlightedNote=${noteId}`
    } else if (coreAppId) {
      const identifier = entityIdentifier || coreAppId
      noteUrl = `${window.location.origin}/core-apps/${identifier}/notes?highlightedNote=${noteId}`
    } else {
      console.error('Nessuna entità associata alla nota')
      return
    }
    
    try {
      await navigator.clipboard.writeText(noteUrl)
      // Mostra il toast di successo
      setShowToast(true)
      setTimeout(() => {
        setShowToast(false)
      }, 3000)
    } catch (err) {
      console.error('Errore nel copiare il link:', err)
    }
  }

  // Funzione per rispondere a una nota menzionando l'autore
  const handleReply = (authorId: Id<'users'>) => {
    const author = users?.find(u => u._id === authorId)
    if (!author) return
    
    const formattedAuthorName = formatUserName(author.name)
    const mentionText = `@${formattedAuthorName} `
    
    // Inserisci la menzione nella textarea
    setNewNote(mentionText)
    
    // Scrolla in alto alla textarea e metti il focus
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
        textareaRef.current.focus()
        // Posiziona il cursore alla fine del testo
        const textLength = mentionText.length
        textareaRef.current.setSelectionRange(textLength, textLength)
      }
    }, 100)
  }

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

  // Filtra le note in base alla ricerca
  const filteredNotes = useMemo(() => {
    if (!notes) return []
    
    return notes.filter(note => {
      // Filtro per mittente (dropdown)
      if (selectedAuthorId && note.authorId !== selectedAuthorId) {
        return false
      }
      
      // Filtro per testo (input testuale)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        if (!note.body.toLowerCase().includes(query)) {
          return false
        }
      }
      
      return true
    })
  }, [notes, searchQuery, selectedAuthorId])

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
    if (!keyDevId && !coreAppId) {
      console.error('Nessuna entità associata')
      return
    }
    
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
      coreAppId,
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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex flex-col h-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 shrink-0">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Note</h2>
        <div className="flex flex-col sm:flex-row gap-2 flex-1 sm:max-w-2xl">
          <select
            value={selectedAuthorId}
            onChange={(e) => setSelectedAuthorId(e.target.value as Id<'users'> | '')}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-w-[150px]"
          >
            <option value="">Tutti i mittenti</option>
            {users?.map((user) => (
              <option key={user._id} value={user._id}>
                {formatUserName(user.name)}
              </option>
            ))}
          </select>
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca nel testo del messaggio..."
              className="w-full px-3 py-2 pr-8 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none"
                title="Cancella ricerca"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col flex-1 min-h-0 space-y-4">
        <div className="border-b dark:border-gray-700 pb-4 shrink-0">
          <div className="relative">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 relative mention-dropdown-container">
                <textarea
                  ref={textareaRef}
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

        {/* 
          Sezione scrollabile delle note: si espande per riempire tutto lo spazio disponibile
          fino alla sezione "LABEL BLOCCANTI". Lo scrolling verticale si attiva automaticamente
          solo quando il contenuto supera l'altezza disponibile.
        */}
        <div className="flex-1 overflow-y-auto min-h-0 pr-2">
          <div className="space-y-4">
            {filteredNotes && filteredNotes.length > 0 ? (
              filteredNotes.map((note) => {
            const mentionedUsers = note.mentionedUserIds 
              ? note.mentionedUserIds.map(userId => users?.find(u => u._id === userId)).filter(Boolean)
              : []
            const isAuthor = note.authorId === currentUser?._id
            const canEdit = isAuthor || isAdmin(currentUser?.roles)
            const isEditing = editingNoteId === note._id
            const isConfirmDelete = confirmDeleteNoteId === note._id
            
            const isHighlighted = highlightedNote === note._id
            
            return (
              <div 
                key={note._id} 
                ref={(el) => {
                  if (el) {
                    noteRefs.current.set(note._id, el)
                  } else {
                    noteRefs.current.delete(note._id)
                  }
                }}
                className={`p-4 rounded-lg overflow-hidden transition-all ${
                  isHighlighted
                    ? 'bg-amber-100 dark:bg-amber-900/50 border-2 border-amber-400 dark:border-amber-500 shadow-lg shadow-amber-200/50 dark:shadow-amber-900/50'
                    : note.type === 'Mention' 
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
                  {!isEditing && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => handleCopyNoteLink(note._id)}
                        data-note-link={note._id}
                        className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 whitespace-nowrap"
                        title="Copia link alla nota"
                      >
                        🔗
                      </button>
                      {!isAuthor && (
                        <button
                          onClick={() => handleReply(note.authorId)}
                          className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 whitespace-nowrap"
                          title="Rispondi alla nota"
                        >
                          💬 Rispondi
                        </button>
                      )}
                      {canEdit && (
                        <>
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
                        </>
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
                  <p className="text-gray-700 dark:text-gray-300 wrap-break-word break-all">
                    {renderTextWithLinks(note.body, users)}
                  </p>
                )}
              </div>
            )
          })
        ) : notes && notes.length > 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">
            Nessuna nota trovata con i criteri di ricerca selezionati.
          </p>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                Nessuna nota presente. Aggiungi la prima nota utilizzando il form qui sopra.
              </p>
            )}
          </div>
        </div>
      </div>
      
      {/* Toast di successo per la copia del link */}
      {showToast && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-2 fade-in">
          <div className="bg-green-600 dark:bg-green-700 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px]">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <div className="flex-1">
              <p className="font-medium">Link copiato!</p>
              <p className="text-sm text-green-100">Puoi incollarlo dove vuoi condividere questo messaggio.</p>
            </div>
            <button
              onClick={() => setShowToast(false)}
              className="text-green-100 hover:text-white"
              aria-label="Chiudi"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
