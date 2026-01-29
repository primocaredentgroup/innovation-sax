import { Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState, useEffect, useMemo } from 'react'
import type { Id } from '../../convex/_generated/dataModel'

export default function KeyDevNewPage() {
  const navigate = useNavigate()
  const createKeyDev = useMutation(api.keydevs.create)

  const departments = useQuery(api.departments.list)
  const teams = useQuery(api.teams.list)
  const currentUser = useQuery(api.users.getCurrentUser)

  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [selectedDeptId, setSelectedDeptId] = useState<string>('')
  const [selectedTeamId, setSelectedTeamId] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentMonth = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }, [])

  // Calcola i valori iniziali per dipartimento e team in base all'utente
  const getInitialDeptId = () => {
    if (currentUser?.deptId && departments) {
      const userDept = departments.find(d => d._id === currentUser.deptId)
      return userDept?._id || ''
    }
    return ''
  }

  const getInitialTeamId = (deptId: string) => {
    if (deptId && teams && departments) {
      const userDept = departments.find(d => d._id === deptId)
      if (userDept && userDept.teamIds.length > 0) {
        return userDept.teamIds[0]
      }
    }
    return ''
  }

  // Inizializza i valori quando i dati sono disponibili
  useEffect(() => {
    const newDeptId = getInitialDeptId()
    const newTeamId = getInitialTeamId(newDeptId)
    if (newDeptId && newDeptId !== selectedDeptId) {
      setSelectedDeptId(newDeptId)
    }
    if (newTeamId && newTeamId !== selectedTeamId) {
      setSelectedTeamId(newTeamId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.deptId, departments, teams])

  // Filtra i team in base al dipartimento selezionato
  const availableTeams = useMemo(() => {
    if (!teams || !selectedDeptId) return []
    const selectedDept = departments?.find(d => d._id === selectedDeptId)
    if (!selectedDept) return []
    return teams.filter(t => selectedDept.teamIds.includes(t._id))
  }, [teams, selectedDeptId, departments])

  // Verifica se il form è valido (dipartimento e team selezionati)
  const isFormValid = selectedDeptId !== '' && selectedTeamId !== '' && availableTeams.some(t => t._id === selectedTeamId)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    
    if (!isFormValid) {
      setError('Seleziona un dipartimento e un team')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await createKeyDev({
        title: title.trim(),
        desc: desc.trim(),
        teamId: selectedTeamId as Id<'teams'>,
        deptId: selectedDeptId as Id<'departments'>
      })
      navigate({ to: '/keydevs/$id', params: { id: result.readableId } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante la creazione dello Sviluppo Chiave')
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link
          to="/keydevs"
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
        >
          ← Torna alla lista
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Nuovo Sviluppo Chiave</h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Titolo
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Descrizione / Obiettivo dello Sviluppo
            </label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={4}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Dipartimento richiedente
              </label>
              <select
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Team
              </label>
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                required
                disabled={!selectedDeptId || availableTeams.length === 0}
              >
                <option value="">
                  {selectedDeptId && availableTeams.length === 0 
                    ? 'Nessun team disponibile' 
                    : 'Seleziona...'}
                </option>
                {availableTeams.map((t) => (
                  <option key={t._id} value={t._id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || !isFormValid}
              className={`px-4 py-2 rounded-md ${
                isSubmitting || !isFormValid
                  ? 'bg-gray-400 dark:bg-gray-600 text-gray-200 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
              }`}
            >
              {isSubmitting ? 'Creazione...' : 'Crea Sviluppo Chiave'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
