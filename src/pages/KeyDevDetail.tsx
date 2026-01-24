import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router'
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

const statusColors: Record<string, string> = {
  Draft: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
  MockupDone: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
  Approved: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
  Rejected: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
  FrontValidated: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
  InProgress: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
  Done: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300',
  Checked: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300'
}

const statusLabels: Record<string, string> = {
  Draft: 'Bozza',
  MockupDone: 'Mockup Terminato',
  Approved: 'Approvato',
  Rejected: 'Rifiutato',
  FrontValidated: 'Front Validato',
  InProgress: 'In Corso',
  Done: 'Completato',
  Checked: 'Controllato'
}

// Helper per troncare URL mantenendo inizio e fine
const truncateUrl = (url: string, maxLength: number = 50): string => {
  if (url.length <= maxLength) return url
  const start = url.substring(0, Math.floor(maxLength / 2) - 3)
  const end = url.substring(url.length - Math.floor(maxLength / 2) + 3)
  return `${start}...${end}`
}

// Descrizioni del flusso per ogni stato
const statusDescriptions: Record<string, string> = {
  Draft: 'Aggiungi il mockupRepoUrl per passare a "Mockup Terminato"',
  MockupDone: 'In attesa di approvazione da parte di un TechValidator',
  Approved: 'In attesa di validazione frontend da parte del BusinessValidator del dipartimento',
  Rejected: 'Rifiutato dal TechValidator - vedere motivo',
  FrontValidated: 'In attesa che un TechValidator prenda in carico lo sviluppo',
  InProgress: 'In sviluppo - l\'owner può dichiararlo completato',
  Done: 'Completato',
  Checked: 'Controllato dall\'admin aziendale'
}

