import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import {
  keyDevQuestionAnswerRecipientRoleValidator,
  keyDevQuestionSourceValidator,
  keydevStatusValidator,
  keydevWeightValidator
} from './schema'
import { hasRole, isAdmin } from './users'
import { internal } from './_generated/api'

type Role = 'Requester' | 'BusinessValidator' | 'TechValidator' | 'Admin'

const keyDevQuestionValidator = v.object({
  _id: v.id('keyDevQuestions'),
  _creationTime: v.number(),
  keyDevId: v.id('keydevs'),
  text: v.string(),
  createdById: v.id('users'),
  createdAt: v.number(),
  order: v.number(),
  source: keyDevQuestionSourceValidator,
  validatedAnswerId: v.optional(v.id('keyDevQuestionAnswers')),
  validatedAnswer: v.optional(
    v.object({
      _id: v.id('keyDevQuestionAnswers'),
      _creationTime: v.number(),
      questionId: v.id('keyDevQuestions'),
      body: v.string(),
      senderId: v.id('users'),
      recipientRole: keyDevQuestionAnswerRecipientRoleValidator,
      mentionedUserIds: v.optional(v.array(v.id('users'))),
      ts: v.number()
    })
  )
})

const keyDevQuestionAnswerValidator = v.object({
  _id: v.id('keyDevQuestionAnswers'),
  _creationTime: v.number(),
  questionId: v.id('keyDevQuestions'),
  body: v.string(),
  senderId: v.id('users'),
  recipientRole: keyDevQuestionAnswerRecipientRoleValidator,
  mentionedUserIds: v.optional(v.array(v.id('users'))),
  ts: v.number()
})

async function getCurrentUserOrThrow(ctx: unknown) {
  const convexCtx = ctx as {
    auth: { getUserIdentity: () => Promise<{ subject: string } | null> }
    db: {
      query: (table: 'users') => {
        withIndex: (
          indexName: 'by_sub',
          indexRange: (q: { eq: (field: 'sub', value: string) => unknown }) => unknown
        ) => { first: () => Promise<Doc<'users'> | null> }
      }
    }
  }

  const identity = await convexCtx.auth.getUserIdentity()
  if (!identity) throw new Error('Non autenticato')

  const user = await convexCtx.db
    .query('users')
    .withIndex('by_sub', (q) => q.eq('sub', identity.subject))
    .first()

  if (!user) throw new Error('Utente non trovato')
  return user
}

async function recomputeKeyDevStatusFromQuestions(
  ctx: unknown,
  keyDevId: Id<'keydevs'>
) {
  const convexCtx = ctx as {
    db: {
      get: (id: Id<'keydevs'> | Id<'keyDevQuestionAnswers'>) => Promise<Doc<'keydevs'> | Doc<'keyDevQuestionAnswers'> | null>
      query: (table: 'keyDevQuestions') => {
        withIndex: (
          indexName: 'by_keyDev',
          indexRange: (q: { eq: (field: 'keyDevId', value: Id<'keydevs'>) => unknown }) => unknown
        ) => { collect: () => Promise<Array<Doc<'keyDevQuestions'>>> }
      }
      patch: (id: Id<'keydevs'>, value: Partial<Doc<'keydevs'>>) => Promise<void>
      replace: (id: Id<'keydevs'>, value: Omit<Doc<'keydevs'>, '_id' | '_creationTime'>) => Promise<void>
    }
  }

  const keydevDoc = await convexCtx.db.get(keyDevId)
  const keydev = keydevDoc as Doc<'keydevs'> | null
  if (!keydev) throw new Error('KeyDev non trovato')

  const questions = await convexCtx.db
    .query('keyDevQuestions')
    .withIndex('by_keyDev', (q) => q.eq('keyDevId', keyDevId))
    .collect()

  if (questions.length === 0) return

  const allValidated = questions.every((question) => question.validatedAnswerId !== undefined)
  const nextStatus: Doc<'keydevs'>['status'] = allValidated ? 'Approved' : 'Rejected'

  if (keydev.status === nextStatus) return

  if (nextStatus === 'Rejected') {
    await convexCtx.db.patch(keyDevId, { status: 'Rejected' })
    return
  }

  // Per passaggio a Approved puliamo eventuali campi rejection storici.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _id: _unusedId, _creationTime: _unusedCreationTime, rejectionReason: _unusedRejectionReason, rejectedById: _unusedRejectedById, ...docWithoutSystemFields } = keydev
  await convexCtx.db.replace(keyDevId, {
    ...docWithoutSystemFields,
    status: 'Approved'
  })
}

/**
 * Avvia il flusso questions su MockupDone:
 * - richiede owner già assegnato
 * - crea domande da template attivi (solo se non presenti)
 * - imposta stato Rejected finché non tutte validate
 */
