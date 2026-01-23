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
      categoryIds: v.array(v.id('categories'))
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
      categoryIds: v.array(v.id('categories'))
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
    categoryIds: v.array(v.id('categories'))
  },
  returns: v.id('departments'),
  handler: async (ctx, args) => {
    return await ctx.db.insert('departments', {
      name: args.name,
      categoryIds: args.categoryIds
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
    categoryIds: v.optional(v.array(v.id('categories')))
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
