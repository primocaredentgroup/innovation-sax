import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState } from 'react'
import type { Id } from '../../convex/_generated/dataModel'

type Tab = 'teams' | 'departments' | 'coreAppsCategories'

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
  const coreAppsCategories = useQuery(api.coreAppsCategories.list)
  const coreApps = useQuery(api.coreApps.list)
  const createCategory = useMutation(api.coreAppsCategories.create)
  const updateCategory = useMutation(api.coreAppsCategories.update)
  const removeCategory = useMutation(api.coreAppsCategories.remove)
  const updateCoreApp = useMutation(api.coreApps.update)

  const [activeTab, setActiveTab] = useState<Tab>('teams')
  const [editingTeam, setEditingTeam] = useState<Id<'teams'> | null>(null)
  const [editingDepartment, setEditingDepartment] = useState<Id<'departments'> | null>(null)
  const [newTeamName, setNewTeamName] = useState('')
  const [newDepartmentName, setNewDepartmentName] = useState('')
  const [newDepartmentTeams, setNewDepartmentTeams] = useState<Id<'teams'>[]>([])
  const [editTeamName, setEditTeamName] = useState('')
  const [editDepartmentName, setEditDepartmentName] = useState('')
  const [editDepartmentTeams, setEditDepartmentTeams] = useState<Id<'teams'>[]>([])
  const [editingCategory, setEditingCategory] = useState<Id<'coreAppsCategories'> | null>(null)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategorySlug, setNewCategorySlug] = useState('')
  const [newCategoryDescription, setNewCategoryDescription] = useState('')
  const [editCategoryName, setEditCategoryName] = useState('')
  const [editCategorySlug, setEditCategorySlug] = useState('')
  const [editCategoryDescription, setEditCategoryDescription] = useState('')
  const [editCategoryCoreApps, setEditCategoryCoreApps] = useState<Id<'coreApps'>[]>([])

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

  // Gestione Categorie Core Apps
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return
    try {
      await createCategory({
        name: newCategoryName.trim(),
        slug: newCategorySlug.trim() || undefined,
        description: newCategoryDescription.trim() || undefined
      })
      setNewCategoryName('')
      setNewCategorySlug('')
      setNewCategoryDescription('')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Errore nella creazione della categoria')
    }
  }

  const handleUpdateCategory = async (id: Id<'coreAppsCategories'>) => {
    if (!editCategoryName.trim()) return
    try {
      await updateCategory({
        id,
        name: editCategoryName.trim(),
        slug: editCategorySlug.trim() || undefined,
        description: editCategoryDescription.trim() || undefined
      })
      
      // Aggiorna le Core Apps associate
      const currentAssociatedApps = coreApps?.filter(app => app.categoryId === id) || []
      const currentAssociatedIds = currentAssociatedApps.map(app => app._id)
      
      // Rimuovi la categoria dalle Core Apps che non sono più selezionate
      for (const appId of currentAssociatedIds) {
        if (!editCategoryCoreApps.includes(appId)) {
          await updateCoreApp({ id: appId, categoryId: undefined })
        }
      }
      
      // Aggiungi la categoria alle Core Apps selezionate che non l'avevano già
      for (const appId of editCategoryCoreApps) {
        if (!currentAssociatedIds.includes(appId)) {
          await updateCoreApp({ id: appId, categoryId: id })
        }
      }
      
      setEditingCategory(null)
      setEditCategoryName('')
      setEditCategorySlug('')
      setEditCategoryDescription('')
      setEditCategoryCoreApps([])
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Errore nell\'aggiornamento della categoria')
    }
  }

  const handleStartEditCategory = (id: Id<'coreAppsCategories'>, currentName: string, currentSlug: string, currentDescription?: string) => {
    setEditingCategory(id)
    setEditCategoryName(currentName)
    setEditCategorySlug(currentSlug)
    setEditCategoryDescription(currentDescription || '')
    // Inizializza con le Core Apps già associate
    const associatedApps = coreApps?.filter(app => app.categoryId === id) || []
    setEditCategoryCoreApps(associatedApps.map(app => app._id))
  }

  const handleCancelEditCategory = () => {
    setEditingCategory(null)
    setEditCategoryName('')
    setEditCategorySlug('')
    setEditCategoryDescription('')
    setEditCategoryCoreApps([])
  }

  const handleRemoveCategory = async (id: Id<'coreAppsCategories'>) => {
    if (!confirm('Sei sicuro di voler eliminare questa categoria? Le Core Apps associate perderanno il riferimento alla categoria.')) return
    try {
      await removeCategory({ id })
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Errore nell\'eliminazione della categoria')
    }
  }


  return (
    <div className="w-full max-w-full">
      <div className="mb-4 lg:mb-6">
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-gray-100">Amministrazione</h1>
        <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400 mt-1">Gestisci team, dipartimenti e categorie Core Apps</p>
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
            onClick={() => setActiveTab('coreAppsCategories')}
            className={`py-3 lg:py-4 px-1 border-b-2 font-medium text-xs lg:text-sm whitespace-nowrap ${
              activeTab === 'coreAppsCategories'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Categorie Core Apps
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

      {activeTab === 'coreAppsCategories' && (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-4 lg:px-6 py-3 lg:py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-gray-100">Categorie Core Apps</h2>
        </div>
        <div className="p-4 lg:p-6">
          <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400 mb-4">
            Gestisci le categorie per organizzare le Core Apps. Gli utenti possono iscriversi alle categorie per ricevere notifiche.
          </p>
          
          <div className="mb-4 space-y-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Nome categoria"
              className="w-full px-3 py-2 text-sm lg:text-base border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
            />
            <input
              type="text"
              value={newCategorySlug}
              onChange={(e) => setNewCategorySlug(e.target.value)}
              placeholder="Slug (opzionale, generato automaticamente se vuoto)"
              className="w-full px-3 py-2 text-sm lg:text-base border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
            />
            <textarea
              value={newCategoryDescription}
              onChange={(e) => setNewCategoryDescription(e.target.value)}
              placeholder="Descrizione (opzionale)"
              rows={2}
              className="w-full px-3 py-2 text-sm lg:text-base border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
            />
            <button
              onClick={handleCreateCategory}
              className="w-full sm:w-auto px-4 py-2 text-sm lg:text-base bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
            >
              Aggiungi Categoria
            </button>
          </div>

          <div className="overflow-x-auto -mx-4 lg:mx-0">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700">
                    <th className="px-3 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold text-gray-900 dark:text-gray-100">Nome</th>
                    <th className="px-3 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold text-gray-900 dark:text-gray-100">Slug</th>
                    <th className="px-3 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold text-gray-900 dark:text-gray-100">Descrizione</th>
                    <th className="px-3 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold text-gray-900 dark:text-gray-100">Core Apps</th>
                    <th className="px-3 lg:px-4 py-2 lg:py-3 text-center text-xs lg:text-sm font-semibold text-gray-900 dark:text-gray-100">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {coreAppsCategories?.map((category) => {
                    const isEditing = editingCategory === category._id
                    const associatedApps = coreApps?.filter(app => app.categoryId === category._id) || []

                    return (
                      <tr key={category._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-3 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-900 dark:text-gray-100">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editCategoryName}
                              onChange={(e) => setEditCategoryName(e.target.value)}
                              className="w-full px-2 py-1 text-xs lg:text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:text-gray-100"
                              autoFocus
                            />
                          ) : (
                            category.name
                          )}
                        </td>
                        <td className="px-3 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm font-mono text-gray-900 dark:text-gray-100">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editCategorySlug}
                              onChange={(e) => setEditCategorySlug(e.target.value)}
                              className="w-full px-2 py-1 text-xs lg:text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:text-gray-100"
                            />
                          ) : (
                            category.slug
                          )}
                        </td>
                        <td className="px-3 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-900 dark:text-gray-100">
                          {isEditing ? (
                            <textarea
                              value={editCategoryDescription}
                              onChange={(e) => setEditCategoryDescription(e.target.value)}
                              rows={2}
                              className="w-full px-2 py-1 text-xs lg:text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:text-gray-100"
                            />
                          ) : (
                            <span className={category.description ? '' : 'text-gray-400 dark:text-gray-500'}>
                              {category.description || '-'}
                            </span>
                          )}
                        </td>
                        <td className="px-3 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm">
                          {isEditing ? (
                            <div className="space-y-2">
                              <select
                                multiple
                                value={editCategoryCoreApps}
                                onChange={(e) => {
                                  const selectedIds = Array.from(e.target.selectedOptions, option => option.value as Id<'coreApps'>)
                                  setEditCategoryCoreApps(selectedIds)
                                }}
                                className="w-full px-2 py-1 text-xs lg:text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:text-gray-100 min-h-[100px]"
                                size={Math.min(coreApps?.length || 0, 5)}
                              >
                                {coreApps?.map((app) => (
                                  <option key={app._id} value={app._id}>
                                    {app.name}
                                  </option>
                                ))}
                              </select>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {editCategoryCoreApps.length} selezionate (Ctrl/Cmd + Click per selezioni multiple)
                              </p>
                            </div>
                          ) : associatedApps.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {associatedApps.slice(0, 3).map((app) => (
                                <span
                                  key={app._id}
                                  className="px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 inline-block"
                                >
                                  {app.name}
                                </span>
                              ))}
                              {associatedApps.length > 3 && (
                                <span className="text-gray-500 dark:text-gray-400 text-xs">
                                  +{associatedApps.length - 3} altre
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-3 lg:px-4 py-2 lg:py-3 text-center">
                          {isEditing ? (
                            <div className="flex gap-1 lg:gap-2 justify-center flex-wrap">
                              <button
                                onClick={() => handleUpdateCategory(category._id)}
                                className="px-2 lg:px-3 py-1 text-xs lg:text-sm bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
                              >
                                Salva
                              </button>
                              <button
                                onClick={handleCancelEditCategory}
                                className="px-2 lg:px-3 py-1 text-xs lg:text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
                              >
                                Annulla
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-1 lg:gap-2 justify-center flex-wrap">
                              <button
                                onClick={() => handleStartEditCategory(category._id, category.name, category.slug, category.description)}
                                className="px-2 lg:px-3 py-1 text-xs lg:text-sm bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
                              >
                                Modifica
                              </button>
                              <button
                                onClick={() => handleRemoveCategory(category._id)}
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
            {coreAppsCategories?.length === 0 && (
              <div className="p-6 lg:p-8 text-center text-sm lg:text-base text-gray-500 dark:text-gray-400">Nessuna categoria presente</div>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  )
}
