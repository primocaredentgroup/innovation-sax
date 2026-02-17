import { useMemo, useState } from 'react'
import type { QuestionLabelLite } from './types'

type QuestionLabelsInputProps = {
  availableLabels: Array<QuestionLabelLite>
  selectedLabels: Array<QuestionLabelLite>
  onAddLabel: (labelText: string) => Promise<void>
  onRemoveLabel: (labelId: string) => Promise<void>
}

export default function QuestionLabelsInput({
  availableLabels,
  selectedLabels,
  onAddLabel,
  onRemoveLabel
}: QuestionLabelsInputProps) {
  const [value, setValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEditorOpen, setIsEditorOpen] = useState(false)

  const normalizedSelectedIds = useMemo(() => new Set(selectedLabels.map((label) => label._id)), [selectedLabels])

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase()
    if (!q) return []
    return availableLabels
      .filter((label) => !normalizedSelectedIds.has(label._id))
      .filter((label) => label.label.toLowerCase().includes(q) || label.value.toLowerCase().includes(q))
      .slice(0, 6)
  }, [availableLabels, normalizedSelectedIds, value])

  const submitLabel = async (rawLabel: string) => {
    const labelText = rawLabel.trim()
    if (!labelText) return
    setIsSubmitting(true)
    try {
      await onAddLabel(labelText)
      setValue('')
      setIsEditorOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="space-y-1"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {selectedLabels.map((label) => (
          <span
            key={label._id}
            className="inline-flex items-center gap-1 rounded-full border border-violet-300/80 bg-violet-100/80 px-2.5 py-1 text-xs font-medium text-violet-800 dark:border-violet-700 dark:bg-violet-900/40 dark:text-violet-200"
          >
            {label.label}
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation()
                await onRemoveLabel(label._id)
              }}
              className="text-violet-700 hover:text-red-600 dark:text-violet-300 dark:hover:text-red-300"
              title="Rimuovi label"
            >
              ✕
            </button>
          </span>
        ))}

        {isEditorOpen ? (
          <div className="inline-flex items-center gap-1">
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={async (e) => {
                e.stopPropagation()
                if (e.key === 'Enter') {
                  e.preventDefault()
                  await submitLabel(value)
                }
                if (e.key === 'Escape') {
                  setValue('')
                  setIsEditorOpen(false)
                }
              }}
              placeholder="Nuova label"
              className="w-36 px-2.5 py-1 text-xs border border-violet-300 dark:border-violet-700 rounded-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              autoFocus
            />
            <button
              type="button"
              disabled={!value.trim() || isSubmitting}
              onClick={async (e) => {
                e.stopPropagation()
                await submitLabel(value)
              }}
              className="px-2.5 py-1 text-xs rounded-full bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
            >
              Aggiungi
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setIsEditorOpen(true)
            }}
            className="inline-flex items-center rounded-full border border-dashed border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:border-violet-400 hover:text-violet-700 dark:border-gray-600 dark:text-gray-300 dark:hover:border-violet-500 dark:hover:text-violet-300"
          >
            + Label
          </button>
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {suggestions.map((label) => (
            <button
              key={label._id}
              type="button"
              onClick={async (e) => {
                e.stopPropagation()
                await submitLabel(label.label)
              }}
              className="px-2 py-0.5 text-xs rounded-full border border-gray-300 bg-gray-100 text-gray-700 hover:border-violet-300 hover:text-violet-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:border-violet-600 dark:hover:text-violet-300"
            >
              {label.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
