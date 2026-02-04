import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useMemo, useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
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
    Draft: 'Bozza',
    MockupDone: 'Mockup Terminato',
    Approved: 'Approvato',
    Rejected: 'Rifiutato',
    FrontValidated: 'Front Validato',
    InProgress: 'In Corso',
    Done: 'Completato',
    Checked: 'Controllato'
  }
  return statusMap[status] || status
}

// Funzione helper per formattare il mese in formato italiano "Gennaio 2026"
function formatMonth(monthRef: string): string {
  const [year, month] = monthRef.split('-')
  const monthNum = parseInt(month, 10)
  const monthNames = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ]
  return `${monthNames[monthNum - 1]} ${year}`
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70 p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full p-4 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
          {title && (
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 break-words flex-1 min-w-0">
              {title}
            </h3>
          )}
          <button
            onClick={onClose}
            className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl sm:text-2xl font-bold shrink-0"
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

// Colori per gli stati - allineati con KeyDevsList.tsx
// Usiamo versioni più scure per i grafici (basate sui colori di KeyDevsList ma più saturate per visibilità)
const statusColors: Record<string, { light: string; dark: string }> = {
  Draft: { light: '#6b7280', dark: '#374151' }, // gray-500 / gray-700
  MockupDone: { light: '#eab308', dark: '#a16207' }, // yellow-500 / yellow-700
  Approved: { light: '#22c55e', dark: '#15803d' }, // green-500 / green-700
  Rejected: { light: '#ef4444', dark: '#b91c1c' }, // red-500 / red-700
  FrontValidated: { light: '#3b82f6', dark: '#1e40af' }, // blue-500 / blue-800
  InProgress: { light: '#a855f7', dark: '#7e22ce' }, // purple-500 / purple-700
  Done: { light: '#10b981', dark: '#047857' }, // emerald-500 / emerald-700
  Checked: { light: '#f97316', dark: '#c2410c' } // orange-500 / orange-700
}

// Hook per rilevare il tema
function useDarkMode() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'))
    }
    checkTheme()

    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })

    return () => observer.disconnect()
  }, [])

  return isDark
}

// Hook per rilevare la dimensione dello schermo
function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    window.addEventListener('resize', handleResize)
    handleResize()

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return windowSize
}