export const startQuestions = mutation({
  args: {
    keyDevId: v.id('keydevs'),
    weight: v.optional(keydevWeightValidator)
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx)
    const userRoles = user.roles as Role[] | undefined
    if (!isAdmin(userRoles) && !hasRole(userRoles, 'TechValidator')) {
      throw new Error('Solo Admin o TechValidator possono avviare le questions')
    }

    const keydev = await ctx.db.get(args.keyDevId)
    if (!keydev) throw new Error('KeyDev non trovato')
    if (keydev.status !== 'MockupDone' && keydev.status !== 'Rejected' && keydev.status !== 'Approved') {
      throw new Error('Le questions possono essere avviate solo da Mockup Terminato')
    }
    if (!keydev.ownerId) {
      throw new Error('Devi assegnare un Owner prima di avviare le questions')
    }

    if (args.weight !== undefined) {
      await ctx.db.patch(args.keyDevId, { weight: args.weight })
    }

    const existingQuestions = await ctx.db
      .query('keyDevQuestions')
      .withIndex('by_keyDev', (q) => q.eq('keyDevId', args.keyDevId))
      .collect()

    if (existingQuestions.length === 0) {
      const templates = await ctx.db
        .query('keyDevQuestionTemplates')
        .withIndex('by_active_and_order', (q) => q.eq('active', true))
        .collect()

      if (templates.length === 0) {
        throw new Error('Non ci sono template domande attivi configurati in Amministrazione')
      }

      for (let index = 0; index < templates.length; index++) {
        const template = templates[index]
        await ctx.db.insert('keyDevQuestions', {
          keyDevId: args.keyDevId,
          text: template.text,
          createdById: user._id,
          createdAt: Date.now(),
          order: index + 1,
          source: 'Template'
        })
      }
    }

    await recomputeKeyDevStatusFromQuestions(ctx, args.keyDevId)
    return null
  }
})

/**
 * Lista domande per KeyDev con eventuale risposta validata inline.
 */
export const listByKeyDev = query({
  args: { keyDevId: v.id('keydevs') },
  returns: v.array(keyDevQuestionValidator),
  handler: async (ctx, args) => {
    const questions = await ctx.db
      .query('keyDevQuestions')
      .withIndex('by_keyDev_and_order', (q) => q.eq('keyDevId', args.keyDevId))
      .collect()

    const result: Array<{
      _id: Id<'keyDevQuestions'>
      _creationTime: number
      keyDevId: Id<'keydevs'>
      text: string
      createdById: Id<'users'>
      createdAt: number
      order: number
      source: 'Template' | 'Manual'
      validatedAnswerId?: Id<'keyDevQuestionAnswers'>
      validatedAnswer?: {
        _id: Id<'keyDevQuestionAnswers'>
        _creationTime: number
        questionId: Id<'keyDevQuestions'>
        body: string
        senderId: Id<'users'>
        recipientRole: 'owner' | 'requester'
        mentionedUserIds?: Array<Id<'users'>>
        ts: number
      }
    }> = []

    for (const question of questions) {
      let validatedAnswer: Doc<'keyDevQuestionAnswers'> | null = null
      if (question.validatedAnswerId) {
        validatedAnswer = await ctx.db.get(question.validatedAnswerId)
      }
      result.push({
        ...question,
        validatedAnswer: validatedAnswer || undefined
      })
    }
    return result
  }
})

/**
 * Crea una nuova domanda manuale (tutti gli utenti autenticati).
 */
export const createQuestion = mutation({
  args: {
    keyDevId: v.id('keydevs'),
    text: v.string()
  },
  returns: v.id('keyDevQuestions'),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx)
    const keydev = await ctx.db.get(args.keyDevId)
    if (!keydev) throw new Error('KeyDev non trovato')

    const questions = await ctx.db
      .query('keyDevQuestions')
      .withIndex('by_keyDev', (q) => q.eq('keyDevId', args.keyDevId))
      .collect()

    const maxOrder = questions.reduce((acc, item) => Math.max(acc, item.order), 0)

    const questionId = await ctx.db.insert('keyDevQuestions', {
      keyDevId: args.keyDevId,
      text: args.text.trim(),
      createdById: user._id,
      createdAt: Date.now(),
      order: maxOrder + 1,
      source: 'Manual'
    })

    await recomputeKeyDevStatusFromQuestions(ctx, args.keyDevId)
    return questionId
  }
})

/**
 * Lista risposte in ordine cronologico crescente.
 */
export const listAnswersByQuestion = query({
  args: { questionId: v.id('keyDevQuestions') },
  returns: v.array(keyDevQuestionAnswerValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('keyDevQuestionAnswers')
      .withIndex('by_question_and_ts', (q) => q.eq('questionId', args.questionId))
      .collect()
  }
})

/**
 * Crea una risposta ad una domanda e notifica destinatari.
 */
