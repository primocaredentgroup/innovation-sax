import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

const WEIGHT_CYCLE = [0.25, 0.5, 0.75, 1] as const
type WeightValue = (typeof WEIGHT_CYCLE)[number] | 0

const formatWeight = (w: WeightValue | undefined): string => {
  if (w === undefined) return 'x1'
  return `x${w}`
}

interface WeightLabelProps {
  keyDevId: Id<'keydevs'>
  weight: WeightValue | undefined
}

export default function WeightLabel({ keyDevId, weight }: WeightLabelProps) {
  const updateWeight = useMutation(api.keydevs.updateWeight)

  const currentValue = weight ?? 1
  const displayLabel = formatWeight(weight)

  const getNextWeight = (): WeightValue => {
    if (currentValue === 0) return 0.25
    const idx = WEIGHT_CYCLE.indexOf(currentValue as (typeof WEIGHT_CYCLE)[number])
    if (idx >= 0 && idx < WEIGHT_CYCLE.length - 1) {
      return WEIGHT_CYCLE[idx + 1]
    }
    return 0.25 // da 1 torna a 0.25
  }

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const nextWeight = getNextWeight()
    try {
      await updateWeight({ id: keyDevId, weight: nextWeight })
    } catch (err) {
      console.error('Errore aggiornamento weight:', err)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex shrink-0 text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:underline ml-1 px-1 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
      title={`Peso: ${displayLabel} (clicca per cambiare)`}
    >
      {displayLabel}
    </button>
  )
}
