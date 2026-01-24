import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { isAdmin } from './users'

/**
 * Lista tutte le penalità per un KeyDev.
 */
export const listByKeyDev = query({
  args: {
    keyDevId: v.id('keydevs')
  },
  returns: v.array(
    v.object({
      _id: v.id('penalties'),
      _creationTime: v.number(),
      keyDevId: v.id('keydevs'),
      weight: v.number(),
      description: v.optional(v.string()),
      createdById: v.id('users'),
      createdAt: v.number()
    })
  ),
  handler: async (ctx, args) => {
    const penalties = await ctx.db
      .query('penalties')
      .withIndex('by_keydev', (q) => q.eq('keyDevId', args.keyDevId))
      .collect()
    
    return penalties
  }
})

/**
 * Crea una nuova penalità per un KeyDev (solo admin).
 */
export const create = mutation({
  args: {
    keyDevId: v.id('keydevs'),
    weight: v.number(),
    description: v.optional(v.string())
  },
  returns: v.id('penalties'),
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

    const userRoles = user.roles as Array<'Requester' | 'BusinessValidator' | 'TechValidator' | 'Admin'> | undefined
    if (!isAdmin(userRoles)) {
      throw new Error('Solo gli admin possono creare penalità')
    }

    // Verifica che il KeyDev esista
    const keydev = await ctx.db.get(args.keyDevId)
    if (!keydev) {
      throw new Error('KeyDev non trovato')
    }

    // Valida il weight (deve essere tra 0 e 1)
    if (args.weight < 0 || args.weight > 1) {
      throw new Error('Il peso della penalità deve essere tra 0 e 1')
    }

    // Valida che il peso sia un multiplo di 0.10 (opzionale, ma meglio controllare)
    const roundedWeight = Math.round(args.weight * 100) / 100
    if (Math.abs(args.weight - roundedWeight) > 0.001) {
      throw new Error('Il peso della penalità deve essere un valore con massimo 2 decimali (es. 0.10, 0.20, ecc.)')
    }

    const penaltyId = await ctx.db.insert('penalties', {
      keyDevId: args.keyDevId,
      weight: args.weight,
      description: args.description,
      createdById: user._id,
      createdAt: Date.now()
    })

    return penaltyId
  }
})

/**
 * Rimuove una penalità (solo admin).
 */
export const remove = mutation({
  args: {
    id: v.id('penalties')
  },
  returns: v.null(),
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

    const userRoles = user.roles as Array<'Requester' | 'BusinessValidator' | 'TechValidator' | 'Admin'> | undefined
    if (!isAdmin(userRoles)) {
      throw new Error('Solo gli admin possono rimuovere penalità')
    }

    await ctx.db.delete(args.id)
    return null
  }
})
