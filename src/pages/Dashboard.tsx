import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useMemo, useState, useEffect, useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { oembed } from '@loomhq/loom-embed'
import type { Id } from '../../convex/_generated/dataModel'

// Helper per calcolare il numero della settimana ISO
function getISOWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return { year: d.getUTCFullYear(), week: weekNo }
}

// Funzione helper per ottenere la settimana precedente in formato "YYYY-Www"
function getPreviousWeek(): string {
  const now = new Date()
  const previousWeek = new Date(now)
  previousWeek.setDate(previousWeek.getDate() - 7)
  const { year, week } = getISOWeek(previousWeek)
  return `${year}-W${week.toString().padStart(2, '0')}`
}

// Funzione helper per formattare il nome dello stato
function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    FrontValidated: 'Front Validato',
    InProgress: 'In Corso',
    Done: 'Completato'
  }
  return statusMap[status] || status
}

// Componente per l'embed Loom
function LoomEmbed({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null)

  // Reset state quando l'URL cambia
  const needsLoad = url !== loadedUrl

  useEffect(() => {
    if (!containerRef.current || !url || !needsLoad) return

    let isCancelled = false

    oembed(url, { width: 640 })
      .then((result) => {
        if (isCancelled) return
        if (containerRef.current && result.html) {
          containerRef.current.innerHTML = result.html
        }
        setLoading(false)
        setError(null)
        setLoadedUrl(url)
      })
      .catch((err) => {
        if (isCancelled) return
        console.error('Loom embed error:', err)
        setError('Impossibile caricare il video Loom')
        setLoading(false)
        setLoadedUrl(url)
      })

    return () => {
      isCancelled = true
    }
  }, [url, needsLoad])

  if (error) {
    return (
      <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-2">{error}</p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Apri in Loom
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
      {loading && (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-gray-500 dark:text-gray-400">Caricamento video...</div>
        </div>
      )}
      <div ref={containerRef} className={`w-full h-full ${loading ? 'hidden' : ''}`} />
    </div>
  )
}

// Dialog per mostrare il video Loom
function LoomDialog({ 
  isOpen, 
  onClose, 
  loomUrl, 
  title 
}: { 
  isOpen: boolean
  onClose: () => void
  loomUrl: string | undefined
  title?: string
}) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen || !loomUrl) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h3>
          )}
          <button
            onClick={onClose}
            className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl font-bold"
            aria-label="Chiudi"
          >
            ×
          </button>
        </div>
        <div className="w-full">
          <LoomEmbed url={loomUrl} />
        </div>
      </div>
    </div>
  )
}

// Colori per i team (ciclo attraverso una palette)
const teamColors = [
  'bg-blue-500 dark:bg-blue-600',
  'bg-purple-500 dark:bg-purple-600',
  'bg-pink-500 dark:bg-pink-600',
  'bg-indigo-500 dark:bg-indigo-600',
  'bg-cyan-500 dark:bg-cyan-600',
  'bg-teal-500 dark:bg-teal-600',
  'bg-orange-500 dark:bg-orange-600',
  'bg-red-500 dark:bg-red-600',
  'bg-yellow-500 dark:bg-yellow-600',
  'bg-green-500 dark:bg-green-600'
]

