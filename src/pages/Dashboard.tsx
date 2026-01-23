import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'

export default function DashboardPage() {
  const currentMonth = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }, [])

  const okrData = useQuery(api.dashboard.getOKRScore, { monthRef: currentMonth })
  const delayedKeyDevs = useQuery(api.dashboard.getDelayedKeyDevs, { currentMonth })

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* OKR Score Card */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          OKR Score - {currentMonth}
        </h2>
        {okrData ? (
          <div className="flex items-center gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600">
                {okrData.score.toFixed(0)}%
              </div>
              <div className="text-sm text-gray-500">Completamento</div>
            </div>
            <div className="flex-1">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Done: {okrData.doneCount}</span>
                <span>Budget: {okrData.totalBudget}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-blue-600 h-4 rounded-full transition-all"
                  style={{ width: `${Math.min(okrData.score, 100)}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="text-gray-500">Caricamento dati OKR...</div>
        )}
      </div>

      {/* Monthly Progress by Category */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Progress per Categoria
        </h2>
        {okrData?.byCategory && okrData.byCategory.length > 0 ? (
          <div className="space-y-4">
            {okrData.byCategory.map((cat) => (
              <div key={cat.categoryId}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{cat.categoryName}</span>
                  <span className="text-gray-500">
                    {cat.done}/{cat.total}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${cat.total > 0 ? (cat.done / cat.total) * 100 : 0}%`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500">Nessuna categoria con KeyDev questo mese</div>
        )}
      </div>

      {/* Delayed KeyDevs */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          KeyDev in Ritardo
        </h2>
        {delayedKeyDevs && delayedKeyDevs.length > 0 ? (
          <div className="space-y-3">
            {delayedKeyDevs.map((kd) => (
              <div
                key={kd._id}
                className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg"
              >
                <div>
                  <div className="font-medium text-gray-900">{kd.title}</div>
                  <div className="text-sm text-gray-500">
                    Mese: {kd.monthRef} | Stato: {kd.status}
                  </div>
                </div>
                <Link
                  to="/keydevs/$id"
                  params={{ id: kd._id }}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Dettagli →
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-green-600">Nessun KeyDev in ritardo</div>
        )}
      </div>
    </div>
  )
}
