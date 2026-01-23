import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useMemo } from 'react'

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
  Approved: 'Approvato',
  Rejected: 'Rifiutato',
  FrontValidated: 'Front Validato',
  InProgress: 'In Corso',
  Done: 'Completato'
}

export default function KeyDevsListPage() {
  const search = useSearch({ strict: false }) as {
    month?: string
    dept?: string
    category?: string
    status?: string | string[]
  }
  const navigate = useNavigate()

  const currentMonth = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }, [])

  const selectedMonth = search.month || currentMonth

  const keydevs = useQuery(api.keydevs.listByMonth, { monthRef: selectedMonth })
  const statusCounts = useQuery(api.keydevs.getStatusCounts, { monthRef: selectedMonth })
  const departments = useQuery(api.departments.list)
  const categories = useQuery(api.categories.list)

  // Normalizza gli status selezionati (può essere stringa o array)
  const selectedStatuses = useMemo(() => {
    if (!search.status) return []
    if (Array.isArray(search.status)) return search.status
    return [search.status]
  }, [search.status])

  // Filter keydevs based on search params
  const filteredKeyDevs = useMemo(() => {
    if (!keydevs) return []
    let result = keydevs

    if (search.dept) {
      result = result.filter((kd) => kd.deptId === search.dept)
    }
    if (search.category) {
      result = result.filter((kd) => kd.categoryId === search.category)
    }
    if (selectedStatuses.length > 0) {
      result = result.filter((kd) => selectedStatuses.includes(kd.status))
    }

    return result
  }, [keydevs, search.dept, search.category, selectedStatuses])

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">KeyDevs</h1>
        <Link
          to="/keydevs/$id"
          params={{ id: 'new' }}
          className="px-4 py-2 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 font-medium rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors border border-blue-600 dark:border-blue-500"
        >
          + Nuovo KeyDev
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Mese (obbligatorio)
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => updateSearch({ month: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
            >
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Dipartimento
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
              Categoria
            </label>
            <select
              value={search.category || ''}
              onChange={(e) => updateSearch({ category: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="">Tutte</option>
              {categories?.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
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
            {Object.entries(statusLabels).map(([key, label]) => {
              const isSelected = selectedStatuses.includes(key)
              const count = statusCounts?.[key] || 0
              return (
                <button
                  key={key}
                  onClick={() => toggleStatus(key)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    isSelected
                      ? `${statusColors[key]} ring-2 ring-offset-2 ring-gray-600 dark:ring-gray-400 shadow-md font-semibold`
                      : `${statusColors[key]} opacity-70 hover:opacity-100`
                  }`}
                >
                  {label}
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
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Categoria</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Completamento</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Info</th>
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
                    {categories?.find((c) => c._id === kd.categoryId)?.name || 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {kd.donePerc !== undefined ? (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-900 dark:text-gray-100 font-medium w-10">{kd.donePerc}%</span>
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 max-w-24">
                          <div
                            className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full"
                            style={{ width: `${kd.donePerc}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex flex-wrap gap-2">
                      {kd.mockupRepoUrl && (
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                          Mockup
                        </span>
                      )}
                      {kd.prNumber && (
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            kd.prMerged ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                          }`}
                        >
                          PR #{kd.prNumber} {kd.prMerged ? '✓' : '○'}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredKeyDevs.length === 0 && (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            Nessun KeyDev trovato per i filtri selezionati
          </div>
        )}
      </div>
    </div>
  )
}