export const createAnswer = mutation({
  args: {
    questionId: v.id('keyDevQuestions'),
    body: v.string(),
    recipientRole: keyDevQuestionAnswerRecipientRoleValidator,
    mentionedUserIds: v.optional(v.array(v.id('users')))
  },
  returns: v.id('keyDevQuestionAnswers'),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx)
    const question = await ctx.db.get(args.questionId)
    if (!question) throw new Error('Domanda non trovata')

    const keydev = await ctx.db.get(question.keyDevId)
    if (!keydev) throw new Error('KeyDev non trovato')

    const answerId = await ctx.db.insert('keyDevQuestionAnswers', {
      questionId: args.questionId,
      body: args.body.trim(),
      senderId: user._id,
      recipientRole: args.recipientRole,
      mentionedUserIds: args.mentionedUserIds,
      ts: Date.now()
    })

    await ctx.scheduler.runAfter(0, internal.emails.sendKeyDevQuestionAnswerNotification, {
      answerId
    })

    return answerId
  }
})

/**
 * Aggiorna una risposta esistente.
 * La risposta validata non può essere modificata.
 */
export const updateAnswer = mutation({
  args: {
    answerId: v.id('keyDevQuestionAnswers'),
    body: v.string(),
    recipientRole: keyDevQuestionAnswerRecipientRoleValidator,
    mentionedUserIds: v.optional(v.array(v.id('users')))
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx)
    const answer = await ctx.db.get(args.answerId)
    if (!answer) throw new Error('Risposta non trovata')

    const question = await ctx.db.get(answer.questionId)
    if (!question) throw new Error('Domanda non trovata')

    if (question.validatedAnswerId === answer._id) {
      throw new Error('La risposta validata non può essere modificata')
    }

    const userRoles = user.roles as Role[] | undefined
    const canEdit = answer.senderId === user._id || isAdmin(userRoles)
    if (!canEdit) {
      throw new Error('Puoi modificare solo le tue risposte')
    }

    await ctx.db.patch(answer._id, {
      body: args.body.trim(),
      recipientRole: args.recipientRole,
      mentionedUserIds: args.mentionedUserIds
    })

    return null
  }
})

/**
 * Owner seleziona la risposta valida per una domanda.
 */
export const validateAnswer = mutation({
  args: {
    questionId: v.id('keyDevQuestions'),
    answerId: v.id('keyDevQuestionAnswers')
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx)
    const question = await ctx.db.get(args.questionId)
    if (!question) throw new Error('Domanda non trovata')

    const keydev = await ctx.db.get(question.keyDevId)
    if (!keydev) throw new Error('KeyDev non trovato')

    if (keydev.ownerId !== user._id) {
      throw new Error('Solo l’owner del KeyDev può validare la risposta')
    }

    const answer = await ctx.db.get(args.answerId)
    if (!answer) throw new Error('Risposta non trovata')
    if (answer.questionId !== question._id) {
      throw new Error('La risposta selezionata non appartiene a questa domanda')
    }

    await ctx.db.patch(question._id, {
      validatedAnswerId: answer._id
    })

    await recomputeKeyDevStatusFromQuestions(ctx, question.keyDevId)
    return null
  }
})

/**
 * Sync status manuale (utility).
 */
export const syncKeyDevStatusFromQuestions = mutation({
  args: { keyDevId: v.id('keydevs') },
  returns: v.null(),
  handler: async (ctx, args) => {
    await recomputeKeyDevStatusFromQuestions(ctx, args.keyDevId)
    return null
  }
})

/**
 * Ottiene stato sintetico per UI.
 */
export const getQuestionsStatus = query({
  args: { keyDevId: v.id('keydevs') },
  returns: v.object({
    total: v.number(),
    validated: v.number(),
    hasUnvalidated: v.boolean(),
    allValidated: v.boolean(),
    keyDevStatus: keydevStatusValidator
  }),
  handler: async (ctx, args) => {
    const keydev = await ctx.db.get(args.keyDevId)
    if (!keydev) throw new Error('KeyDev non trovato')

    const questions = await ctx.db
      .query('keyDevQuestions')
      .withIndex('by_keyDev', (q) => q.eq('keyDevId', args.keyDevId))
      .collect()

    const total = questions.length
    const validated = questions.filter((q) => q.validatedAnswerId !== undefined).length
    const hasUnvalidated = validated < total

    return {
      total,
      validated,
      hasUnvalidated,
      allValidated: total > 0 && !hasUnvalidated,
      keyDevStatus: keydev.status
    }
  }
})

/**
 * Ottiene stato sintetico domande per più KeyDev.
 */
export const getStatusByKeyDevIds = query({
  args: { keyDevIds: v.array(v.id('keydevs')) },
  returns: v.record(
    v.string(),
    v.object({
      total: v.number(),
      validated: v.number(),
      missing: v.number()
    })
  ),
  handler: async (ctx, args) => {
    const result: Record<string, { total: number; validated: number; missing: number }> = {}
    for (const keyDevId of args.keyDevIds) {
      const questions = await ctx.db
        .query('keyDevQuestions')
        .withIndex('by_keyDev', (q) => q.eq('keyDevId', keyDevId))
        .collect()

      const total = questions.length
      const validated = questions.filter((question) => question.validatedAnswerId !== undefined).length
      result[keyDevId] = {
        total,
        validated,
        missing: Math.max(0, total - validated)
      }
    }
    return result
  }
})
