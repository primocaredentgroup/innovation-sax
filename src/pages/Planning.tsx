import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState, useMemo } from 'react'
import type { Id } from '../../convex/_generated/dataModel'

export default function PlanningPage() {
  const currentMonth = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }, [])

  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [editingCell, setEditingCell] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const departments = useQuery(api.departments.list)
  const categories = useQuery(api.categories.list)
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

  const getAllocation = (deptId: Id<'departments'>, categoryId: Id<'categories'>) => {
    const alloc = budgetAllocations?.find(
      (b) => b.deptId === deptId && b.categoryId === categoryId
    )
    return alloc?.maxAlloc ?? 0
  }

  const totalAllocated = budgetAllocations?.reduce((sum, b) => sum + b.maxAlloc, 0) ?? 0
  const totalBudget = monthData?.totalKeyDev ?? 0

  const handleCellClick = (deptId: Id<'departments'>, categoryId: Id<'categories'>) => {
    const key = `${deptId}-${categoryId}`
    setEditingCell(key)
    setEditValue(String(getAllocation(deptId, categoryId)))
  }

  const handleCellSave = async (deptId: Id<'departments'>, categoryId: Id<'categories'>) => {
    const value = parseInt(editValue) || 0
    await updateBudget({
      monthRef: selectedMonth,
      deptId,
      categoryId,
      maxAlloc: value
    })
    setEditingCell(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Planning Budget KeyDev</h1>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          {monthOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-gray-500">Budget Totale:</span>
            <span className="ml-2 font-semibold">{totalBudget}</span>
          </div>
          <div>
            <span className="text-sm text-gray-500">Allocato:</span>
            <span className={`ml-2 font-semibold ${totalAllocated > totalBudget ? 'text-red-600' : 'text-green-600'}`}>
              {totalAllocated}
            </span>
          </div>
          <div>
            <span className="text-sm text-gray-500">Rimanente:</span>
            <span className={`ml-2 font-semibold ${totalBudget - totalAllocated < 0 ? 'text-red-600' : ''}`}>
              {totalBudget - totalAllocated}
            </span>
          </div>
        </div>
        {totalAllocated !== totalBudget && (
          <div className={`mt-2 text-sm ${totalAllocated > totalBudget ? 'text-red-600' : 'text-yellow-600'}`}>
            {totalAllocated > totalBudget
              ? `Attenzione: allocazione supera il budget di ${totalAllocated - totalBudget}`
              : `Mancano ${totalBudget - totalAllocated} KeyDev da allocare`}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                  Dipartimento / Categoria
                </th>
                {categories?.map((cat) => (
                  <th key={cat._id} className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                    {cat.name}
                  </th>
                ))}
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 bg-gray-100">
                  Totale
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {departments?.map((dept) => {
                const deptTotal = categories?.reduce(
                  (sum, cat) => sum + getAllocation(dept._id, cat._id),
                  0
                ) ?? 0

                return (
                  <tr key={dept._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {dept.name}
                    </td>
                    {categories?.map((cat) => {
                      const key = `${dept._id}-${cat._id}`
                      const isEditing = editingCell === key
                      const value = getAllocation(dept._id, cat._id)

                      return (
                        <td key={cat._id} className="px-4 py-3 text-center">
                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => handleCellSave(dept._id, cat._id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCellSave(dept._id, cat._id)
                                if (e.key === 'Escape') setEditingCell(null)
                              }}
                              className="w-16 px-2 py-1 text-center border border-blue-500 rounded focus:outline-none"
                              autoFocus
                            />
                          ) : (
                            <button
                              onClick={() => handleCellClick(dept._id, cat._id)}
                              className={`w-12 h-8 rounded text-sm ${
                                value > 0
                                  ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                              }`}
                            >
                              {value}
                            </button>
                          )}
                        </td>
                      )
                    })}
                    <td className="px-4 py-3 text-center text-sm font-semibold bg-gray-50">
                      {deptTotal}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100">
                <td className="px-4 py-3 text-sm font-semibold text-gray-900">Totale</td>
                {categories?.map((cat) => {
                  const catTotal = departments?.reduce(
                    (sum, dept) => sum + getAllocation(dept._id, cat._id),
                    0
                  ) ?? 0
                  return (
                    <td key={cat._id} className="px-4 py-3 text-center text-sm font-semibold">
                      {catTotal}
                    </td>
                  )
                })}
                <td className="px-4 py-3 text-center text-sm font-bold bg-gray-200">
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