export default function KeyDevDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string }
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as { notes?: string }
  const isNew = id === 'new'

  // Usa getByReadableId se l'id è un readableId (formato KD-XXX), altrimenti usa getById per retrocompatibilità
  const isReadableId = /^KD-\d+$/.test(id)
  const keydev = useQuery(
    isReadableId ? api.keydevs.getByReadableId : api.keydevs.getById,
    isNew ? 'skip' : (isReadableId ? { readableId: id } : { id: id as Id<'keydevs'> })
  )
  const departments = useQuery(api.departments.list)
  const teams = useQuery(api.teams.list)
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
  const availableLabels = useQuery(api.labels.list)

  const createKeyDev = useMutation(api.keydevs.create)
  const updateKeyDev = useMutation(api.keydevs.update)
  const updateStatus = useMutation(api.keydevs.updateStatus)
  const takeOwnership = useMutation(api.keydevs.takeOwnership)
  const assignOwner = useMutation(api.keydevs.assignOwner)
  const markAsDone = useMutation(api.keydevs.markAsDone)
  const linkMockupRepo = useMutation(api.keydevs.linkMockupRepo)
  const addNote = useMutation(api.notes.create)
  const updateNote = useMutation(api.notes.update)
  const removeNote = useMutation(api.notes.remove)
  const createBlockingLabel = useMutation(api.blockingLabels.create)
  const removeBlockingLabel = useMutation(api.blockingLabels.remove)
  const penalties = useQuery(
    api.penalties.listByKeyDev,
    isNew || !keydev ? 'skip' : { keyDevId: keydev._id }
  )
  const createPenalty = useMutation(api.penalties.create)
  const removePenalty = useMutation(api.penalties.remove)

  const currentMonth = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }, [])

  const [newNote, setNewNote] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  // Inizializza showNotesPage dal parametro URL
  const [showNotesPage, setShowNotesPage] = useState(() => search.notes === 'true')
  
  // Stati per la funzionalità di menzione
  const [mentionQuery, setMentionQuery] = useState('')
  const [showMentionDropdown, setShowMentionDropdown] = useState(false)
  const [mentionPosition, setMentionPosition] = useState<{ start: number; end: number } | null>(null)
  
  // Stati per modifica ed eliminazione note
  const [editingNoteId, setEditingNoteId] = useState<Id<'notes'> | null>(null)
  const [editingNoteText, setEditingNoteText] = useState('')
  const [confirmDeleteNoteId, setConfirmDeleteNoteId] = useState<Id<'notes'> | null>(null)
  
  // Helper per rimuovere spazi dai nomi utente nella visualizzazione
  const formatUserName = (name: string | undefined): string => {
    if (!name) return 'Utente'
    return name.replace(/\s+/g, '')
  }
  
  // Sincronizza lo stato con l'URL quando cambia il parametro
  useEffect(() => {
    setShowNotesPage(search.notes === 'true')
  }, [search.notes])

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
  const [mockupRepoUrlInput, setMockupRepoUrlInput] = useState('')
  const [validationMonth, setValidationMonth] = useState(currentMonth)
  const [validationCommit, setValidationCommit] = useState('')
  const [validationError, setValidationError] = useState('')
  const [repoUrl, setRepoUrl] = useState('')
  const [releaseCommit, setReleaseCommit] = useState('')
  const [ownershipWeight, setOwnershipWeight] = useState<0 | 0.25 | 0.5 | 0.75 | 1>(() => {
    if (keydev?.weight !== undefined) {
      return keydev.weight as 0 | 0.25 | 0.5 | 0.75 | 1
    }
    return 1
  })
  const [penaltyWeight, setPenaltyWeight] = useState('')
  const [penaltyDescription, setPenaltyDescription] = useState('')
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>('')
  // Inizializza techWeight con il valore esistente del keydev o 1 come default
  const [techWeight, setTechWeight] = useState<0 | 0.25 | 0.5 | 0.75 | 1>(() => {
    if (keydev?.weight !== undefined) {
      return keydev.weight as 0 | 0.25 | 0.5 | 0.75 | 1
    }
    return 1
  })
  
  // Aggiorna selectedOwnerId quando cambia il keydev
  useEffect(() => {
    if (keydev?.ownerId) {
      setSelectedOwnerId(keydev.ownerId)
    } else {
      setSelectedOwnerId('')
    }
  }, [keydev?.ownerId])
  
  // Aggiorna techWeight quando cambia il keydev
  useEffect(() => {
    if (keydev?.weight !== undefined) {
      setTechWeight(keydev.weight as 0 | 0.25 | 0.5 | 0.75 | 1)
    } else {
      setTechWeight(1)
    }
  }, [keydev?.weight])

  // Aggiorna ownershipWeight quando cambia il keydev
  useEffect(() => {
    if (keydev?.weight !== undefined) {
      setOwnershipWeight(keydev.weight as 0 | 0.25 | 0.5 | 0.75 | 1)
    } else {
      setOwnershipWeight(1)
    }
  }, [keydev?.weight])
  
  // Calcola i valori iniziali per dipartimento e team in base all'utente
  const getInitialDeptId = () => {
    if (isNew && currentUser?.deptId && departments) {
      const userDept = departments.find(d => d._id === currentUser.deptId)
      return userDept?._id || ''
    }
    return ''
  }

  const getInitialTeamId = (deptId: string) => {
    if (isNew && deptId && teams && departments) {
      const userDept = departments.find(d => d._id === deptId)
      if (userDept && userDept.teamIds.length > 0) {
        return userDept.teamIds[0]
      }
    }
    return ''
  }

  // Stati per il form di creazione con inizializzazione lazy
  const [selectedDeptId, setSelectedDeptId] = useState<string>(() => getInitialDeptId())
  const [selectedTeamId, setSelectedTeamId] = useState<string>(() => getInitialTeamId(getInitialDeptId()))
  
  // Aggiorna gli stati quando cambiano i dati dell'utente o dipartimenti/teams
  // Questo è necessario per sincronizzare lo stato del form con i dati esterni (utente, dipartimenti, teams)
  useEffect(() => {
    if (isNew) {
      const newDeptId = getInitialDeptId()
      const newTeamId = getInitialTeamId(newDeptId)
      // Aggiorna solo se i valori sono diversi per evitare render inutili
      if (newDeptId && newDeptId !== selectedDeptId) {
        setSelectedDeptId(newDeptId)
      }
      if (newTeamId && newTeamId !== selectedTeamId) {
        setSelectedTeamId(newTeamId)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew, currentUser?.deptId, departments, teams])

  // Query per il budget disponibile per la validazione
  const budgetForValidation = useQuery(
    api.budget.getByMonthDeptTeam,
    keydev && keydev.status === 'Approved' 
      ? { monthRef: validationMonth, deptId: keydev.deptId, teamId: keydev.teamId }
      : 'skip'
  )

  // Genera opzioni mese per validazione
  const monthOptions = useMemo(() => {
    const options = []
    const now = new Date()
    for (let i = 0; i <= 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const ref = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const label = date.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
      options.push({ value: ref, label })
    }
    return options
  }, [])

  // Use keydev data or defaults for form - key resets the form when keydev changes
  const formKey = keydev?._id || 'new'

  // Valore derivato per l'input: usa il valore inserito dall'utente o quello del keydev
  const mockupRepoUrl = mockupRepoUrlInput || keydev?.mockupRepoUrl || ''


  // Filtra i team in base al dipartimento selezionato
  const availableTeams = useMemo(() => {
    if (!teams || !selectedDeptId) return []
    const selectedDept = departments?.find(d => d._id === selectedDeptId)
    if (!selectedDept) return []
    return teams.filter(t => selectedDept.teamIds.includes(t._id))
  }, [teams, selectedDeptId, departments])

  // Verifica se il form è valido (dipartimento e team selezionati)
  const isFormValid = selectedDeptId !== '' && selectedTeamId !== '' && availableTeams.some(t => t._id === selectedTeamId)

  // Ruoli e permessi utente corrente
  const userRoles = currentUser?.roles as Role[] | undefined
  const userIsAdmin = isAdmin(userRoles)
  const userIsTechValidator = hasRole(userRoles, 'TechValidator')
  const userIsBusinessValidator = hasRole(userRoles, 'BusinessValidator')
  
  // Verifica se l'utente è il BusinessValidator del dipartimento del keydev
  const isBusinessValidatorOfDept = userIsBusinessValidator && currentUser?.deptId === keydev?.deptId
  
  // Verifica se l'utente è l'owner
  const isOwner = keydev?.ownerId === currentUser?._id
  
  // Verifica se l'utente è il requester
  const isRequester = keydev?.requesterId === currentUser?._id

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const title = formData.get('title') as string
    const desc = formData.get('desc') as string
    const teamId = isNew ? selectedTeamId : (formData.get('teamId') as string)
    const deptId = isNew ? selectedDeptId : (formData.get('deptId') as string)

    if (isNew) {
      if (!isFormValid) return
      const result = await createKeyDev({
        title,
        desc,
        teamId: teamId as Id<'teams'>,
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

  const handleLinkMockupRepo = async () => {
    if (!keydev || !mockupRepoUrl.trim()) return
    await linkMockupRepo({ 
      id: keydev._id, 
      mockupRepoUrl: mockupRepoUrl.trim() 
    })
    setMockupRepoUrlInput('')
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
    if (!newNote.trim() || isNew || !keydev) return
    
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
      keyDevId: keydev._id,
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
    if (!editingNoteText.trim() || !keydev) return
    
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

  const handleAddBlockingLabel = async (labelId: Id<'labels'>) => {
    if (isNew || !keydev) return
    try {
      await createBlockingLabel({
        keyDevId: keydev._id,
        labelId
      })
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Errore nell\'aggiunta della blocking label')
    }
  }

  const handleRemoveBlockingLabel = async (id: Id<'blockingLabels'>) => {
    if (!confirm('Sei sicuro di voler rimuovere questa blocking label?')) return
    await removeBlockingLabel({ id })
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
    await takeOwnership({ id: keydev._id, weight: ownershipWeight })
  }

  // Handler per dichiarare completato
  const handleMarkAsDone = async () => {
    if (!keydev) return
    if (!repoUrl.trim()) {
      alert('Devi specificare l\'URL del repository definitivo')
      return
    }
    if (!releaseCommit.trim()) {
      alert('Devi specificare il commit di rilascio')
      return
    }
    await markAsDone({ 
      id: keydev._id, 
      repoUrl: repoUrl.trim(),
      releaseCommit: releaseCommit.trim() 
    })
    setRepoUrl('')
    setReleaseCommit('')
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
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link
            to="/keydevs"
            search={{ month: keydev?.monthRef || currentMonth }}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            ← Torna alla lista
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {isNew ? 'Nuovo Sviluppo Chiave' : keydev?.title}
          </h1>
          {!isNew && keydev && (
            <>
              <span className="px-3 py-1 rounded-md text-sm font-mono bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                {keydev.readableId}
              </span>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-sm ${statusColors[keydev.status]}`}>
                  {statusLabels[keydev.status]}
                </span>
                {/* Pulsante per riportare in Bozza quando rifiutato */}
                {keydev.status === 'Rejected' && (isRequester || userIsAdmin) && (
                  <button
                    onClick={async () => {
                      if (!confirm('Sei sicuro di voler riportare questo sviluppo in Bozza? Potrai modificare il mockupRepoUrl e ripassarlo a "Mockup Terminato".')) return
                      await updateStatus({ id: keydev._id, status: 'Draft' })
                    }}
                    className="px-4 py-1 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 text-sm font-medium"
                    title="Riporta in Bozza per modificare il mockup"
                  >
                    ↶ Riporta in Bozza
                  </button>
                )}
              </div>
            </>
          )}
        </div>
        {!isNew && keydev && (
          <button
            onClick={() => {
              const newShowNotesPage = !showNotesPage
              navigate({
                to: '/keydevs/$id',
                params: { id },
                search: newShowNotesPage ? { notes: 'true' } : {}
              })
            }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              showNotesPage
                ? 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {showNotesPage ? '← Torna ai Dettagli' : '📝 Note'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="col-span-2 space-y-6">
          {showNotesPage ? (
            /* Sottopagina Note */
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
                        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {formatUserName(users?.find((u) => u._id === note.authorId)?.name)}
                            </span>
                            {note.type === 'Mention' && mentionedUsers.length > 0 && (
                              <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">
                                Menzione → {mentionedUsers.map(u => formatUserName(u?.name)).filter(Boolean).join(', ')}
                              </span>
                            )}
                            <span className="text-sm text-gray-400 dark:text-gray-500">
                              {new Date(note.ts).toLocaleString('it-IT')}
                            </span>
                          </div>
                          {canEdit && !isEditing && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleStartEditNote(note._id)}
                                className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                                title="Modifica nota"
                              >
                                ✏️ Modifica
                              </button>
                              {!isConfirmDelete && (
                                <button
                                  onClick={() => handleDeleteNoteClick(note._id)}
                                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                                  title="Elimina nota"
                                >
                                  🗑️ Elimina
                                </button>
                              )}
                              {isConfirmDelete && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-red-600 dark:text-red-400">Confermi eliminazione?</span>
                                  <button
                                    onClick={() => handleConfirmDeleteNote(note._id)}
                                    className="text-xs bg-red-600 dark:bg-red-700 text-white px-2 py-1 rounded hover:bg-red-700 dark:hover:bg-red-600"
                                  >
                                    Sì, elimina
                                  </button>
                                  <button
                                    onClick={handleCancelDeleteNote}
                                    className="text-xs bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-2 py-1 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
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
                            <div className="flex gap-2">
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
                    <div className="flex gap-2">
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
                        className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
                      >
                        Aggiungi
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dipartimento</label>
                    <select
                      name="deptId"
                      value={selectedDeptId}
                      onChange={(e) => {
                        setSelectedDeptId(e.target.value)
                        setSelectedTeamId('') // Reset team quando cambia dipartimento
                      }}
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Team</label>
                    <select
                      name="teamId"
                      value={selectedTeamId}
                      onChange={(e) => setSelectedTeamId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                      required
                      disabled={!selectedDeptId || availableTeams.length === 0}
                    >
                      <option value="">{selectedDeptId && availableTeams.length === 0 ? 'Nessun team disponibile' : 'Seleziona...'}</option>
                      {availableTeams.map((t) => (
                        <option key={t._id} value={t._id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isNew && !isFormValid}
                  className={`px-4 py-2 rounded-md ${
                    isNew && !isFormValid
                      ? 'bg-gray-400 dark:bg-gray-600 text-gray-200 dark:text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
                  }`}
                >
                  {isNew ? 'Crea Sviluppo Chiave' : 'Salva Modifiche'}
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
                    {/* Messaggio per requester/admin */}
                    {(isRequester || userIsAdmin) && (
                      <div className="mt-3 p-2 bg-blue-100 dark:bg-blue-900/30 rounded border border-blue-200 dark:border-blue-800">
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                          💡 Puoi riportare questo sviluppo in Bozza per modificare il mockupRepoUrl e ripassarlo a "Mockup Terminato"
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Azioni disponibili in base allo stato */}
              <div className="space-y-4">
                {/* Draft: Mostra input per inserire/modificare URL mockup repo */}
                {keydev.status === 'Draft' && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Repository URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={mockupRepoUrl}
                        onChange={(e) => setMockupRepoUrlInput(e.target.value)}
                        placeholder="https://github.com/..."
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                      />
                      <button
                        onClick={handleLinkMockupRepo}
                        disabled={!mockupRepoUrl.trim()}
                        className="px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded-md hover:bg-gray-800 dark:hover:bg-gray-600 disabled:opacity-50"
                      >
                        Salva
                      </button>
                    </div>
                  </div>
                )}

                {/* MockupDone: TechValidator può approvare o rifiutare */}
                {keydev.status === 'MockupDone' && (userIsTechValidator || userIsAdmin) && (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-4">
                      Come TechValidator, puoi approvare o rifiutare questo mockup dopo aver verificato la logica e il processo.
                    </p>
                    
                    {!showRejectForm ? (
                      <div className="space-y-4">
                        {/* Campo obbligatorio per il peso dello sviluppo */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Peso dello sviluppo per validazione tech <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={techWeight}
                            onChange={(e) => setTechWeight(parseFloat(e.target.value) as 0 | 0.25 | 0.5 | 0.75 | 1)}
                            className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 ${
                              techWeight === undefined 
                                ? 'border-red-300 dark:border-red-600' 
                                : 'border-gray-300 dark:border-gray-600'
                            }`}
                            required
                          >
                            <option value={1}>1.00 - Sviluppo completo (100%)</option>
                            <option value={0.75}>0.75 - Sviluppo significativo (75%)</option>
                            <option value={0.5}>0.50 - Sviluppo medio (50%)</option>
                            <option value={0.25}>0.25 - Sviluppo leggero (25%)</option>
                            <option value={0}>0.00 - Nessuno sviluppo (0%)</option>
                          </select>
                          <p className={`mt-1 text-xs ${
                            techWeight === undefined 
                              ? 'text-red-500 dark:text-red-400' 
                              : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            {techWeight === undefined 
                              ? 'Obbligatorio: seleziona il peso dello sviluppo per la validazione tech'
                              : 'Seleziona quanto è "pesante" lo sviluppo per la validazione tech'}
                          </p>
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateStatus({ id: keydev._id, status: 'Approved', weight: techWeight })}
                            disabled={techWeight === undefined}
                            className="px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-md hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
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
                      Seleziona il mese di riferimento per l'allocazione del budget e inserisci il commit validato.
                    </p>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Mese di riferimento
                        </label>
                        <select
                          value={validationMonth}
                          onChange={(e) => {
                            setValidationMonth(e.target.value)
                            setValidationError('')
                          }}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                        >
                          {monthOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Commit Validato dal Business <span className="text-red-500">*</span>
                          </label>
                          {keydev.mockupRepoUrl && (
                            <a
                              href={`${keydev.mockupRepoUrl.replace(/\/+$/, '')}/commits/`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                              title="Vai alla pagina dei commit, clicca il bottone 'Copia' dell'ultimo commit (dove apparirà 'Copy full SHA for [xxx]') e incollalo qui: sarà il patto tra sviluppatori e dipartimento richiedente."
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              Open on a new tab
                            </a>
                          )}
                        </div>
                        <input
                          type="text"
                          value={validationCommit}
                          onChange={(e) => setValidationCommit(e.target.value)}
                          placeholder="es. abc1234 o hash completo del commit"
                          className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 font-mono text-sm ${
                            !validationCommit.trim() 
                              ? 'border-red-300 dark:border-red-600' 
                              : 'border-gray-300 dark:border-gray-600'
                          }`}
                          required
                        />
                        <p className={`mt-1 text-xs ${
                          !validationCommit.trim() 
                            ? 'text-red-500 dark:text-red-400' 
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {!validationCommit.trim() 
                            ? 'Obbligatorio: inserisci l\'hash del commit del mockup che stai validando'
                            : 'Inserisci l\'hash del commit del mockup che stai validando'
                          }
                        </p>
                      </div>
                      
                      {/* Info budget */}
                      <div className={`p-3 rounded-lg ${
                        budgetForValidation && budgetForValidation.maxAlloc > 0
                          ? 'bg-green-100 dark:bg-green-900/30'
                          : 'bg-red-100 dark:bg-red-900/30'
                      }`}>
                        {budgetForValidation ? (
                          <p className={`text-sm ${
                            budgetForValidation.maxAlloc > 0
                              ? 'text-green-800 dark:text-green-300'
                              : 'text-red-800 dark:text-red-300'
                          }`}>
                            Budget disponibile: <strong>{budgetForValidation.maxAlloc}</strong> Sviluppi Chiave per questo team/dipartimento nel mese selezionato
                          </p>
                        ) : (
                          <p className="text-sm text-red-800 dark:text-red-300">
                            Nessun budget allocato per questa combinazione mese/dipartimento/team.
                            Contatta l'amministratore.
                          </p>
                        )}
                      </div>
                      
                      {validationError && (
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                          <p className="text-sm text-red-800 dark:text-red-300">{validationError}</p>
                        </div>
                      )}
                      
                      <button
                        onClick={async () => {
                          try {
                            setValidationError('')
                            if (!validationCommit.trim()) {
                              setValidationError('Devi specificare il commit del mockup validato')
                              return
                            }
                            await updateStatus({ 
                              id: keydev._id, 
                              status: 'FrontValidated',
                              monthRef: validationMonth,
                              validatedMockupCommit: validationCommit.trim()
                            })
                          } catch (err) {
                            setValidationError(err instanceof Error ? err.message : 'Errore durante la validazione')
                          }
                        }}
                        disabled={!budgetForValidation || budgetForValidation.maxAlloc <= 0 || !validationCommit.trim()}
                        className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Valida Frontend per {monthOptions.find(m => m.value === validationMonth)?.label}
                      </button>
                    </div>
                  </div>
                )}

                {/* FrontValidated: TechValidator può prendere in carico */}
                {keydev.status === 'FrontValidated' && (userIsTechValidator || userIsAdmin) && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-300 mb-4">
                      Come TechValidator, puoi prendere in carico questo Sviluppo Chiave e iniziare lo sviluppo.
                      Puoi confermare o modificare il peso sviluppo dichiarato in fase di approvazione.
                    </p>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Peso dello sviluppo per validazione tech
                        </label>
                        <select
                          value={ownershipWeight}
                          onChange={(e) => setOwnershipWeight(parseFloat(e.target.value) as 0 | 0.25 | 0.5 | 0.75 | 1)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                        >
                          <option value={1}>1.00 - Sviluppo completo (100%)</option>
                          <option value={0.75}>0.75 - Sviluppo significativo (75%)</option>
                          <option value={0.5}>0.50 - Sviluppo medio (50%)</option>
                          <option value={0.25}>0.25 - Sviluppo leggero (25%)</option>
                          <option value={0}>0.00 - Nessuno sviluppo (0%)</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {keydev.weight !== undefined 
                            ? `Peso attualmente dichiarato: ${keydev.weight} (${(keydev.weight * 100).toFixed(0)}%)`
                            : 'Nessun peso dichiarato'}
                        </p>
                      </div>
                      <button
                        onClick={handleTakeOwnership}
                        className="px-4 py-2 bg-purple-600 dark:bg-purple-700 text-white rounded-md hover:bg-purple-700 dark:hover:bg-purple-600"
                      >
                        Prendi in Carico e Inizia Sviluppo
                      </button>
                    </div>
                  </div>
                )}

                {/* InProgress: Solo owner può dichiarare completato */}
                {keydev.status === 'InProgress' && (isOwner || userIsAdmin) && (
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                    <p className="text-sm text-purple-800 dark:text-purple-300 mb-4">
                      {isOwner ? 'Sei l\'owner di questo Sviluppo Chiave. ' : ''}
                      Puoi dichiararlo completato quando lo sviluppo è terminato.
                    </p>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Repository URL definitivo <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={repoUrl}
                          onChange={(e) => setRepoUrl(e.target.value)}
                          placeholder="https://github.com/..."
                          className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 font-mono text-sm ${
                            !repoUrl.trim() 
                              ? 'border-red-300 dark:border-red-600' 
                              : 'border-gray-300 dark:border-gray-600'
                          }`}
                          required
                        />
                        <p className={`mt-1 text-xs ${
                          !repoUrl.trim() 
                            ? 'text-red-500 dark:text-red-400' 
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {!repoUrl.trim() 
                            ? 'Obbligatorio: inserisci l\'URL del repository definitivo di sviluppo'
                            : 'Inserisci l\'URL del repository definitivo dove è stato sviluppato'
                          }
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Commit di Rilascio <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={releaseCommit}
                          onChange={(e) => setReleaseCommit(e.target.value)}
                          placeholder="es. abc1234 o hash completo del commit"
                          className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 font-mono text-sm ${
                            !releaseCommit.trim() 
                              ? 'border-red-300 dark:border-red-600' 
                              : 'border-gray-300 dark:border-gray-600'
                          }`}
                          required
                        />
                        <p className={`mt-1 text-xs ${
                          !releaseCommit.trim() 
                            ? 'text-red-500 dark:text-red-400' 
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {!releaseCommit.trim() 
                            ? 'Obbligatorio: inserisci l\'hash del commit di rilascio'
                            : 'Inserisci l\'hash del commit di rilascio quando completi lo sviluppo'
                          }
                        </p>
                      </div>
                      <button
                        onClick={handleMarkAsDone}
                        disabled={!repoUrl.trim() || !releaseCommit.trim()}
                        className="px-4 py-2 bg-emerald-600 dark:bg-emerald-700 text-white rounded-md hover:bg-emerald-700 dark:hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Dichiara Completato
                      </button>
                    </div>
                  </div>
                )}

                {/* Done: Messaggio di completamento */}
                {keydev.status === 'Done' && (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                    <p className="text-sm text-emerald-800 dark:text-emerald-300 mb-4">
                      Questo Sviluppo Chiave è stato completato con successo!
                    </p>
                    {userIsAdmin && (
                      <button
                        onClick={() => updateStatus({ id: keydev._id, status: 'Checked' })}
                        className="px-4 py-2 bg-orange-600 dark:bg-orange-700 text-white rounded-md hover:bg-orange-700 dark:hover:bg-orange-600"
                      >
                        Contrassegna come Controllato
                      </button>
                    )}
                  </div>
                )}

                {/* Checked: Messaggio di controllo completato */}
                {keydev.status === 'Checked' && (
                  <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                    <p className="text-sm text-orange-800 dark:text-orange-300">
                      Questo Sviluppo Chiave è stato controllato dall'admin aziendale.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sezione Penalità per Admin quando status è Done o Checked */}
          {!isNew && keydev && (keydev.status === 'Done' || keydev.status === 'Checked') && userIsAdmin && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                Controllo e Penalità
              </h2>

              {/* Riferimenti ai commit */}
              <div className="mb-6 space-y-4">
                {keydev.validatedMockupCommit && keydev.mockupRepoUrl && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Commit Mockup Validato
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded text-gray-800 dark:text-gray-200 font-mono">
                        {keydev.validatedMockupCommit}
                      </span>
                      <a
                        href={`${keydev.mockupRepoUrl}/commit/${keydev.validatedMockupCommit}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                      >
                        Vedi su GitHub
                      </a>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Repository: {keydev.mockupRepoUrl}
                    </p>
                  </div>
                )}

                {keydev.releaseCommit && keydev.repoUrl && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Commit di Rilascio
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded text-gray-800 dark:text-gray-200 font-mono">
                        {keydev.releaseCommit}
                      </span>
                      <a
                        href={`${keydev.repoUrl}/commit/${keydev.releaseCommit}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                      >
                        Vedi su GitHub
                      </a>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Repository: {keydev.repoUrl}
                    </p>
                  </div>
                )}
              </div>

              {/* Form per aggiungere penalità */}
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4">
                  Aggiungi Penalità
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Peso (0.00 - 1.00) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.10"
                      min="0"
                      max="1"
                      value={penaltyWeight}
                      onChange={(e) => setPenaltyWeight(e.target.value)}
                      placeholder="es. 0.10, 0.20, 0.50"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Valore da 0 a 1 (es. 0.10 per 10%, 0.20 per 20%)
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Descrizione (opzionale)
                    </label>
                    <textarea
                      value={penaltyDescription}
                      onChange={(e) => setPenaltyDescription(e.target.value)}
                      placeholder="Descrizione della penalità..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                    />
                  </div>
                  <button
                    onClick={async () => {
                      if (!penaltyWeight || parseFloat(penaltyWeight) < 0 || parseFloat(penaltyWeight) > 1) {
                        alert('Inserisci un peso valido tra 0 e 1')
                        return
                      }
                      // Arrotonda al multiplo di 0.05 più vicino per rispettare il validator
                      const weight = parseFloat(penaltyWeight)
                      const roundedWeight = Math.round(weight * 20) / 20
                      const validWeights = [0, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80, 0.85, 0.90, 0.95, 1] as const
                      const validWeight = validWeights.find(w => Math.abs(w - roundedWeight) < 0.001)
                      if (validWeight === undefined) {
                        alert('Il peso deve essere un multiplo di 0.05 (es. 0.05, 0.10, 0.15, ecc.)')
                        return
                      }
                      try {
                        await createPenalty({
                          keyDevId: keydev._id,
                          weight: validWeight,
                          description: penaltyDescription.trim() || undefined
                        })
                        setPenaltyWeight('')
                        setPenaltyDescription('')
                      } catch (error) {
                        alert(error instanceof Error ? error.message : 'Errore nell\'aggiunta della penalità')
                      }
                    }}
                    disabled={!penaltyWeight || parseFloat(penaltyWeight) < 0 || parseFloat(penaltyWeight) > 1}
                    className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Aggiungi Penalità
                  </button>
                </div>
              </div>

              {/* Lista penalità esistenti */}
              <div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4">
                  Penalità Applicate
                </h3>
                {penalties && penalties.length > 0 ? (
                  <div className="space-y-2">
                    {penalties.map((penalty) => (
                      <div
                        key={penalty._id}
                        className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-red-800 dark:text-red-300">
                              {(penalty.weight * 100).toFixed(0)}%
                            </span>
                            {penalty.description && (
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                - {penalty.description}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Aggiunta il {new Date(penalty.createdAt).toLocaleDateString('it-IT', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <button
                          onClick={async () => {
                            if (!confirm('Sei sicuro di voler rimuovere questa penalità?')) return
                            await removePenalty({ id: penalty._id })
                          }}
                          className="ml-4 px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                        >
                          Rimuovi
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Nessuna penalità applicata
                  </p>
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

                {keydev.validatedMockupCommit && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Commit Validato dal Business
                    </label>
                    <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded text-gray-800 dark:text-gray-200 font-mono">
                      {keydev.validatedMockupCommit}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

            </>
          )}
        </div>

        {/* Sidebar */}
        {!isNew && keydev && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-4">Informazioni Sviluppo Chiave</h3>
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
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Team</dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-100">
                    {teams?.find((t) => t._id === keydev.teamId)?.name || 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Requester</dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-100">
                    {users?.find((u) => u._id === keydev.requesterId)?.name || 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">RepoMockup</dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-100">
                    {keydev.mockupRepoUrl ? (
                      <a
                        href={keydev.mockupRepoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline block truncate"
                        title={keydev.mockupRepoUrl}
                      >
                        {truncateUrl(keydev.mockupRepoUrl, 50)}
                      </a>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500 italic">Non assegnato</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">RepoUrl ufficiale</dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-100">
                    {keydev.repoUrl ? (
                      <a
                        href={keydev.repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline block truncate"
                        title={keydev.repoUrl}
                      >
                        {truncateUrl(keydev.repoUrl, 50)}
                      </a>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500 italic">Non assegnato</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Attori del Flusso */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-4">Attori del Flusso</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Approvato da (TechValidator)</dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-100">
                    {keydev.techValidatorId ? (
                      users?.find((u) => u._id === keydev.techValidatorId)?.name || 'N/A'
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500 italic">Non assegnato</span>
                    )}
                  </dd>
                  {(keydev.techValidatedAt || keydev.approvedAt) && (
                    <dd className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(keydev.techValidatedAt || keydev.approvedAt!).toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </dd>
                  )}
                </div>
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Validato da (BusinessValidator)</dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-100">
                    {keydev.businessValidatorId ? (
                      users?.find((u) => u._id === keydev.businessValidatorId)?.name || 'N/A'
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500 italic">Non assegnato</span>
                    )}
                  </dd>
                  {(keydev.businessValidatedAt || keydev.frontValidatedAt) && (
                    <dd className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(keydev.businessValidatedAt || keydev.frontValidatedAt!).toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </dd>
                  )}
                </div>
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Owner (Sviluppatore)</dt>
                  {(userIsAdmin || userIsTechValidator) ? (
                    <div className="space-y-2">
                      <select
                        value={selectedOwnerId}
                        onChange={(e) => setSelectedOwnerId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 text-sm"
                      >
                        <option value="">Seleziona owner...</option>
                        {users?.filter(u => hasRole(u.roles as Role[] | undefined, 'TechValidator') || isAdmin(u.roles as Role[] | undefined))
                          .map((u) => (
                            <option key={u._id} value={u._id}>
                              {u.name}
                            </option>
                          ))}
                      </select>
                      <button
                        onClick={async () => {
                          if (!selectedOwnerId) {
                            alert('Seleziona un owner')
                            return
                          }
                          try {
                            await assignOwner({
                              id: keydev._id,
                              ownerId: selectedOwnerId as Id<'users'>
                            })
                          } catch (error) {
                            alert(error instanceof Error ? error.message : 'Errore nell\'assegnazione dell\'owner')
                          }
                        }}
                        disabled={!selectedOwnerId || selectedOwnerId === keydev.ownerId}
                        className="w-full px-3 py-1 text-sm bg-purple-600 dark:bg-purple-700 text-white rounded-md hover:bg-purple-700 dark:hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {keydev.ownerId ? 'Aggiorna Owner' : 'Assegna Owner'}
                      </button>
                    </div>
                  ) : (
                    <dd className="font-medium text-purple-700 dark:text-purple-400">
                      {keydev.ownerId ? (
                        users?.find((u) => u._id === keydev.ownerId)?.name || 'N/A'
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 italic">Non assegnato</span>
                      )}
                    </dd>
                  )}
                </div>
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Completato il</dt>
                  <dd className="font-medium text-emerald-700 dark:text-emerald-400">
                    {keydev.releasedAt ? (
                      new Date(keydev.releasedAt).toLocaleDateString('it-IT')
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500 italic">Non completato</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Peso sviluppo</dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-100">
                    {keydev.weight !== undefined ? (
                      `${keydev.weight} (${(keydev.weight * 100).toFixed(0)}%)`
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500 italic">Non assegnato</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-4">Label Bloccanti</h3>
              
              {/* Mostra tutti i label possibili come pulsanti cliccabili */}
              <div className="mb-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Aggiungi blocking label:</p>
                <div className="flex flex-wrap gap-2">
                  {availableLabels?.map((label) => {
                    const existingOpen = blockingLabels?.find((bl) => bl.labelId === label._id && bl.status === 'Open')
                    const existingClosed = blockingLabels?.find((bl) => bl.labelId === label._id && bl.status === 'Closed')
                    return (
                      <button
                        key={label._id}
                        onClick={() => handleAddBlockingLabel(label._id)}
                        disabled={!!existingOpen}
                        className={`px-3 py-1 text-xs rounded-full transition-colors ${
                          existingOpen
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 cursor-not-allowed'
                            : existingClosed
                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                        }`}
                        title={existingOpen ? 'Label già presente (aperta)' : existingClosed ? 'Label già presente (chiusa) - clicca per aggiungerne una nuova' : 'Clicca per aggiungere questa blocking label'}
                      >
                        {label.label}
                        {existingOpen && ' ✓'}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Lista delle blocking labels esistenti */}
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
                        {bl.label.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${bl.status === 'Open' ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}`}>
                          {bl.status === 'Open' ? 'Aperto' : 'Chiuso'}
                        </span>
                        <button
                          onClick={() => handleRemoveBlockingLabel(bl._id)}
                          className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 px-2 py-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30"
                          title="Rimuovi blocking label"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">Nessuna label bloccante presente</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