// Componente per grafico a torta
function PieChart({ 
  data, 
  size = 200,
  teamId,
  monthRef
}: { 
  data: Array<{ status: string; count: number }>
  size?: number
  teamId?: Id<'teams'>
  monthRef?: string
}) {
  const isDark = useDarkMode()
  const navigate = useNavigate()
  const [hoveredPath, setHoveredPath] = useState<{ status: string; count: number; percentage: number; x: number; y: number } | null>(null)

  const total = data.reduce((sum, item) => sum + item.count, 0)
  
  if (total === 0) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <div className="text-gray-400 dark:text-gray-500 text-sm">Nessun dato</div>
      </div>
    )
  }

  const radius = size / 2 - 10
  const center = size / 2
  let currentAngle = -Math.PI / 2 // Inizia dall'alto

  const paths: Array<{ d: string; fill: string; status: string; count: number; percentage: number; midAngle: number }> = []

  // Conta quanti segmenti hanno count > 0
  const segmentsWithData = data.filter(item => item.count > 0).length

  for (const item of data) {
    if (item.count === 0) continue
    
    const percentage = (item.count / total) * 100
    const angle = (item.count / total) * 2 * Math.PI
    const midAngle = currentAngle + angle / 2
    
    // Se c'è un solo segmento e rappresenta il 100%, renderizza un cerchio completo
    let d: string
    if (segmentsWithData === 1 && Math.abs(angle - 2 * Math.PI) < 0.001) {
      // Cerchio completo - usa un path che disegna un cerchio completo
      // M sposta al centro, poi disegna un cerchio usando due archi semicircolari
      const startX = center
      const startY = center - radius
      d = `M ${startX} ${startY} A ${radius} ${radius} 0 1 1 ${startX} ${center + radius} A ${radius} ${radius} 0 1 1 ${startX} ${startY} Z`
    } else {
      const x1 = center + radius * Math.cos(currentAngle)
      const y1 = center + radius * Math.sin(currentAngle)
      const x2 = center + radius * Math.cos(currentAngle + angle)
      const y2 = center + radius * Math.sin(currentAngle + angle)
      
      const largeArcFlag = angle > Math.PI ? 1 : 0
      
      d = [
        `M ${center} ${center}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        'Z'
      ].join(' ')
    }

    // Usa il colore appropriato in base al tema
    const color = isDark ? statusColors[item.status]?.dark : statusColors[item.status]?.light || '#6b7280'
    
    paths.push({
      d,
      fill: color,
      status: item.status,
      count: item.count,
      percentage,
      midAngle
    })
    
    currentAngle += angle
  }

  return (
    <div className="flex items-center justify-center relative" style={{ width: size, height: size }}>
      {paths.length === 0 ? (
        <div className="text-gray-400 dark:text-gray-500 text-sm">Nessun dato da visualizzare</div>
      ) : (
        <svg width={size} height={size} className="transform -rotate-90" style={{ display: 'block' }}>
          {paths.map((path, index) => {
            // Calcola la posizione per il tooltip (angolo medio del segmento)
            const tooltipXPos = center + (radius * 0.7) * Math.cos(path.midAngle)
            const tooltipYPos = center + (radius * 0.7) * Math.sin(path.midAngle)
            
            return (
              <path
                key={`${path.status}-${index}`}
                d={path.d}
                fill={path.fill}
                className="transition-opacity hover:opacity-80 cursor-pointer"
                onMouseEnter={() => setHoveredPath({
                  status: path.status,
                  count: path.count,
                  percentage: path.percentage,
                  x: tooltipXPos,
                  y: tooltipYPos
                })}
                onMouseLeave={() => setHoveredPath(null)}
                onClick={() => {
                  if (teamId && path.count > 0) {
                    navigate({
                      to: '/keydevs',
                      search: {
                        team: teamId,
                        status: path.status,
                        month: monthRef
                      }
                    })
                  }
                }}
              />
            )
          })}
        </svg>
      )}
      {hoveredPath && (
        <div
          className="absolute z-10 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg pointer-events-none"
          style={{
            left: `${hoveredPath.x}px`,
            top: `${hoveredPath.y}px`,
            transform: 'translate(-50%, -50%)',
            whiteSpace: 'nowrap'
          }}
        >
          <div className="font-semibold mb-1">{formatStatus(hoveredPath.status)}</div>
          <div>Quantità: {hoveredPath.count}</div>
          <div>Percentuale: {hoveredPath.percentage.toFixed(1)}%</div>
        </div>
      )}
    </div>
  )
}

// Componente per la legenda condivisa (mostra tutti gli stati possibili)
function SharedLegend() {
  const isDark = useDarkMode()
  
  // Tutti gli stati possibili nell'ordine desiderato
  const allStatuses = ['Draft', 'MockupDone', 'Approved', 'Rejected', 'FrontValidated', 'InProgress', 'Done', 'Checked'] as const

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
      {allStatuses.map((status) => {
        const color = isDark ? statusColors[status]?.dark : statusColors[status]?.light || '#6b7280'
        
        return (
          <div key={status} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 sm:w-4 sm:h-4 rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
              {formatStatus(status)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// Componente per grafico a barre orizzontali
function BarChart({ 
  data 
}: { 
  data: Array<{ teamId: Id<'teams'>; teamName: string; done: number; total: number }>
}) {
  // Calcola la percentuale massima per scalare le barre
  const maxPercentage = Math.max(
    ...data.map((team) => (team.total > 0 ? (team.done / team.total) * 100 : 0)),
    1 // Almeno 1% per evitare divisione per zero
  )

  return (
    <div className="space-y-3 sm:space-y-4">
      {data.map((team) => {
        const percentage = team.total > 0 ? (team.done / team.total) * 100 : 0
        const barWidth = maxPercentage > 0 ? (percentage / maxPercentage) * 100 : 0
        
        return (
          <div key={team.teamId} className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
              <span className="font-medium text-gray-900 dark:text-gray-100 text-xs sm:text-sm min-w-0 sm:min-w-[120px] truncate">
                {team.teamName}
              </span>
              <div className="flex items-center gap-2 sm:gap-4">
                <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  {team.done} / {team.total}
                </span>
                <span className="text-sm sm:text-base font-bold text-green-600 dark:text-green-400 min-w-[45px] sm:min-w-[50px] text-right">
                  {percentage.toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="relative w-full bg-gray-200 dark:bg-gray-700 rounded-full h-6 sm:h-8 overflow-hidden">
              <div
                className="bg-green-500 dark:bg-green-600 h-6 sm:h-8 rounded-full transition-all duration-500 flex items-center justify-end pr-2 sm:pr-3"
                style={{
                  width: `${barWidth}%`
                }}
              >
                {barWidth > 20 && (
                  <span className="text-xs font-semibold text-white">
                    {team.done}
                  </span>
                )}
              </div>
              {barWidth <= 20 && percentage > 0 && (
                <span className="absolute inset-0 flex items-center pl-2 sm:pl-3 text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {team.done}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function DashboardPage() {
  const isDark = useDarkMode()
  const currentMonth = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }, [])

  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const previousWeek = useMemo(() => getPreviousWeek(), [])
  const [selectedWeek, setSelectedWeek] = useState(previousWeek)
  const [activeTab, setActiveTab] = useState<'okr' | 'weeklyLoom' | 'pastKeyDevs'>('okr')
  const [openLoomDialog, setOpenLoomDialog] = useState<{ url: string; title?: string } | null>(null)
  const { width: windowWidth } = useWindowSize()

  // Query per i mesi disponibili
  const months = useQuery(api.months.list)
  
  // Query per i dati del dashboard
  const okrData = useQuery(api.dashboard.getOKRScore, { monthRef: selectedMonth })
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

  // Trova tutti gli update raggruppati per Core App (senza filtro settimanale)
  // Prendi gli update da tutte le settimane disponibili
  const updatesByCoreApp = useMemo(() => {
    if (!updatesByWeek) return []
    
    // Raccogli tutti gli update da tutte le settimane
    const allUpdates: Array<typeof updatesByWeek[0]['updates'][0]> = []
    for (const weekData of updatesByWeek) {
      allUpdates.push(...weekData.updates)
    }
    
    // Raggruppa per Core App
    const grouped: Record<string, typeof allUpdates> = {}
    for (const update of allUpdates) {
      if (!grouped[update.coreAppId]) {
        grouped[update.coreAppId] = []
      }
      grouped[update.coreAppId].push(update)
    }
    
    // Limita a 10 elementi e ordina per percentComplete decrescente
    return Object.entries(grouped)
      .map(([coreAppId, updates]) => ({
        coreAppId: coreAppId as Id<'coreApps'>,
        coreAppName: updates[0].coreAppName,
        percentComplete: updates[0].percentComplete,
        updates
      }))
      .sort((a, b) => b.percentComplete - a.percentComplete)
      .slice(0, 10)
  }, [updatesByWeek])

  return (
    <div className="w-full max-w-full overflow-x-hidden min-w-0">
      {/* Tabs per OKR, Weekly Loom e KeyDev Scaduti - più prominenti */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-3 sm:gap-4">
          <button
            onClick={() => setActiveTab('okr')}
            className={`px-4 sm:px-6 py-3 font-semibold text-sm sm:text-base border-2 rounded-lg transition-all shrink-0 ${
              activeTab === 'okr'
                ? 'border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-md'
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Sviluppi Chiave del Mese
          </button>
          <button
            onClick={() => setActiveTab('weeklyLoom')}
            className={`px-4 sm:px-6 py-3 font-semibold text-sm sm:text-base border-2 rounded-lg transition-all shrink-0 ${
              activeTab === 'weeklyLoom'
                ? 'border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-md'
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Aggiornamenti sul Core
            <span className="ml-2 px-2 py-0.5 bg-blue-600 dark:bg-blue-500 text-white rounded-full text-xs sm:text-sm font-bold">
              {weeklyLoomCount}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('pastKeyDevs')}
            className={`px-4 sm:px-6 py-3 font-semibold text-sm sm:text-base border-2 rounded-lg transition-all shrink-0 ${
              activeTab === 'pastKeyDevs'
                ? 'border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-md'
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <span className="hidden sm:inline">Sviluppi Chiave Scaduti</span>
            <span className="sm:hidden">KeyDev Scaduti</span>
            <span className="ml-2 px-2 py-0.5 bg-red-600 dark:bg-red-500 text-white rounded-full text-xs sm:text-sm font-bold">
              {pastKeyDevsCount}
            </span>
          </button>
        </div>
      </div>

      {/* Contenuto Tab OKR */}
      {activeTab === 'okr' && (
        <>
          {/* Filtro mese per la tab OKR */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mb-6 min-w-0">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 min-w-0">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap shrink-0">
                Mese:
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full sm:w-auto px-3 sm:px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-0 max-w-full"
              >
                {monthOptions.map((monthRef) => (
                  <option key={monthRef} value={monthRef}>
                    {formatMonth(monthRef)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* OKR Score Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mb-6 min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 break-words">
              Sviluppi Chiave - {selectedMonth}
            </h2>
            {okrData ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 min-w-0">
                <div className="text-center sm:text-left shrink-0">
                  <div className="text-3xl sm:text-4xl font-bold text-blue-600 dark:text-blue-400">
                    {okrData.score.toFixed(0)}%
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Completamento</div>
                </div>
                <div className="flex-1 min-w-0 w-full sm:w-auto">
                  <div className="flex flex-wrap sm:flex-nowrap justify-between text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1 gap-2">
                    <span className="whitespace-nowrap shrink-0">Controllati: {okrData.checkedCount}</span>
                    <span className="whitespace-nowrap shrink-0">Totale: {okrData.totalCount}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 sm:h-4 min-w-0">
                    <div
                      className="bg-blue-600 dark:bg-blue-500 h-3 sm:h-4 rounded-full transition-all"
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mb-6 min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 sm:mb-6 break-words">
              Sviluppi Chiave per Stato - {selectedMonth}
            </h2>
            {keyDevsByTeam ? (
              <>
                {/* Griglia con i grafici affiancati - mostra sempre tutti i team */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 mb-4 sm:mb-6">
                  {keyDevsByTeam.byTeam.map((team) => {
                    const teamTotal = team.byStatus.reduce((sum, item) => sum + item.count, 0)
                    
                    return (
                      <div key={team.teamId} className="flex flex-col items-center">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base mb-2 text-center break-words px-2">
                          {team.teamName}
                        </h3>
                        <div className="w-[140px] h-[140px] sm:w-[160px] sm:h-[160px] flex items-center justify-center">
                          <PieChart 
                            data={team.byStatus} 
                            size={windowWidth < 640 ? 140 : 160} 
                            teamId={team.teamId}
                            monthRef={selectedMonth}
                          />
                        </div>
                        <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-2">
                          Totale: {teamTotal}
                        </span>
                      </div>
                    )
                  })}
                </div>
                
                {/* Legenda unica condivisa */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 sm:pt-6">
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 sm:mb-4">
                    Legenda Stati
                  </h3>
                  <SharedLegend />
                </div>
              </>
            ) : (
              <div className="text-gray-500 dark:text-gray-400">Caricamento dati...</div>
            )}
          </div>

        </>
      )}

      {/* Contenuto Tab Weekly Loom */}
      {activeTab === 'weeklyLoom' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 min-w-0">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 break-words">
            Aggiornamenti sul Core
          </h2>
          {updatesByWeek ? (
            <div>
              {updatesByCoreApp.length > 0 ? (
                <div className="space-y-4 sm:space-y-6">
                  {updatesByCoreApp.map((group) => (
                    <div
                      key={group.coreAppId}
                      className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg min-w-0"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-3 sm:mb-4 min-w-0">
                        <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100 break-words min-w-0 flex-1">
                          {group.coreAppName}
                        </h3>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">Completamento:</span>
                          <span className="text-base sm:text-lg font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                            {group.percentComplete}%
                          </span>
                        </div>
                      </div>
                      <div className="space-y-3 sm:space-y-4">
                        {group.updates.map((update) => (
                          <div key={update._id} className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              {update.title && (
                                <h4 className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 break-words">
                                  {update.title}
                                </h4>
                              )}
                              {update.notes && (
                                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 break-words">
                                  {update.notes}
                                </p>
                              )}
                            </div>
                            {update.loomUrl && (
                              <button
                                onClick={() => setOpenLoomDialog({ url: update.loomUrl!, title: update.title })}
                                className="shrink-0 px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 text-xs sm:text-sm font-medium transition-colors"
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
                <div className="text-gray-500 dark:text-gray-400 text-center py-4 text-sm">
                  Nessun update disponibile
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500 dark:text-gray-400 text-sm">Caricamento dati...</div>
          )}
        </div>
      )}

      {/* Contenuto Tab KeyDev Scaduti */}
      {activeTab === 'pastKeyDevs' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 min-w-0">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3 sm:mb-4 break-words">
            Sviluppi Chiave Scaduti
          </h2>
          <div className="mb-4 p-3 sm:p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-1">
                  Attenzione
                </p>
                <p className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-400 break-words">
                  Mostra tutti gli sviluppi chiave con un mese di riferimento precedente all'attuale che non sono ancora stati controllati (stato diverso da "Checked").
                </p>
              </div>
            </div>
          </div>
          {pastKeyDevs && pastKeyDevs.length > 0 ? (
            <div className="space-y-3">
              {pastKeyDevs.map((kd) => {
                const statusColorInfo = statusColors[kd.status]
                const statusBgColor = isDark ? statusColorInfo?.dark : statusColorInfo?.light || '#6b7280'
                
                return (
                  <div
                    key={kd._id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm sm:text-base text-gray-900 dark:text-gray-100 break-words">
                        {kd.readableId}: {kd.title}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          Mese: <span className="font-medium text-gray-700 dark:text-gray-300">{formatMonth(kd.monthRef)}</span>
                        </span>
                        <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">|</span>
                        <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          Stato:
                        </span>
                        <span
                          className="px-2 py-0.5 text-xs sm:text-sm font-medium rounded-full"
                          style={{
                            backgroundColor: statusBgColor,
                            color: isDark ? '#fff' : '#1f2937'
                          }}
                        >
                          {formatStatus(kd.status)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0 self-start sm:self-auto">
                      <Link
                        to="/keydevs/$id/notes"
                        params={{ id: kd.readableId }}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap"
                        title="Vedi note"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span>Note</span>
                        {(kd.notesCount || 0) > 0 && (
                          <span className="px-1.5 py-0.5 bg-blue-200 dark:bg-blue-800 rounded-full text-xs font-semibold">
                            {kd.notesCount || 0}
                          </span>
                        )}
                      </Link>
                      <Link
                        to="/keydevs/$id"
                        params={{ id: kd._id }}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-xs sm:text-sm whitespace-nowrap"
                      >
                        Dettagli →
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-gray-500 dark:text-gray-400 text-center py-4 text-sm">
              Nessuno Sviluppo Chiave scaduto da controllare
            </div>
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
