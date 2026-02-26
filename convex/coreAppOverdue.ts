import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx } from './_generated/server'
import { internalMutation } from './_generated/server'
import { v } from 'convex/values'

function getStatusFromMilestones(
  milestones: Array<Doc<'coreAppMilestones'>>,
  nowMs: number
): Doc<'coreApps'>['status'] {
  const completedProgress = Math.round(
    milestones
      .filter((m) => m.completed)
      .reduce((sum, m) => sum + m.valuePercent, 0)
  )
  if (completedProgress >= 100) return 'Completed'

  const hasOverdue = milestones.some((m) => m.targetDate < nowMs && !m.completed)
  return hasOverdue ? 'Overdue' : 'InProgress'
}

async function syncStatusByCoreAppId(
  ctx: MutationCtx,
  coreAppId: Id<'coreApps'>,
  nowMs: number
) {
  const coreApp = await ctx.db.get(coreAppId)
  if (!coreApp) return

  const milestones = await ctx.db
    .query('coreAppMilestones')
    .withIndex('by_coreApp', (q) => q.eq('coreAppId', coreAppId))
    .collect()

  const nextStatus = getStatusFromMilestones(milestones, nowMs)
  const completedSum = Math.round(
    milestones
      .filter((m) => m.completed)
      .reduce((sum, m) => sum + m.valuePercent, 0)
  )

  const updates: { status?: Doc<'coreApps'>['status']; percentComplete?: number } = {}
  if (coreApp.status !== nextStatus) updates.status = nextStatus
  if (coreApp.percentComplete !== completedSum) updates.percentComplete = completedSum

  if (Object.keys(updates).length > 0) {
    await ctx.db.patch(coreAppId, updates)
  }
}

/**
 * Sincronizza lo status di una singola CoreApp.
 * Regole:
 * - progress >= 100 => Completed (automatico)
 * - altrimenti, se esiste milestone scaduta => Overdue
 * - altrimenti => InProgress
 */
export const syncOverdueStatusForCoreApp = internalMutation({
  args: { coreAppId: v.id('coreApps') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const nowMs = Date.now()
    await syncStatusByCoreAppId(ctx, args.coreAppId, nowMs)
    return null
  }
})

/**
 * Sincronizza lo status CoreApp per tutte le CoreApp (usato dal cron giornaliero).
 */
export const syncAllOverdueStatuses = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const coreApps = await ctx.db.query('coreApps').collect()
    const nowMs = Date.now()

    for (const coreApp of coreApps) {
      await syncStatusByCoreAppId(ctx, coreApp._id, nowMs)
    }

    return null
  }
})
