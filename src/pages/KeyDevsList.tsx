import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useMemo } from 'react'
import type { Id } from '../../convex/_generated/dataModel'

const statusColors: Record<string, string> = {
  Draft: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
  MockupDone: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
  Approved: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
  Rejected: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
  FrontValidated: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
  InProgress: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
  Done: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300'
}

const statusLabels: Record<string, string> = {
  Draft: 'Bozza',
  MockupDone: 'Mockup Terminato',
  Rejected: 'Rifiutato',
  Approved: 'Approvato',
  FrontValidated: 'Front Validato',
  InProgress: 'In Corso',
  Done: 'Completato'
}

// Stati che non hanno filtro per mese (appaiono sempre)
const statusesWithoutMonthFilter = ['MockupDone', 'Rejected', 'Approved']

// Ordine degli stati per la visualizzazione
const statusOrder = ['Draft', 'MockupDone', 'Rejected', 'Approved', 'FrontValidated', 'InProgress', 'Done']

export default function KeyDevsListPage() {
  const search = useSearch({ strict: false })
  const navigate = useNavigate()

  const currentMonth = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }, [])

  const selectedMonth = search.month || currentMonth

  // Query per keydevs filtrati per mese (Draft, FrontValidated, InProgress, Done)
  const keydevsByMonth = useQuery(api.keydevs.listByMonth, { monthRef: selectedMonth })
  // Query per keydevs senza filtro mese (MockupDone, Rejected, Approved)
  const keydevsWithoutMonth = useQuery(api.keydevs.listWithoutMonthFilter)
  // Contatori per mese
  const statusCountsByMonth = useQuery(api.keydevs.getStatusCounts, { monthRef: selectedMonth })
  // Contatori senza filtro mese
  const statusCountsWithoutMonth = useQuery(api.keydevs.getStatusCountsWithoutMonth)
  
  const departments = useQuery(api.departments.list)
  const teams = useQuery(api.teams.list)
  const allBlockingLabels = useQuery(api.blockingLabels.list)
  const users = useQuery(api.users.listUsers)
  
  // Combina i contatori
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    // Contatori per stati con filtro mese
    if (statusCountsByMonth) {
      for (const [status, count] of Object.entries(statusCountsByMonth)) {
        if (!statusesWithoutMonthFilter.includes(status)) {
          counts[status] = count
        }
      }
    }
    // Contatori per stati senza filtro mese
    if (statusCountsWithoutMonth) {
      for (const [status, count] of Object.entries(statusCountsWithoutMonth)) {
        counts[status] = count
      }
    }
    return counts
  }, [statusCountsByMonth, statusCountsWithoutMonth])
  
  // Combina i keydevs
  const keydevs = useMemo(() => {
    const byMonthFiltered = (keydevsByMonth || []).filter(
      (kd) => !statusesWithoutMonthFilter.includes(kd.status)
    )
    const withoutMonth = keydevsWithoutMonth || []
    return [...byMonthFiltered, ...withoutMonth]
  }, [keydevsByMonth, keydevsWithoutMonth])

  // Normalizza gli status selezionati (può essere stringa o array)
  const selectedStatuses = useMemo(() => {
    if (!search.status) return []
    if (Array.isArray(search.status)) return search.status
    return [search.status]
  }, [search.status])

  // Crea una mappa dei blockingLabels per keydev
  const blockingLabelsByKeyDev = useMemo(() => {
    const map = new Map<Id<'keydevs'>, Array<{ labelId: Id<'labels'>; label: { value: string; label: string }; status: 'Open' | 'Closed' }>>()
    if (allBlockingLabels) {
      for (const bl of allBlockingLabels) {
        if (!map.has(bl.keyDevId)) {
          map.set(bl.keyDevId, [])
        }
        map.get(bl.keyDevId)!.push({ labelId: bl.labelId, label: bl.label, status: bl.status })
      }
    }
    return map
  }, [allBlockingLabels])

  // Applica i filtri base (mese, dept, team, status) per calcolare i contatori
  const baseFilteredKeyDevs = useMemo(() => {
    if (!keydevs) return []
    let result = keydevs

    if (search.dept) {
      result = result.filter((kd) => kd.deptId === search.dept)
    }
    if (search.team) {
      result = result.filter((kd) => kd.teamId === search.team)
    }
    if (selectedStatuses.length > 0) {
      result = result.filter((kd) => selectedStatuses.includes(kd.status))
    }

    return result
  }, [keydevs, search.dept, search.team, selectedStatuses])

  // Calcola i contatori per ogni label di blocking basati sui keydevs filtrati
  const blockingLabelCounts = useMemo(() => {
    const counts = new Map<Id<'labels'>, { label: { value: string; label: string }; count: number }>()
    if (allBlockingLabels && baseFilteredKeyDevs.length > 0) {
      // Raggruppa per labelId
      const labelMap = new Map<Id<'labels'>, { label: { value: string; label: string }; keyDevIds: Set<Id<'keydevs'>> }>()
      
      for (const bl of allBlockingLabels) {
        if (!labelMap.has(bl.labelId)) {
          labelMap.set(bl.labelId, { label: bl.label, keyDevIds: new Set() })
        }
        labelMap.get(bl.labelId)!.keyDevIds.add(bl.keyDevId)
      }
      
      // Conta solo i keydevs che sono nella lista filtrata corrente
      for (const [labelId, data] of labelMap.entries()) {
        const matchingKeyDevs = baseFilteredKeyDevs.filter(kd => data.keyDevIds.has(kd._id))
        if (matchingKeyDevs.length > 0) {
          counts.set(labelId, { label: data.label, count: matchingKeyDevs.length })
        }
      }
    }
    return counts
  }, [allBlockingLabels, baseFilteredKeyDevs])

  // Filter keydevs based on search params (usa baseFilteredKeyDevs e aggiunge il filtro blockingLabel)
  const filteredKeyDevs = useMemo(() => {
    let result = baseFilteredKeyDevs

    if (search.blockingLabel) {
      result = result.filter((kd) => {
        const labels = blockingLabelsByKeyDev.get(kd._id) || []
        return labels.some((l) => l.labelId === search.blockingLabel)
      })
    }

    return result
  }, [baseFilteredKeyDevs, search.blockingLabel, blockingLabelsByKeyDev])

  // Generate month options
  const monthOptions = useMemo(() => {
    const options = []
    const now = new Date()
    for (let i = -6; i <= 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const ref = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const label = date.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
      options.push({ value: ref, label })
    }
    return options
  }, [])

  const updateSearch = (updates: Record<string, string | string[] | undefined>) => {
    navigate({
      to: '/keydevs',
      search: { ...search, ...updates }
    })
  }

  const toggleStatus = (status: string) => {
    const currentStatuses = selectedStatuses
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter((s) => s !== status)
      : [...currentStatuses, status]
    
    updateSearch({ status: newStatuses.length > 0 ? newStatuses : undefined })
  }

  const selectedTeam = search.team || null

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Sviluppi Chiave di</h1>
          <select
            value={selectedMonth}
            onChange={(e) => updateSearch({ month: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 text-lg font-semibold"
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <Link
          to="/keydevs/$id"
          params={{ id: 'new' }}
          className="px-4 py-2 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 font-medium rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors border border-blue-600 dark:border-blue-500"
        >
          + Nuovo Sviluppo Chiave
        </Link>
      </div>

      {/* Team Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex overflow-x-auto">
          <button
            onClick={() => updateSearch({ team: undefined })}
            className={`px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              selectedTeam === null
                ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Tutti i team
          </button>
          {teams?.map((team) => (
            <button
              key={team._id}
              onClick={() => updateSearch({ team: team._id })}
              className={`px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                selectedTeam === team._id
                  ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {team.name}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Dipartimento richiedente
            </label>
            <select
              value={search.dept || ''}
              onChange={(e) => updateSearch({ dept: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="">Tutti</option>
              {departments?.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Filtra per Blocking Label
            </label>
            <select
              value={search.blockingLabel || ''}
              onChange={(e) => updateSearch({ blockingLabel: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="">Tutti</option>
              {Array.from(blockingLabelCounts.entries())
                .sort((a, b) => a[1].label.label.localeCompare(b[1].label.label))
                .map(([labelId, data]) => (
                  <option key={labelId} value={labelId}>
                    {data.label.label} ({data.count})
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Status Filters - Tag Style */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Filtra per Stato
          </label>
          <div className="flex flex-wrap gap-2">
            {statusOrder.map((key) => {
              const label = statusLabels[key]
              const isSelected = selectedStatuses.includes(key)
              const count = statusCounts?.[key] || 0
              const hasNoMonthFilter = statusesWithoutMonthFilter.includes(key)
              return (
                <button
                  key={key}
                  onClick={() => toggleStatus(key)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    isSelected
                      ? `${statusColors[key]} ring-2 ring-offset-2 ring-gray-600 dark:ring-gray-400 shadow-md font-semibold`
                      : `${statusColors[key]} opacity-70 hover:opacity-100`
                  }`}
                  title={hasNoMonthFilter ? 'Questo stato non è filtrato per mese' : undefined}
                >
                  {label}
                  {hasNoMonthFilter && <span className="ml-1 text-xs opacity-60">*</span>}
                  {count > 0 && (
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                      isSelected ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900' : 'bg-gray-700 dark:bg-gray-300 text-white dark:text-gray-900'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            * Stati non filtrati per mese
          </p>
          {selectedStatuses.length > 0 && (
            <button
              onClick={() => updateSearch({ status: undefined })}
              className="mt-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 underline"
            >
              Rimuovi tutti i filtri
            </button>
          )}
        </div>
      </div>

      {/* KeyDev List Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Titolo</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Stato</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Dipartimento</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Team</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Owner</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Blocchi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredKeyDevs.map((kd) => (
                <tr
                  key={kd._id}
                  onClick={() => navigate({ to: '/keydevs/$id', params: { id: kd.readableId } })}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 dark:text-gray-400 font-mono text-xs">{kd.readableId}</span>
                      <span>{kd.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 text-xs rounded-full ${statusColors[kd.status]}`}>
                      {statusLabels[kd.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                    {departments?.find((d) => d._id === kd.deptId)?.name || 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                    {teams?.find((t) => t._id === kd.teamId)?.name || 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                    {kd.ownerId ? (users?.find((u) => u._id === kd.ownerId)?.name || 'N/A') : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        const labels = blockingLabelsByKeyDev.get(kd._id) || []
                        const openLabels = labels.filter((l) => l.status === 'Open')
                        const closedLabels = labels.filter((l) => l.status === 'Closed')
                        
                        return (
                          <>
                            {openLabels.map((bl) => (
                              <span
                                key={`open-${bl.labelId}`}
                                className="px-2 py-1 text-xs rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                                title={`${bl.label.label} (Aperto)`}
                              >
                                {bl.label.label}
                              </span>
                            ))}
                            {closedLabels.map((bl) => (
                              <span
                                key={`closed-${bl.labelId}`}
                                className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 line-through"
                                title={`${bl.label.label} (Chiuso)`}
                              >
                                {bl.label.label}
                              </span>
                            ))}
                            {labels.length === 0 && (
                              <span className="text-gray-400 dark:text-gray-500 text-xs">-</span>
                            )}
                          </>
                        )
                      })()}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredKeyDevs.length === 0 && (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            Nessuno Sviluppo Chiave trovato per i filtri selezionati
          </div>
        )}
      </div>
    </div>
  )
}
