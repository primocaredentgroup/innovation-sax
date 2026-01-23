import { mutation, internalMutation, internalQuery } from './_generated/server'
import { v } from 'convex/values'

/**
 * Salva le credenziali GitHub per l'utente corrente.
 */
export const saveGitHubCredentials = internalMutation({
  args: {
    accessToken: v.string(),
    githubLogin: v.string()
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

    await ctx.db.patch(user._id, {
      githubAccessToken: args.accessToken,
      githubLogin: args.githubLogin
    })

    return null
  }
})

/**
 * Crea un repository mockup per un KeyDev.
 * Usa il template react-ts di Vite.
 */
export const createMockupRepo = mutation({
  args: {
    keyDevId: v.id('keydevs')
  },
  returns: v.object({
    success: v.boolean(),
    repoUrl: v.optional(v.string()),
    error: v.optional(v.string())
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return { success: false, error: 'Non autenticato' }
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_sub', (q) => q.eq('sub', identity.subject))
      .first()

    if (!user) {
      return { success: false, error: 'Utente non trovato' }
    }

    if (!user.githubAccessToken || !user.githubLogin) {
      return { success: false, error: 'GitHub non connesso. Vai nel profilo per connettere il tuo account GitHub.' }
    }

    const keydev = await ctx.db.get(args.keyDevId)
    if (!keydev) {
      return { success: false, error: 'KeyDev non trovato' }
    }

    // Genera il nome del repo
    // Estrai il numero del keydev dall'ID (ultimi 4 caratteri)
    const keydevNumber = keydev._id.slice(-4)
    const repoName = `mockup-keydev${keydevNumber}`

    // Per ora, simuliamo la creazione del repo
    // In produzione, questo chiamerebbe l'API GitHub tramite un'action
    const repoUrl = `https://github.com/${user.githubLogin}/${repoName}`

    // Aggiorna il KeyDev con l'URL del repo
    await ctx.db.patch(args.keyDevId, {
      mockupRepoUrl: repoUrl
    })

    return { success: true, repoUrl }
  }
})

/**
 * Query interna per ottenere un KeyDev nelle actions.
 */
export const getKeyDevForAction = internalQuery({
  args: { keyDevId: v.id('keydevs') },
  returns: v.union(
    v.object({
      _id: v.id('keydevs'),
      mockupRepoUrl: v.optional(v.string()),
      prNumber: v.optional(v.number()),
      prMerged: v.optional(v.boolean())
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const keydev = await ctx.db.get(args.keyDevId)
    if (!keydev) return null
    return {
      _id: keydev._id,
      mockupRepoUrl: keydev.mockupRepoUrl,
      prNumber: keydev.prNumber,
      prMerged: keydev.prMerged
    }
  }
})

/**
 * Marca una PR come merged.
 */
export const markPRMerged = internalMutation({
  args: { keyDevId: v.id('keydevs') },
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

    const userRoles = user.roles || []
    if (!userRoles.includes('BusinessValidator') && !userRoles.includes('Admin')) {
      throw new Error('Solo BusinessValidator o Admin possono fare il merge')
    }

    await ctx.db.patch(args.keyDevId, {
      prMerged: true,
      status: 'Approved',
      approvedAt: Date.now(),
      techValidatorId: user._id,
      mockupTag: 'v0.9.0-business'
    })

    return null
  }
})
