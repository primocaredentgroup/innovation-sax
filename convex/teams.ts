import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

/**
 * Lista tutti i team.
 */
export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('teams'),
      _creationTime: v.number(),
      name: v.string()
    })
  ),
  handler: async (ctx) => {
    return await ctx.db.query('teams').collect()
  }
})

/**
 * Ottiene un team per ID.
 */
export const getById = query({
  args: { id: v.id('teams') },
  returns: v.union(
    v.object({
      _id: v.id('teams'),
      _creationTime: v.number(),
      name: v.string()
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  }
})

/**
 * Crea un nuovo team.
 */
export const create = mutation({
  args: {
    name: v.string()
  },
  returns: v.id('teams'),
  handler: async (ctx, args) => {
    return await ctx.db.insert('teams', {
      name: args.name
    })
  }
})

/**
 * Aggiorna un team.
 */
export const update = mutation({
  args: {
    id: v.id('teams'),
    name: v.string()
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { name: args.name })
    return null
  }
})

/**
 * Elimina un team.
 */
export const remove = mutation({
  args: {
    id: v.id('teams')
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id)
    return null
  }
})
