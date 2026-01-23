import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

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

    // Crea un nuovo utente
    const userId = await ctx.db.insert('users', {
      sub: identity.subject,
      name: identity.name ?? '',
      email: identity.email,
      picture: identity.pictureUrl
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
      sub: v.string()
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
