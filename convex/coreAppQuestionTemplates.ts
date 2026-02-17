import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import type { Doc } from './_generated/dataModel'
import { hasRole, isAdmin } from './users'

type Role = 'Requester' | 'BusinessValidator' | 'TechValidator' | 'Admin'

const templateValidator = v.object({
  _id: v.id('coreAppQuestionTemplates'),
  _creationTime: v.number(),
  text: v.string(),
  active: v.boolean(),
  order: v.number(),
  createdById: v.id('users'),
  updatedAt: v.number()
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

export const list = query({
  args: {},
  returns: v.array(templateValidator),
  handler: async (ctx) => {
    return await ctx.db.query('coreAppQuestionTemplates').withIndex('by_order').collect()
  }
})

export const listActive = query({
  args: {},
  returns: v.array(templateValidator),
  handler: async (ctx) => {
    return await ctx.db
      .query('coreAppQuestionTemplates')
      .withIndex('by_active_and_order', (q) => q.eq('active', true))
      .collect()
  }
})

export const create = mutation({
  args: {
    text: v.string(),
    order: v.optional(v.number()),
    active: v.optional(v.boolean())
  },
  returns: v.id('coreAppQuestionTemplates'),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx)
    const userRoles = user.roles as Array<Role> | undefined
    if (!isAdmin(userRoles) && !hasRole(userRoles, 'TechValidator')) {
      throw new Error('Solo Admin o TechValidator possono creare template')
    }

    const templates = await ctx.db.query('coreAppQuestionTemplates').withIndex('by_order').collect()
    const nextOrder =
      args.order !== undefined
        ? Math.max(1, Math.floor(args.order))
        : templates.reduce((acc, template) => Math.max(acc, template.order), 0) + 1

    return await ctx.db.insert('coreAppQuestionTemplates', {
      text: args.text.trim(),
      active: args.active ?? true,
      order: nextOrder,
      createdById: user._id,
      updatedAt: Date.now()
    })
  }
})

export const update = mutation({
  args: {
    id: v.id('coreAppQuestionTemplates'),
    text: v.optional(v.string()),
    active: v.optional(v.boolean()),
    order: v.optional(v.number())
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx)
    const userRoles = user.roles as Array<Role> | undefined
    if (!isAdmin(userRoles) && !hasRole(userRoles, 'TechValidator')) {
      throw new Error('Solo Admin o TechValidator possono aggiornare template')
    }

    const template = await ctx.db.get(args.id)
    if (!template) throw new Error('Template non trovato')

    const updates: {
      text?: string
      active?: boolean
      order?: number
      updatedAt: number
    } = { updatedAt: Date.now() }

    if (args.text !== undefined) updates.text = args.text.trim()
    if (args.active !== undefined) updates.active = args.active
    if (args.order !== undefined) updates.order = Math.max(1, Math.floor(args.order))

    await ctx.db.patch(args.id, updates)
    return null
  }
})

export const remove = mutation({
  args: { id: v.id('coreAppQuestionTemplates') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx)
    const userRoles = user.roles as Array<Role> | undefined
    if (!isAdmin(userRoles) && !hasRole(userRoles, 'TechValidator')) {
      throw new Error('Solo Admin o TechValidator possono eliminare template')
    }

    await ctx.db.delete(args.id)
    return null
  }
})
