import { query, mutation } from './_generated/server'
import type { MutationCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { v } from 'convex/values'

const coreAppStatusValidator = v.union(
  v.literal('Planning'),
  v.literal('InProgress'),
  v.literal('Completed')
)

const coreAppReturnValidator = v.object({
  _id: v.id('coreApps'),
  _creationTime: v.number(),
  name: v.string(),
  slug: v.string(),
  description: v.optional(v.string()),
  percentComplete: v.number(),
  weight: v.optional(v.number()),
  repoUrl: v.optional(v.string()),
  hubMilestonesUrl: v.optional(v.string()),
  status: coreAppStatusValidator,
  ownerId: v.optional(v.id('users')),
  businessRefId: v.optional(v.id('users')),
  categoryId: v.optional(v.id('coreAppsCategories')),
  notesCount: v.optional(v.number()),
  priority: v.optional(v.number()),
  lastUpdate: v.optional(v.object({
    createdAt: v.number(),
    weekRef: v.string()
  }))
})

/**
 * Lista tutte le Core Apps.
 */
export const list = query({
  args: {},
  returns: v.array(coreAppReturnValidator),
  handler: async (ctx) => {
    const apps = await ctx.db.query('coreApps').collect()
    
    // Per ogni app, trova l'ultimo aggiornamento
    const appsWithLastUpdate = await Promise.all(
      apps.map(async (app) => {
        const lastUpdate = await ctx.db
          .query('coreAppUpdates')
          .withIndex('by_coreApp', (q) => q.eq('coreAppId', app._id))
          .order('desc')
          .first()
        
        return {
          ...app,
          lastUpdate: lastUpdate ? {
            createdAt: lastUpdate.createdAt,
            weekRef: lastUpdate.weekRef
          } : undefined
        }
      })
    )
    
    return appsWithLastUpdate
  }
})

/**
 * Lista le Core Apps per categoria.
 */
export const listByCategory = query({
  args: { categoryId: v.id('coreAppsCategories') },
  returns: v.array(coreAppReturnValidator),
  handler: async (ctx, args) => {
    const apps = await ctx.db
      .query('coreApps')
      .withIndex('by_category', (q) => q.eq('categoryId', args.categoryId))
      .collect()
    
    // Per ogni app, trova l'ultimo aggiornamento
    const appsWithLastUpdate = await Promise.all(
      apps.map(async (app) => {
        const lastUpdate = await ctx.db
          .query('coreAppUpdates')
          .withIndex('by_coreApp', (q) => q.eq('coreAppId', app._id))
          .order('desc')
          .first()
        
        return {
          ...app,
          lastUpdate: lastUpdate ? {
            createdAt: lastUpdate.createdAt,
            weekRef: lastUpdate.weekRef
          } : undefined
        }
      })
    )
    
    return appsWithLastUpdate
  }
})

/**
 * Ottiene una Core App per ID.
 */
export const getById = query({
  args: { id: v.id('coreApps') },
  returns: v.union(coreAppReturnValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  }
})

/**
 * Ottiene una Core App per slug.
 */
export const getBySlug = query({
  args: { slug: v.string() },
  returns: v.union(coreAppReturnValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('coreApps')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .first()
  }
})

/**
 * Genera uno slug URL-friendly da una stringa.
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Calcola la prossima priority unica per una categoria.
 * La priority è univoca all'interno di ogni categoria (inclusa "senza categoria").
 */
async function getNextPriorityForCategory(
  ctx: MutationCtx,
  categoryId: Id<'coreAppsCategories'> | undefined
): Promise<number> {
  const appsInCategory = await ctx.db
    .query('coreApps')
    .withIndex('by_category', (q) => q.eq('categoryId', categoryId ?? undefined))
    .collect()

  const maxPriority = appsInCategory.reduce((max, app) => {
    const p = app.priority
    if (p === undefined) return max
    return p > max ? p : max
  }, -1)

  return maxPriority + 1
}

/**
 * Crea una nuova Core App.
 * La priority viene calcolata automaticamente: max(priority) + 1 per la categoria selezionata.
 */
export const create = mutation({
  args: {
    name: v.string(),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    repoUrl: v.optional(v.string()),
    ownerId: v.id('users'),
    businessRefId: v.optional(v.id('users')),
    categoryId: v.optional(v.id('coreAppsCategories')),
    weight: v.optional(v.number())
  },
  returns: v.id('coreApps'),
  handler: async (ctx, args) => {
    const slug = args.slug || generateSlug(args.name)

    // Verifica che lo slug sia unico
    const existing = await ctx.db
      .query('coreApps')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .first()

    if (existing) {
      throw new Error(`Slug "${slug}" già in uso`)
    }

    // Verifica che l'owner esista
    const owner = await ctx.db.get(args.ownerId)
    if (!owner) {
      throw new Error('Owner non trovato')
    }

    // Verifica che la categoria esista (se specificata)
    if (args.categoryId) {
      const category = await ctx.db.get(args.categoryId)
      if (!category) {
        throw new Error('Categoria non trovata')
      }
    }

    // Verifica che il referente business esista (se specificato)
    if (args.businessRefId) {
      const businessRef = await ctx.db.get(args.businessRefId)
      if (!businessRef) {
        throw new Error('Referente business non trovato')
      }
    }

    // Calcola la prossima priority unica per la categoria
    const priority = await getNextPriorityForCategory(ctx, args.categoryId)
    const weight = args.weight ?? 1
    if (!Number.isFinite(weight) || weight < 1 || weight > 10) {
      throw new Error('Il peso deve essere un numero tra 1 e 10')
    }

    const coreAppId = await ctx.db.insert('coreApps', {
      name: args.name,
      slug,
      description: args.description,
      percentComplete: 0,
      weight: Math.floor(weight),
      repoUrl: args.repoUrl,
      status: 'Planning',
      ownerId: args.ownerId,
      businessRefId: args.businessRefId,
      categoryId: args.categoryId,
      priority
    })

    // Applica i template milestones: ogni nuova CoreApp parte con il set predefinito
    const templates = await ctx.db
      .query('coreAppMilestoneTemplates')
      .withIndex('by_order')
      .collect()
    for (const t of templates) {
      await ctx.db.insert('coreAppMilestones', {
        coreAppId,
        description: t.description,
        valuePercent: t.valuePercent,
        completed: false,
        order: t.order
      })
    }

    return coreAppId
  }
})

/**
 * Aggiorna una Core App.
 */
export const update = mutation({
  args: {
    id: v.id('coreApps'),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    percentComplete: v.optional(v.number()),
    repoUrl: v.optional(v.string()),
    hubMilestonesUrl: v.optional(v.string()),
    status: v.optional(coreAppStatusValidator),
    ownerId: v.optional(v.id('users')),
    businessRefId: v.optional(v.id('users')),
    categoryId: v.optional(v.id('coreAppsCategories')),
    weight: v.optional(v.number()),
    priority: v.optional(v.number()) // Ricalcolata automaticamente quando si cambia categoria
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...updates } = args
    const current = await ctx.db.get(id)
    if (!current) return null

    // Se si sta aggiornando la categoria, verifica che esista e assegna la nuova priority
    if (updates.categoryId !== undefined && updates.categoryId !== current.categoryId) {
      const category = await ctx.db.get(updates.categoryId)
      if (!category) {
        throw new Error('Categoria non trovata')
      }
      updates.priority = await getNextPriorityForCategory(ctx, updates.categoryId)
    }

    // Se si sta aggiornando lo slug, verifica che sia unico
    if (updates.slug) {
      const existing = await ctx.db
        .query('coreApps')
        .withIndex('by_slug', (q) => q.eq('slug', updates.slug!))
        .first()

      if (existing && existing._id !== id) {
        throw new Error(`Slug "${updates.slug}" già in uso`)
      }
    }

    // Se si sta aggiornando l'owner, verifica che esista
    if (updates.ownerId) {
      const owner = await ctx.db.get(updates.ownerId)
      if (!owner) {
        throw new Error('Owner non trovato')
      }
    }

    // Se si sta aggiornando il referente business, verifica che esista
    if (updates.businessRefId !== undefined && updates.businessRefId !== null) {
      const businessRef = await ctx.db.get(updates.businessRefId)
      if (!businessRef) {
        throw new Error('Referente business non trovato')
      }
    }

    if (updates.weight !== undefined) {
      if (!Number.isFinite(updates.weight) || updates.weight < 1 || updates.weight > 10) {
        throw new Error('Il peso deve essere un numero tra 1 e 10')
      }
      updates.weight = Math.floor(updates.weight)
    }

    await ctx.db.patch(id, updates)
    return null
  }
})

