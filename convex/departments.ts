import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

/**
 * Lista tutti i dipartimenti.
 */
export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('departments'),
      _creationTime: v.number(),
      name: v.string(),
      teamIds: v.array(v.id('teams'))
    })
  ),
  handler: async (ctx) => {
    return await ctx.db.query('departments').collect()
  }
})

/**
 * Ottiene un dipartimento per ID.
 */
export const getById = query({
  args: { id: v.id('departments') },
  returns: v.union(
    v.object({
      _id: v.id('departments'),
      _creationTime: v.number(),
      name: v.string(),
      teamIds: v.array(v.id('teams'))
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  }
})

/**
 * Crea un nuovo dipartimento.
 */
export const create = mutation({
  args: {
    name: v.string(),
    teamIds: v.array(v.id('teams'))
  },
  returns: v.id('departments'),
  handler: async (ctx, args) => {
    return await ctx.db.insert('departments', {
      name: args.name,
      teamIds: args.teamIds
    })
  }
})

/**
 * Aggiorna un dipartimento.
 */
export const update = mutation({
  args: {
    id: v.id('departments'),
    name: v.optional(v.string()),
    teamIds: v.optional(v.array(v.id('teams')))
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...updates } = args
    await ctx.db.patch(id, updates)
    return null
  }
})

/**
 * Elimina un dipartimento.
 */
export const remove = mutation({
  args: {
    id: v.id('departments')
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id)
    return null
  }
})
