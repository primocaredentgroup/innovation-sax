import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import {
  keyDevQuestionAnswerRecipientRoleValidator,
  keyDevQuestionSourceValidator
} from './schema'
import { hasRole, isAdmin } from './users'
import { internal } from './_generated/api'

type Role = 'Requester' | 'BusinessValidator' | 'TechValidator' | 'Admin'

const coreAppQuestionValidator = v.object({
  _id: v.id('coreAppQuestions'),
  _creationTime: v.number(),
  coreAppId: v.id('coreApps'),
  text: v.string(),
  createdById: v.id('users'),
  createdAt: v.number(),
  order: v.number(),
  source: keyDevQuestionSourceValidator,
  validatedAnswerId: v.optional(v.id('coreAppQuestionAnswers')),
  validatedAnswer: v.optional(
    v.object({
      _id: v.id('coreAppQuestionAnswers'),
      _creationTime: v.number(),
      questionId: v.id('coreAppQuestions'),
      body: v.string(),
      senderId: v.id('users'),
      recipientRole: keyDevQuestionAnswerRecipientRoleValidator,
      mentionedUserIds: v.optional(v.array(v.id('users'))),
      ts: v.number()
    })
  )
})

const coreAppQuestionAnswerValidator = v.object({
  _id: v.id('coreAppQuestionAnswers'),
  _creationTime: v.number(),
  questionId: v.id('coreAppQuestions'),
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

export const startQuestions = mutation({
  args: { coreAppId: v.id('coreApps') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx)
    const userRoles = user.roles as Role[] | undefined
    if (!isAdmin(userRoles) && !hasRole(userRoles, 'TechValidator')) {
      throw new Error('Solo Admin o TechValidator possono avviare le questions')
    }

    const coreApp = await ctx.db.get(args.coreAppId)
    if (!coreApp) throw new Error('CoreApp non trovata')

    const existingQuestions = await ctx.db
      .query('coreAppQuestions')
      .withIndex('by_coreApp', (q) => q.eq('coreAppId', args.coreAppId))
      .collect()

    if (existingQuestions.length > 0) return null

    const templates = await ctx.db
      .query('coreAppQuestionTemplates')
      .withIndex('by_active_and_order', (q) => q.eq('active', true))
      .collect()

    if (templates.length === 0) {
      throw new Error('Non ci sono template domande CoreApp attivi configurati in Amministrazione')
    }

    for (let index = 0; index < templates.length; index++) {
      const template = templates[index]
      await ctx.db.insert('coreAppQuestions', {
        coreAppId: args.coreAppId,
        text: template.text,
        createdById: user._id,
        createdAt: Date.now(),
        order: index + 1,
        source: 'Template'
      })
    }

    return null
  }
})

export const listByCoreApp = query({
  args: { coreAppId: v.id('coreApps') },
  returns: v.array(coreAppQuestionValidator),
  handler: async (ctx, args) => {
    const questions = await ctx.db
      .query('coreAppQuestions')
      .withIndex('by_coreApp_and_order', (q) => q.eq('coreAppId', args.coreAppId))
      .collect()

    const result: Array<{
      _id: Id<'coreAppQuestions'>
      _creationTime: number
      coreAppId: Id<'coreApps'>
      text: string
      createdById: Id<'users'>
      createdAt: number
      order: number
      source: 'Template' | 'Manual'
      validatedAnswerId?: Id<'coreAppQuestionAnswers'>
      validatedAnswer?: {
        _id: Id<'coreAppQuestionAnswers'>
        _creationTime: number
        questionId: Id<'coreAppQuestions'>
        body: string
        senderId: Id<'users'>
        recipientRole: 'owner' | 'requester'
        mentionedUserIds?: Array<Id<'users'>>
        ts: number
      }
    }> = []

    for (const question of questions) {
      let validatedAnswer: Doc<'coreAppQuestionAnswers'> | null = null
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

export const createQuestion = mutation({
  args: {
    coreAppId: v.id('coreApps'),
    text: v.string()
  },
  returns: v.id('coreAppQuestions'),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx)
    const coreApp = await ctx.db.get(args.coreAppId)
    if (!coreApp) throw new Error('CoreApp non trovata')

    const questions = await ctx.db
      .query('coreAppQuestions')
      .withIndex('by_coreApp', (q) => q.eq('coreAppId', args.coreAppId))
      .collect()

    const maxOrder = questions.reduce((acc, item) => Math.max(acc, item.order), 0)

    return await ctx.db.insert('coreAppQuestions', {
      coreAppId: args.coreAppId,
      text: args.text.trim(),
      createdById: user._id,
      createdAt: Date.now(),
      order: maxOrder + 1,
      source: 'Manual'
    })
  }
})

export const listAnswersByQuestion = query({
  args: { questionId: v.id('coreAppQuestions') },
  returns: v.array(coreAppQuestionAnswerValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('coreAppQuestionAnswers')
      .withIndex('by_question_and_ts', (q) => q.eq('questionId', args.questionId))
      .collect()
  }
})

export const createAnswer = mutation({
  args: {
    questionId: v.id('coreAppQuestions'),
    body: v.string(),
    recipientRole: keyDevQuestionAnswerRecipientRoleValidator,
    mentionedUserIds: v.optional(v.array(v.id('users')))
  },
  returns: v.id('coreAppQuestionAnswers'),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx)
    const question = await ctx.db.get(args.questionId)
    if (!question) throw new Error('Domanda non trovata')

    const answerId = await ctx.db.insert('coreAppQuestionAnswers', {
      questionId: args.questionId,
      body: args.body.trim(),
      senderId: user._id,
      recipientRole: args.recipientRole,
      mentionedUserIds: args.mentionedUserIds,
      ts: Date.now()
    })

    await ctx.scheduler.runAfter(0, internal.emails.sendCoreAppQuestionAnswerNotification, {
      answerId
    })

    return answerId
  }
})

export const updateAnswer = mutation({
  args: {
    answerId: v.id('coreAppQuestionAnswers'),
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
    if (!canEdit) throw new Error('Puoi modificare solo le tue risposte')

    await ctx.db.patch(answer._id, {
      body: args.body.trim(),
      recipientRole: args.recipientRole,
      mentionedUserIds: args.mentionedUserIds
    })

    await ctx.scheduler.runAfter(0, internal.emails.sendCoreAppQuestionAnswerNotification, {
      answerId: answer._id
    })

    return null
  }
})

export const validateAnswer = mutation({
  args: {
    questionId: v.id('coreAppQuestions'),
    answerId: v.id('coreAppQuestionAnswers')
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx)
    const question = await ctx.db.get(args.questionId)
    if (!question) throw new Error('Domanda non trovata')

    const coreApp = await ctx.db.get(question.coreAppId)
    if (!coreApp) throw new Error('CoreApp non trovata')

    const userRoles = user.roles as Role[] | undefined
    if (coreApp.ownerId !== user._id && !isAdmin(userRoles)) {
      throw new Error('Solo l’owner della CoreApp (o Admin) può validare la risposta')
    }

    const answer = await ctx.db.get(args.answerId)
    if (!answer) throw new Error('Risposta non trovata')
    if (answer.questionId !== question._id) {
      throw new Error('La risposta selezionata non appartiene a questa domanda')
    }

    await ctx.db.patch(question._id, { validatedAnswerId: answer._id })
    return null
  }
})

