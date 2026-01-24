import { useState, useMemo, useRef, useEffect } from 'react'
import { Link, useParams, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { oembed } from '@loomhq/loom-embed'

// Helper per calcolare il mese dalla settimana ISO (usa il lunedì della settimana)
function getMonthFromWeekRef(weekRef: string): string {
  const match = weekRef.match(/^(\d{4})-W(\d{2})$/)
  if (!match) {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }
  const year = parseInt(match[1], 10)
  const week = parseInt(match[2], 10)
  const monday = getMondayOfISOWeek(year, week)
  const month = monday.getMonth() + 1
  // Usa l'anno effettivo del lunedì, non l'anno della settimana ISO
  // (importante quando una settimana ISO inizia in un anno diverso)
  return `${monday.getFullYear()}-${String(month).padStart(2, '0')}`
}

// Helper per calcolare il numero della settimana ISO
function getISOWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return { year: d.getUTCFullYear(), week: weekNo }
}

// Helper per ottenere la settimana corrente in formato ISO
function getCurrentWeekRef(): string {
  const now = new Date()
  const { year, week } = getISOWeek(now)
  return `${year}-W${week.toString().padStart(2, '0')}`
}

// Helper per ottenere il lunedì della settimana ISO
function getMondayOfISOWeek(year: number, week: number): Date {
  const simple = new Date(year, 0, 1 + (week - 1) * 7)
  const dow = simple.getDay()
  const ISOweekStart = simple
  if (dow <= 4) {
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1)
  } else {
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay())
  }
  return ISOweekStart
}

// Helper per generare le settimane disponibili (ultime 12 settimane + prossime 4)
function generateWeekOptions(): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> = []
  const now = new Date()
  const seen = new Set<string>()
  
  // Genera le ultime 12 settimane
  for (let i = 12; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - (i * 7))
    const { year, week } = getISOWeek(date)
    const weekRef = `${year}-W${week.toString().padStart(2, '0')}`
    
    if (seen.has(weekRef)) continue
    seen.add(weekRef)
    
    const weekStart = getMondayOfISOWeek(year, week)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    
    const label = `${weekRef} (${weekStart.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })} - ${weekEnd.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })})`
    
    options.push({ value: weekRef, label })
  }
  
  // Genera le prossime 4 settimane
  for (let i = 1; i <= 4; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() + (i * 7))
    const { year, week } = getISOWeek(date)
    const weekRef = `${year}-W${week.toString().padStart(2, '0')}`
    
    if (seen.has(weekRef)) continue
    seen.add(weekRef)
    
    const weekStart = getMondayOfISOWeek(year, week)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    
    const label = `${weekRef} (${weekStart.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })} - ${weekEnd.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })})`
    
    options.push({ value: weekRef, label })
  }
  
  return options.sort((a, b) => a.value.localeCompare(b.value))
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

export default function CoreAppUpdateNewPage() {
  const { slug } = useParams({ strict: false }) as { slug: string }
  const navigate = useNavigate()
  
  const coreApp = useQuery(api.coreApps.getBySlug, { slug })
  const months = useQuery(api.months.list)
  const createUpdate = useMutation(api.coreAppUpdates.create)
  
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeekRef())
  const [selectedMonth, setSelectedMonth] = useState<string>(getMonthFromWeekRef(getCurrentWeekRef()))
  const [notes, setNotes] = useState('')
  const [loomUrl, setLoomUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Genera le opzioni delle settimane
  const weekOptions = useMemo(() => generateWeekOptions(), [])
  
  // Genera le opzioni per i mesi (6 mesi passati + mese corrente + mesi futuri dal DB)
  const monthOptions = useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonthNum = now.getMonth() + 1
    
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
  
  // Quando cambia la settimana, aggiorna automaticamente il mese
  // Nota: selectedMonth NON è nelle dipendenze per permettere la selezione manuale
  useEffect(() => {
    const calculatedMonth = getMonthFromWeekRef(selectedWeek)
    if (monthOptions.includes(calculatedMonth)) {
      setSelectedMonth(calculatedMonth)
    }
  }, [selectedWeek, monthOptions])
  
  // Genera il titolo automatico basato sulla settimana e sul nome del prodotto Core
  const autoTitle = useMemo(() => {
    if (!coreApp || !selectedWeek) return ''
    return `Aggiornamenti ${selectedWeek} - ${coreApp.name}`
  }, [coreApp, selectedWeek])
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!coreApp || isSubmitting) return
    
    setIsSubmitting(true)
    try {
      await createUpdate({
        coreAppId: coreApp._id,
        weekRef: selectedWeek,
        monthRef: selectedMonth || undefined,
        title: autoTitle,
        notes: notes.trim() || undefined,
        loomUrl: loomUrl.trim() || undefined
      })
      navigate({ to: '/core-apps/$slug', params: { slug } })
    } catch (error) {
      console.error('Errore durante la creazione dell\'aggiornamento:', error)
      alert('Errore durante la creazione dell\'aggiornamento. Riprova.')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  if (!coreApp) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Caricamento...</div>
      </div>
    )
  }
  
  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link
          to="/core-apps/$slug"
          params={{ slug }}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
        >
          ← Torna al dettaglio
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Nuovo Aggiornamento Settimanale
        </h1>
      </div>
      
      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Settimana *
            </label>
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
              required
            >
              {weekOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Mese di Riferimento
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
            >
              {monthOptions.map((monthRef) => (
                <option key={monthRef} value={monthRef}>
                  {monthRef}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Il mese viene calcolato automaticamente dalla settimana selezionata, ma può essere modificato manualmente
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Titolo (generato automaticamente)
            </label>
            <input
              type="text"
              value={autoTitle}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Il titolo viene generato automaticamente in base alla settimana selezionata e al nome del prodotto Core
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              URL Video Loom
            </label>
            <input
              type="url"
              value={loomUrl}
              onChange={(e) => setLoomUrl(e.target.value)}
              placeholder="https://www.loom.com/share/..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>

          {/* Preview Loom */}
          {loomUrl && loomUrl.includes('loom.com') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Anteprima
              </label>
              <LoomEmbed url={loomUrl} />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Note
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Note aggiuntive sull'aggiornamento..."
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 resize-none"
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
            <Link
              to="/core-apps/$slug"
              params={{ slug }}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Annulla
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || !selectedWeek}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creazione...' : 'Crea Aggiornamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
