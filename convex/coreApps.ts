import { query, mutation } from './_generated/server'
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
  repoUrl: v.optional(v.string()),
  hubMilestonesUrl: v.optional(v.string()),
  status: coreAppStatusValidator,
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
 * Crea una nuova Core App.
 */
export const create = mutation({
  args: {
    name: v.string(),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    repoUrl: v.optional(v.string())
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

    return await ctx.db.insert('coreApps', {
      name: args.name,
      slug,
      description: args.description,
      percentComplete: 0,
      repoUrl: args.repoUrl,
      status: 'Planning'
    })
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
    status: v.optional(coreAppStatusValidator)
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...updates } = args

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

    await ctx.db.patch(id, updates)
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
    // Elimina anche tutti gli aggiornamenti associati
    const updates = await ctx.db
      .query('coreAppUpdates')
      .withIndex('by_coreApp', (q) => q.eq('coreAppId', args.id))
      .collect()

    for (const update of updates) {
      await ctx.db.delete(update._id)
    }

    await ctx.db.delete(args.id)
    return null
  }
})
