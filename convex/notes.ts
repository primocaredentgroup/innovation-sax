import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { noteTypeValidator } from './schema'
import { internal } from './_generated/api'

const noteReturnValidator = v.object({
  _id: v.id('notes'),
  _creationTime: v.number(),
  keyDevId: v.optional(v.id('keydevs')),
  coreAppId: v.optional(v.id('coreApps')),
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
 * Lista le note di una CoreApp.
 */
export const listByCoreApp = query({
  args: { coreAppId: v.id('coreApps') },
  returns: v.array(noteReturnValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('notes')
      .withIndex('by_coreApp', (q) => q.eq('coreAppId', args.coreAppId))
      .order('desc')
      .collect()
  }
})

/**
 * Crea una nuova nota.
 * Può essere collegata a un KeyDev o a una CoreApp (almeno uno dei due obbligatorio).
 */
export const create = mutation({
  args: {
    keyDevId: v.optional(v.id('keydevs')),
    coreAppId: v.optional(v.id('coreApps')),
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

    // Validazione: almeno uno tra keyDevId e coreAppId deve essere presente
    if (!args.keyDevId && !args.coreAppId) {
      throw new Error('Devi specificare keyDevId o coreAppId')
    }

    // Validazione: non possono essere entrambi presenti
    if (args.keyDevId && args.coreAppId) {
      throw new Error('Non puoi specificare sia keyDevId che coreAppId')
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

    // Se la nota è collegata a un KeyDev
    if (args.keyDevId) {
      const keydev = await ctx.db.get(args.keyDevId)
      if (!keydev) {
        throw new Error('KeyDev non trovato')
      }
      if (keydev.deletedAt) {
        throw new Error('Non è possibile aggiungere note a un KeyDev eliminato')
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
          const mentionedUser = await ctx.db.get(mentionedUserId)
          if (mentionedUser?.email) {
            console.log(`[notes.create] Programmando invio email a ${mentionedUser.email} per nota ${noteId}`)
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

    // Se la nota è collegata a una CoreApp
    if (args.coreAppId) {
      const coreApp = await ctx.db.get(args.coreAppId)
      if (!coreApp) {
        throw new Error('CoreApp non trovata')
      }

      const noteId = await ctx.db.insert('notes', {
        coreAppId: args.coreAppId,
        authorId: user._id,
        body: args.body,
        ts: Date.now(),
        type: args.type,
        mentionedUserIds: args.mentionedUserIds
      })

      // Incrementa il contatore delle note sulla CoreApp
      await ctx.db.patch(args.coreAppId, {
        notesCount: (coreApp.notesCount || 0) + 1
      })

      // Per ora le email di menzione per CoreApps non sono supportate
      // (potrebbe essere aggiunto in futuro se necessario)

      return noteId
    }

    throw new Error('Errore interno: nessuna entità associata alla nota')
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
    // Solo per note collegate a KeyDev (per ora le email per CoreApps non sono supportate)
    if (newMentionedUserIds.length > 0 && note.keyDevId) {
      const newMentions = newMentionedUserIds.filter(
        (userId) => !previousMentionedUserIds.includes(userId)
      )

      for (const mentionedUserId of newMentions) {
        const mentionedUser = await ctx.db.get(mentionedUserId)
        if (mentionedUser?.email) {
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

    // Elimina la nota
    await ctx.db.delete(args.id)

    // Decrementa il contatore delle note sull'entità collegata
    if (note.keyDevId) {
      const keydev = await ctx.db.get(note.keyDevId)
      if (keydev) {
        await ctx.db.patch(note.keyDevId, {
          notesCount: Math.max(0, (keydev.notesCount || 0) - 1)
        })
      }
    } else if (note.coreAppId) {
      const coreApp = await ctx.db.get(note.coreAppId)
      if (coreApp) {
        await ctx.db.patch(note.coreAppId, {
          notesCount: Math.max(0, (coreApp.notesCount || 0) - 1)
        })
      }
    }

    return null
  }
})
