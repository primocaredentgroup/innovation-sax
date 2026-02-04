import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

const coreAppsCategoryReturnValidator = v.object({
  _id: v.id('coreAppsCategories'),
  _creationTime: v.number(),
  name: v.string(),
  slug: v.string(),
  description: v.optional(v.string()),
  subscriberIds: v.optional(v.array(v.id('users')))
})

/**
 * Lista tutte le categorie di Core Apps.
 */
export const list = query({
  args: {},
  returns: v.array(coreAppsCategoryReturnValidator),
  handler: async (ctx) => {
    return await ctx.db.query('coreAppsCategories').collect()
  }
})

/**
 * Ottiene una categoria per ID.
 */
export const getById = query({
  args: { id: v.id('coreAppsCategories') },
  returns: v.union(coreAppsCategoryReturnValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  }
})

/**
 * Ottiene una categoria per slug.
 */
export const getBySlug = query({
  args: { slug: v.string() },
  returns: v.union(coreAppsCategoryReturnValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('coreAppsCategories')
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
 * Crea una nuova categoria di Core Apps.
 */
export const create = mutation({
  args: {
    name: v.string(),
    slug: v.optional(v.string()),
    description: v.optional(v.string())
  },
  returns: v.id('coreAppsCategories'),
  handler: async (ctx, args) => {
    const slug = args.slug || generateSlug(args.name)

    // Verifica che lo slug sia unico
    const existing = await ctx.db
      .query('coreAppsCategories')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .first()

    if (existing) {
      throw new Error(`Slug "${slug}" già in uso`)
    }

    return await ctx.db.insert('coreAppsCategories', {
      name: args.name,
      slug,
      description: args.description,
      subscriberIds: []
    })
  }
})

/**
 * Aggiorna una categoria di Core Apps.
 */
export const update = mutation({
  args: {
    id: v.id('coreAppsCategories'),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.string())
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...updates } = args

    // Se si sta aggiornando lo slug, verifica che sia unico
    if (updates.slug) {
      const existing = await ctx.db
        .query('coreAppsCategories')
        .withIndex('by_slug', (q) => q.eq('slug', updates.slug!))
        .first()

      if (existing && existing._id !== id) {
        throw new Error(`Slug "${updates.slug}" già in uso`)
      }
    }

    // Filtra solo i campi definiti
    const filteredUpdates: {
      name?: string
      slug?: string
      description?: string
    } = {}

    if (updates.name !== undefined) {
      filteredUpdates.name = updates.name
    }
    if (updates.slug !== undefined) {
      filteredUpdates.slug = updates.slug
    }
    if (updates.description !== undefined) {
      filteredUpdates.description = updates.description
    }

    await ctx.db.patch(id, filteredUpdates)
    return null
  }
})

/**
 * Elimina una categoria di Core Apps.
 * Nota: le CoreApps associate perderanno il riferimento alla categoria.
 */
export const remove = mutation({
  args: { id: v.id('coreAppsCategories') },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Rimuovi il riferimento alla categoria dalle CoreApps associate
    const coreApps = await ctx.db
      .query('coreApps')
      .withIndex('by_category', (q) => q.eq('categoryId', args.id))
      .collect()

    for (const coreApp of coreApps) {
      await ctx.db.patch(coreApp._id, { categoryId: undefined })
    }

    await ctx.db.delete(args.id)
    return null
  }
})

/**
 * Aggiunge un subscriber alla categoria.
 */
export const addSubscriber = mutation({
  args: {
    id: v.id('coreAppsCategories'),
    userId: v.id('users')
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.id)
    if (!category) {
      throw new Error('Categoria non trovata')
    }

    const user = await ctx.db.get(args.userId)
    if (!user) {
      throw new Error('Utente non trovato')
    }

    // Inizializza subscriberIds se non esiste
    const currentSubscribers = category.subscriberIds || []

    // Verifica che l'utente non sia già iscritto
    if (currentSubscribers.includes(args.userId)) {
      return null // Già iscritto, non fare nulla
    }

    await ctx.db.patch(args.id, {
      subscriberIds: [...currentSubscribers, args.userId]
    })
    return null
  }
})

/**
 * Rimuove un subscriber dalla categoria.
 */
export const removeSubscriber = mutation({
  args: {
    id: v.id('coreAppsCategories'),
    userId: v.id('users')
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.id)
    if (!category) {
      throw new Error('Categoria non trovata')
    }

    const currentSubscribers = category.subscriberIds || []
    await ctx.db.patch(args.id, {
      subscriberIds: currentSubscribers.filter((id) => id !== args.userId)
    })
    return null
  }
})
