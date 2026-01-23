import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

const coreAppUpdateReturnValidator = v.object({
  _id: v.id('coreAppUpdates'),
  _creationTime: v.number(),
  coreAppId: v.id('coreApps'),
  weekRef: v.string(),
  loomUrl: v.optional(v.string()),
  title: v.optional(v.string()),
  notes: v.optional(v.string()),
  createdAt: v.number()
})

/**
 * Lista gli aggiornamenti di una Core App.
 */
export const listByCoreApp = query({
  args: { coreAppId: v.id('coreApps') },
  returns: v.array(coreAppUpdateReturnValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('coreAppUpdates')
      .withIndex('by_coreApp', (q) => q.eq('coreAppId', args.coreAppId))
      .order('desc')
      .collect()
  }
})

/**
 * Lista tutti gli aggiornamenti di una settimana.
 */
export const listByWeek = query({
  args: { weekRef: v.string() },
  returns: v.array(coreAppUpdateReturnValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('coreAppUpdates')
      .withIndex('by_week', (q) => q.eq('weekRef', args.weekRef))
      .collect()
  }
})

/**
 * Crea un nuovo aggiornamento settimanale.
 */
export const create = mutation({
  args: {
    coreAppId: v.id('coreApps'),
    weekRef: v.string(),
    loomUrl: v.optional(v.string()),
    title: v.optional(v.string()),
    notes: v.optional(v.string())
  },
  returns: v.id('coreAppUpdates'),
  handler: async (ctx, args) => {
    return await ctx.db.insert('coreAppUpdates', {
      coreAppId: args.coreAppId,
      weekRef: args.weekRef,
      loomUrl: args.loomUrl,
      title: args.title,
      notes: args.notes,
      createdAt: Date.now()
    })
  }
})

/**
 * Aggiorna un aggiornamento settimanale.
 */
export const update = mutation({
  args: {
    id: v.id('coreAppUpdates'),
    loomUrl: v.optional(v.string()),
    title: v.optional(v.string()),
    notes: v.optional(v.string())
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...updates } = args
    await ctx.db.patch(id, updates)
    return null
  }
})

/**
 * Elimina un aggiornamento settimanale.
 */
export const remove = mutation({
  args: { id: v.id('coreAppUpdates') },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id)
    return null
  }
})
