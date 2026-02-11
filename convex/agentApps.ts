import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

const agentAppReturnValidator = v.object({
  _id: v.id('agentApps'),
  _creationTime: v.number(),
  name: v.string(),
  baseUrl: v.string(),
  appKey: v.string()
})

/**
 * Lista tutte le Agent Apps.
 */
export const list = query({
  args: {},
  returns: v.array(agentAppReturnValidator),
  handler: async (ctx) => {
    return await ctx.db.query('agentApps').collect()
  }
})

/**
 * Ottiene una Agent App per ID.
 */
export const getById = query({
  args: { id: v.id('agentApps') },
  returns: v.union(agentAppReturnValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  }
})

/**
 * Crea una nuova Agent App.
 */
export const create = mutation({
  args: {
    name: v.string(),
    baseUrl: v.string(),
    appKey: v.string()
  },
  returns: v.id('agentApps'),
  handler: async (ctx, args) => {
    return await ctx.db.insert('agentApps', {
      name: args.name,
      baseUrl: args.baseUrl,
      appKey: args.appKey
    })
  }
})

/**
 * Aggiorna una Agent App.
 */
export const update = mutation({
  args: {
    id: v.id('agentApps'),
    name: v.optional(v.string()),
    baseUrl: v.optional(v.string()),
    appKey: v.optional(v.string())
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...updates } = args
    await ctx.db.patch(id, updates)
    return null
  }
})

/**
 * Elimina una Agent App.
 */
export const remove = mutation({
  args: {
    id: v.id('agentApps')
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id)
    return null
  }
})
