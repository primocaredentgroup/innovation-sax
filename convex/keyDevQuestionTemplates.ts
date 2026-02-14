import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import { isAdmin } from './users'

const keyDevQuestionTemplateValidator = v.object({
  _id: v.id('keyDevQuestionTemplates'),
  _creationTime: v.number(),
  text: v.string(),
  active: v.boolean(),
  order: v.number(),
  createdById: v.id('users'),
  updatedAt: v.number()
})

const keyDevQuestionTemplateInputValidator = v.object({
  text: v.string(),
  active: v.boolean()
})

async function getCurrentUserOrThrow(ctx: unknown) {
  const convexCtx = ctx as {
    auth: { getUserIdentity: () => Promise<{ subject: string } | null> }
    db: {
      query: (table: 'users') => {
        withIndex: (
          indexName: 'by_sub',
          indexRange: (q: { eq: (field: 'sub', value: string) => unknown }) => unknown
        ) => { first: () => Promise<{ _id: Id<'users'>; roles?: Array<'Requester' | 'BusinessValidator' | 'TechValidator' | 'Admin'> } | null> }
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
 * Lista tutti i template Questions (admin).
 */
export const list = query({
  args: {},
  returns: v.array(keyDevQuestionTemplateValidator),
  handler: async (ctx) => {
    return await ctx.db
      .query('keyDevQuestionTemplates')
      .withIndex('by_order')
      .collect()
  }
})

/**
 * Lista solo i template attivi ordinati.
 */
export const listActive = query({
  args: {},
  returns: v.array(keyDevQuestionTemplateValidator),
  handler: async (ctx) => {
    return await ctx.db
      .query('keyDevQuestionTemplates')
      .withIndex('by_active_and_order', (q) => q.eq('active', true))
      .collect()
  }
})

/**
 * Crea un template domanda (solo admin).
 */
export const create = mutation({
  args: keyDevQuestionTemplateInputValidator.fields,
  returns: v.id('keyDevQuestionTemplates'),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx)
    if (!isAdmin(user.roles)) {
      throw new Error('Solo gli Admin possono creare template questions')
    }

    const existing = await ctx.db
      .query('keyDevQuestionTemplates')
      .withIndex('by_order')
      .collect()

    const maxOrder = existing.reduce((acc, item) => Math.max(acc, item.order), 0)

    return await ctx.db.insert('keyDevQuestionTemplates', {
      text: args.text.trim(),
      active: args.active,
      order: maxOrder + 1,
      createdById: user._id,
      updatedAt: Date.now()
    })
  }
})

/**
 * Aggiorna un template domanda (solo admin).
 */
export const update = mutation({
  args: {
    id: v.id('keyDevQuestionTemplates'),
    text: v.optional(v.string()),
    active: v.optional(v.boolean()),
    order: v.optional(v.number())
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx)
    if (!isAdmin(user.roles)) {
      throw new Error('Solo gli Admin possono aggiornare template questions')
    }

    const template = await ctx.db.get(args.id)
    if (!template) {
      throw new Error('Template question non trovato')
    }

    const updates: {
      text?: string
      active?: boolean
      order?: number
      updatedAt: number
    } = { updatedAt: Date.now() }

    if (args.text !== undefined) updates.text = args.text.trim()
    if (args.active !== undefined) updates.active = args.active
    if (args.order !== undefined) updates.order = args.order

    await ctx.db.patch(args.id, updates)
    return null
  }
})

/**
 * Elimina un template domanda (solo admin).
 */
export const remove = mutation({
  args: { id: v.id('keyDevQuestionTemplates') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx)
    if (!isAdmin(user.roles)) {
      throw new Error('Solo gli Admin possono eliminare template questions')
    }

    const template = await ctx.db.get(args.id)
    if (!template) {
      throw new Error('Template question non trovato')
    }

    await ctx.db.delete(args.id)
    return null
  }
})
