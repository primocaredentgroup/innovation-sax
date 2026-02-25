import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

const milestoneReturnValidator = v.object({
  _id: v.id('coreAppMilestones'),
  _creationTime: v.number(),
  coreAppId: v.id('coreApps'),
  description: v.string(),
  valuePercent: v.number(),
  completed: v.boolean(),
  targetDate: v.optional(v.number()),
  order: v.number()
})

function calculateProgress(
  milestones: { valuePercent: number; completed: boolean }[]
): number {
  if (milestones.length === 0) return 0
  const sumWeight = milestones.reduce((s, m) => s + m.valuePercent, 0)
  if (sumWeight <= 0) return 0
  const completedWeight = milestones
    .filter((m) => m.completed)
    .reduce((s, m) => s + m.valuePercent, 0)
  return Math.round((completedWeight / sumWeight) * 100)
}

function normalizePercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

/**
 * Lista le milestone di una Core App, ordinate per order.
 */
export const listByCoreApp = query({
  args: { coreAppId: v.id('coreApps') },
  returns: v.object({
    milestones: v.array(milestoneReturnValidator),
    progressPercent: v.number(),
    completedCount: v.number(),
    totalCount: v.number()
  }),
  handler: async (ctx, args) => {
    const milestones = await ctx.db
      .query('coreAppMilestones')
      .withIndex('by_coreApp_and_order', (q) =>
        q.eq('coreAppId', args.coreAppId)
      )
      .order('asc')
      .collect()

    const progressPercent = normalizePercent(calculateProgress(milestones))
    const completedCount = milestones.filter((m) => m.completed).length

    return {
      milestones,
      progressPercent,
      completedCount,
      totalCount: milestones.length
    }
  }
})

/**
 * Crea una nuova milestone e aggiorna percentComplete sulla CoreApp.
 */
export const create = mutation({
  args: {
    coreAppId: v.id('coreApps'),
    description: v.string(),
    valuePercent: v.number(),
    targetDate: v.optional(v.number())
  },
  returns: v.id('coreAppMilestones'),
  handler: async (ctx, args) => {
    const coreApp = await ctx.db.get(args.coreAppId)
    if (!coreApp) {
      throw new Error('CoreApp non trovata')
    }

    const description = args.description.trim()
    if (!description) {
      throw new Error('La descrizione è obbligatoria')
    }

    const valuePercent = Math.max(0, Math.min(100, args.valuePercent))

    const existing = await ctx.db
      .query('coreAppMilestones')
      .withIndex('by_coreApp_and_order', (q) => q.eq('coreAppId', args.coreAppId))
      .order('desc')
      .collect()

    const maxOrder =
      existing.length > 0 ? existing[0].order : -1
    const order = maxOrder + 1

    const milestoneId = await ctx.db.insert('coreAppMilestones', {
      coreAppId: args.coreAppId,
      description,
      valuePercent,
      completed: false,
      targetDate: args.targetDate,
      order
    })

    const allMilestones = [
      ...existing,
      { valuePercent, completed: false }
    ]
    const calculated = normalizePercent(calculateProgress(allMilestones))
    await ctx.db.patch(args.coreAppId, { percentComplete: calculated })

    return milestoneId
  }
})

/**
 * Aggiorna una milestone e ricalcola percentComplete sulla CoreApp.
 */
export const update = mutation({
  args: {
    id: v.id('coreAppMilestones'),
    description: v.optional(v.string()),
    valuePercent: v.optional(v.number()),
    completed: v.optional(v.boolean()),
    targetDate: v.optional(v.number())
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...updates } = args
    const existing = await ctx.db.get(id)
    if (!existing) {
      throw new Error('Milestone non trovata')
    }

    const description =
      updates.description !== undefined
        ? updates.description.trim()
        : existing.description
    if (!description) {
      throw new Error('La descrizione è obbligatoria')
    }

    const valuePercent =
      updates.valuePercent !== undefined
        ? Math.max(0, Math.min(100, updates.valuePercent))
        : existing.valuePercent
    const completed =
      updates.completed !== undefined ? updates.completed : existing.completed

    await ctx.db.patch(id, {
      description,
      valuePercent,
      completed,
      targetDate:
        updates.targetDate !== undefined
          ? updates.targetDate
          : existing.targetDate
    })

    const milestones = await ctx.db
      .query('coreAppMilestones')
      .withIndex('by_coreApp', (q) => q.eq('coreAppId', existing.coreAppId))
      .collect()

    const toCalculate = milestones.map((m) =>
      m._id === id
        ? { valuePercent, completed }
        : { valuePercent: m.valuePercent, completed: m.completed }
    )
    const calculated = normalizePercent(calculateProgress(toCalculate))
    await ctx.db.patch(existing.coreAppId, { percentComplete: calculated })

    return null
  }
})

/**
 * Elimina una milestone e ricalcola percentComplete sulla CoreApp.
 */
export const remove = mutation({
  args: { id: v.id('coreAppMilestones') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id)
    if (!existing) {
      throw new Error('Milestone non trovata')
    }

    await ctx.db.delete(args.id)

    const remaining = await ctx.db
      .query('coreAppMilestones')
      .withIndex('by_coreApp', (q) => q.eq('coreAppId', existing.coreAppId))
      .collect()

    if (remaining.length > 0) {
      const calculated = normalizePercent(calculateProgress(remaining))
      await ctx.db.patch(existing.coreAppId, { percentComplete: calculated })
    } else {
      await ctx.db.patch(existing.coreAppId, { percentComplete: 0 })
    }

    return null
  }
})