/**
 * Imposta la priority di una Core App.
 * Se la priority target è già occupata da un'altra app nella stessa categoria, effettua uno swap.
 */
export const setPriority = mutation({
  args: {
    id: v.id('coreApps'),
    priority: v.number()
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const current = await ctx.db.get(args.id)
    if (!current) return null

    if (args.priority < 0) {
      throw new Error('La priority deve essere >= 0')
    }

    const categoryId = current.categoryId ?? undefined

    // Trova l'app che ha già questa priority nella stessa categoria
    const appsInCategory = await ctx.db
      .query('coreApps')
      .withIndex('by_category', (q) => q.eq('categoryId', categoryId))
      .collect()

    const otherWithSamePriority = appsInCategory.find(
      (app) => app._id !== args.id && app.priority === args.priority
    )

    const currentPriority = current.priority ?? -1

    if (otherWithSamePriority) {
      // Swap: questa app prende la priority target, l'altra prende la nostra
      await ctx.db.patch(args.id, { priority: args.priority })
      await ctx.db.patch(otherWithSamePriority._id, { priority: currentPriority })
    } else {
      // Nessun conflitto: imposta direttamente
      await ctx.db.patch(args.id, { priority: args.priority })
    }

    return null
  }
})

/**
 * Elimina una Core App.
 */
export const remove = mutation({
  args: { id: v.id('coreApps') },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Elimina anche tutti gli aggiornamenti e le milestone associate
    const updates = await ctx.db
      .query('coreAppUpdates')
      .withIndex('by_coreApp', (q) => q.eq('coreAppId', args.id))
      .collect()

    for (const update of updates) {
      await ctx.db.delete(update._id)
    }

    const milestones = await ctx.db
      .query('coreAppMilestones')
      .withIndex('by_coreApp', (q) => q.eq('coreAppId', args.id))
      .collect()

    for (const milestone of milestones) {
      await ctx.db.delete(milestone._id)
    }

    await ctx.db.delete(args.id)
    return null
  }
})
