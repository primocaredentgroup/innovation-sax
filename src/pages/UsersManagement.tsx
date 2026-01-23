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
  const categories = useQuery(api.categories.list)
  const currentUser = useQuery(api.users.getCurrentUser)

  const updateUserRoles = useMutation(api.users.updateUserRoles)
  const updateUserDepartment = useMutation(api.users.updateUserDepartment)
  const seedDatabase = useMutation(api.seed.seedDatabase)

  const [editingUser, setEditingUser] = useState<Id<'users'> | null>(null)
  const [isSeeding, setIsSeeding] = useState(false)
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

  const handleSeedDatabase = async () => {
    if (!confirm('Sei sicuro di voler eseguire il seed del database? Questo aggiungerà dati di esempio.')) {
      return
    }
    setIsSeeding(true)
    try {
      await seedDatabase()
      alert('Seed completato con successo! Ricarica la pagina per vedere i nuovi dati.')
    } catch (error) {
      alert(`Errore durante il seed: ${error}`)
    } finally {
      setIsSeeding(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Gestione Utenti</h1>
        <button
          onClick={handleSeedDatabase}
          disabled={isSeeding}
          className="px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-md hover:bg-green-700 dark:hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isSeeding ? 'Caricamento...' : 'Esegui Seed Data'}
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700 border-b">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Nome</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Email</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Ruolo</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Dipartimento</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Categorie</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 dark:text-gray-100">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {users?.map((user) => {
                const userDept = departments?.find((d) => d._id === user.deptId)
                const userCategories = userDept
                  ? categories?.filter((c) => userDept.categoryIds.includes(c._id))
                  : []
                const isEditing = editingUser === user._id

                return (
                  <tr key={user._id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{user.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{user.email || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      {isEditing ? (
                        <div className="flex flex-wrap gap-2">
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
                                  ? 'bg-purple-100 text-purple-800'
                                  : role === 'TechValidator'
                                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                                  : role === 'BusinessValidator'
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {roleLabels[role as Role]}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {isEditing ? (
                        <select
                          value={selectedDeptId}
                          onChange={(e) => setSelectedDeptId(e.target.value as Id<'departments'> | '')}
                          className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
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
                    <td className="px-4 py-3 text-sm">
                      {userCategories && userCategories.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {userCategories.map((cat) => (
                            <span
                              key={cat._id}
                              className="px-2 py-1 text-xs rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                            >
                              {cat.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleSaveUser(user._id)}
                            className="px-3 py-1 text-sm bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
                          >
                            Salva
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
                          >
                            Annulla
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEditUser(user._id, user.deptId, (user.roles || ['Requester']) as Role[])}
                          className="px-3 py-1 text-sm bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
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

        {users?.length === 0 && (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            Nessun utente presente. Esegui il seed-data per popolare il database.
          </div>
        )}
      </div>

      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-2">Informazioni</h2>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
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
