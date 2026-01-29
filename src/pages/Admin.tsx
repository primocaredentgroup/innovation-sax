import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState } from 'react'
import type { Id } from '../../convex/_generated/dataModel'

type Tab = 'teams' | 'departments' | 'blockingLabels'

export default function AdminPage() {
  const currentUser = useQuery(api.users.getCurrentUser)
  const teams = useQuery(api.teams.list)
  const departments = useQuery(api.departments.list)
  const createTeam = useMutation(api.teams.create)
  const updateTeam = useMutation(api.teams.update)
  const removeTeam = useMutation(api.teams.remove)
  const createDepartment = useMutation(api.departments.create)
  const updateDepartment = useMutation(api.departments.update)
  const removeDepartment = useMutation(api.departments.remove)
  const labels = useQuery(api.labels.list)
  const createLabel = useMutation(api.labels.create)
  const updateLabel = useMutation(api.labels.update)
  const removeLabel = useMutation(api.labels.remove)

  const [activeTab, setActiveTab] = useState<Tab>('teams')
  const [editingTeam, setEditingTeam] = useState<Id<'teams'> | null>(null)
  const [editingDepartment, setEditingDepartment] = useState<Id<'departments'> | null>(null)
  const [editingLabel, setEditingLabel] = useState<Id<'labels'> | null>(null)
  const [newTeamName, setNewTeamName] = useState('')
  const [newDepartmentName, setNewDepartmentName] = useState('')
  const [newDepartmentTeams, setNewDepartmentTeams] = useState<Id<'teams'>[]>([])
  const [editTeamName, setEditTeamName] = useState('')
  const [editDepartmentName, setEditDepartmentName] = useState('')
  const [editDepartmentTeams, setEditDepartmentTeams] = useState<Id<'teams'>[]>([])
  const [newLabelValue, setNewLabelValue] = useState('')
  const [newLabelLabel, setNewLabelLabel] = useState('')
  const [editLabelValue, setEditLabelValue] = useState('')
  const [editLabelLabel, setEditLabelLabel] = useState('')

  // Solo Admin può accedere
  if (!currentUser?.roles?.includes('Admin')) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
        <p className="text-red-600 dark:text-red-400">Accesso negato. Solo gli amministratori possono accedere a questa pagina.</p>
      </div>
    )
  }

  // Gestione Team
  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return
    await createTeam({ name: newTeamName.trim() })
    setNewTeamName('')
  }

  const handleUpdateTeam = async (id: Id<'teams'>) => {
    await updateTeam({ id, name: editTeamName })
    setEditingTeam(null)
    setEditTeamName('')
  }

  const handleStartEditTeam = (id: Id<'teams'>, currentName: string) => {
    setEditingTeam(id)
    setEditTeamName(currentName)
  }

  const handleCancelEditTeam = () => {
    setEditingTeam(null)
    setEditTeamName('')
  }

  const handleRemoveTeam = async (id: Id<'teams'>) => {
    if (!confirm('Sei sicuro di voler eliminare questo team?')) return
    await removeTeam({ id })
  }

  // Gestione Dipartimenti
  const handleCreateDepartment = async () => {
    if (!newDepartmentName.trim()) return
    await createDepartment({ name: newDepartmentName.trim(), teamIds: newDepartmentTeams })
    setNewDepartmentName('')
    setNewDepartmentTeams([])
  }

  const handleUpdateDepartment = async (id: Id<'departments'>) => {
    await updateDepartment({ id, name: editDepartmentName, teamIds: editDepartmentTeams })
    setEditingDepartment(null)
    setEditDepartmentName('')
    setEditDepartmentTeams([])
  }

  const handleStartEditDepartment = (id: Id<'departments'>, currentName: string, currentTeams: Id<'teams'>[]) => {
    setEditingDepartment(id)
    setEditDepartmentName(currentName)
    setEditDepartmentTeams(currentTeams)
  }

  const handleCancelEditDepartment = () => {
    setEditingDepartment(null)
    setEditDepartmentName('')
    setEditDepartmentTeams([])
  }

  const handleRemoveDepartment = async (id: Id<'departments'>) => {
    if (!confirm('Sei sicuro di voler eliminare questo dipartimento?')) return
    await removeDepartment({ id })
  }

  // Gestione Labels
  const handleCreateLabel = async () => {
    if (!newLabelValue.trim() || !newLabelLabel.trim()) return
    try {
      await createLabel({ value: newLabelValue.trim(), label: newLabelLabel.trim() })
      setNewLabelValue('')
      setNewLabelLabel('')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Errore nella creazione della label')
    }
  }

  const handleUpdateLabel = async (id: Id<'labels'>) => {
    if (!editLabelValue.trim() || !editLabelLabel.trim()) return
    try {
      await updateLabel({ id, value: editLabelValue.trim(), label: editLabelLabel.trim() })
      setEditingLabel(null)
      setEditLabelValue('')
      setEditLabelLabel('')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Errore nell\'aggiornamento della label')
    }
  }

  const handleStartEditLabel = (id: Id<'labels'>, currentValue: string, currentLabel: string) => {
    setEditingLabel(id)
    setEditLabelValue(currentValue)
    setEditLabelLabel(currentLabel)
  }

  const handleCancelEditLabel = () => {
    setEditingLabel(null)
    setEditLabelValue('')
    setEditLabelLabel('')
  }

  const handleRemoveLabel = async (id: Id<'labels'>) => {
    if (!confirm('Sei sicuro di voler eliminare questa label? Non sarà possibile eliminarla se è ancora in uso da blocking labels.')) return
    try {
      await removeLabel({ id })
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Errore nell\'eliminazione della label')
    }
  }


  return (
    <div className="w-full max-w-full">
      <div className="mb-4 lg:mb-6">
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-gray-100">Amministrazione</h1>
        <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400 mt-1">Gestisci team, dipartimenti, budget totale e blocking labels</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-4 lg:mb-6 overflow-x-auto">
        <nav className="-mb-px flex space-x-4 lg:space-x-8 min-w-max lg:min-w-0">
          <button
            onClick={() => setActiveTab('teams')}
            className={`py-3 lg:py-4 px-1 border-b-2 font-medium text-xs lg:text-sm whitespace-nowrap ${
              activeTab === 'teams'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Team
          </button>
          <button
            onClick={() => setActiveTab('departments')}
            className={`py-3 lg:py-4 px-1 border-b-2 font-medium text-xs lg:text-sm whitespace-nowrap ${
              activeTab === 'departments'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Dipartimenti
          </button>
          <button
            onClick={() => setActiveTab('blockingLabels')}
            className={`py-3 lg:py-4 px-1 border-b-2 font-medium text-xs lg:text-sm whitespace-nowrap ${
              activeTab === 'blockingLabels'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Blocking Labels
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'teams' && (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        {/* Team */}
        <div className="px-4 lg:px-6 py-3 lg:py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-gray-100">Team</h2>
        </div>
        <div className="p-4 lg:p-6">
          <div className="mb-4 flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateTeam()}
              placeholder="Nome team"
              className="flex-1 px-3 py-2 text-sm lg:text-base border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
            />
            <button
              onClick={handleCreateTeam}
              className="px-4 py-2 text-sm lg:text-base bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 whitespace-nowrap"
            >
              Aggiungi
            </button>
          </div>

          <div className="overflow-x-auto -mx-4 lg:mx-0">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700">
                    <th className="px-3 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold text-gray-900 dark:text-gray-100">Nome</th>
                    <th className="px-3 lg:px-4 py-2 lg:py-3 text-center text-xs lg:text-sm font-semibold text-gray-900 dark:text-gray-100">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {teams?.map((team) => {
                    const isEditing = editingTeam === team._id
                    const displayName = isEditing ? editTeamName : team.name

                    return (
                      <tr key={team._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-3 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-900 dark:text-gray-100">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editTeamName}
                              onChange={(e) => setEditTeamName(e.target.value)}
                              className="w-full px-2 py-1 text-xs lg:text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:text-gray-100"
                              autoFocus
                            />
                          ) : (
                            displayName
                          )}
                        </td>
                        <td className="px-3 lg:px-4 py-2 lg:py-3 text-center">
                          {isEditing ? (
                            <div className="flex gap-1 lg:gap-2 justify-center flex-wrap">
                              <button
                                onClick={() => handleUpdateTeam(team._id)}
                                className="px-2 lg:px-3 py-1 text-xs lg:text-sm bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
                              >
                                Salva
                              </button>
                              <button
                                onClick={handleCancelEditTeam}
                                className="px-2 lg:px-3 py-1 text-xs lg:text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
                              >
                                Annulla
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-1 lg:gap-2 justify-center flex-wrap">
                              <button
                                onClick={() => handleStartEditTeam(team._id, team.name)}
                                className="px-2 lg:px-3 py-1 text-xs lg:text-sm bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
                              >
                                Modifica
                              </button>
                              <button
                                onClick={() => handleRemoveTeam(team._id)}
                                className="px-2 lg:px-3 py-1 text-xs lg:text-sm bg-red-600 dark:bg-red-700 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-600"
                              >
                                Elimina
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {teams?.length === 0 && (
              <div className="p-6 lg:p-8 text-center text-sm lg:text-base text-gray-500 dark:text-gray-400">Nessun team presente</div>
            )}
          </div>
        </div>
      </div>
      )}

      {activeTab === 'departments' && (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        {/* Dipartimenti */}
        <div className="px-4 lg:px-6 py-3 lg:py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-gray-100">Dipartimenti</h2>
        </div>
        <div className="p-4 lg:p-6">
          <div className="mb-4 space-y-2">
            <input
              type="text"
              value={newDepartmentName}
              onChange={(e) => setNewDepartmentName(e.target.value)}
              placeholder="Nome dipartimento"
              className="w-full px-3 py-2 text-sm lg:text-base border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
            />
            <div>
              <label className="block text-xs lg:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Team associati</label>
              <div className="flex flex-wrap gap-2">
                {teams?.map((team) => (
                  <label key={team._id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newDepartmentTeams.includes(team._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewDepartmentTeams([...newDepartmentTeams, team._id])
                        } else {
                          setNewDepartmentTeams(newDepartmentTeams.filter((id) => id !== team._id))
                        }
                      }}
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs lg:text-sm text-gray-700 dark:text-gray-300">{team.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <button
              onClick={handleCreateDepartment}
              className="w-full sm:w-auto px-4 py-2 text-sm lg:text-base bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
            >
              Aggiungi Dipartimento
            </button>
          </div>

          <div className="overflow-x-auto -mx-4 lg:mx-0">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700 border-b">
                    <th className="px-3 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold text-gray-900 dark:text-gray-100">Nome</th>
                    <th className="px-3 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold text-gray-900 dark:text-gray-100">Team</th>
                    <th className="px-3 lg:px-4 py-2 lg:py-3 text-center text-xs lg:text-sm font-semibold text-gray-900 dark:text-gray-100">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {departments?.map((dept) => {
                    const isEditing = editingDepartment === dept._id

                    return (
                      <tr key={dept._id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700">
                        <td className="px-3 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-900 dark:text-gray-100">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editDepartmentName}
                              onChange={(e) => setEditDepartmentName(e.target.value)}
                              className="w-full px-2 py-1 text-xs lg:text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:text-gray-100"
                            />
                          ) : (
                            dept.name
                          )}
                        </td>
                        <td className="px-3 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm">
                          {isEditing ? (
                            <div className="flex flex-wrap gap-2">
                              {teams?.map((team) => (
                                <label key={team._id} className="flex items-center gap-1">
                                  <input
                                    type="checkbox"
                                    checked={editDepartmentTeams.includes(team._id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setEditDepartmentTeams([...editDepartmentTeams, team._id])
                                      } else {
                                        setEditDepartmentTeams(editDepartmentTeams.filter((id) => id !== team._id))
                                      }
                                    }}
                                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-xs text-gray-700 dark:text-gray-300">{team.name}</span>
                                </label>
                              ))}
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {dept.teamIds
                                .map((teamId) => teams?.find((t) => t._id === teamId))
                                .filter(Boolean)
                                .map((team) => (
                                  <span
                                    key={team!._id}
                                    className="px-2 py-1 text-xs rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                                  >
                                    {team!.name}
                                  </span>
                                ))}
                            </div>
                          )}
                        </td>
                        <td className="px-3 lg:px-4 py-2 lg:py-3 text-center">
                          {isEditing ? (
                            <div className="flex gap-1 lg:gap-2 justify-center flex-wrap">
                              <button
                                onClick={() => handleUpdateDepartment(dept._id)}
                                className="px-2 lg:px-3 py-1 text-xs lg:text-sm bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
                              >
                                Salva
                              </button>
                              <button
                                onClick={handleCancelEditDepartment}
                                className="px-2 lg:px-3 py-1 text-xs lg:text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
                              >
                                Annulla
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-1 lg:gap-2 justify-center flex-wrap">
                              <button
                                onClick={() => handleStartEditDepartment(dept._id, dept.name, dept.teamIds)}
                                className="px-2 lg:px-3 py-1 text-xs lg:text-sm bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
                              >
                                Modifica
                              </button>
                              <button
                                onClick={() => handleRemoveDepartment(dept._id)}
                                className="px-2 lg:px-3 py-1 text-xs lg:text-sm bg-red-600 dark:bg-red-700 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-600"
                              >
                                Elimina
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {departments?.length === 0 && (
              <div className="p-6 lg:p-8 text-center text-sm lg:text-base text-gray-500 dark:text-gray-400">Nessun dipartimento presente</div>
            )}
          </div>
        </div>
      </div>
      )}

      {activeTab === 'blockingLabels' && (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-4 lg:px-6 py-3 lg:py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-gray-100">Tipologie di Blocking Labels</h2>
        </div>
        <div className="p-4 lg:p-6">
          <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400 mb-4">
            Gestisci le tipologie di blocking labels disponibili nel sistema.
          </p>
          
          <div className="mb-4 space-y-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newLabelValue}
                onChange={(e) => setNewLabelValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateLabel()}
                placeholder="Valore (es. Improvement, Bug)"
                className="flex-1 px-3 py-2 text-sm lg:text-base border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
              />
              <input
                type="text"
                value={newLabelLabel}
                onChange={(e) => setNewLabelLabel(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateLabel()}
                placeholder="Etichetta (es. Miglioramento, Bug)"
                className="flex-1 px-3 py-2 text-sm lg:text-base border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
              />
              <button
                onClick={handleCreateLabel}
                className="px-4 py-2 text-sm lg:text-base bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 whitespace-nowrap"
              >
                Aggiungi
              </button>
            </div>
          </div>

          <div className="overflow-x-auto -mx-4 lg:mx-0">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700">
                    <th className="px-3 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold text-gray-900 dark:text-gray-100">Valore</th>
                    <th className="px-3 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold text-gray-900 dark:text-gray-100">Etichetta</th>
                    <th className="px-3 lg:px-4 py-2 lg:py-3 text-center text-xs lg:text-sm font-semibold text-gray-900 dark:text-gray-100">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {labels?.map((label) => {
                    const isEditing = editingLabel === label._id
                    const displayValue = isEditing ? editLabelValue : label.value
                    const displayLabel = isEditing ? editLabelLabel : label.label

                    return (
                      <tr key={label._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-3 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm font-mono text-gray-900 dark:text-gray-100">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editLabelValue}
                              onChange={(e) => setEditLabelValue(e.target.value)}
                              className="w-full px-2 py-1 text-xs lg:text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:text-gray-100"
                              autoFocus
                            />
                          ) : (
                            displayValue
                          )}
                        </td>
                        <td className="px-3 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-900 dark:text-gray-100">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editLabelLabel}
                              onChange={(e) => setEditLabelLabel(e.target.value)}
                              className="w-full px-2 py-1 text-xs lg:text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:text-gray-100"
                            />
                          ) : (
                            displayLabel
                          )}
                        </td>
                        <td className="px-3 lg:px-4 py-2 lg:py-3 text-center">
                          {isEditing ? (
                            <div className="flex gap-1 lg:gap-2 justify-center flex-wrap">
                              <button
                                onClick={() => handleUpdateLabel(label._id)}
                                className="px-2 lg:px-3 py-1 text-xs lg:text-sm bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
                              >
                                Salva
                              </button>
                              <button
                                onClick={handleCancelEditLabel}
                                className="px-2 lg:px-3 py-1 text-xs lg:text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
                              >
                                Annulla
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-1 lg:gap-2 justify-center flex-wrap">
                              <button
                                onClick={() => handleStartEditLabel(label._id, label.value, label.label)}
                                className="px-2 lg:px-3 py-1 text-xs lg:text-sm bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
                              >
                                Modifica
                              </button>
                              <button
                                onClick={() => handleRemoveLabel(label._id)}
                                className="px-2 lg:px-3 py-1 text-xs lg:text-sm bg-red-600 dark:bg-red-700 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-600"
                              >
                                Elimina
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {labels?.length === 0 && (
              <div className="p-6 lg:p-8 text-center text-sm lg:text-base text-gray-500 dark:text-gray-400">Nessuna label presente</div>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  )
}
