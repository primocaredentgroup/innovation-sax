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
      recipientUserId: v.optional(v.id('users')),
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
  recipientUserId: v.optional(v.id('users')),
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

  const allQuestions = await convexCtx.db
    .query('keyDevQuestions')
    .withIndex('by_keyDev', (q) => q.eq('keyDevId', keyDevId))
    .collect()

  const questions = allQuestions.filter((q) => q.deletedAt === undefined)
  if (questions.length === 0) return

  const allValidated = questions.every((question) => question.validatedAnswerId !== undefined)
  const nextStatus: Doc<'keydevs'>['status'] = allValidated ? 'Approved' : 'Rejected'

  if (keydev.status === nextStatus) return

  if (nextStatus === 'Rejected') {
    await convexCtx.db.patch(keyDevId, { status: 'Rejected' })
    return
  }

  // Per passaggio a Approved: escludiamo eventuali campi legacy (rejectionReason, rejectedById) da documenti nel DB
  type KeydevWithLegacy = Doc<'keydevs'> & { rejectionReason?: string; rejectedById?: Id<'users'> }
  const keydevWithLegacy = keydev as KeydevWithLegacy
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _id, _creationTime, rejectionReason, rejectedById, ...docWithoutSystemAndLegacy } = keydevWithLegacy
  await convexCtx.db.replace(keyDevId, {
    ...docWithoutSystemAndLegacy,
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
    const allQuestions = await ctx.db
      .query('keyDevQuestions')
      .withIndex('by_keyDev_and_order', (q) => q.eq('keyDevId', args.keyDevId))
      .collect()

    const questions = allQuestions.filter((q) => q.deletedAt === undefined)

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
        recipientRole: 'owner' | 'requester' | 'user'
        recipientUserId?: Id<'users'>
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

    if (keydev.ownerId && keydev.ownerId !== user._id) {
      await ctx.scheduler.runAfter(0, internal.emails.sendKeyDevNewQuestionNotification, {
        questionId
      })
    }

    await recomputeKeyDevStatusFromQuestions(ctx, args.keyDevId)
    return questionId
  }
})

/**
 * Aggiorna il testo di una domanda. Owner o Admin.
 */
export const updateQuestion = mutation({
  args: {
    questionId: v.id('keyDevQuestions'),
    text: v.string()
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx)
    const question = await ctx.db.get(args.questionId)
    if (!question) throw new Error('Domanda non trovata')
    if (question.deletedAt !== undefined) throw new Error('Domanda eliminata')

    const keydev = await ctx.db.get(question.keyDevId)
    if (!keydev) throw new Error('KeyDev non trovato')

    const userRoles = user.roles as Role[] | undefined
    if (keydev.ownerId !== user._id && !isAdmin(userRoles)) {
      throw new Error("Solo l'owner del KeyDev o un Admin possono modificare domande")
    }

    await ctx.db.patch(args.questionId, { text: args.text.trim() })
    return null
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
    recipientUserId: v.optional(v.id('users')),
    mentionedUserIds: v.optional(v.array(v.id('users')))
  },
  returns: v.id('keyDevQuestionAnswers'),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx)
    const question = await ctx.db.get(args.questionId)
    if (!question) throw new Error('Domanda non trovata')

    const keydev = await ctx.db.get(question.keyDevId)
    if (!keydev) throw new Error('KeyDev non trovato')

    if (args.recipientRole === 'user' && !args.recipientUserId) {
      throw new Error('recipientUserId obbligatorio quando recipientRole è user')
    }

    const answerId = await ctx.db.insert('keyDevQuestionAnswers', {
      questionId: args.questionId,
      body: args.body.trim(),
      senderId: user._id,
      recipientRole: args.recipientRole,
      recipientUserId: args.recipientUserId,
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
    recipientUserId: v.optional(v.id('users')),
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

    if (args.recipientRole === 'user' && !args.recipientUserId) {
      throw new Error('recipientUserId obbligatorio quando recipientRole è user')
    }

    await ctx.db.patch(answer._id, {
      body: args.body.trim(),
      recipientRole: args.recipientRole,
      recipientUserId: args.recipientUserId,
      mentionedUserIds: args.mentionedUserIds
    })

    await ctx.scheduler.runAfter(0, internal.emails.sendKeyDevQuestionAnswerNotification, {
      answerId: answer._id
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

    const userRoles = user.roles as Role[] | undefined
    if (keydev.ownerId !== user._id && !isAdmin(userRoles)) {
      throw new Error("Solo l'owner del KeyDev o un Admin possono validare la risposta")
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
 * Soft-delete di una domanda. Owner o Admin.
 */
export const deleteQuestion = mutation({
  args: {
    questionId: v.id('keyDevQuestions')
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx)
    const question = await ctx.db.get(args.questionId)
    if (!question) throw new Error('Domanda non trovata')
    if (question.deletedAt !== undefined) throw new Error('Domanda già eliminata')

    const keydev = await ctx.db.get(question.keyDevId)
    if (!keydev) throw new Error('KeyDev non trovato')

    const userRoles = user.roles as Role[] | undefined
    if (keydev.ownerId !== user._id && !isAdmin(userRoles)) {
      throw new Error("Solo l'owner del KeyDev o un Admin possono eliminare domande")
    }

    const answers = await ctx.db
      .query('keyDevQuestionAnswers')
      .withIndex('by_question_and_ts', (q) => q.eq('questionId', args.questionId))
      .collect()
    for (const answer of answers) {
      await ctx.db.delete(answer._id)
    }

    const labelLinks = await ctx.db
      .query('questionToLabels')
      .withIndex('by_keyDevQuestion', (q) => q.eq('keyDevQuestionId', args.questionId))
      .collect()
    for (const link of labelLinks) {
      await ctx.db.delete(link._id)
    }

    await ctx.db.patch(args.questionId, { deletedAt: Date.now() })
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

    const allQuestions = await ctx.db
      .query('keyDevQuestions')
      .withIndex('by_keyDev', (q) => q.eq('keyDevId', args.keyDevId))
      .collect()

    const questions = allQuestions.filter((q) => q.deletedAt === undefined)
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
      const allQuestions = await ctx.db
        .query('keyDevQuestions')
        .withIndex('by_keyDev', (q) => q.eq('keyDevId', keyDevId))
        .collect()

      const questions = allQuestions.filter((q) => q.deletedAt === undefined)
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
