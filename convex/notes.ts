import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { noteTypeValidator } from './schema'

const noteReturnValidator = v.object({
  _id: v.id('notes'),
  _creationTime: v.number(),
  keyDevId: v.id('keydevs'),
  authorId: v.id('users'),
  body: v.string(),
  ts: v.number(),
  type: noteTypeValidator,
  mentionedUserIds: v.optional(v.array(v.id('users')))
})

/**
 * Lista le note di un KeyDev.
 */
export const listByKeyDev = query({
  args: { keyDevId: v.id('keydevs') },
  returns: v.array(noteReturnValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('notes')
      .withIndex('by_keydev', (q) => q.eq('keyDevId', args.keyDevId))
      .order('desc')
      .collect()
  }
})

/**
 * Crea una nuova nota.
 */
export const create = mutation({
  args: {
    keyDevId: v.id('keydevs'),
    body: v.string(),
    type: noteTypeValidator,
    mentionedUserIds: v.optional(v.array(v.id('users')))
  },
  returns: v.id('notes'),
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

    // Validazione: se type è 'Mention', mentionedUserIds deve essere presente e non vuoto
    if (args.type === 'Mention' && (!args.mentionedUserIds || args.mentionedUserIds.length === 0)) {
      throw new Error('mentionedUserIds è obbligatorio e non può essere vuoto per le note di tipo Mention')
    }

    // Validazione: se type è 'Comment', mentionedUserIds non deve essere presente
    if (args.type === 'Comment' && args.mentionedUserIds && args.mentionedUserIds.length > 0) {
      throw new Error('mentionedUserIds non può essere presente per le note di tipo Comment')
    }

    return await ctx.db.insert('notes', {
      keyDevId: args.keyDevId,
      authorId: user._id,
      body: args.body,
      ts: Date.now(),
      type: args.type,
      mentionedUserIds: args.mentionedUserIds
    })
  }
})

/**
 * Aggiorna una nota.
 */
export const update = mutation({
  args: {
    id: v.id('notes'),
    body: v.string(),
    type: noteTypeValidator,
    mentionedUserIds: v.optional(v.array(v.id('users')))
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Non autenticato')
    }

    const note = await ctx.db.get(args.id)
    if (!note) {
      throw new Error('Nota non trovata')
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_sub', (q) => q.eq('sub', identity.subject))
      .first()

    if (!user) {
      throw new Error('Utente non trovato')
    }

    // Solo l'autore o un admin può modificare
    const userRoles = user.roles || []
    if (note.authorId !== user._id && !userRoles.includes('Admin')) {
      throw new Error('Non autorizzato a modificare questa nota')
    }

    // Validazione: se type è 'Mention', mentionedUserIds deve essere presente e non vuoto
    if (args.type === 'Mention' && (!args.mentionedUserIds || args.mentionedUserIds.length === 0)) {
      throw new Error('mentionedUserIds è obbligatorio e non può essere vuoto per le note di tipo Mention')
    }

    // Validazione: se type è 'Comment', mentionedUserIds non deve essere presente
    if (args.type === 'Comment' && args.mentionedUserIds && args.mentionedUserIds.length > 0) {
      throw new Error('mentionedUserIds non può essere presente per le note di tipo Comment')
    }

    await ctx.db.patch(args.id, {
      body: args.body,
      type: args.type,
      mentionedUserIds: args.mentionedUserIds,
      ts: Date.now() // Aggiorna il timestamp
    })
    return null
  }
})

/**
 * Elimina una nota.
 */
export const remove = mutation({
  args: { id: v.id('notes') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Non autenticato')
    }

    const note = await ctx.db.get(args.id)
    if (!note) {
      throw new Error('Nota non trovata')
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_sub', (q) => q.eq('sub', identity.subject))
      .first()

    if (!user) {
      throw new Error('Utente non trovato')
    }

    // Solo l'autore o un admin può eliminare
    const userRoles = user.roles || []
    if (note.authorId !== user._id && !userRoles.includes('Admin')) {
      throw new Error('Non autorizzato a eliminare questa nota')
    }

    await ctx.db.delete(args.id)
    return null
  }
})