export default function DashboardPage() {
  const currentMonth = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }, [])

  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const previousWeek = useMemo(() => getPreviousWeek(), [])
  const [selectedWeek, setSelectedWeek] = useState(previousWeek)
  const [activeTab, setActiveTab] = useState<'okr' | 'delayed' | 'weeklyLoom' | 'pastKeyDevs'>('okr')
  const [openLoomDialog, setOpenLoomDialog] = useState<{ url: string; title?: string } | null>(null)

  // Query per i mesi disponibili
  const months = useQuery(api.months.list)
  
  // Query per i dati del dashboard
  const okrData = useQuery(api.dashboard.getOKRScore, { monthRef: selectedMonth })
  const delayedKeyDevs = useQuery(api.dashboard.getDelayedKeyDevs, { currentMonth })
  const pastKeyDevs = useQuery(api.dashboard.getPastKeyDevs, { currentMonth })
  const keyDevsByTeam = useQuery(api.dashboard.getKeyDevsByTeamAndStatus, { monthRef: selectedMonth })
  const updatesByWeek = useQuery(api.dashboard.getUpdatesByWeek, { monthRef: selectedMonth })
  
  // Calcola il counter per Weekly Loom (totale update con loomUrl)
  const weeklyLoomCount = useMemo(() => {
    if (!updatesByWeek) return 0
    return updatesByWeek.reduce((total, week) => {
      return total + week.updates.filter((u) => u.loomUrl).length
    }, 0)
  }, [updatesByWeek])
  
  // Counter per KeyDev passati
  const pastKeyDevsCount = pastKeyDevs?.length || 0

  // Genera le opzioni per il dropdown dei mesi (6 mesi passati + mese corrente + mesi futuri dal DB)
  const monthOptions = useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonthNum = now.getMonth() + 1 // 1-12
    
    // Genera i 6 mesi passati
    const pastMonths: string[] = []
    for (let i = 6; i >= 1; i--) {
      const date = new Date(currentYear, currentMonthNum - 1 - i, 1)
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      pastMonths.push(`${year}-${String(month).padStart(2, '0')}`)
    }
    
    // Mese corrente
    const currentMonthRef = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`
    
    // Mesi futuri dal database
    const futureMonths = months 
      ? months
          .map((m) => m.monthRef)
          .filter((m) => m > currentMonthRef)
          .sort()
      : []
    
    // Combina tutto: mesi passati + mese corrente + mesi futuri
    const allMonths = [...pastMonths, currentMonthRef, ...futureMonths]
    
    // Rimuovi duplicati e ordina (decrescente)
    const uniqueMonths = Array.from(new Set(allMonths)).sort().reverse()
    
    return uniqueMonths
  }, [months])

  // Genera le opzioni per il dropdown delle settimane
  const weekOptions = useMemo(() => {
    if (!updatesByWeek) return []
    return updatesByWeek.map((w) => w.weekRef)
  }, [updatesByWeek])

  // Se la settimana selezionata non è disponibile, usa la prima disponibile o la settimana precedente
  const effectiveSelectedWeek = useMemo(() => {
    if (!updatesByWeek || updatesByWeek.length === 0) return previousWeek
    if (weekOptions.includes(selectedWeek)) return selectedWeek
    return weekOptions[0] || previousWeek
  }, [updatesByWeek, selectedWeek, weekOptions, previousWeek])

  // Trova gli update per la settimana selezionata, raggruppati per Core App
  const updatesByCoreApp = useMemo(() => {
    if (!updatesByWeek) return []
    const weekData = updatesByWeek.find((w) => w.weekRef === effectiveSelectedWeek)
    if (!weekData) return []
    
    // Raggruppa per Core App
    const grouped: Record<string, typeof weekData.updates> = {}
    for (const update of weekData.updates) {
      if (!grouped[update.coreAppId]) {
        grouped[update.coreAppId] = []
      }
      grouped[update.coreAppId].push(update)
    }
    
    return Object.entries(grouped).map(([coreAppId, updates]) => ({
      coreAppId: coreAppId as Id<'coreApps'>,
      coreAppName: updates[0].coreAppName,
      percentComplete: updates[0].percentComplete,
      updates
    }))
  }, [updatesByWeek, effectiveSelectedWeek])

  // Determina se ci sono KeyDev in ritardo
  const hasDelayedKeyDevs = delayedKeyDevs && delayedKeyDevs.length > 0

  return (
    <div>
      {/* Header con titolo e dropdown mese */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Mese:
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {monthOptions.map((monthRef) => (
              <option key={monthRef} value={monthRef}>
                {monthRef}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs per OKR, Weekly Loom, KeyDev Passati e KeyDev in Ritardo */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('okr')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'okr'
                ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            OKR Score
          </button>
          <button
            onClick={() => setActiveTab('weeklyLoom')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'weeklyLoom'
                ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Weekly Loom ({weeklyLoomCount})
          </button>
          <button
            onClick={() => setActiveTab('pastKeyDevs')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'pastKeyDevs'
                ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Sviluppi Chiave Scaduti ({pastKeyDevsCount})
          </button>
          {hasDelayedKeyDevs && (
            <button
              onClick={() => setActiveTab('delayed')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'delayed'
                  ? 'border-red-600 dark:border-red-400 text-red-600 dark:text-red-400'
                  : 'border-transparent text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300'
              }`}
            >
              Sviluppi Chiave in Ritardo ({delayedKeyDevs.length})
            </button>
          )}
        </div>
      </div>

      {/* Contenuto Tab OKR */}
      {activeTab === 'okr' && (
        <>
          {/* OKR Score Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              OKR Score - {selectedMonth}
            </h2>
            {okrData ? (
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                    {okrData.score.toFixed(0)}%
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Completamento</div>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <span>Done: {okrData.doneCount}</span>
                    <span>Budget: {okrData.totalBudget}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                    <div
                      className="bg-blue-600 dark:bg-blue-500 h-4 rounded-full transition-all"
                      style={{ width: `${Math.min(okrData.score, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 dark:text-gray-400">Caricamento dati OKR...</div>
            )}
          </div>

          {/* Grafico KeyDev per Stato con divisione per team */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Sviluppi Chiave per Stato - {selectedMonth}
            </h2>
            {keyDevsByTeam ? (
              <div className="space-y-6">
                {keyDevsByTeam.byTeam.map((team, teamIndex) => {
                  const teamTotal = team.byStatus.reduce((sum, item) => sum + item.count, 0)
                  if (teamTotal === 0) return null
                  
                  const colorClass = teamColors[teamIndex % teamColors.length]
                  
                  return (
                    <div key={team.teamId} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">
                          {team.teamName}
                        </h3>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Totale: {teamTotal}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {team.byStatus.map((item) => {
                          const percentage = teamTotal > 0 ? (item.count / teamTotal) * 100 : 0
                          
                          return (
                            <div key={item.status}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-700 dark:text-gray-300">
                                  {formatStatus(item.status)}
                                </span>
                                <span className="text-gray-500 dark:text-gray-400">
                                  {item.count} ({percentage.toFixed(1)}%)
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                                <div
                                  className={`${colorClass} h-4 rounded-full transition-all flex items-center justify-end pr-2 text-white text-xs font-medium`}
                                  style={{ width: `${percentage}%` }}
                                >
                                  {item.count > 0 && item.count}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
                {keyDevsByTeam.byTeam.length === 0 && (
                  <div className="text-gray-500 dark:text-gray-400 text-center py-4">
                    Nessuno Sviluppo Chiave con status Front Validato o superiore per questo mese
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-500 dark:text-gray-400">Caricamento dati...</div>
            )}
          </div>

          {/* Monthly Progress by Team */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Completati per Team - {selectedMonth}
            </h2>
            {okrData?.byTeam && okrData.byTeam.length > 0 ? (
              <div className="space-y-4">
                {okrData.byTeam.map((team) => (
                  <div key={team.teamId}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-900 dark:text-gray-100">{team.teamName}</span>
                      <span className="text-gray-500 dark:text-gray-400">
                        {team.done}/{team.total}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-green-500 dark:bg-green-600 h-2 rounded-full transition-all"
                        style={{
                          width: `${team.total > 0 ? (team.done / team.total) * 100 : 0}%`
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 dark:text-gray-400">Nessun team con Sviluppi Chiave questo mese</div>
            )}
          </div>

        </>
      )}

      {/* Contenuto Tab Weekly Loom */}
      {activeTab === 'weeklyLoom' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
            Update Loom per Settimana
          </h2>
          {updatesByWeek ? (
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Seleziona Settimana
                </label>
                <select
                  value={effectiveSelectedWeek}
                  onChange={(e) => {
                    setSelectedWeek(e.target.value)
                  }}
                  className="w-full md:w-64 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {weekOptions.length > 0 ? (
                    weekOptions.map((weekRef) => (
                      <option key={weekRef} value={weekRef}>
                        {weekRef}
                      </option>
                    ))
                  ) : (
                    <option value={previousWeek}>{previousWeek}</option>
                  )}
                </select>
              </div>
              {updatesByCoreApp.length > 0 ? (
                <div className="space-y-6">
                  {updatesByCoreApp.map((group) => (
                    <div
                      key={group.coreAppId}
                      className="p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                          {group.coreAppName}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Completamento:</span>
                          <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            {group.percentComplete}%
                          </span>
                        </div>
                      </div>
                      <div className="space-y-4">
                        {group.updates.map((update) => (
                          <div key={update._id}>
                            {update.title && (
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {update.title}
                              </h4>
                            )}
                            {update.notes && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                {update.notes}
                              </p>
                            )}
                            {update.loomUrl && (
                              <button
                                onClick={() => setOpenLoomDialog({ url: update.loomUrl!, title: update.title })}
                                className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 text-sm font-medium transition-colors"
                              >
                                ▶ Guarda Video Loom
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 dark:text-gray-400 text-center py-4">
                  Nessun update disponibile per la settimana selezionata
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500 dark:text-gray-400">Caricamento dati...</div>
          )}
        </div>
      )}

      {/* Contenuto Tab KeyDev Passati */}
      {activeTab === 'pastKeyDevs' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
            Sviluppi Chiave Scaduti
          </h2>
          {pastKeyDevs && pastKeyDevs.length > 0 ? (
            <div className="space-y-3">
              {pastKeyDevs.map((kd) => (
                <div
                  key={kd._id}
                  className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {kd.readableId}: {kd.title}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Mese: {kd.monthRef} | Stato: {formatStatus(kd.status)}
                    </div>
                  </div>
                  <Link
                    to="/keydevs/$id"
                    params={{ id: kd._id }}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"
                  >
                    Dettagli →
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 dark:text-gray-400 text-center py-4">
              Nessuno Sviluppo Chiave passato completato
            </div>
          )}
        </div>
      )}

      {/* Contenuto Tab KeyDev in Ritardo */}
      {activeTab === 'delayed' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
            Sviluppi Chiave in Ritardo
          </h2>
          {delayedKeyDevs && delayedKeyDevs.length > 0 ? (
            <div className="space-y-3">
              {delayedKeyDevs.map((kd) => (
                <div
                  key={kd._id}
                  className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">{kd.title}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Mese: {kd.monthRef} | Stato: {kd.status}
                    </div>
                  </div>
                  <Link
                    to="/keydevs/$id"
                    params={{ id: kd._id }}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"
                  >
                    Dettagli →
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-green-600 dark:text-green-400">Nessuno Sviluppo Chiave in ritardo</div>
          )}
        </div>
      )}

      {/* Dialog per il video Loom */}
      <LoomDialog
        isOpen={openLoomDialog !== null}
        onClose={() => setOpenLoomDialog(null)}
        loomUrl={openLoomDialog?.url}
        title={openLoomDialog?.title}
      />
    </div>
  )
}
