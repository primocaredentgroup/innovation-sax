import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { noteTypeValidator } from './schema'
import { internal } from './_generated/api'

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

    // Verifica che il keydev esista
    const keydev = await ctx.db.get(args.keyDevId)
    if (!keydev) {
      throw new Error('KeyDev non trovato')
    }

    const noteId = await ctx.db.insert('notes', {
      keyDevId: args.keyDevId,
      authorId: user._id,
      body: args.body,
      ts: Date.now(),
      type: args.type,
      mentionedUserIds: args.mentionedUserIds
    })

    // Incrementa il contatore delle note
    await ctx.db.patch(args.keyDevId, {
      notesCount: (keydev.notesCount || 0) + 1
    })

    // Invia email di notifica a tutti gli utenti menzionati
    if (args.mentionedUserIds && args.mentionedUserIds.length > 0) {
      console.log(`[notes.create] Trovati ${args.mentionedUserIds.length} utenti menzionati`)
      for (const mentionedUserId of args.mentionedUserIds) {
        // Verifica che l'utente menzionato abbia un'email prima di programmare l'invio
        const mentionedUser = await ctx.db.get(mentionedUserId)
        if (mentionedUser?.email) {
          console.log(`[notes.create] Programmando invio email a ${mentionedUser.email} per nota ${noteId}`)
          // Programma l'invio email in modo asincrono
          await ctx.scheduler.runAfter(0, internal.emails.sendMentionNotification, {
            noteId,
            mentionedUserId,
            keyDevId: args.keyDevId,
          })
        } else {
          console.log(`[notes.create] Utente ${mentionedUserId} non ha email, skip invio`)
        }
      }
    }

    return noteId
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

    // Salva i mentionedUserIds precedenti per confronto
    const previousMentionedUserIds = note.mentionedUserIds || []
    const newMentionedUserIds = args.mentionedUserIds || []

    await ctx.db.patch(args.id, {
      body: args.body,
      type: args.type,
      mentionedUserIds: args.mentionedUserIds,
      ts: Date.now() // Aggiorna il timestamp
    })

    // Invia email solo ai nuovi utenti menzionati (non presenti nella versione precedente)
    if (newMentionedUserIds.length > 0) {
      const newMentions = newMentionedUserIds.filter(
        (userId) => !previousMentionedUserIds.includes(userId)
      )

      for (const mentionedUserId of newMentions) {
        // Verifica che l'utente menzionato abbia un'email prima di programmare l'invio
        const mentionedUser = await ctx.db.get(mentionedUserId)
        if (mentionedUser?.email) {
          // Programma l'invio email in modo asincrono
          await ctx.scheduler.runAfter(0, internal.emails.sendMentionNotification, {
            noteId: args.id,
            mentionedUserId,
            keyDevId: note.keyDevId,
          })
        }
      }
    }

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

    // Ottieni il keydev per aggiornare il contatore
    const keydev = await ctx.db.get(note.keyDevId)
    if (!keydev) {
      throw new Error('KeyDev non trovato')
    }

    // Elimina la nota
    await ctx.db.delete(args.id)

    // Decrementa il contatore delle note (non scendere sotto 0)
    await ctx.db.patch(note.keyDevId, {
      notesCount: Math.max(0, (keydev.notesCount || 0) - 1)
    })

    return null
  }
})
