import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'

const problemReturnValidator = v.object({
  _id: v.id('coreAppProblems'),
  _creationTime: v.number(),
  milestoneId: v.id('coreAppMilestones'),
  description: v.string(),
  status: v.union(v.literal('NOT_RESOLVED'), v.literal('RESOLVED'))
})

/**
 * Lista tutti i problemi di una CoreApp, raggruppati per milestone, con conteggio unsolved.
 */
export const listByCoreApp = query({
  args: { coreAppId: v.id('coreApps') },
  returns: v.object({
    problemsByMilestone: v.record(
      v.id('coreAppMilestones'),
      v.array(problemReturnValidator)
    ),
    unresolvedCount: v.number()
  }),
  handler: async (ctx, args) => {
    const milestones = await ctx.db
      .query('coreAppMilestones')
      .withIndex('by_coreApp_and_order', (q) =>
        q.eq('coreAppId', args.coreAppId)
      )
      .order('asc')
      .collect()

    const problemsByMilestone: Record<Id<'coreAppMilestones'>, Array<{ _id: Id<'coreAppProblems'>; _creationTime: number; milestoneId: Id<'coreAppMilestones'>; description: string; status: 'NOT_RESOLVED' | 'RESOLVED' }>> = {}
    let unresolvedCount = 0

    for (const m of milestones) {
      const problems = await ctx.db
        .query('coreAppProblems')
        .withIndex('by_milestone', (q) => q.eq('milestoneId', m._id))
        .collect()

      problemsByMilestone[m._id] = problems
      unresolvedCount += problems.filter((p) => p.status === 'NOT_RESOLVED').length
    }

    return {
      problemsByMilestone,
      unresolvedCount
    }
  }
})

/**
 * Lista i problemi di una singola milestone.
 */
export const listByMilestone = query({
  args: { milestoneId: v.id('coreAppMilestones') },
  returns: v.array(problemReturnValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('coreAppProblems')
      .withIndex('by_milestone', (q) => q.eq('milestoneId', args.milestoneId))
      .collect()
  }
})

/**
 * Crea un nuovo problema (status NOT_RESOLVED di default).
 */
export const create = mutation({
  args: {
    milestoneId: v.id('coreAppMilestones'),
    description: v.string()
  },
  returns: v.id('coreAppProblems'),
  handler: async (ctx, args) => {
    const milestone = await ctx.db.get(args.milestoneId)
    if (!milestone) {
      throw new Error('Milestone non trovata')
    }

    const description = args.description.trim()
    if (!description) {
      throw new Error('La descrizione è obbligatoria')
    }

    return await ctx.db.insert('coreAppProblems', {
      milestoneId: args.milestoneId,
      description,
      status: 'NOT_RESOLVED'
    })
  }
})

/**
 * Aggiorna lo status di un problema (RESOLVED / NOT_RESOLVED).
 */
export const updateStatus = mutation({
  args: {
    id: v.id('coreAppProblems'),
    status: v.union(v.literal('NOT_RESOLVED'), v.literal('RESOLVED'))
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id)
    if (!existing) {
      throw new Error('Problema non trovato')
    }

    await ctx.db.patch(args.id, { status: args.status })
    return null
  }
})

/**
 * Elimina un problema.
 */
export const remove = mutation({
  args: { id: v.id('coreAppProblems') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id)
    if (!existing) {
      throw new Error('Problema non trovato')
    }

    await ctx.db.delete(args.id)
    return null
  }
})
