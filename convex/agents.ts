import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

const agentReturnValidator = v.object({
  _id: v.id('agents'),
  _creationTime: v.number(),
  name: v.string(),
  provider: v.string(),
  providerUserId: v.string()
})

/**
 * Lista tutti gli agents.
 */
export const list = query({
  args: {},
  returns: v.array(agentReturnValidator),
  handler: async (ctx) => {
    return await ctx.db.query('agents').collect()
  }
})

/**
 * Ottiene un agent per ID.
 */
export const getById = query({
  args: { id: v.id('agents') },
  returns: v.union(agentReturnValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  }
})

/**
 * Crea un nuovo agent.
 */
export const create = mutation({
  args: {
    name: v.string(),
    provider: v.string(),
    providerUserId: v.string()
  },
  returns: v.id('agents'),
  handler: async (ctx, args) => {
    return await ctx.db.insert('agents', {
      name: args.name,
      provider: args.provider,
      providerUserId: args.providerUserId
    })
  }
})

/**
 * Aggiorna un agent.
 */
export const update = mutation({
  args: {
    id: v.id('agents'),
    name: v.optional(v.string()),
    provider: v.optional(v.string()),
    providerUserId: v.optional(v.string())
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...updates } = args
    await ctx.db.patch(id, updates)
    return null
  }
})

/**
 * Elimina un agent.
 */
export const remove = mutation({
  args: {
    id: v.id('agents')
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id)
    return null
  }
})
