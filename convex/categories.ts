import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

/**
 * Lista tutte le categorie.
 */
export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('categories'),
      _creationTime: v.number(),
      name: v.string()
    })
  ),
  handler: async (ctx) => {
    return await ctx.db.query('categories').collect()
  }
})

/**
 * Ottiene una categoria per ID.
 */
export const getById = query({
  args: { id: v.id('categories') },
  returns: v.union(
    v.object({
      _id: v.id('categories'),
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
 * Crea una nuova categoria.
 */
export const create = mutation({
  args: {
    name: v.string()
  },
  returns: v.id('categories'),
  handler: async (ctx, args) => {
    return await ctx.db.insert('categories', {
      name: args.name
    })
  }
})

/**
 * Aggiorna una categoria.
 */
export const update = mutation({
  args: {
    id: v.id('categories'),
    name: v.string()
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { name: args.name })
    return null
  }
})
