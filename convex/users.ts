import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { roleValidator } from './schema'

/**
 * Ottiene o crea l'utente corrente basato sull'identità Auth0.
 * Questa funzione dovrebbe essere chiamata dopo il login per assicurarsi
 * che l'utente sia salvato nel database.
 */
export const getOrCreateUser = mutation({
  args: {},
  returns: v.union(v.id('users'), v.null()),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return null
    }

    // Cerca se l'utente esiste già
    const existingUser = await ctx.db
      .query('users')
      .withIndex('by_sub', (q) => q.eq('sub', identity.subject))
      .first()

    if (existingUser) {
      // Aggiorna le informazioni se necessario
      await ctx.db.patch(existingUser._id, {
        name: identity.name ?? existingUser.name,
        email: identity.email ?? existingUser.email,
        picture: identity.pictureUrl ?? existingUser.picture
      })
      return existingUser._id
    }

    // Crea un nuovo utente con ruolo default Requester
    const userId = await ctx.db.insert('users', {
      sub: identity.subject,
      name: identity.name ?? '',
      email: identity.email,
      picture: identity.pictureUrl,
      role: 'Requester'
    })

    return userId
  }
})

/**
 * Ottiene l'utente corrente dal database.
 */
export const getCurrentUser = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id('users'),
      _creationTime: v.number(),
      name: v.string(),
      email: v.optional(v.string()),
      picture: v.optional(v.string()),
      sub: v.string(),
      role: v.optional(roleValidator),
      deptId: v.optional(v.id('departments')),
      githubLogin: v.optional(v.string()),
      githubAccessToken: v.optional(v.string())
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return null
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_sub', (q) => q.eq('sub', identity.subject))
      .first()

    return user ?? null
  }
})

/**
 * Aggiorna il ruolo di un utente (solo Admin può farlo).
 */
export const updateUserRole = mutation({
  args: {
    userId: v.id('users'),
    role: roleValidator
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Non autenticato')
    }

    // Verifica che l'utente corrente sia Admin
    const currentUser = await ctx.db
      .query('users')
      .withIndex('by_sub', (q) => q.eq('sub', identity.subject))
      .first()

    if (!currentUser || currentUser.role !== 'Admin') {
      throw new Error('Solo gli Admin possono modificare i ruoli')
    }

    await ctx.db.patch(args.userId, { role: args.role })
    return null
  }
})

/**
 * Aggiorna il dipartimento di un utente.
 */
export const updateUserDepartment = mutation({
  args: {
    userId: v.id('users'),
    deptId: v.id('departments')
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Non autenticato')
    }

    // Verifica che l'utente corrente sia Admin
    const currentUser = await ctx.db
      .query('users')
      .withIndex('by_sub', (q) => q.eq('sub', identity.subject))
      .first()

    if (!currentUser || currentUser.role !== 'Admin') {
      throw new Error('Solo gli Admin possono modificare i dipartimenti')
    }

    // Verifica che il dipartimento esista
    const dept = await ctx.db.get(args.deptId)
    if (!dept) {
      throw new Error('Dipartimento non trovato')
    }

    await ctx.db.patch(args.userId, { deptId: args.deptId })
    return null
  }
})

/**
 * Lista tutti gli utenti (per admin).
 */
export const listUsers = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('users'),
      _creationTime: v.number(),
      name: v.string(),
      email: v.optional(v.string()),
      picture: v.optional(v.string()),
      sub: v.string(),
      role: v.optional(roleValidator),
      deptId: v.optional(v.id('departments')),
      githubLogin: v.optional(v.string()),
      githubAccessToken: v.optional(v.string())
    })
  ),
  handler: async (ctx) => {
    const users = await ctx.db.query('users').collect()
    return users
  }
})
