import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState, useMemo } from 'react'
import type { Id } from '../../convex/_generated/dataModel'
import { Pencil, Copy } from 'lucide-react'

export default function PlanningPage() {
  const currentUser = useQuery(api.users.getCurrentUser)

  const nextMonth = useMemo(() => {
    const now = new Date()
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
  }, [])

  const [selectedMonth, setSelectedMonth] = useState(nextMonth)
  const [editingCell, setEditingCell] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editingBudgetTeamId, setEditingBudgetTeamId] = useState<Id<'teams'> | null>(null)
  const [editBudgetValue, setEditBudgetValue] = useState('')
  const [showCopyDropdown, setShowCopyDropdown] = useState(false)
  const [copySourceMonth, setCopySourceMonth] = useState('')
  const [isCopying, setIsCopying] = useState(false)

  const departments = useQuery(api.departments.list)
  const teams = useQuery(api.teams.list)
  const budgetAllocations = useQuery(api.budget.getByMonth, { monthRef: selectedMonth })
  const teamMonthLimits = useQuery(api.months.listByMonth, { monthRef: selectedMonth })

  const updateBudget = useMutation(api.budget.upsert)
  const upsertMonth = useMutation(api.months.upsert)
  const copyBudgetFromMonth = useMutation(api.budget.copyFromMonth)
  const copyMonthLimitsFromMonth = useMutation(api.months.copyFromMonth)

  const monthOptions = useMemo(() => {
    const options = []
    const now = new Date()
    // 6 mesi precedenti + mese corrente + 3 mesi successivi = 10 mesi totali
    for (let i = -6; i <= 3; i++) {
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
  
  const teamBudgetMap = useMemo(() => {
    const map = new Map<Id<'teams'>, number>()
    if (!teamMonthLimits) return map
    for (const row of teamMonthLimits) {
      map.set(row.teamId, row.totalKeyDev)
    }
    return map
  }, [teamMonthLimits])

  const totalBudget = useMemo(() => {
    if (!teams) return 0
    return teams.reduce((sum, team) => sum + (teamBudgetMap.get(team._id) ?? 0), 0)
  }, [teamBudgetMap, teams])

  const missingTeamLimits = useMemo(() => {
    if (!teams) return []
    return teams.filter((team) => !teamBudgetMap.has(team._id))
  }, [teamBudgetMap, teams])

  const copySourceMonthOptions = useMemo(() => {
    return monthOptions.filter((opt) => opt.value !== selectedMonth)
  }, [monthOptions, selectedMonth])

  const handleCopyFromMonth = async () => {
    if (!copySourceMonth || copySourceMonth === selectedMonth) return
    setIsCopying(true)
    try {
      await copyBudgetFromMonth({
        sourceMonthRef: copySourceMonth,
        targetMonthRef: selectedMonth
      })
      await copyMonthLimitsFromMonth({
        sourceMonthRef: copySourceMonth,
        targetMonthRef: selectedMonth
      })
      setShowCopyDropdown(false)
      setCopySourceMonth('')
    } finally {
      setIsCopying(false)
    }
  }

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

  const handleStartEditBudget = (teamId: Id<'teams'>) => {
    setEditingBudgetTeamId(teamId)
    setEditBudgetValue(String(teamBudgetMap.get(teamId) ?? 0))
  }

  const handleSaveBudget = async (teamId: Id<'teams'>) => {
    const value = parseInt(editBudgetValue) || 0
    if (value >= 0) {
      await upsertMonth({ monthRef: selectedMonth, teamId, totalKeyDev: value })
      setEditingBudgetTeamId(null)
      setEditBudgetValue('')
    }
  }

  const handleCancelEditBudget = () => {
    setEditingBudgetTeamId(null)
    setEditBudgetValue('')
  }

  const isAdmin = currentUser?.roles?.includes('Admin')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 flex-wrap">
          Assegna budget Sviluppi Chiave di
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 text-2xl font-bold text-gray-900 dark:text-gray-100"
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {isAdmin && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCopyDropdown((v) => !v)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md border border-gray-300 dark:border-gray-600"
                title="Copia struttura da un altro mese"
              >
                <Copy size={18} />
                Copia da mese
              </button>
              {showCopyDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    aria-hidden="true"
                    onClick={() => setShowCopyDropdown(false)}
                  />
                  <div className="absolute left-0 top-full mt-1 z-20 w-64 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Copia allocazioni e limiti da:
                    </p>
                    <select
                      value={copySourceMonth}
                      onChange={(e) => setCopySourceMonth(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-100 mb-2"
                    >
                      <option value="">Seleziona mese</option>
                      {copySourceMonthOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {copySourceMonthOptions.length === 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        Nessun altro mese disponibile
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleCopyFromMonth}
                        disabled={!copySourceMonth || isCopying}
                        className="flex-1 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded"
                      >
                        {isCopying ? 'Copia in corso...' : 'Copia'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCopyDropdown(false)}
                        className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                      >
                        Annulla
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Numero sviluppatori totale:</span>
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
        {missingTeamLimits.length > 0 && (
          <div className="mt-2 text-sm text-red-600 dark:text-red-400">
            Limite non configurato per: {missingTeamLimits.map((team) => team.name).join(', ')}. Per questi team il limite effettivo è 0.
          </div>
        )}
      </div>

      {/* Vista mobile: schede */}
      <div className="md:hidden space-y-4">
        {/* Limiti sviluppatori per team (mobile) */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Sviluppatori disponibili per team</h3>
          <div className="grid grid-cols-2 gap-2">
            {teams?.map((team) => {
              const isEditing = editingBudgetTeamId === team._id
              const teamLimit = teamBudgetMap.get(team._id) ?? 0
              return (
                <div key={team._id} className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{team.name}</span>
                  {isEditing && isAdmin ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        value={editBudgetValue}
                        onChange={(e) => setEditBudgetValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveBudget(team._id)
                          if (e.key === 'Escape') handleCancelEditBudget()
                        }}
                        className="w-14 px-2 py-1 text-sm text-center border border-blue-500 dark:border-blue-400 rounded focus:outline-none dark:bg-gray-600 dark:text-gray-100"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveBudget(team._id)}
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded"
                      >
                        Salva
                      </button>
                      <button
                        onClick={handleCancelEditBudget}
                        className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 rounded"
                      >
                        Annulla
                      </button>
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <span className="font-semibold">{teamLimit}</span>
                      {isAdmin && (
                        <button
                          onClick={() => handleStartEditBudget(team._id)}
                          className="p-0.5 text-gray-400 hover:text-blue-600"
                          title={`Modifica per ${team.name}`}
                        >
                          <Pencil size={12} />
                        </button>
                      )}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
        {departments?.map((dept) => {
          const deptTotal = teams?.reduce(
            (sum, team) => sum + getAllocation(dept._id, team._id),
            0
          ) ?? 0

          return (
            <div key={dept._id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  {dept.name}
                </h3>
                <div className="mt-1 text-sm font-semibold text-gray-600 dark:text-gray-400">
                  Totale: {deptTotal}
                </div>
              </div>
              <div className="space-y-3">
                {teams?.map((team) => {
                  const key = `${dept._id}-${team._id}`
                  const isEditing = editingCell === key
                  const value = getAllocation(dept._id, team._id)

                  return (
                    <div key={team._id} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{team.name}</span>
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
                          className="w-20 px-2 py-1 text-center border border-blue-500 dark:border-blue-400 rounded focus:outline-none dark:bg-gray-700 dark:text-gray-100"
                          autoFocus
                        />
                      ) : (
                        <button
                          onClick={() => handleCellClick(dept._id, team._id)}
                          className={`w-16 h-8 rounded text-sm ${
                            value > 0
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/50'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          {value}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
        {/* Card totale generale */}
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg shadow p-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">Totale Generale</h3>
          <div className="space-y-2">
            {teams?.map((team) => {
              const teamTotal = departments?.reduce(
                (sum, dept) => sum + getAllocation(dept._id, team._id),
                0
              ) ?? 0
              return (
                <div key={team._id} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{team.name}</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{teamTotal}</span>
                </div>
              )
            })}
            <div className="pt-2 mt-2 border-t border-gray-300 dark:border-gray-600 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Totale</span>
              <span className="text-base font-bold text-gray-900 dark:text-gray-100">{totalAllocated}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Vista desktop: tabella */}
      <div className="hidden md:block bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
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
              <tr className="bg-gray-100 dark:bg-gray-700/80 border-b">
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                  Sviluppatori disponibili
                </th>
                {teams?.map((team) => {
                  const isEditing = editingBudgetTeamId === team._id
                  const teamLimit = teamBudgetMap.get(team._id) ?? 0
                  return (
                    <th key={team._id} className="px-4 py-2 text-center">
                      {isEditing && isAdmin ? (
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            min="0"
                            value={editBudgetValue}
                            onChange={(e) => setEditBudgetValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveBudget(team._id)
                              if (e.key === 'Escape') handleCancelEditBudget()
                            }}
                            className="w-14 px-2 py-1 text-sm text-center border border-blue-500 dark:border-blue-400 rounded focus:outline-none dark:bg-gray-700 dark:text-gray-100"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveBudget(team._id)}
                            className="px-1.5 py-0.5 text-xs bg-blue-600 dark:bg-blue-700 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600"
                          >
                            Salva
                          </button>
                          <button
                            onClick={handleCancelEditBudget}
                            className="px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                          >
                            Annulla
                          </button>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <span className="font-semibold">{teamLimit}</span>
                          {isAdmin && (
                            <button
                              onClick={() => handleStartEditBudget(team._id)}
                              className="p-0.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                              title={`Modifica numero sviluppatori per ${team.name}`}
                            >
                              <Pencil size={12} />
                            </button>
                          )}
                        </span>
                      )}
                    </th>
                  )
                })}
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600">
                  {totalBudget}
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
