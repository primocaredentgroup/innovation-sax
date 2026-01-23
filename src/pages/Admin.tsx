import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState, useMemo } from 'react'
import type { Id } from '../../convex/_generated/dataModel'

export default function AdminPage() {
  const currentUser = useQuery(api.users.getCurrentUser)
  const categories = useQuery(api.categories.list)
  const departments = useQuery(api.departments.list)
  const months = useQuery(api.months.list)

  const createCategory = useMutation(api.categories.create)
  const updateCategory = useMutation(api.categories.update)
  const removeCategory = useMutation(api.categories.remove)
  const createDepartment = useMutation(api.departments.create)
  const updateDepartment = useMutation(api.departments.update)
  const removeDepartment = useMutation(api.departments.remove)
  const upsertMonth = useMutation(api.months.upsert)

  const [editingCategory, setEditingCategory] = useState<Id<'categories'> | null>(null)
  const [editingDepartment, setEditingDepartment] = useState<Id<'departments'> | null>(null)
  const [editingMonth, setEditingMonth] = useState<string | null>(null)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newDepartmentName, setNewDepartmentName] = useState('')
  const [newDepartmentCategories, setNewDepartmentCategories] = useState<Id<'categories'>[]>([])
  const [newMonthRef, setNewMonthRef] = useState('')
  const [newMonthBudget, setNewMonthBudget] = useState(0)
  const [editCategoryName, setEditCategoryName] = useState('')
  const [editDepartmentName, setEditDepartmentName] = useState('')
  const [editDepartmentCategories, setEditDepartmentCategories] = useState<Id<'categories'>[]>([])

  // Genera opzioni mesi per i prossimi 12 mesi
  const monthOptions = useMemo(() => {
    const options = []
    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const ref = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const label = date.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
      options.push({ value: ref, label })
    }
    return options
  }, [])

  // Solo Admin può accedere
  if (!currentUser?.roles?.includes('Admin')) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
        <p className="text-red-600 dark:text-red-400">Accesso negato. Solo gli amministratori possono accedere a questa pagina.</p>
      </div>
    )
  }

  // Gestione Categorie
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return
    await createCategory({ name: newCategoryName.trim() })
    setNewCategoryName('')
  }

  const handleUpdateCategory = async (id: Id<'categories'>) => {
    await updateCategory({ id, name: editCategoryName })
    setEditingCategory(null)
    setEditCategoryName('')
  }

  const handleStartEditCategory = (id: Id<'categories'>, currentName: string) => {
    setEditingCategory(id)
    setEditCategoryName(currentName)
  }

  const handleCancelEditCategory = () => {
    setEditingCategory(null)
    setEditCategoryName('')
  }

  const handleRemoveCategory = async (id: Id<'categories'>) => {
    if (!confirm('Sei sicuro di voler eliminare questa categoria?')) return
    await removeCategory({ id })
  }

  // Gestione Dipartimenti
  const handleCreateDepartment = async () => {
    if (!newDepartmentName.trim()) return
    await createDepartment({ name: newDepartmentName.trim(), categoryIds: newDepartmentCategories })
    setNewDepartmentName('')
    setNewDepartmentCategories([])
  }

  const handleUpdateDepartment = async (id: Id<'departments'>) => {
    await updateDepartment({ id, name: editDepartmentName, categoryIds: editDepartmentCategories })
    setEditingDepartment(null)
    setEditDepartmentName('')
    setEditDepartmentCategories([])
  }

  const handleStartEditDepartment = (id: Id<'departments'>, currentName: string, currentCategories: Id<'categories'>[]) => {
    setEditingDepartment(id)
    setEditDepartmentName(currentName)
    setEditDepartmentCategories(currentCategories)
  }

  const handleCancelEditDepartment = () => {
    setEditingDepartment(null)
    setEditDepartmentName('')
    setEditDepartmentCategories([])
  }

  const handleRemoveDepartment = async (id: Id<'departments'>) => {
    if (!confirm('Sei sicuro di voler eliminare questo dipartimento?')) return
    await removeDepartment({ id })
  }

  // Gestione Budget Mensile
  const handleUpsertMonth = async () => {
    if (!newMonthRef || newMonthBudget < 0) return
    await upsertMonth({ monthRef: newMonthRef, totalKeyDev: newMonthBudget })
    setNewMonthRef('')
    setNewMonthBudget(0)
    setEditingMonth(null)
  }

  const handleEditMonth = (monthRef: string, currentBudget: number) => {
    setEditingMonth(monthRef)
    setNewMonthRef(monthRef)
    setNewMonthBudget(currentBudget)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Amministrazione</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Gestisci categorie, dipartimenti e budget totale</p>
      </div>

      {/* Categorie */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Categorie</h2>
        </div>
        <div className="p-6">
          <div className="mb-4 flex gap-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateCategory()}
              placeholder="Nome categoria"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
            />
            <button
              onClick={handleCreateCategory}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
            >
              Aggiungi
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Nome</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 dark:text-gray-100">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {categories?.map((cat) => {
                  const isEditing = editingCategory === cat._id
                  const displayName = isEditing ? editCategoryName : cat.name

                  return (
                    <tr key={cat._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editCategoryName}
                            onChange={(e) => setEditCategoryName(e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:text-gray-100"
                            autoFocus
                          />
                        ) : (
                          displayName
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isEditing ? (
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => handleUpdateCategory(cat._id)}
                              className="px-3 py-1 text-sm bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
                            >
                              Salva
                            </button>
                            <button
                              onClick={handleCancelEditCategory}
                              className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
                            >
                              Annulla
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => handleStartEditCategory(cat._id, cat.name)}
                              className="px-3 py-1 text-sm bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
                            >
                              Modifica
                            </button>
                            <button
                              onClick={() => handleRemoveCategory(cat._id)}
                              className="px-3 py-1 text-sm bg-red-600 dark:bg-red-700 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-600"
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
            {categories?.length === 0 && (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">Nessuna categoria presente</div>
            )}
          </div>
        </div>
      </div>

      {/* Dipartimenti */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Dipartimenti</h2>
        </div>
        <div className="p-6">
          <div className="mb-4 space-y-2">
            <input
              type="text"
              value={newDepartmentName}
              onChange={(e) => setNewDepartmentName(e.target.value)}
              placeholder="Nome dipartimento"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categorie associate</label>
              <div className="flex flex-wrap gap-2">
                {categories?.map((cat) => (
                  <label key={cat._id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newDepartmentCategories.includes(cat._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewDepartmentCategories([...newDepartmentCategories, cat._id])
                        } else {
                          setNewDepartmentCategories(newDepartmentCategories.filter((id) => id !== cat._id))
                        }
                      }}
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{cat.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <button
              onClick={handleCreateDepartment}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
            >
              Aggiungi Dipartimento
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700 border-b">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Nome</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Categorie</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 dark:text-gray-100">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {departments?.map((dept) => {
                  const isEditing = editingDepartment === dept._id

                  return (
                    <tr key={dept._id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editDepartmentName}
                            onChange={(e) => setEditDepartmentName(e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          />
                        ) : (
                          dept.name
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {isEditing ? (
                          <div className="flex flex-wrap gap-2">
                            {categories?.map((cat) => (
                              <label key={cat._id} className="flex items-center gap-1">
                                <input
                                  type="checkbox"
                                  checked={editDepartmentCategories.includes(cat._id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setEditDepartmentCategories([...editDepartmentCategories, cat._id])
                                    } else {
                                      setEditDepartmentCategories(editDepartmentCategories.filter((id) => id !== cat._id))
                                    }
                                  }}
                                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-xs text-gray-700 dark:text-gray-300">{cat.name}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {dept.categoryIds
                              .map((catId) => categories?.find((c) => c._id === catId))
                              .filter(Boolean)
                              .map((cat) => (
                                <span
                                  key={cat!._id}
                                  className="px-2 py-1 text-xs rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                                >
                                  {cat!.name}
                                </span>
                              ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isEditing ? (
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => handleUpdateDepartment(dept._id)}
                              className="px-3 py-1 text-sm bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
                            >
                              Salva
                            </button>
                            <button
                              onClick={handleCancelEditDepartment}
                              className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
                            >
                              Annulla
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => handleStartEditDepartment(dept._id, dept.name, dept.categoryIds)}
                              className="px-3 py-1 text-sm bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
                            >
                              Modifica
                            </button>
                            <button
                              onClick={() => handleRemoveDepartment(dept._id)}
                              className="px-3 py-1 text-sm bg-red-600 dark:bg-red-700 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-600"
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
            {departments?.length === 0 && (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">Nessun dipartimento presente</div>
            )}
          </div>
        </div>
      </div>

      {/* Budget Totale Mensile */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Budget Totale Mensile</h2>
        </div>
        <div className="p-6">
          <div className="mb-4 flex gap-2">
            <select
              value={newMonthRef}
              onChange={(e) => setNewMonthRef(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Seleziona mese</option>
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={newMonthBudget || ''}
              onChange={(e) => setNewMonthBudget(Number(e.target.value))}
              placeholder="Budget totale"
              min="0"
              step="1"
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={handleUpsertMonth}
              disabled={!newMonthRef || newMonthBudget < 0}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {editingMonth ? 'Aggiorna' : 'Aggiungi'}
            </button>
            {editingMonth && (
              <button
                onClick={() => {
                  setEditingMonth(null)
                  setNewMonthRef('')
                  setNewMonthBudget(0)
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
              >
                Annulla
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700 border-b">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Mese</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Budget Totale</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 dark:text-gray-100">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {months
                  ?.sort((a, b) => b.monthRef.localeCompare(a.monthRef))
                  .map((month) => {
                    const monthLabel = (() => {
                      const [year, monthNum] = month.monthRef.split('-')
                      const date = new Date(Number(year), Number(monthNum) - 1, 1)
                      return date.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
                    })()

                    return (
                      <tr key={month._id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700">
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{monthLabel}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 font-semibold">
                          {month.totalKeyDev} KeyDev
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleEditMonth(month.monthRef, month.totalKeyDev)}
                            className="px-3 py-1 text-sm bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
                          >
                            Modifica
                          </button>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
            {months?.length === 0 && (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">Nessun budget mensile configurato</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
