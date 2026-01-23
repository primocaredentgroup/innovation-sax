import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { keydevStatusValidator } from './schema'

const keydevReturnValidator = v.object({
  _id: v.id('keydevs'),
  _creationTime: v.number(),
  title: v.string(),
  desc: v.string(),
  monthRef: v.string(),
  categoryId: v.id('categories'),
  deptId: v.id('departments'),
  requesterId: v.id('users'),
  businessValidatorId: v.optional(v.id('users')),
  techValidatorId: v.optional(v.id('users')),
  status: keydevStatusValidator,
  mockupRepoUrl: v.optional(v.string()),
  mockupTag: v.optional(v.string()),
  repoUrl: v.optional(v.string()),
  repoTag: v.optional(v.string()),
  approvedAt: v.optional(v.number()),
  frontValidatedAt: v.optional(v.number()),
  releasedAt: v.optional(v.number()),
  donePerc: v.optional(v.number()),
  prNumber: v.optional(v.number()),
  prMerged: v.optional(v.boolean())
})

/**
 * Lista KeyDevs per mese (filtro obbligatorio).
 */
export const listByMonth = query({
  args: { monthRef: v.string() },
  returns: v.array(keydevReturnValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('keydevs')
      .withIndex('by_month', (q) => q.eq('monthRef', args.monthRef))
      .collect()
  }
})

/**
 * Ottiene un KeyDev per ID.
 */
export const getById = query({
  args: { id: v.id('keydevs') },
  returns: v.union(keydevReturnValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  }
})

/**
 * Lista KeyDevs in ritardo (mese passato e non Done).
 */
export const listDelayed = query({
  args: { currentMonth: v.string() },
  returns: v.array(keydevReturnValidator),
  handler: async (ctx, args) => {
    const allKeyDevs = await ctx.db.query('keydevs').collect()
    return allKeyDevs.filter(
      (kd) => kd.monthRef < args.currentMonth && kd.status !== 'Done'
    )
  }
})

/**
 * Lista KeyDevs rifiutati (per audit trail).
 */
export const listRejected = query({
  args: {},
  returns: v.array(keydevReturnValidator),
  handler: async (ctx) => {
    return await ctx.db
      .query('keydevs')
      .withIndex('by_status_and_month', (q) => q.eq('status', 'Rejected'))
      .collect()
  }
})

/**
 * Crea un nuovo KeyDev.
 */
export const create = mutation({
  args: {
    title: v.string(),
    desc: v.string(),
    monthRef: v.string(),
    categoryId: v.id('categories'),
    deptId: v.id('departments')
  },
  returns: v.id('keydevs'),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Non autenticato')
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_sub', (q) => q.eq('sub', identity.subject))
      .first()

    if (!user) {
      throw new Error('Utente non trovato')
    }

    return await ctx.db.insert('keydevs', {
      title: args.title,
      desc: args.desc,
      monthRef: args.monthRef,
      categoryId: args.categoryId,
      deptId: args.deptId,
      requesterId: user._id,
      status: 'Draft'
    })
  }
})

/**
 * Aggiorna un KeyDev.
 */
export const update = mutation({
  args: {
    id: v.id('keydevs'),
    title: v.optional(v.string()),
    desc: v.optional(v.string())
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...updates } = args
    await ctx.db.patch(id, updates)
    return null
  }
})

/**
 * Aggiorna lo stato di un KeyDev.
 */
export const updateStatus = mutation({
  args: {
    id: v.id('keydevs'),
    status: keydevStatusValidator
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const keydev = await ctx.db.get(args.id)
    if (!keydev) {
      throw new Error('KeyDev non trovato')
    }

    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Non autenticato')
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_sub', (q) => q.eq('sub', identity.subject))
      .first()

    if (!user) {
      throw new Error('Utente non trovato')
    }

    // Validazione transizioni di stato
    const updates: Record<string, unknown> = { status: args.status }

    if (args.status === 'Approved') {
      if (user.role !== 'BusinessValidator' && user.role !== 'Admin') {
        throw new Error('Solo BusinessValidator o Admin possono approvare')
      }
      updates.approvedAt = Date.now()
      updates.businessValidatorId = user._id
      updates.prMerged = true
      updates.mockupTag = 'v0.9.0-business'
    }

    if (args.status === 'FrontValidated') {
      if (user.role !== 'TechValidator' && user.role !== 'Admin') {
        throw new Error('Solo TechValidator o Admin possono validare il frontend')
      }
      updates.frontValidatedAt = Date.now()
      updates.techValidatorId = user._id
    }

    if (args.status === 'Done') {
      updates.releasedAt = Date.now()
      updates.donePerc = 100
    }

    await ctx.db.patch(args.id, updates)
    return null
  }
})

/**
 * Collega un mockup repository a un KeyDev.
 */
export const linkMockupRepo = mutation({
  args: {
    id: v.id('keydevs'),
    mockupRepoUrl: v.string(),
    prNumber: v.optional(v.number())
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = {
      mockupRepoUrl: args.mockupRepoUrl
    }
    if (args.prNumber) {
      updates.prNumber = args.prNumber
      updates.prMerged = false
    }
    await ctx.db.patch(args.id, updates)
    return null
  }
})

/**
 * Aggiorna il progresso di un KeyDev.
 */
export const updateProgress = mutation({
  args: {
    id: v.id('keydevs'),
    donePerc: v.number()
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { donePerc: args.donePerc })
    return null
  }
})
