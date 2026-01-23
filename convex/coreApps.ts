import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

const coreAppStatusValidator = v.union(
  v.literal('Planning'),
  v.literal('InProgress'),
  v.literal('Completed')
)

const coreAppReturnValidator = v.object({
  _id: v.id('coreApps'),
  _creationTime: v.number(),
  name: v.string(),
  description: v.optional(v.string()),
  percentComplete: v.number(),
  repoUrl: v.optional(v.string()),
  status: coreAppStatusValidator
})

/**
 * Lista tutte le Core Apps.
 */
export const list = query({
  args: {},
  returns: v.array(coreAppReturnValidator),
  handler: async (ctx) => {
    return await ctx.db.query('coreApps').collect()
  }
})

/**
 * Ottiene una Core App per ID.
 */
export const getById = query({
  args: { id: v.id('coreApps') },
  returns: v.union(coreAppReturnValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  }
})

/**
 * Crea una nuova Core App.
 */
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    repoUrl: v.optional(v.string())
  },
  returns: v.id('coreApps'),
  handler: async (ctx, args) => {
    return await ctx.db.insert('coreApps', {
      name: args.name,
      description: args.description,
      percentComplete: 0,
      repoUrl: args.repoUrl,
      status: 'Planning'
    })
  }
})

/**
 * Aggiorna una Core App.
 */
export const update = mutation({
  args: {
    id: v.id('coreApps'),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    percentComplete: v.optional(v.number()),
    repoUrl: v.optional(v.string()),
    status: v.optional(coreAppStatusValidator)
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...updates } = args
    await ctx.db.patch(id, updates)
    return null
  }
})

/**
 * Elimina una Core App.
 */
export const remove = mutation({
  args: { id: v.id('coreApps') },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Elimina anche tutti gli aggiornamenti associati
    const updates = await ctx.db
      .query('coreAppUpdates')
      .withIndex('by_coreApp', (q) => q.eq('coreAppId', args.id))
      .collect()

    for (const update of updates) {
      await ctx.db.delete(update._id)
    }

    await ctx.db.delete(args.id)
    return null
  }
})