export const getQuestionsStatus = query({
  args: { coreAppId: v.id('coreApps') },
  returns: v.object({
    total: v.number(),
    validated: v.number(),
    hasUnvalidated: v.boolean(),
    allValidated: v.boolean()
  }),
  handler: async (ctx, args) => {
    const questions = await ctx.db
      .query('coreAppQuestions')
      .withIndex('by_coreApp', (q) => q.eq('coreAppId', args.coreAppId))
      .collect()

    const total = questions.length
    const validated = questions.filter((q) => q.validatedAnswerId !== undefined).length
    const hasUnvalidated = validated < total

    return {
      total,
      validated,
      hasUnvalidated,
      allValidated: total > 0 && !hasUnvalidated
    }
  }
})

export const getStatusByCoreAppIds = query({
  args: { coreAppIds: v.array(v.id('coreApps')) },
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

    for (const coreAppId of args.coreAppIds) {
      const questions = await ctx.db
        .query('coreAppQuestions')
        .withIndex('by_coreApp', (q) => q.eq('coreAppId', coreAppId))
        .collect()

      const total = questions.length
      const validated = questions.filter((question) => question.validatedAnswerId !== undefined).length
      result[coreAppId] = {
        total,
        validated,
        missing: Math.max(0, total - validated)
      }
    }

    return result
  }
})
