import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState, useMemo } from 'react'
import type { Id } from '../../convex/_generated/dataModel'

export default function PlanningPage() {
  const currentUser = useQuery(api.users.getCurrentUser)

  const currentMonth = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }, [])

  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [editingCell, setEditingCell] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const departments = useQuery(api.departments.list)
  const teams = useQuery(api.teams.list)
  const budgetAllocations = useQuery(api.budget.getByMonth, { monthRef: selectedMonth })
  const monthData = useQuery(api.months.getByRef, { monthRef: selectedMonth })

  const updateBudget = useMutation(api.budget.upsert)

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

  const getAllocation = (deptId: Id<'departments'>, teamId: Id<'teams'>) => {
    const alloc = budgetAllocations?.find(
      (b) => b.deptId === deptId && b.teamId === teamId
    )
    return alloc?.maxAlloc ?? 0
  }

  // Calcola il totale allocato sommando i valori come vengono visualizzati nella tabella
  // Questo evita problemi con eventuali duplicati nel database
  const totalAllocated = useMemo(() => {
    if (!departments || !teams) return 0
    
    let total = 0
    for (const dept of departments) {
      for (const team of teams) {
        total += getAllocation(dept._id, team._id)
      }
    }
    
    return total
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budgetAllocations, departments, teams])
  
  const totalBudget = monthData?.totalKeyDev ?? 0

  // Solo Admin può accedere
  if (!currentUser?.roles?.includes('Admin')) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
        <p className="text-red-600 dark:text-red-400">Accesso negato. Solo gli amministratori possono accedere a questa pagina.</p>
      </div>
    )
  }

  const handleCellClick = (deptId: Id<'departments'>, teamId: Id<'teams'>) => {
    const key = `${deptId}-${teamId}`
    setEditingCell(key)
    setEditValue(String(getAllocation(deptId, teamId)))
  }

  const handleCellSave = async (deptId: Id<'departments'>, teamId: Id<'teams'>) => {
    const value = parseInt(editValue) || 0
    await updateBudget({
      monthRef: selectedMonth,
      deptId,
      teamId,
      maxAlloc: value
    })
    setEditingCell(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Planning Budget KeyDev</h1>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          {monthOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Numero sviluppatori:</span>
            <span className="ml-2 font-semibold">{totalBudget}</span>
          </div>
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Slot allocati:</span>
            <span className="ml-2 font-semibold text-blue-600 dark:text-blue-400">
              {totalAllocated}
            </span>
          </div>
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {totalAllocated > totalBudget ? 'Competizione:' : 'Slot liberi:'}
            </span>
            <span className={`ml-2 font-semibold ${
              totalAllocated > totalBudget 
                ? 'text-green-600 dark:text-green-400' 
                : totalAllocated < totalBudget 
                  ? 'text-yellow-600 dark:text-yellow-400' 
                  : ''
            }`}>
              {totalAllocated > totalBudget 
                ? `+${totalAllocated - totalBudget}` 
                : totalBudget - totalAllocated}
            </span>
          </div>
        </div>
        {totalAllocated !== totalBudget && (
          <div className={`mt-2 text-sm ${
            totalAllocated > totalBudget 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-yellow-600 dark:text-yellow-400'
          }`}>
            {totalAllocated > totalBudget
              ? `I dipartimenti competono per ${totalAllocated - totalBudget} slot extra`
              : `${totalBudget - totalAllocated} slot rimarranno inutilizzati dai dipartimenti`}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700 border-b">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Dipartimento / Team
                </th>
                {teams?.map((team) => (
                  <th key={team._id} className="px-4 py-3 text-center text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {team.name}
                  </th>
                ))}
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-700">
                  Totale
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {departments?.map((dept) => {
                const deptTotal = teams?.reduce(
                  (sum, team) => sum + getAllocation(dept._id, team._id),
                  0
                ) ?? 0

                return (
                  <tr key={dept._id} className="hover:bg-gray-50 dark:bg-gray-700 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {dept.name}
                    </td>
                    {teams?.map((team) => {
                      const key = `${dept._id}-${team._id}`
                      const isEditing = editingCell === key
                      const value = getAllocation(dept._id, team._id)

                      return (
                        <td key={team._id} className="px-4 py-3 text-center">
                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => handleCellSave(dept._id, team._id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCellSave(dept._id, team._id)
                                if (e.key === 'Escape') setEditingCell(null)
                              }}
                              className="w-16 px-2 py-1 text-center border border-blue-500 dark:border-blue-400 rounded focus:outline-none"
                              autoFocus
                            />
                          ) : (
                            <button
                              onClick={() => handleCellClick(dept._id, team._id)}
                              className={`w-12 h-8 rounded text-sm ${
                                value > 0
                                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/50'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                              }`}
                            >
                              {value}
                            </button>
                          )}
                        </td>
                      )
                    })}
                    <td className="px-4 py-3 text-center text-sm font-semibold bg-gray-50 dark:bg-gray-700">
                      {deptTotal}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 dark:bg-gray-700">
                <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Totale</td>
                {teams?.map((team) => {
                  const teamTotal = departments?.reduce(
                    (sum, dept) => sum + getAllocation(dept._id, team._id),
                    0
                  ) ?? 0
                  return (
                    <td key={team._id} className="px-4 py-3 text-center text-sm font-semibold">
                      {teamTotal}
                    </td>
                  )
                })}
                <td className="px-4 py-3 text-center text-sm font-bold bg-gray-200 dark:bg-gray-600">
                  {totalAllocated}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
