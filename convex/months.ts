import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

/**
 * Lista tutti i mesi configurati.
 */
export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('months'),
      _creationTime: v.number(),
      monthRef: v.string(),
      totalKeyDev: v.number()
    })
  ),
  handler: async (ctx) => {
    return await ctx.db.query('months').collect()
  }
})

/**
 * Ottiene un mese per riferimento.
 */
export const getByRef = query({
  args: { monthRef: v.string() },
  returns: v.union(
    v.object({
      _id: v.id('months'),
      _creationTime: v.number(),
      monthRef: v.string(),
      totalKeyDev: v.number()
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('months')
      .withIndex('by_monthRef', (q) => q.eq('monthRef', args.monthRef))
      .first()
  }
})

/**
 * Crea o aggiorna un mese.
 */
export const upsert = mutation({
  args: {
    monthRef: v.string(),
    totalKeyDev: v.number()
  },
  returns: v.id('months'),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('months')
      .withIndex('by_monthRef', (q) => q.eq('monthRef', args.monthRef))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, { totalKeyDev: args.totalKeyDev })
      return existing._id
    }

    return await ctx.db.insert('months', {
      monthRef: args.monthRef,
      totalKeyDev: args.totalKeyDev
    })
  }
})
