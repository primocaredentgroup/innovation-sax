import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState, useMemo, useEffect } from 'react'
import type { Id } from '../../convex/_generated/dataModel'
import PrioritySelector from '../components/PrioritySelector'

// Tipo per i ruoli
type Role = 'Requester' | 'BusinessValidator' | 'TechValidator' | 'Admin'

// Tipo per lo status
type KeyDevStatus = 'Draft' | 'MockupDone' | 'Approved' | 'Rejected' | 'FrontValidated' | 'InProgress' | 'Done' | 'Checked'

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

// Ordine degli stati per la visualizzazione
const statusOrder = ['Draft', 'MockupDone', 'Rejected', 'Approved', 'FrontValidated', 'InProgress', 'Done', 'Checked']

// Helper per ottenere solo gli stati precedenti (incluso quello attuale)
const getPreviousStatuses = (currentStatus: string): string[] => {
  const currentIndex = statusOrder.indexOf(currentStatus)
  if (currentIndex === -1) return statusOrder
  return statusOrder.slice(0, currentIndex + 1)
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
  Draft: 'Aggiungi il mockupRepoUrl e poi dichiara "Mockup Terminato" quando sei pronto',
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
  const updateRepoUrl = useMutation(api.keydevs.updateRepoUrl)
  const updateMonth = useMutation(api.keydevs.updateMonth)
  const createBlockingLabel = useMutation(api.blockingLabels.create)
  const removeBlockingLabel = useMutation(api.blockingLabels.remove)
  const penalties = useQuery(
    api.penalties.listByKeyDev,
    isNew || !keydev ? 'skip' : { keyDevId: keydev._id }
  )
  const createPenalty = useMutation(api.penalties.create)
  const removePenalty = useMutation(api.penalties.remove)
  const softDeleteKeyDev = useMutation(api.keydevs.softDelete)

  const currentMonth = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }, [])

  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
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
  const [editingMockupRepoUrl, setEditingMockupRepoUrl] = useState('')
  const [editingRepoUrl, setEditingRepoUrl] = useState('')
  const [isEditingMockupRepoUrl, setIsEditingMockupRepoUrl] = useState(false)
  const [isEditingRepoUrl, setIsEditingRepoUrl] = useState(false)
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

  // Aggiorna i valori di editing quando cambia il keydev
  useEffect(() => {
    const mockupRepoUrl = keydev?.mockupRepoUrl || ''
    const repoUrl = keydev?.repoUrl || ''
    setEditingMockupRepoUrl(mockupRepoUrl)
    setEditingRepoUrl(repoUrl)
    // Reset degli stati di editing quando cambia il keydev
    setIsEditingMockupRepoUrl(false)
    setIsEditingRepoUrl(false)
  }, [keydev?.mockupRepoUrl, keydev?.repoUrl])
  
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

  // Genera opzioni mese per dropdown sidebar (4 mesi passati, mese corrente e 6 mesi futuri)
  const inlineMonthOptions = useMemo(() => {
    const options = []
    const now = new Date()
    for (let i = -4; i <= 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const ref = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const label = date.toLocaleDateString('it-IT', { month: 'short', year: 'numeric' })
      options.push({ value: ref, label })
    }
    return options
  }, [])

  // Handler per cambio mese nella sidebar
  const handleMonthChange = async (newMonth: string) => {
    if (!keydev || newMonth === keydev.monthRef) return
    try {
      await updateMonth({
        id: keydev._id,
        monthRef: newMonth || null
      })
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Errore durante il cambio mese')
    }
  }

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

  // Formatta il mese per la visualizzazione breve
  const formatMonthShort = (monthRef: string | undefined) => {
    if (!monthRef) return '-'
    const [year, month] = monthRef.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1, 1)
    return date.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' })
  }

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

  const handleUpdateMockupRepoUrl = async () => {
    if (!keydev) return
    await linkMockupRepo({ 
      id: keydev._id, 
      mockupRepoUrl: editingMockupRepoUrl.trim() 
    })
    setIsEditingMockupRepoUrl(false)
  }

  const handleUpdateRepoUrl = async () => {
    if (!keydev || !editingRepoUrl.trim()) return
    await updateRepoUrl({ 
      id: keydev._id, 
      repoUrl: editingRepoUrl.trim() 
    })
    setIsEditingRepoUrl(false)
  }

  const handleCancelEditMockupRepoUrl = () => {
    setEditingMockupRepoUrl(keydev?.mockupRepoUrl || '')
    setIsEditingMockupRepoUrl(false)
  }

  const handleCancelEditRepoUrl = () => {
    setEditingRepoUrl(keydev?.repoUrl || '')
    setIsEditingRepoUrl(false)
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
    <div className="w-full max-w-full overflow-x-hidden">
      {/* Header responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 min-w-0">
          <Link
            to="/keydevs"
            search={{ month: keydev?.monthRef || currentMonth }}
            className="text-sm sm:text-base text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 whitespace-nowrap"
          >
            ← Torna alla lista
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
              {isNew ? 'Nuovo Sviluppo Chiave' : keydev?.title}
            </h1>
            {!isNew && keydev && (
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <span className="px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-mono bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  {keydev.readableId}
                </span>
                {/* Link Note migliorato */}
                <Link
                  to="/keydevs/$id/notes"
                  params={{ id }}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 hover:from-blue-700 hover:to-blue-800 dark:hover:from-blue-600 dark:hover:to-blue-700 shadow-md hover:shadow-lg text-white border border-blue-800 dark:border-blue-400"
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span className="text-white">Note</span>
                  {keydev.notesCount !== undefined && keydev.notesCount > 0 && (
                    <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-white dark:bg-blue-800 text-blue-700 dark:text-white text-xs font-bold min-w-5 sm:min-w-6 flex items-center justify-center border border-blue-800 dark:border-blue-200">
                      {keydev.notesCount}
                    </span>
                  )}
                </Link>
                {/* PrioritySelector migliorato accanto al bottone Note */}
                <div className="flex items-center">
                  <PrioritySelector 
                    keyDevId={keydev._id} 
                    currentPriority={keydev.priority}
                    compact={true}
                  />
                </div>
                {/* Dropdown status sulla stessa riga */}
                <select
                  value={keydev.status}
                  onChange={async (e) => {
                    try {
                      await updateStatus({ id: keydev._id, status: e.target.value as KeyDevStatus })
                    } catch (error) {
                      alert(error instanceof Error ? error.message : 'Errore nel cambio di stato')
                    }
                  }}
                  className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm border-0 ${statusColors[keydev.status]} cursor-pointer`}
                >
                  {getPreviousStatuses(keydev.status).map((status) => (
                    <option key={status} value={status} className="bg-white dark:bg-gray-800">
                      {statusLabels[status]}
                    </option>
                  ))}
                </select>
                {/* Pulsante per riportare in Bozza quando rifiutato */}
                {keydev.status === 'Rejected' && (isRequester || userIsAdmin) && (
                  <button
                    onClick={async () => {
                      if (!confirm('Sei sicuro di voler riportare questo sviluppo in Bozza? Potrai modificare il mockupRepoUrl e ripassarlo a "Mockup Terminato".')) return
                      await updateStatus({ id: keydev._id, status: 'Draft' })
                    }}
                    className="px-3 sm:px-4 py-1 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 text-xs sm:text-sm font-medium whitespace-nowrap"
                    title="Riporta in Bozza per modificare il mockup"
                  >
                    ↶ Riporta in Bozza
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        {/* Pulsante cestino per soft-delete - in alto a destra */}
        {!isNew && keydev && (
          <button
            onClick={async () => {
              if (!confirm('Sei sicuro di voler eliminare questo sviluppo chiave? L\'operazione non può essere annullata.')) return
              try {
                await softDeleteKeyDev({ id: keydev._id })
                navigate({ to: '/keydevs', search: { month: keydev.monthRef || currentMonth } })
              } catch (error) {
                alert(error instanceof Error ? error.message : 'Errore durante l\'eliminazione')
              }
            }}
            className="self-start sm:self-auto px-3 py-1.5 rounded-md text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border border-red-300 dark:border-red-700 hover:border-red-400 dark:hover:border-red-600"
            title="Elimina sviluppo chiave"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      {/* Layout responsive: singola colonna su mobile, due colonne su desktop */}
      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Main Form */}
        <div className="w-full lg:col-span-2 space-y-4 sm:space-y-6">
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrizione / Obiettivo dello Sviluppo</label>
                <textarea
                  name="desc"
                  defaultValue={keydev?.desc || ''}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  required
                />
              </div>

              {isNew && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                {/* Draft: Mostra input per inserire/modificare URL mockup repo e pulsante separato per dichiarare Mockup Terminato */}
                {keydev.status === 'Draft' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Repository URL Mockup
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
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
                          className="px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded-md hover:bg-gray-800 dark:hover:bg-gray-600 disabled:opacity-50 whitespace-nowrap"
                        >
                          Salva URL
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Puoi salvare l'URL del repository mockup senza cambiare lo stato
                      </p>
                    </div>
                    
                    {/* Pulsante separato per dichiarare Mockup Terminato */}
                    {keydev.mockupRepoUrl && (
                      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-3">
                          Il repository mockup è stato salvato. Quando sei pronto, puoi dichiarare il mockup come terminato.
                        </p>
                        <button
                          onClick={async () => {
                            if (!keydev.mockupRepoUrl) {
                              alert('Devi prima salvare l\'URL del repository mockup')
                              return
                            }
                            await updateStatus({ id: keydev._id, status: 'MockupDone' })
                          }}
                          className="px-4 py-2 bg-yellow-600 dark:bg-yellow-700 text-white rounded-md hover:bg-yellow-700 dark:hover:bg-yellow-600 whitespace-nowrap"
                        >
                          Dichiara Mockup Terminato
                        </button>
                      </div>
                    )}
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
                        
                        <div className="flex flex-col sm:flex-row gap-2">
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
                        <div className="flex flex-col sm:flex-row gap-2">
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
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Commit Validato dal Business <span className="text-red-500">*</span>
                          </label>
                          {keydev.mockupRepoUrl && (
                            <a
                              href={`${keydev.mockupRepoUrl.replace(/\/+$/, '')}/commits/`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors whitespace-nowrap"
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
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded text-gray-800 dark:text-gray-200 font-mono break-all">
                        {keydev.validatedMockupCommit}
                      </span>
                      <a
                        href={`${keydev.mockupRepoUrl}/commit/${keydev.validatedMockupCommit}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline text-sm whitespace-nowrap"
                      >
                        Vedi su GitHub
                      </a>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-all">
                      Repository: {keydev.mockupRepoUrl}
                    </p>
                  </div>
                )}

                {keydev.releaseCommit && keydev.repoUrl && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Commit di Rilascio
                    </label>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded text-gray-800 dark:text-gray-200 font-mono break-all">
                        {keydev.releaseCommit}
                      </span>
                      <a
                        href={`${keydev.repoUrl}/commit/${keydev.releaseCommit}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline text-sm whitespace-nowrap"
                      >
                        Vedi su GitHub
                      </a>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-all">
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
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-red-800 dark:text-red-300">
                              {(penalty.weight * 100).toFixed(0)}%
                            </span>
                            {penalty.description && (
                              <span className="text-sm text-gray-700 dark:text-gray-300 wrap-break-word">
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
                          className="sm:ml-4 px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 rounded whitespace-nowrap self-start sm:self-auto"
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

          </>
        </div>

        {/* Sidebar */}
        {!isNew && keydev && (
          <div className="w-full lg:w-auto space-y-4 sm:space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-4">Informazioni Sviluppo Chiave</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Mese</dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-100">
                    {['Draft', 'MockupDone', 'Approved'].includes(keydev.status) ? (
                      <select
                        value={keydev.monthRef || ''}
                        onChange={(e) => handleMonthChange(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 text-sm ${
                          keydev.monthRef 
                            ? 'border-gray-300 dark:border-gray-600' 
                            : 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                        }`}
                      >
                        <option value="">Seleziona...</option>
                        {inlineMonthOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className={keydev.monthRef ? '' : 'text-gray-400 dark:text-gray-500 italic'}>
                        {keydev.monthRef ? formatMonthShort(keydev.monthRef) : 'Non assegnato'}
                      </span>
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
                  <dt className="text-sm text-gray-500 dark:text-gray-400 mb-2">Priorità</dt>
                  <dd>
                    <PrioritySelector 
                      keyDevId={keydev._id} 
                      currentPriority={keydev.priority}
                    />
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400 mb-2">RepoMockup</dt>
                  <dd>
                    {isEditingMockupRepoUrl ? (
                      <div className="space-y-2">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            value={editingMockupRepoUrl}
                            onChange={(e) => setEditingMockupRepoUrl(e.target.value)}
                            placeholder="https://github.com/..."
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 text-sm font-mono"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleUpdateMockupRepoUrl}
                              disabled={editingMockupRepoUrl.trim() === (keydev.mockupRepoUrl || '')}
                              className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm whitespace-nowrap"
                            >
                              Salva
                            </button>
                            <button
                              onClick={handleCancelEditMockupRepoUrl}
                              className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 text-sm whitespace-nowrap"
                            >
                              Annulla
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group">
                        {keydev.mockupRepoUrl ? (
                          <a
                            href={keydev.mockupRepoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all flex-1"
                            title={keydev.mockupRepoUrl}
                          >
                            {truncateUrl(keydev.mockupRepoUrl, 40)}
                          </a>
                        ) : (
                          <span className="text-sm text-gray-400 dark:text-gray-500 italic">Non assegnato</span>
                        )}
                        <button
                          onClick={() => {
                            setEditingMockupRepoUrl(keydev.mockupRepoUrl || '')
                            setIsEditingMockupRepoUrl(true)
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                          title="Modifica"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400 mb-2">RepoUrl ufficiale</dt>
                  <dd>
                    {isEditingRepoUrl ? (
                      <div className="space-y-2">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            value={editingRepoUrl}
                            onChange={(e) => setEditingRepoUrl(e.target.value)}
                            placeholder="https://github.com/..."
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 text-sm font-mono"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleUpdateRepoUrl}
                              disabled={editingRepoUrl.trim() === (keydev.repoUrl || '') || !editingRepoUrl.trim()}
                              className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm whitespace-nowrap"
                            >
                              Salva
                            </button>
                            <button
                              onClick={handleCancelEditRepoUrl}
                              className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 text-sm whitespace-nowrap"
                            >
                              Annulla
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group">
                        {keydev.repoUrl ? (
                          <a
                            href={keydev.repoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all flex-1"
                            title={keydev.repoUrl}
                          >
                            {truncateUrl(keydev.repoUrl, 40)}
                          </a>
                        ) : (
                          <span className="text-sm text-gray-400 dark:text-gray-500 italic">Non assegnato</span>
                        )}
                        <button
                          onClick={() => {
                            setEditingRepoUrl(keydev.repoUrl || '')
                            setIsEditingRepoUrl(true)
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                          title="Modifica"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </div>
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
                  <dd>
                    <select
                      value={selectedOwnerId}
                      onChange={async (e) => {
                        if (!e.target.value) return
                        try {
                          await assignOwner({
                            id: keydev._id,
                            ownerId: e.target.value as Id<'users'>
                          })
                        } catch (error) {
                          alert(error instanceof Error ? error.message : 'Errore nell\'assegnazione dell\'owner')
                        }
                      }}
                      disabled={!userIsAdmin && !userIsTechValidator}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">Nessun owner</option>
                      {users?.filter(u => hasRole(u.roles as Role[] | undefined, 'TechValidator') || isAdmin(u.roles as Role[] | undefined))
                        .map((u) => (
                          <option key={u._id} value={u._id}>
                            {u.name}
                          </option>
                        ))}
                    </select>
                  </dd>
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
                      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 py-2 rounded ${
                        bl.status === 'Open' ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' : 'bg-gray-50 dark:bg-gray-700/50'
                      }`}
                    >
                      <span className={`wrap-break-word ${bl.status === 'Closed' ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
                        {bl.label.label}
                      </span>
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <span className={`text-xs whitespace-nowrap ${bl.status === 'Open' ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}`}>
                          {bl.status === 'Open' ? 'Aperto' : 'Chiuso'}
                        </span>
                        <button
                          onClick={() => handleRemoveBlockingLabel(bl._id)}
                          className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 px-2 py-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 whitespace-nowrap"
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
