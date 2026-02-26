import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import type { Doc } from './_generated/dataModel'
import { isAdmin } from './users'

const templateValidator = v.object({
  _id: v.id('coreAppMilestoneTemplates'),
  _creationTime: v.number(),
  description: v.string(),
  valuePercent: v.number(),
  order: v.number()
})

async function getCurrentUserOrThrow(ctx: unknown) {
  const convexCtx = ctx as {
    auth: { getUserIdentity: () => Promise<{ subject: string } | null> }
    db: {
      query: (table: 'users') => {
        withIndex: (
          indexName: 'by_sub',
          indexRange: (q: { eq: (field: 'sub', value: string) => unknown }) => unknown
        ) => { first: () => Promise<Doc<'users'> | null> }
      }
    }
  }

  const identity = await convexCtx.auth.getUserIdentity()
  if (!identity) throw new Error('Non autenticato')

  const user = await convexCtx.db
    .query('users')
    .withIndex('by_sub', (q) => q.eq('sub', identity.subject))
    .first()
  if (!user) throw new Error('Utente non trovato')
  return user
}

/**
 * Lista tutti i template milestones (admin).
 */
export const list = query({
  args: {},
  returns: v.array(templateValidator),
  handler: async (ctx) => {
    return await ctx.db
      .query('coreAppMilestoneTemplates')
      .withIndex('by_order')
      .collect()
  }
})

/**
 * Crea un template milestone (solo Admin).
 */
export const create = mutation({
  args: {
    description: v.string(),
    valuePercent: v.number(),
    order: v.optional(v.number())
  },
  returns: v.id('coreAppMilestoneTemplates'),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx)
    const userRoles = user.roles as Array<'Requester' | 'BusinessValidator' | 'TechValidator' | 'Admin'> | undefined
    if (!isAdmin(userRoles)) {
      throw new Error('Solo gli Admin possono creare template milestones')
    }

    const description = args.description.trim()
    if (!description) {
      throw new Error('La descrizione è obbligatoria')
    }

    const valuePercent = Math.max(0, Math.min(100, args.valuePercent))

    const templates = await ctx.db
      .query('coreAppMilestoneTemplates')
      .withIndex('by_order')
      .collect()
    const nextOrder =
      args.order !== undefined
        ? Math.max(0, Math.floor(args.order))
        : templates.reduce((acc, t) => Math.max(acc, t.order), -1) + 1

    return await ctx.db.insert('coreAppMilestoneTemplates', {
      description,
      valuePercent,
      order: nextOrder
    })
  }
})

/**
 * Aggiorna un template milestone (solo Admin).
 */
export const update = mutation({
  args: {
    id: v.id('coreAppMilestoneTemplates'),
    description: v.optional(v.string()),
    valuePercent: v.optional(v.number()),
    order: v.optional(v.number())
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx)
    const userRoles = user.roles as Array<'Requester' | 'BusinessValidator' | 'TechValidator' | 'Admin'> | undefined
    if (!isAdmin(userRoles)) {
      throw new Error('Solo gli Admin possono aggiornare template milestones')
    }

    const template = await ctx.db.get(args.id)
    if (!template) throw new Error('Template non trovato')

    const updates: {
      description?: string
      valuePercent?: number
      order?: number
    } = {}

    if (args.description !== undefined) {
      const desc = args.description.trim()
      if (!desc) throw new Error('La descrizione è obbligatoria')
      updates.description = desc
    }
    if (args.valuePercent !== undefined) {
      updates.valuePercent = Math.max(0, Math.min(100, args.valuePercent))
    }
    if (args.order !== undefined) updates.order = Math.max(0, Math.floor(args.order))

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.id, updates)
    }
    return null
  }
})

/**
 * Elimina un template milestone (solo Admin).
 */
export const remove = mutation({
  args: { id: v.id('coreAppMilestoneTemplates') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx)
    const userRoles = user.roles as Array<'Requester' | 'BusinessValidator' | 'TechValidator' | 'Admin'> | undefined
    if (!isAdmin(userRoles)) {
      throw new Error('Solo gli Admin possono eliminare template milestones')
    }

    await ctx.db.delete(args.id)
    return null
  }
})
