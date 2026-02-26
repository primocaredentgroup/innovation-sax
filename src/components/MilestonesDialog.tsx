import { useState, useEffect, useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { Plus, Pencil, Trash2, Calendar } from 'lucide-react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

type MilestoneDoc = {
  _id: Id<'coreAppMilestones'>
  description: string
  valuePercent: number
  completed: boolean
  targetDate?: number
  order: number
}

function MilestoneForm({
  lastMilestone,
  onCreate,
  onCancel
}: {
  lastMilestone: MilestoneDoc | null
  onCreate: (data: {
    description: string
    valuePercent: number
    targetDate?: number
  }) => Promise<void>
  onCancel: () => void
}) {
  const [description, setDescription] = useState('')
  const [valuePercent, setValuePercent] = useState(0)
  const [targetDateStr, setTargetDateStr] = useState('')

  const suggestedDate = useMemo(() => {
    if (!lastMilestone?.targetDate) {
      const d = new Date()
      d.setMonth(d.getMonth() + 1)
      return d.toISOString().slice(0, 10)
    }
    const d = new Date(lastMilestone.targetDate)
    d.setMonth(d.getMonth() + 1)
    return d.toISOString().slice(0, 10)
  }, [lastMilestone])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim()) return
    const dateToUse = targetDateStr || suggestedDate
    await onCreate({
      description: description.trim(),
      valuePercent: Math.max(0, Math.min(100, valuePercent)),
      targetDate: dateToUse
        ? new Date(dateToUse).getTime()
        : undefined
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 mb-4 border border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/40 shadow-sm space-y-4"
    >
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Descrizione
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Inserisci descrizione milestone..."
          rows={2}
          className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Valore (%)
          </label>
          <input
            type="number"
            min={0}
            max={100}
            value={valuePercent}
            onChange={(e) => setValuePercent(Number(e.target.value))}
            onFocus={(e) => e.target.select()}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Peso sul progresso totale
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Data Obiettivo (opzionale)
          </label>
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={targetDateStr || suggestedDate}
              onChange={(e) => setTargetDateStr(e.target.value)}
              className="flex-1 px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <Calendar className="w-5 h-5 text-gray-400 shrink-0" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Suggerita: un mese dopo l&apos;ultima
          </p>
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          Annulla
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
        >
          Crea
        </button>
      </div>
    </form>
  )
}

function MilestoneRow({
  milestone,
  isEditing,
  isOverdue,
  onEdit,
  onEditCancel,
  onUpdate,
  onCompletedChange,
  onDelete
}: {
  milestone: MilestoneDoc
  isEditing: boolean
  isOverdue: boolean
  onEdit: () => void
  onEditCancel: () => void
  onUpdate: (data: {
    description?: string
    valuePercent?: number
    completed?: boolean
    targetDate?: number
  }) => Promise<void>
  onCompletedChange: (completed: boolean) => Promise<void>
  onDelete: () => Promise<void>
}) {
  const [editDesc, setEditDesc] = useState(milestone.description)
  const [editValue, setEditValue] = useState(milestone.valuePercent)
  const [editCompleted, setEditCompleted] = useState(milestone.completed)
  const [editTarget, setEditTarget] = useState(
    milestone.targetDate
      ? new Date(milestone.targetDate).toISOString().slice(0, 10)
      : ''
  )

  if (isEditing) {
    return (
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          await onUpdate({
            description: editDesc.trim(),
            valuePercent: Math.max(0, Math.min(100, editValue)),
            completed: editCompleted,
            targetDate: editTarget ? new Date(editTarget).getTime() : undefined
          })
        }}
        className={`p-4 rounded-xl border space-y-4 shadow-sm ${
          isOverdue
            ? 'border-red-300 dark:border-red-500/70 bg-red-50/50 dark:bg-red-900/10'
            : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700/40'
        }`}
      >
        <textarea
          value={editDesc}
          onChange={(e) => setEditDesc(e.target.value)}
          rows={2}
          className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Valore %</label>
            <input
              type="number"
              min={0}
              max={100}
              value={editValue}
              onChange={(e) => setEditValue(Number(e.target.value))}
              onFocus={(e) => e.target.select()}
              className="w-16 px-2.5 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Obiettivo</label>
            <input
              type="date"
              value={editTarget}
              onChange={(e) => setEditTarget(e.target.value)}
              className="px-2.5 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={editCompleted}
              onChange={(e) => setEditCompleted(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500/30"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Completata</span>
          </label>
        </div>
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onEditCancel}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            Annulla
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
          >
            Salva
          </button>
        </div>
      </form>
    )
  }

  return (
    <div
      className={`p-4 rounded-xl border flex flex-col gap-3 transition-colors ${
        isOverdue
          ? 'border-red-300 dark:border-red-500/70 bg-red-50/50 dark:bg-red-900/10'
          : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/60 hover:border-gray-300 dark:hover:border-gray-500'
      } ${milestone.completed ? 'ring-1 ring-green-500/20 dark:ring-green-500/30' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 flex-1 min-w-0 leading-snug">
          {milestone.description}
        </p>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onEdit}
            className="p-2 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            title="Modifica"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-2 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="Elimina"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer select-none group">
          <input
            type="checkbox"
            checked={milestone.completed}
            onChange={(e) => onCompletedChange(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500/30 transition-colors"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">
            Completata
          </span>
        </label>
        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
          Valore {milestone.valuePercent}%
        </span>
        {milestone.targetDate && (
          <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <Calendar className="w-3.5 h-3.5" />
            Obiettivo: {new Date(milestone.targetDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
            {isOverdue && <span className="text-red-500 font-medium">!</span>}
          </span>
        )}
      </div>
    </div>
  )
}

export function MilestonesDialog({
  isOpen,
  onClose,
  coreAppId,
  appName,
  appSlug,
  initialPercentComplete = 0
}: {
  isOpen: boolean
  onClose: () => void
  coreAppId: Id<'coreApps'>
  appName: string
  appSlug: string
  initialPercentComplete?: number
}) {
  const [isCreatingMilestone, setIsCreatingMilestone] = useState(false)
  const [editingMilestoneId, setEditingMilestoneId] = useState<Id<'coreAppMilestones'> | null>(null)
  const [nowForOverdue, setNowForOverdue] = useState(0)

  const milestonesData = useQuery(
    api.coreAppMilestones.listByCoreApp,
    isOpen ? { coreAppId } : 'skip'
  )
  const createMilestone = useMutation(api.coreAppMilestones.create)
  const updateMilestone = useMutation(api.coreAppMilestones.update)
  const removeMilestone = useMutation(api.coreAppMilestones.remove)
  const updateCoreApp = useMutation(api.coreApps.update)

  const [isEditingPercent, setIsEditingPercent] = useState(false)
  const [tempPercent, setTempPercent] = useState(0)

  const milestonesCount = milestonesData?.milestones?.length ?? 0
  useEffect(() => {
    const id = setTimeout(() => setNowForOverdue(Date.now()), 0)
    return () => clearTimeout(id)
  }, [milestonesCount])

  const currentPercent = useMemo(() => {
    if (milestonesData && milestonesData.milestones.length > 0) {
      return milestonesData.progressPercent
    }
    return initialPercentComplete
  }, [milestonesData, initialPercentComplete])

  const handleSavePercent = async () => {
    const percent = Math.max(0, Math.min(100, tempPercent))
    await updateCoreApp({ id: coreAppId, percentComplete: percent })
    setIsEditingPercent(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6 border-b dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 wrap-break-word">
              Milestones - {appName}
            </h2>
            <Link
              to="/core-apps/$slug"
              params={{ slug: appSlug }}
              onClick={(e) => e.stopPropagation()}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-block"
            >
              Apri dettaglio completo →
            </Link>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shrink-0"
            aria-label="Chiudi"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 sm:p-6">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-4">Progresso</h3>
          <div className="text-center mb-6">
            {milestonesData && milestonesData.totalCount > 0 ? (
              <>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Valore raggiunto: <strong className="text-gray-700 dark:text-gray-300">{milestonesData.completedSum}/100</strong>
                  {milestonesData.totalSum < 100 && (
                    <span className="block mt-1 text-amber-600 dark:text-amber-400 text-xs">
                      Per raggiungere il 100% mancano delle milestones (totale attuale: {milestonesData.totalSum}%)
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {milestonesData.completedCount}/{milestonesData.totalCount} completate
                </p>
              </>
            ) : null}
            {isEditingPercent && (!milestonesData || milestonesData.milestones.length === 0) ? (
              <div className="space-y-2 mb-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={tempPercent}
                  onChange={(e) => setTempPercent(Number(e.target.value))}
                  className="text-2xl font-bold text-center w-20 px-2 py-1 border dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSavePercent()
                    if (e.key === 'Escape') setIsEditingPercent(false)
                  }}
                />
                <div className="flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={handleSavePercent}
                    className="px-2 py-1 text-sm bg-blue-600 text-white rounded"
                  >
                    Salva
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingPercent(false)}
                    className="px-2 py-1 text-sm text-gray-500"
                  >
                    Annulla
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={
                  !milestonesData || milestonesData.milestones.length === 0
                    ? () => {
                        setTempPercent(currentPercent)
                        setIsEditingPercent(true)
                      }
                    : undefined
                }
                className={
                  !milestonesData || milestonesData.milestones.length === 0
                    ? 'cursor-pointer hover:opacity-80'
                    : ''
                }
                title={
                  !milestonesData || milestonesData.milestones.length === 0
                    ? 'Clicca per modificare'
                    : undefined
                }
              >
                <div className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  {Math.round(currentPercent)}%
                </div>
              </div>
            )}
            {milestonesData && milestonesData.totalCount > 0 && milestonesData.totalSum >= 100 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">di 100%</p>
            )}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mt-2">
              <div
                className={`h-3 rounded-full transition-all ${
                  currentPercent >= 100
                    ? 'bg-green-500 dark:bg-green-600'
                    : currentPercent > 50
                      ? 'bg-blue-500 dark:bg-blue-600'
                      : 'bg-yellow-500 dark:bg-yellow-600'
                }`}
                style={{ width: `${Math.min(100, currentPercent)}%` }}
              />
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                Milestones
              </h4>
              <button
                type="button"
                onClick={() => setIsCreatingMilestone(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Nuova Milestone
              </button>
            </div>

            {isCreatingMilestone && (
              <MilestoneForm
                lastMilestone={
                  milestonesData?.milestones.length
                    ? milestonesData.milestones[milestonesData.milestones.length - 1]
                    : null
                }
                onCreate={async (data) => {
                  await createMilestone({
                    coreAppId,
                    description: data.description,
                    valuePercent: data.valuePercent,
                    targetDate: data.targetDate
                  })
                  setIsCreatingMilestone(false)
                }}
                onCancel={() => setIsCreatingMilestone(false)}
              />
            )}

            {milestonesData?.milestones && milestonesData.milestones.length > 0 ? (
              <div className="space-y-3">
                {milestonesData.milestones.map((m) => {
                  const isOverdue =
                    m.targetDate != null &&
                    m.targetDate < nowForOverdue &&
                    !m.completed
                  return (
                    <MilestoneRow
                      key={m._id}
                      milestone={m}
                      isEditing={editingMilestoneId === m._id}
                      isOverdue={isOverdue}
                      onEdit={() => setEditingMilestoneId(m._id)}
                      onEditCancel={() => setEditingMilestoneId(null)}
                      onUpdate={async (data) => {
                        await updateMilestone({ id: m._id, ...data })
                        setEditingMilestoneId(null)
                      }}
                      onCompletedChange={async (completed: boolean) => {
                        await updateMilestone({ id: m._id, completed })
                      }}
                      onDelete={async () => {
                        if (confirm('Eliminare questa milestone?')) {
                          await removeMilestone({ id: m._id })
                          setEditingMilestoneId(null)
                        }
                      }}
                    />
                  )
                })}
              </div>
            ) : !isCreatingMilestone ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
                Nessuna milestone. Clicca su &quot;Nuova Milestone&quot; per aggiungerne una.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
