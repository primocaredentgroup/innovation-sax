import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState } from 'react'
import type { Id } from '../../convex/_generated/dataModel'

// Tipo per i ruoli
type Role = 'Requester' | 'BusinessValidator' | 'TechValidator' | 'Admin'

const roleLabels: Record<Role, string> = {
  Requester: 'Richiedente',
  BusinessValidator: 'Validatore Business',
  TechValidator: 'Validatore Tech',
  Admin: 'Amministratore'
}

const allRoles: Role[] = ['Requester', 'BusinessValidator', 'TechValidator', 'Admin']

export default function UsersManagementPage() {
  const users = useQuery(api.users.listUsers)
  const departments = useQuery(api.departments.list)
  const teams = useQuery(api.teams.list)
  const currentUser = useQuery(api.users.getCurrentUser)

  const updateUserRoles = useMutation(api.users.updateUserRoles)
  const updateUserDepartment = useMutation(api.users.updateUserDepartment)

  const [editingUser, setEditingUser] = useState<Id<'users'> | null>(null)
  const [selectedDeptId, setSelectedDeptId] = useState<Id<'departments'> | ''>('')
  const [selectedRoles, setSelectedRoles] = useState<Role[]>([])

  // Solo Admin può accedere
  if (!currentUser?.roles?.includes('Admin')) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
        <p className="text-red-600 dark:text-red-400">Accesso negato. Solo gli amministratori possono gestire gli utenti.</p>
      </div>
    )
  }

  const handleEditUser = (userId: Id<'users'>, currentDeptId?: Id<'departments'>, currentRoles?: Role[]) => {
    setEditingUser(userId)
    setSelectedDeptId(currentDeptId || '')
    setSelectedRoles(currentRoles || ['Requester'])
  }

  const handleToggleRole = (role: Role) => {
    setSelectedRoles((prev) => {
      if (prev.includes(role)) {
        // Non rimuovere se è l'ultimo ruolo
        if (prev.length === 1) return prev
        return prev.filter((r) => r !== role)
      } else {
        return [...prev, role]
      }
    })
  }

  const handleSaveUser = async (userId: Id<'users'>) => {
    if (selectedDeptId && selectedDeptId !== '') {
      await updateUserDepartment({ userId, deptId: selectedDeptId as Id<'departments'> })
    }
    if (selectedRoles.length > 0) {
      await updateUserRoles({ userId, roles: selectedRoles })
    }
    setEditingUser(null)
    setSelectedDeptId('')
    setSelectedRoles([])
  }

  const handleCancelEdit = () => {
    setEditingUser(null)
    setSelectedDeptId('')
    setSelectedRoles([])
  }

  return (
    <div className="w-full max-w-full">
      <div className="mb-4 lg:mb-6">
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-gray-100">Gestione Utenti</h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto -mx-4 lg:mx-0">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700 border-b">
                  <th className="px-3 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold text-gray-900 dark:text-gray-100">Nome</th>
                  <th className="px-3 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold text-gray-900 dark:text-gray-100">Email</th>
                  <th className="px-3 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold text-gray-900 dark:text-gray-100">Ruolo</th>
                  <th className="px-3 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold text-gray-900 dark:text-gray-100">Dipartimento</th>
                  <th className="px-3 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold text-gray-900 dark:text-gray-100">Team</th>
                  <th className="px-3 lg:px-4 py-2 lg:py-3 text-center text-xs lg:text-sm font-semibold text-gray-900 dark:text-gray-100">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {users?.map((user) => {
                  const userDept = departments?.find((d) => d._id === user.deptId)
                  const userTeams = userDept
                    ? teams?.filter((t) => userDept.teamIds.includes(t._id))
                    : []
                  const isEditing = editingUser === user._id

                  return (
                    <tr key={user._id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700">
                      <td className="px-3 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-900 dark:text-gray-100">{user.name}</td>
                      <td className="px-3 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-600 dark:text-gray-400 truncate max-w-[150px] lg:max-w-none">{user.email || '-'}</td>
                      <td className="px-3 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm">
                        {isEditing ? (
                          <div className="flex flex-wrap gap-1 lg:gap-2">
                            {allRoles.map((role) => (
                              <label key={role} className="flex items-center gap-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedRoles.includes(role)}
                                  onChange={() => handleToggleRole(role)}
                                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-xs">{roleLabels[role]}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {(user.roles || ['Requester']).map((role) => (
                              <span
                                key={role}
                                className={`px-2 py-1 text-xs rounded-full ${
                                  role === 'Admin'
                                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                                    : role === 'TechValidator'
                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                                    : role === 'BusinessValidator'
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                                }`}
                              >
                                {roleLabels[role as Role]}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-3 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm">
                        {isEditing ? (
                          <select
                            value={selectedDeptId}
                            onChange={(e) => setSelectedDeptId(e.target.value as Id<'departments'> | '')}
                            className="w-full px-2 py-1 text-xs lg:text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:text-gray-100"
                          >
                            <option value="">Nessun dipartimento</option>
                            {departments?.map((dept) => (
                              <option key={dept._id} value={dept._id}>
                                {dept.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-gray-900 dark:text-gray-100">{userDept?.name || '-'}</span>
                        )}
                      </td>
                      <td className="px-3 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm">
                        {userTeams && userTeams.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {userTeams.map((team) => (
                              <span
                                key={team._id}
                                className="px-2 py-1 text-xs rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                              >
                                {team.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-3 lg:px-4 py-2 lg:py-3 text-center">
                        {isEditing ? (
                          <div className="flex gap-1 lg:gap-2 justify-center flex-wrap">
                            <button
                              onClick={() => handleSaveUser(user._id)}
                              className="px-2 lg:px-3 py-1 text-xs lg:text-sm bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
                            >
                              Salva
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="px-2 lg:px-3 py-1 text-xs lg:text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
                            >
                              Annulla
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEditUser(user._id, user.deptId, (user.roles || ['Requester']) as Role[])}
                            className="px-2 lg:px-3 py-1 text-xs lg:text-sm bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
                          >
                            Modifica
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {users?.length === 0 && (
          <div className="p-6 lg:p-8 text-center text-sm lg:text-base text-gray-500 dark:text-gray-400">
            Nessun utente presente.
          </div>
        )}
      </div>

      <div className="mt-6 lg:mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 lg:p-6">
        <h2 className="text-base lg:text-lg font-semibold text-blue-900 dark:text-blue-200 mb-2">Informazioni</h2>
        <ul className="text-xs lg:text-sm text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
          <li>Gli utenti possono avere più ruoli contemporaneamente.</li>
          <li><strong>Richiedente:</strong> Può creare nuovi KeyDev.</li>
          <li><strong>Validatore Business:</strong> Può validare il frontend dei KeyDev approvati del proprio dipartimento.</li>
          <li><strong>Validatore Tech:</strong> Può approvare/rifiutare mockup e prendere in carico lo sviluppo.</li>
          <li><strong>Amministratore:</strong> Accesso completo a tutte le funzionalità.</li>
          <li>Il responsabile di dipartimento dovrebbe essere Admin.</li>
          <li>Tutti gli sviluppatori dovrebbero avere il ruolo Validatore Tech.</li>
        </ul>
      </div>
    </div>
  )
}
