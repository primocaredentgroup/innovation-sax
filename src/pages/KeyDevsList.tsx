import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useMemo } from 'react'

const statusColors: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-800',
  PendingBusinessApproval: 'bg-yellow-100 text-yellow-800',
  Approved: 'bg-green-100 text-green-800',
  Rejected: 'bg-red-100 text-red-800',
  FrontValidated: 'bg-blue-100 text-blue-800',
  InProgress: 'bg-purple-100 text-purple-800',
  Done: 'bg-emerald-100 text-emerald-800'
}

const statusLabels: Record<string, string> = {
  Draft: 'Bozza',
  PendingBusinessApproval: 'In Attesa Approvazione',
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
    status?: string
  }
  const navigate = useNavigate()

  const currentMonth = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }, [])

  const selectedMonth = search.month || currentMonth

  const keydevs = useQuery(api.keydevs.listByMonth, { monthRef: selectedMonth })
  const departments = useQuery(api.departments.list)
  const categories = useQuery(api.categories.list)

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
    if (search.status) {
      result = result.filter((kd) => kd.status === search.status)
    }

    return result
  }, [keydevs, search.dept, search.category, search.status])

  // Group by status
  const groupedByStatus = useMemo(() => {
    const groups: Record<string, typeof filteredKeyDevs> = {}
    for (const kd of filteredKeyDevs) {
      if (!groups[kd.status]) {
        groups[kd.status] = []
      }
      groups[kd.status].push(kd)
    }
    return groups
  }, [filteredKeyDevs])

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

  const updateSearch = (updates: Record<string, string | undefined>) => {
    navigate({
      to: '/keydevs',
      search: { ...search, ...updates }
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">KeyDevs</h1>
        <Link
          to="/keydevs/$id"
          params={{ id: 'new' }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          + Nuovo KeyDev
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mese (obbligatorio)
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => updateSearch({ month: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dipartimento
            </label>
            <select
              value={search.dept || ''}
              onChange={(e) => updateSearch({ dept: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoria
            </label>
            <select
              value={search.category || ''}
              onChange={(e) => updateSearch({ category: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Tutte</option>
              {categories?.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stato
            </label>
            <select
              value={search.status || ''}
              onChange={(e) => updateSearch({ status: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Tutti</option>
              {Object.entries(statusLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KeyDev List grouped by status */}
      <div className="space-y-6">
        {Object.entries(groupedByStatus).map(([statusKey, items]) => (
          <div key={statusKey}>
            <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <span className={`px-2 py-1 text-xs rounded-full ${statusColors[statusKey]}`}>
                {statusLabels[statusKey]}
              </span>
              <span className="text-gray-400">({items.length})</span>
            </h2>
            <div className="grid gap-4">
              {items.map((kd) => (
                <Link
                  key={kd._id}
                  to="/keydevs/$id"
                  params={{ id: kd._id }}
                  className="block bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{kd.title}</h3>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {kd.desc}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>
                          Dept: {departments?.find((d) => d._id === kd.deptId)?.name || 'N/A'}
                        </span>
                        <span>
                          Cat: {categories?.find((c) => c._id === kd.categoryId)?.name || 'N/A'}
                        </span>
                        {kd.mockupRepoUrl && (
                          <span className="text-blue-600">Mockup Repo</span>
                        )}
                        {kd.prNumber && (
                          <span className={kd.prMerged ? 'text-green-600' : 'text-yellow-600'}>
                            PR #{kd.prNumber} {kd.prMerged ? '(merged)' : '(open)'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="ml-4">
                      {kd.donePerc !== undefined && (
                        <div className="text-right">
                          <span className="text-lg font-semibold text-gray-900">
                            {kd.donePerc}%
                          </span>
                          <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${kd.donePerc}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}

        {filteredKeyDevs.length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            Nessun KeyDev trovato per i filtri selezionati
          </div>
        )}
      </div>
    </div>
  )
}
