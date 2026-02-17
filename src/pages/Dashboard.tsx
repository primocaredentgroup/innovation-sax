import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useMemo, useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { oembed } from '@loomhq/loom-embed'
import { X } from 'lucide-react'
import type { Id } from '../../convex/_generated/dataModel'

// Componente Avatar per il filtro owner (come in KeyDevsList)
function OwnerAvatar({
  owner,
  size = 'sm',
  onClick
}: {
  owner: { _id: string; name: string; picture?: string; pictureUrl?: string } | null | undefined
  size?: 'sm' | 'md'
  onClick?: () => void
}) {
  const [showTooltip, setShowTooltip] = useState(false)

  if (!owner) {
    return (
      <div
        className={`${size === 'sm' ? 'w-8 h-8 text-xs sm:w-8 sm:h-8' : 'w-10 h-10 text-sm sm:w-12 sm:h-12'} rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-400 ${onClick ? 'cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-500 active:scale-95' : ''}`}
        title="Nessun owner"
        onClick={onClick}
      >
        ?
      </div>
    )
  }

  const initials = owner.name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
    'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-red-500'
  ]
  const colorIndex = owner.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
  const bgColor = colors[colorIndex]

  return (
    <div className="relative">
      <div
        className={`${size === 'sm' ? 'w-8 h-8 text-xs sm:w-8 sm:h-8' : 'w-10 h-10 text-sm sm:w-12 sm:h-12'} rounded-full overflow-hidden ${bgColor} flex items-center justify-center text-white font-medium ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity active:scale-95' : ''}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={onClick}
        title={onClick ? 'Clicca per filtrare per owner' : owner.name}
      >
        {(owner.picture ?? owner.pictureUrl) ? (
          <img src={owner.picture ?? owner.pictureUrl} alt={owner.name} className="w-full h-full object-cover" />
        ) : (
          initials
        )}
      </div>
      {showTooltip && !onClick && (
        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 dark:bg-gray-700 rounded shadow-lg whitespace-nowrap">
          {owner.name}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
        </div>
      )}
    </div>
  )
}

// Funzione helper per formattare il nome dello stato
function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    Draft: 'Bozza',
    MockupDone: 'Mockup Terminato',
    Approved: 'Approvato',
    Rejected: 'Rifiutato',
    FrontValidated: 'Mese Stabilito',
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
  monthRef,
  owner
}: {
  data: Array<{ status: string; count: number }>
  size?: number
  teamId?: Id<'teams'>
  monthRef?: string
  owner?: Id<'users'> | '__no_owner__'
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
                        month: monthRef,
                        ...(owner && { owner })
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

// Ordine del flusso: 1. Bozza, 2. Mockup terminato, 3. Rifiutato, 4. Approvato, 5. Mese stabilito, 6. In corso, 7. Completato, 8. Controllato
const statusFlowOrder = ['Draft', 'MockupDone', 'Rejected', 'Approved', 'FrontValidated', 'InProgress', 'Done', 'Checked'] as const

// Componente per la legenda condivisa (mostra tutti gli stati possibili con conteggio e frecce)
function SharedLegend({
  statusCounts,
  monthRef,
  showAllMonths,
  owner
}: {
  statusCounts: Record<string, number>
  monthRef: string | undefined
  showAllMonths: boolean
  owner?: Id<'users'> | '__no_owner__'
}) {
  const isDark = useDarkMode()
  const navigate = useNavigate()

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-2 sm:gap-x-4 sm:gap-y-4">
      {statusFlowOrder.map((status, index) => {
        const color = isDark ? statusColors[status]?.dark : statusColors[status]?.light || '#6b7280'
        const count = statusCounts[status] ?? 0

        return (
          <div key={status} className="flex items-center gap-x-1.5 sm:gap-x-3">
            {index > 0 && (
              <span className="text-gray-400 dark:text-gray-500 shrink-0 text-xs sm:text-base hidden sm:inline" aria-hidden="true">
                →
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                navigate({
                  to: '/keydevs',
                  search: {
                    month: showAllMonths ? 'all' : monthRef,
                    status,
                    ...(owner && { owner })
                  }
                })
              }}
              className="flex items-center gap-1.5 sm:gap-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded px-2 py-1.5 sm:px-3 sm:py-2 transition-colors cursor-pointer shrink-0 touch-manipulation active:scale-95 min-h-[36px] sm:min-h-0"
              title={`Clicca per vedere i KeyDev in stato "${formatStatus(status)}"${showAllMonths ? ' (tutti i mesi)' : ''}`}
            >
              <div 
                className="w-3 h-3 sm:w-4 sm:h-4 rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs sm:text-base font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                <span className="hidden sm:inline">{formatStatus(status)}</span>
                <span className="sm:hidden">{formatStatus(status).split(' ')[0]}</span>
                {status === 'MockupDone' && count > 0 ? ' ⚠' : ''} <span className="font-semibold">({count})</span>
              </span>
            </button>
          </div>
        )
      })}
    </div>
  )
}


export default function DashboardPage() {
  const isDark = useDarkMode()
  const navigate = useNavigate()
  const currentMonth = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }, [])

  const [selectedMonth, setSelectedMonth] = useState<string | 'all'>('all')
  const [selectedOwner, setSelectedOwner] = useState<Id<'users'> | '__no_owner__' | undefined>(undefined)
  const [activeTab, setActiveTab] = useState<'okr' | 'weeklyLoom' | 'pastKeyDevs' | 'pendingQuestions'>('okr')
  const [pendingQuestionsTab, setPendingQuestionsTab] = useState<'keyDevs' | 'coreApps'>('keyDevs')
  const [openLoomDialog, setOpenLoomDialog] = useState<{ url: string; title?: string } | null>(null)
  const { width: windowWidth } = useWindowSize()

  // Query per i mesi disponibili
  const months = useQuery(api.months.list)
  const users = useQuery(api.users.listUsers)

  const showAllMonths = selectedMonth === 'all'

  // Query keydevs per calcolare owner counts (come KeyDevsList)
  const allKeydevs = useQuery(api.keydevs.listAll, showAllMonths ? {} : 'skip')
  const keydevsByMonth = useQuery(
    api.keydevs.listByMonth,
    !showAllMonths && selectedMonth !== 'all' ? { monthRef: selectedMonth } : 'skip'
  )
  const keydevs = useMemo(
    () => (showAllMonths ? (allKeydevs ?? []) : (keydevsByMonth ?? [])),
    [showAllMonths, allKeydevs, keydevsByMonth]
  )
  const keydevIdsForQuestions = useMemo(
    () => (keydevs ?? []).map((kd) => kd._id),
    [keydevs]
  )
  const questionsStatusByKeyDev = useQuery(
    api.keydevQuestions.getStatusByKeyDevIds,
    keydevIdsForQuestions.length > 0 ? { keyDevIds: keydevIdsForQuestions } : 'skip'
  )

  const coreApps = useQuery(api.coreApps.list)
  const coreAppIdsForQuestions = useMemo(
    () => (coreApps ?? []).map((app) => app._id),
    [coreApps]
  )
  const questionsStatusByCoreApp = useQuery(
    api.coreAppQuestions.getStatusByCoreAppIds,
    coreAppIdsForQuestions.length > 0 ? { coreAppIds: coreAppIdsForQuestions } : 'skip'
  )

  // Mappa userId -> user per avatar (come KeyDevsList)
  const usersMap = useMemo(() => {
    if (!users) return new Map<Id<'users'>, { name: string; picture?: string }>()
    return new Map(users.map(u => [u._id, { name: u.name, picture: u.pictureUrl ?? u.picture }]))
  }, [users])
  const selectedOwnerName = useMemo(() => {
    if (!selectedOwner) return undefined
    if (selectedOwner === '__no_owner__') return 'Senza owner'
    return usersMap.get(selectedOwner)?.name ?? 'Owner sconosciuto'
  }, [selectedOwner, usersMap])

  // Contatori owner per i keydevs (come KeyDevsList)
  const ownerCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const kd of keydevs) {
      const id = kd.ownerId || '__no_owner__'
      counts[id] = (counts[id] ?? 0) + 1
    }
    return counts
  }, [keydevs])
  
  // Query OKR - chiama sempre entrambe le query e scegli quale usare
  const okrDataAllMonths = useQuery(
    api.dashboard.getOKRScoreAllMonths,
    showAllMonths ? { owner: selectedOwner } : 'skip'
  )
  const okrDataSingleMonth = useQuery(
    api.dashboard.getOKRScore,
    showAllMonths ? 'skip' : (selectedMonth !== 'all' ? { monthRef: selectedMonth, owner: selectedOwner } : 'skip')
  )
  const okrData = showAllMonths ? okrDataAllMonths : okrDataSingleMonth
  
  const pastKeyDevs = useQuery(api.dashboard.getPastKeyDevs, { currentMonth })
  
  // Query KeyDevs by Team - chiama sempre entrambe le query e scegli quale usare
  const keyDevsByTeamAllMonths = useQuery(
    api.dashboard.getKeyDevsByTeamAndStatusAllMonths,
    showAllMonths ? { owner: selectedOwner } : 'skip'
  )
  const keyDevsByTeamSingleMonth = useQuery(
    api.dashboard.getKeyDevsByTeamAndStatus,
    showAllMonths ? 'skip' : (selectedMonth !== 'all' ? { monthRef: selectedMonth, owner: selectedOwner } : 'skip')
  )
  const keyDevsByTeam = showAllMonths ? keyDevsByTeamAllMonths : keyDevsByTeamSingleMonth
  
  // Aggrega i conteggi per stato su tutti i team (per la legenda)
  const legendStatusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    if (!keyDevsByTeam?.byTeam) return counts
    for (const team of keyDevsByTeam.byTeam) {
      for (const item of team.byStatus) {
        counts[item.status] = (counts[item.status] ?? 0) + item.count
      }
    }
    return counts
  }, [keyDevsByTeam])

  const mockupDoneCount = legendStatusCounts.MockupDone ?? 0
  
  const updatesByWeek = useQuery(
    api.dashboard.getUpdatesByWeek, 
    showAllMonths ? { owner: selectedOwner } : { monthRef: selectedMonth, owner: selectedOwner }
  )
  
  // Calcola il counter per Weekly Loom (totale update con loomUrl)
  const weeklyLoomCount = useMemo(() => {
    if (!updatesByWeek) return 0
    return updatesByWeek.reduce((total, week) => {
      return total + week.updates.filter((u) => u.loomUrl).length
    }, 0)
  }, [updatesByWeek])
  
  // Counter per KeyDev passati
  const pastKeyDevsCount = pastKeyDevs?.length || 0

  const pendingKeyDevQuestions = useMemo(() => {
    if (!keydevs || !questionsStatusByKeyDev) return []
    return keydevs
      .map((kd) => {
        const qStatus = questionsStatusByKeyDev[String(kd._id)]
        if (!qStatus || qStatus.total === 0) return null
        const missing = qStatus.missing ?? Math.max(0, qStatus.total - qStatus.validated)
        if (missing <= 0) return null
        return { keyDev: kd, qStatus, missing }
      })
      .filter((item): item is { keyDev: (typeof keydevs)[number]; qStatus: { total: number; validated: number; missing: number }; missing: number } => item !== null)
      .sort((a, b) => b.missing - a.missing || a.keyDev.readableId.localeCompare(b.keyDev.readableId))
  }, [keydevs, questionsStatusByKeyDev])

  const pendingCoreAppQuestions = useMemo(() => {
    if (!coreApps || !questionsStatusByCoreApp) return []
    return coreApps
      .map((app) => {
        const qStatus = questionsStatusByCoreApp[String(app._id)]
        if (!qStatus || qStatus.total === 0) return null
        const missing = qStatus.missing ?? Math.max(0, qStatus.total - qStatus.validated)
        if (missing <= 0) return null
        return { coreApp: app, qStatus, missing }
      })
      .filter((item): item is { coreApp: (typeof coreApps)[number]; qStatus: { total: number; validated: number; missing: number }; missing: number } => item !== null)
      .sort((a, b) => b.missing - a.missing || a.coreApp.name.localeCompare(b.coreApp.name))
  }, [coreApps, questionsStatusByCoreApp])

  const pendingKeyDevQuestionsCount = useMemo(
    () => pendingKeyDevQuestions.reduce((total, item) => total + item.missing, 0),
    [pendingKeyDevQuestions]
  )
  const pendingCoreAppQuestionsCount = useMemo(
    () => pendingCoreAppQuestions.reduce((total, item) => total + item.missing, 0),
    [pendingCoreAppQuestions]
  )
  const pendingQuestionsCount = pendingKeyDevQuestionsCount + pendingCoreAppQuestionsCount

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
    <div className="w-full max-w-full min-w-0">
      {/* Tabs per OKR, Weekly Loom e KeyDev Scaduti - più prominenti */}
      <div className="mb-4 sm:mb-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex flex-nowrap gap-2 sm:gap-4 overflow-x-auto pb-1 -mx-2 px-2 sm:mx-0 sm:px-0 sm:overflow-x-visible scrollbar-hide">
            <button
              onClick={() => setActiveTab('okr')}
              className={`px-2.5 sm:px-6 py-2 sm:py-3 font-semibold text-xs sm:text-base border-2 rounded-lg transition-all shrink-0 min-h-[44px] touch-manipulation whitespace-nowrap ${
                activeTab === 'okr'
                  ? 'border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-md'
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95'
              }`}
            >
              <span className="hidden sm:inline">Sviluppi Chiave del Mese</span>
              <span className="sm:hidden">OKR</span>
            </button>
            <button
              onClick={() => setActiveTab('weeklyLoom')}
              className={`px-2.5 sm:px-6 py-2 sm:py-3 font-semibold text-xs sm:text-base border-2 rounded-lg transition-all shrink-0 min-h-[44px] touch-manipulation flex items-center gap-1 sm:gap-2 whitespace-nowrap ${
                activeTab === 'weeklyLoom'
                  ? 'border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-md'
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95'
              }`}
            >
              <span className="hidden sm:inline">Aggiornamenti sul Core</span>
              <span className="sm:hidden">Core</span>
              <span className="px-1 sm:px-2 py-0.5 bg-blue-600 dark:bg-blue-500 text-white rounded-full text-[10px] sm:text-xs font-bold shrink-0">
                {weeklyLoomCount}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('pastKeyDevs')}
              className={`px-2.5 sm:px-6 py-2 sm:py-3 font-semibold text-xs sm:text-base border-2 rounded-lg transition-all shrink-0 min-h-[44px] touch-manipulation flex items-center gap-1 sm:gap-2 whitespace-nowrap ${
                activeTab === 'pastKeyDevs'
                  ? 'border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-md'
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95'
              }`}
            >
              <span className="hidden sm:inline">Sviluppi Chiave Scaduti</span>
              <span className="sm:hidden">Scaduti</span>
              <span className="px-1 sm:px-2 py-0.5 bg-red-600 dark:bg-red-500 text-white rounded-full text-[10px] sm:text-xs font-bold shrink-0">
                {pastKeyDevsCount}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('pendingQuestions')}
              className={`px-2.5 sm:px-6 py-2 sm:py-3 font-semibold text-xs sm:text-base border-2 rounded-lg transition-all shrink-0 min-h-[44px] touch-manipulation flex items-center gap-1 sm:gap-2 whitespace-nowrap ${
                activeTab === 'pendingQuestions'
                  ? 'border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-md'
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95'
              }`}
            >
              <span className="hidden sm:inline">Domande in attesa</span>
              <span className="sm:hidden">Domande</span>
              <span className="px-1 sm:px-2 py-0.5 bg-yellow-600 dark:bg-yellow-500 text-white rounded-full text-[10px] sm:text-xs font-bold shrink-0">
                {pendingQuestionsCount}
              </span>
            </button>
          </div>
          
          {/* Selettore mese e Filtro owner - per le tab OKR e Aggiornamenti sul Core */}
          {(activeTab === 'okr' || activeTab === 'weeklyLoom') && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3 shrink-0 w-full sm:w-auto">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2 w-full sm:w-auto">
                <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  Mese:
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value === 'all' ? 'all' : e.target.value)}
                  className="w-full sm:w-auto px-3 sm:px-4 py-2.5 sm:py-2 text-sm sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px] touch-manipulation"
                >
                  <option value="all">Tutti i mesi</option>
                  {monthOptions.map((monthRef) => (
                    <option key={monthRef} value={monthRef}>
                      {formatMonth(monthRef)}
                    </option>
                  ))}
                </select>
              </div>
              {/* Filtra per Owner - migliorato per mobile con scroll orizzontale */}
              {Object.keys(ownerCounts).filter(id => ownerCounts[id] > 0).length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2 sm:pl-2 sm:border-l sm:border-gray-200 dark:sm:border-gray-600 w-full sm:w-auto">
                <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap shrink-0">
                  Owner:
                </label>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 -mx-2 px-2 sm:mx-0 sm:px-0">
                  {Object.entries(ownerCounts)
                    .filter(([, count]) => count > 0)
                    .sort(([, a], [, b]) => b - a)
                    .map(([ownerId]) => {
                      const owner = ownerId === '__no_owner__' ? null : (usersMap.get(ownerId as Id<'users'>) ? { _id: ownerId, name: usersMap.get(ownerId as Id<'users'>)!.name, picture: usersMap.get(ownerId as Id<'users'>)?.picture } : null)
                      const isSelected = selectedOwner === ownerId
                      const count = ownerCounts[ownerId] ?? 0
                      return (
                        <button
                          key={ownerId}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedOwner(undefined)
                              return
                            }
                            setSelectedOwner(ownerId as Id<'users'> | '__no_owner__')
                          }}
                          className={`rounded-full p-1 transition-all shrink-0 touch-manipulation min-w-[40px] min-h-[40px] flex items-center justify-center ${
                            isSelected ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-800 bg-blue-50 dark:bg-blue-900/30' : 'hover:opacity-80 active:scale-95'
                          }`}
                          title={owner ? `${owner.name} (${count})` : `Senza owner (${count})`}
                        >
                          <OwnerAvatar owner={owner} size="md" />
                          <span className="sr-only">{owner ? owner.name : 'Senza owner'} - {count}</span>
                        </button>
                      )
                    })}
                </div>
              </div>
              )}
              {/* Filtri attivi - migliorati per mobile */}
              {(!showAllMonths || selectedOwner) && (
                <div className="flex flex-wrap items-center gap-2">
                  {!showAllMonths && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                      <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                        Mese: <span className="font-semibold text-gray-900 dark:text-gray-100">{formatMonth(selectedMonth)}</span>
                      </span>
                      <button
                        onClick={() => setSelectedMonth('all')}
                        className="flex items-center justify-center w-6 h-6 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors touch-manipulation"
                        title="Rimuovi filtro mese"
                        aria-label="Rimuovi filtro mese"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  {selectedOwner && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                      <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                        Owner: <span className="font-semibold text-gray-900 dark:text-gray-100">{selectedOwnerName}</span>
                      </span>
                      <button
                        onClick={() => setSelectedOwner(undefined)}
                        className="flex items-center justify-center w-6 h-6 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors touch-manipulation"
                        title="Rimuovi filtro owner"
                        aria-label="Rimuovi filtro owner"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {mockupDoneCount > 0 && (
        <div className="mb-4 sm:mb-6 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 dark:border-yellow-700 dark:bg-yellow-900/20">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm sm:text-base font-medium text-yellow-900 dark:text-yellow-200 leading-relaxed">
              ⚠ Ci sono {mockupDoneCount} {mockupDoneCount > 1 ? 'Sviluppi Chiave' : 'Sviluppo Chiave'} in stato "Mockup Terminato": gli owner devono essere definiti, fare l'analisi e far partire le domande.
            </p>
            <button
              type="button"
              onClick={() =>
                navigate({
                  to: '/keydevs',
                  search: {
                    month: showAllMonths ? 'all' : selectedMonth,
                    status: 'MockupDone',
                    ...(selectedOwner && { owner: selectedOwner })
                  }
                })
              }
              className="self-stretch sm:self-auto rounded-md border border-yellow-500 px-4 py-2.5 sm:px-3 sm:py-1.5 text-sm sm:text-xs font-semibold text-yellow-800 transition-colors hover:bg-yellow-100 dark:border-yellow-500 dark:text-yellow-300 dark:hover:bg-yellow-900/40 active:scale-95 touch-manipulation min-h-[44px] sm:min-h-0"
            >
              Apri i Mockup Terminati
            </button>
          </div>
        </div>
      )}

      {/* Contenuto Tab OKR */}
      {activeTab === 'okr' && (
        <>
          {/* OKR Score Card - cliccabile per navigare a KeyDevsList */}
          <div
            onClick={() => navigate({
              to: '/keydevs',
              search: {
                month: showAllMonths ? 'all' : selectedMonth,
                ...(selectedOwner && { owner: selectedOwner })
              }
            })}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mb-4 sm:mb-6 min-w-0 cursor-pointer hover:shadow-lg transition-shadow active:scale-[0.98] touch-manipulation"
          >
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3 sm:mb-4 break-words">
              {selectedOwnerName
                ? `Sviluppi Chiave - ${showAllMonths ? 'Tutti i mesi' : formatMonth(selectedMonth)} - ${selectedOwnerName}`
                : `Sviluppi Chiave - ${showAllMonths ? 'Tutti i mesi' : formatMonth(selectedMonth)}`}
            </h2>
            {selectedOwnerName && (
              <div className="mb-3 sm:mb-4 inline-flex items-center rounded-md bg-blue-50 px-3 py-1.5 text-xs sm:text-sm font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                Filtro owner attivo: {selectedOwnerName}
              </div>
            )}
            {okrData ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 min-w-0">
                <div className="text-center sm:text-left shrink-0">
                  <div className="text-4xl sm:text-5xl font-bold text-blue-600 dark:text-blue-400">
                    {okrData.score.toFixed(0)}%
                  </div>
                  <div className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">Completamento</div>
                </div>
                <div className="flex-1 min-w-0 w-full sm:w-auto">
                  <div className="flex flex-wrap sm:flex-nowrap justify-between text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-2 gap-2">
                    <span className="whitespace-nowrap shrink-0 font-medium">Controllati: {okrData.checkedCount}</span>
                    <span className="whitespace-nowrap shrink-0 font-medium">Totale: {okrData.totalCount}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 sm:h-5 min-w-0">
                    <div
                      className="bg-blue-600 dark:bg-blue-500 h-4 sm:h-5 rounded-full transition-all"
                      style={{ width: `${Math.min(okrData.score, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">Caricamento dati OKR...</div>
            )}
          </div>

          {/* Grafico KeyDev per Stato con divisione per team */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mb-4 sm:mb-6 min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 sm:mb-6 break-words">
              Sviluppi Chiave per Stato - {showAllMonths ? 'Tutti i mesi' : formatMonth(selectedMonth)}
            </h2>
              {keyDevsByTeam ? (
                <>
                  {/* Griglia con i grafici affiancati - mostra sempre tutti i team */}
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 mb-4 sm:mb-6">
                    {keyDevsByTeam.byTeam.map((team) => {
                      const teamTotal = team.byStatus.reduce((sum, item) => sum + item.count, 0)
                      
                      return (
                        <div key={team.teamId} className="flex flex-col items-center">
                          <h3 className="font-medium text-gray-900 dark:text-gray-100 text-xs sm:text-base mb-2 sm:mb-3 text-center break-words px-1">
                            {team.teamName}
                          </h3>
                        <div className="w-[120px] h-[120px] sm:w-[160px] sm:h-[160px] flex items-center justify-center">
                          <PieChart
                            data={team.byStatus}
                            size={windowWidth < 640 ? 120 : 160}
                            teamId={team.teamId}
                            monthRef={showAllMonths ? undefined : selectedMonth}
                            owner={selectedOwner}
                          />
                        </div>
                          <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium">
                            Totale: {teamTotal}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  
                  {/* Legenda unica condivisa */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4 sm:pt-6">
                    <h3 className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 mb-3 sm:mb-5">
                      Legenda Stati (clicca per filtrare)
                    </h3>
                    <SharedLegend
                      statusCounts={legendStatusCounts}
                      monthRef={showAllMonths ? undefined : selectedMonth}
                      showAllMonths={showAllMonths}
                      owner={selectedOwner}
                    />
                  </div>
                </>
              ) : (
                <div className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">Caricamento dati...</div>
              )}
          </div>

        </>
      )}

      {/* Contenuto Tab Weekly Loom */}
      {activeTab === 'weeklyLoom' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 min-w-0">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200 break-words">
              Aggiornamenti sul Core - {showAllMonths ? 'Tutti i mesi' : formatMonth(selectedMonth)}
            </h2>
            <button
              type="button"
              onClick={() =>
                navigate({
                  to: '/core-apps',
                  search: {
                    ...(selectedOwner && { owner: selectedOwner }),
                  },
                })
              }
              className="self-stretch sm:self-auto rounded-lg border border-blue-600 px-4 py-2.5 sm:px-3 sm:py-1.5 text-sm sm:text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 dark:border-blue-500 dark:text-blue-400 dark:hover:bg-blue-900/30 active:scale-95 touch-manipulation min-h-[44px] sm:min-h-0"
            >
              Apri lista Core Apps filtrata
            </button>
          </div>
          {selectedOwnerName && (
            <div className="mb-4 inline-flex items-center rounded-md bg-blue-50 px-3 py-1.5 text-xs sm:text-sm font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              Filtro owner attivo: {selectedOwnerName}
            </div>
          )}
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
                                className="shrink-0 w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 text-sm sm:text-sm font-medium transition-colors active:scale-95 touch-manipulation min-h-[44px] sm:min-h-0"
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
                          Mese: <span className="font-medium text-gray-700 dark:text-gray-300">{kd.monthRef ? formatMonth(kd.monthRef) : 'N/A'}</span>
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
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 shrink-0 w-full sm:w-auto">
                      <Link
                        to="/keydevs/$id/notes"
                        params={{ id: kd.readableId }}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg text-sm sm:text-sm font-medium transition-colors whitespace-nowrap active:scale-95 touch-manipulation min-h-[44px] sm:min-h-0"
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
                        className="flex items-center justify-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm sm:text-sm whitespace-nowrap px-3 py-2 sm:py-1.5 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors active:scale-95 touch-manipulation min-h-[44px] sm:min-h-0"
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

      {/* Contenuto Tab Domande in attesa */}
      {activeTab === 'pendingQuestions' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 min-w-0">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200 break-words">
              Domande in attesa
            </h2>
            <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-gray-900/30 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setPendingQuestionsTab('keyDevs')}
                className={`flex-1 sm:flex-none px-3 py-2 sm:py-1.5 text-sm sm:text-sm font-medium rounded-md transition-colors touch-manipulation active:scale-95 min-h-[44px] sm:min-h-0 ${
                  pendingQuestionsTab === 'keyDevs'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-white/70 dark:hover:bg-gray-700/70'
                }`}
              >
                KeyDevs ({pendingKeyDevQuestionsCount})
              </button>
              <button
                type="button"
                onClick={() => setPendingQuestionsTab('coreApps')}
                className={`flex-1 sm:flex-none px-3 py-2 sm:py-1.5 text-sm sm:text-sm font-medium rounded-md transition-colors touch-manipulation active:scale-95 min-h-[44px] sm:min-h-0 ${
                  pendingQuestionsTab === 'coreApps'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-white/70 dark:hover:bg-gray-700/70'
                }`}
              >
                CoreApps ({pendingCoreAppQuestionsCount})
              </button>
            </div>
          </div>

          {pendingQuestionsTab === 'keyDevs' && (
            <div>
              {pendingKeyDevQuestions.length > 0 ? (
                <div className="space-y-3">
                  {pendingKeyDevQuestions.map(({ keyDev, qStatus, missing }) => (
                    <div
                      key={keyDev._id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      <div className="min-w-0">
                        <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-gray-100 break-words">
                          {keyDev.readableId}: {keyDev.title}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          Mese: {keyDev.monthRef ? formatMonth(keyDev.monthRef) : 'N/A'}
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                        <Link
                          to="/keydevs/$id/questions"
                          params={{ id: keyDev.readableId }}
                          className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-md bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors touch-manipulation active:scale-95 min-h-[44px] sm:min-h-0"
                          title={`Questions mancanti ${missing}/${qStatus.total}`}
                        >
                          <span className="text-sm font-semibold">{missing}/{qStatus.total}</span>
                        </Link>
                        <Link
                          to="/keydevs/$id"
                          params={{ id: keyDev.readableId }}
                          className="flex items-center justify-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 px-3 py-2 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors touch-manipulation active:scale-95 min-h-[44px] sm:min-h-0"
                        >
                          Dettagli →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 dark:text-gray-400 text-center py-4 text-sm">
                  Nessuna domanda in attesa sui KeyDevs
                </div>
              )}
            </div>
          )}

          {pendingQuestionsTab === 'coreApps' && (
            <div>
              {pendingCoreAppQuestions.length > 0 ? (
                <div className="space-y-3">
                  {pendingCoreAppQuestions.map(({ coreApp, qStatus }) => (
                    <div
                      key={coreApp._id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-gray-100 break-words min-w-0">
                        {coreApp.name}
                      </p>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                        <Link
                          to="/core-apps/$slug/questions"
                          params={{ slug: coreApp.slug }}
                          className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-md bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors touch-manipulation active:scale-95 min-h-[44px] sm:min-h-0"
                          title={`Questions validate ${qStatus.validated}/${qStatus.total}`}
                        >
                          <span className="text-sm font-semibold">{qStatus.validated}/{qStatus.total}</span>
                        </Link>
                        <Link
                          to="/core-apps/$slug"
                          params={{ slug: coreApp.slug }}
                          className="flex items-center justify-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 px-3 py-2 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors touch-manipulation active:scale-95 min-h-[44px] sm:min-h-0"
                        >
                          Dettagli →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 dark:text-gray-400 text-center py-4 text-sm">
                  Nessuna domanda in attesa sulle CoreApps
                </div>
              )}
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
