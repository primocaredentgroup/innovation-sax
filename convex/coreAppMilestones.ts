import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import type { Doc } from './_generated/dataModel'
import { internal } from './_generated/api'
import { isAdmin } from './users'

const milestoneReturnValidator = v.object({
  _id: v.id('coreAppMilestones'),
  _creationTime: v.number(),
  coreAppId: v.id('coreApps'),
  description: v.string(),
  valuePercent: v.number(),
  completed: v.boolean(),
  targetDate: v.optional(v.number()),
  order: v.number()
})

/** Somma dei valuePercent per le milestone completate (progresso = somma valori, nessun ricalcolo in base 100) */
function completedSum(milestones: { valuePercent: number; completed: boolean }[]): number {
  return milestones
    .filter((m) => m.completed)
    .reduce((s, m) => s + m.valuePercent, 0)
}

/** Somma totale dei valuePercent di tutte le milestones */
function totalSum(milestones: { valuePercent: number }[]): number {
  return milestones.reduce((s, m) => s + m.valuePercent, 0)
}

/**
 * Lista le milestone di una Core App, ordinate per order.
 * progressPercent = somma dei valuePercent completati (no scaling).
 * completedSum/totalSum per il counter e avviso se totalSum < 100.
 */
export const listByCoreApp = query({
  args: { coreAppId: v.id('coreApps') },
  returns: v.object({
    milestones: v.array(milestoneReturnValidator),
    progressPercent: v.number(),
    completedSum: v.number(),
    totalSum: v.number(),
    completedCount: v.number(),
    totalCount: v.number()
  }),
  handler: async (ctx, args) => {
    const milestones = await ctx.db
      .query('coreAppMilestones')
      .withIndex('by_coreApp_and_order', (q) =>
        q.eq('coreAppId', args.coreAppId)
      )
      .order('asc')
      .collect()

    const completed = completedSum(milestones)
    const total = totalSum(milestones)

    return {
      milestones,
      progressPercent: Math.round(completed),
      completedSum: Math.round(completed * 10) / 10,
      totalSum: Math.round(total * 10) / 10,
      completedCount: milestones.filter((m) => m.completed).length,
      totalCount: milestones.length
    }
  }
})

/**
 * Crea una nuova milestone e aggiorna percentComplete sulla CoreApp.
 */
export const create = mutation({
  args: {
    coreAppId: v.id('coreApps'),
    description: v.string(),
    valuePercent: v.number(),
    targetDate: v.number()
  },
  returns: v.id('coreAppMilestones'),
  handler: async (ctx, args) => {
    const coreApp = await ctx.db.get(args.coreAppId)
    if (!coreApp) {
      throw new Error('CoreApp non trovata')
    }

    const description = args.description.trim()
    if (!description) {
      throw new Error('La descrizione è obbligatoria')
    }

    const valuePercent = Math.max(0, Math.min(100, args.valuePercent))

    const existing = await ctx.db
      .query('coreAppMilestones')
      .withIndex('by_coreApp_and_order', (q) => q.eq('coreAppId', args.coreAppId))
      .order('desc')
      .collect()

    const maxOrder =
      existing.length > 0 ? existing[0].order : -1
    const order = maxOrder + 1

    const milestoneId = await ctx.db.insert('coreAppMilestones', {
      coreAppId: args.coreAppId,
      description,
      valuePercent,
      completed: false,
      targetDate: args.targetDate,
      order
    })

    const allMilestones = [
      ...existing,
      { valuePercent, completed: false }
    ]
    const sum = completedSum(allMilestones)
    await ctx.db.patch(args.coreAppId, { percentComplete: Math.round(sum) })

    await ctx.scheduler.runAfter(0, internal.coreAppOverdue.syncOverdueStatusForCoreApp, {
      coreAppId: args.coreAppId
    })
    return milestoneId
  }
})

/**
 * Aggiorna una milestone e ricalcola percentComplete sulla CoreApp.
 */
export const update = mutation({
  args: {
    id: v.id('coreAppMilestones'),
    description: v.optional(v.string()),
    valuePercent: v.optional(v.number()),
    completed: v.optional(v.boolean()),
    targetDate: v.optional(v.number())
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...updates } = args
    const existing = await ctx.db.get(id)
    if (!existing) {
      throw new Error('Milestone non trovata')
    }

    const description =
      updates.description !== undefined
        ? updates.description.trim()
        : existing.description
    if (!description) {
      throw new Error('La descrizione è obbligatoria')
    }

    const valuePercent =
      updates.valuePercent !== undefined
        ? Math.max(0, Math.min(100, updates.valuePercent))
        : existing.valuePercent
    const completed =
      updates.completed !== undefined ? updates.completed : existing.completed

    await ctx.db.patch(id, {
      description,
      valuePercent,
      completed,
      targetDate:
        updates.targetDate !== undefined
          ? updates.targetDate
          : existing.targetDate
    })

    const milestones = await ctx.db
      .query('coreAppMilestones')
      .withIndex('by_coreApp', (q) => q.eq('coreAppId', existing.coreAppId))
      .collect()

    const toCalculate = milestones.map((m) =>
      m._id === id
        ? { valuePercent, completed }
        : { valuePercent: m.valuePercent, completed: m.completed }
    )
    const sum = completedSum(toCalculate)
    await ctx.db.patch(existing.coreAppId, { percentComplete: Math.round(sum) })

    await ctx.scheduler.runAfter(0, internal.coreAppOverdue.syncOverdueStatusForCoreApp, {
      coreAppId: existing.coreAppId
    })
    return null
  }
})

/**
 * Elimina una milestone e ricalcola percentComplete sulla CoreApp.
 */
export const remove = mutation({
  args: { id: v.id('coreAppMilestones') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id)
    if (!existing) {
      throw new Error('Milestone non trovata')
    }

    await ctx.db.delete(args.id)

    const remaining = await ctx.db
      .query('coreAppMilestones')
      .withIndex('by_coreApp', (q) => q.eq('coreAppId', existing.coreAppId))
      .collect()

    if (remaining.length > 0) {
      const sum = completedSum(remaining)
      await ctx.db.patch(existing.coreAppId, { percentComplete: Math.round(sum) })
    } else {
      await ctx.db.patch(existing.coreAppId, { percentComplete: 0 })
    }

    await ctx.scheduler.runAfter(0, internal.coreAppOverdue.syncOverdueStatusForCoreApp, {
      coreAppId: existing.coreAppId
    })
    return null
  }
})

const coreAppBasicValidator = v.object({
  _id: v.id('coreApps'),
  name: v.string(),
  slug: v.string()
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
 * Lista le CoreApp senza milestones (per inizializzazione).
 */
export const listCoreAppsWithoutMilestones = query({
  args: {},
  returns: v.array(coreAppBasicValidator),
  handler: async (ctx) => {
    const allCoreApps = await ctx.db.query('coreApps').collect()
    const allMilestones = await ctx.db.query('coreAppMilestones').collect()
    const coreAppIdsWithMilestones = new Set(
      allMilestones.map((m) => m.coreAppId)
    )
    return allCoreApps
      .filter((app) => !coreAppIdsWithMilestones.has(app._id))
      .map((app) => ({ _id: app._id, name: app.name, slug: app.slug }))
  }
})

/**
 * Applica i template milestones a tutte le CoreApp senza milestones (solo Admin).
 */
export const applyTemplateToCoreAppsWithoutMilestones = mutation({
  args: {},
  returns: v.object({
    updatedCount: v.number()
  }),
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx)
    const userRoles = user.roles as
      | Array<'Requester' | 'BusinessValidator' | 'TechValidator' | 'Admin'>
      | undefined
    if (!isAdmin(userRoles)) {
      throw new Error('Solo gli Admin possono inizializzare le CoreApp con i template milestones')
    }

    const templates = await ctx.db
      .query('coreAppMilestoneTemplates')
      .withIndex('by_order')
      .collect()
    if (templates.length === 0) {
      return { updatedCount: 0 }
    }

    const allCoreApps = await ctx.db.query('coreApps').collect()
    const allMilestones = await ctx.db.query('coreAppMilestones').collect()
    const coreAppIdsWithMilestones = new Set(
      allMilestones.map((m) => m.coreAppId)
    )
    const coreAppsWithoutMilestones = allCoreApps.filter(
      (app) => !coreAppIdsWithMilestones.has(app._id)
    )

    const MS_PER_14_DAYS = 14 * 24 * 60 * 60 * 1000
    let updatedCount = 0
    for (const coreApp of coreAppsWithoutMilestones) {
      const baseTime = Date.now()
      for (let i = 0; i < templates.length; i++) {
        const t = templates[i]
        const targetDate = baseTime + (i + 1) * MS_PER_14_DAYS
        await ctx.db.insert('coreAppMilestones', {
          coreAppId: coreApp._id,
          description: t.description,
          valuePercent: t.valuePercent,
          completed: false,
          targetDate,
          order: t.order
        })
      }
      await ctx.scheduler.runAfter(0, internal.coreAppOverdue.syncOverdueStatusForCoreApp, {
        coreAppId: coreApp._id
      })
      updatedCount++
    }

    return { updatedCount }
  }
})
