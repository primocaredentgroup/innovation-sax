import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import { questionDomainValidator } from './schema'

const questionLabelValidator = v.object({
  _id: v.id('questionLabels'),
  _creationTime: v.number(),
  value: v.string(),
  label: v.string(),
  createdById: v.id('users'),
  createdAt: v.number()
})

const questionLabelAssignmentValidator = v.object({
  _id: v.id('questionToLabels'),
  _creationTime: v.number(),
  questionDomain: questionDomainValidator,
  keyDevQuestionId: v.optional(v.id('keyDevQuestions')),
  coreAppQuestionId: v.optional(v.id('coreAppQuestions')),
  labelId: v.id('questionLabels'),
  createdById: v.id('users'),
  createdAt: v.number(),
  label: questionLabelValidator
})

function normalizeLabelValue(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

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

function toKeyDevQuestionId(questionId: string): Id<'keyDevQuestions'> {
  return questionId as Id<'keyDevQuestions'>
}

function toCoreAppQuestionId(questionId: string): Id<'coreAppQuestions'> {
  return questionId as Id<'coreAppQuestions'>
}

export const listQuestionLabels = query({
  args: {},
  returns: v.array(questionLabelValidator),
  handler: async (ctx) => {
    return await ctx.db.query('questionLabels').withIndex('by_label').collect()
  }
})

export const createQuestionLabel = mutation({
  args: {
    label: v.string()
  },
  returns: questionLabelValidator,
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx)
    const rawLabel = args.label.trim()
    if (!rawLabel) throw new Error('Il nome della label è obbligatorio')

    const value = normalizeLabelValue(rawLabel)
    if (!value) throw new Error('Il nome della label non è valido')

    const existing = await ctx.db
      .query('questionLabels')
      .withIndex('by_value', (q) => q.eq('value', value))
      .first()
    if (existing) return existing

    const id = await ctx.db.insert('questionLabels', {
      value,
      label: rawLabel,
      createdById: user._id,
      createdAt: Date.now()
    })
    const created = await ctx.db.get(id)
    if (!created) throw new Error('Impossibile creare la label')
    return created
  }
})

export const listLabelsByQuestion = query({
  args: {
    questionDomain: questionDomainValidator,
    questionId: v.string()
  },
  returns: v.array(questionLabelAssignmentValidator),
  handler: async (ctx, args) => {
    const links =
      args.questionDomain === 'keydev'
        ? await ctx.db
            .query('questionToLabels')
            .withIndex('by_keyDevQuestion', (q) => q.eq('keyDevQuestionId', toKeyDevQuestionId(args.questionId)))
            .collect()
        : await ctx.db
            .query('questionToLabels')
            .withIndex('by_coreAppQuestion', (q) => q.eq('coreAppQuestionId', toCoreAppQuestionId(args.questionId)))
            .collect()

    const result: Array<{
      _id: Id<'questionToLabels'>
      _creationTime: number
      questionDomain: 'keydev' | 'coreapp'
      keyDevQuestionId?: Id<'keyDevQuestions'>
      coreAppQuestionId?: Id<'coreAppQuestions'>
      labelId: Id<'questionLabels'>
      createdById: Id<'users'>
      createdAt: number
      label: Doc<'questionLabels'>
    }> = []

    for (const link of links) {
      const label = await ctx.db.get(link.labelId)
      if (!label) continue
      result.push({
        ...link,
        label
      })
    }

    return result
  }
})

export const listLabelsForQuestions = query({
  args: {
    questionDomain: questionDomainValidator,
    questionIds: v.array(v.string())
  },
  returns: v.record(v.string(), v.array(questionLabelValidator)),
  handler: async (ctx, args) => {
    const result: Record<string, Array<Doc<'questionLabels'>>> = {}
    for (const questionId of args.questionIds) {
      const links =
        args.questionDomain === 'keydev'
          ? await ctx.db
              .query('questionToLabels')
              .withIndex('by_keyDevQuestion', (q) => q.eq('keyDevQuestionId', toKeyDevQuestionId(questionId)))
              .collect()
          : await ctx.db
              .query('questionToLabels')
              .withIndex('by_coreAppQuestion', (q) => q.eq('coreAppQuestionId', toCoreAppQuestionId(questionId)))
              .collect()

      const labels: Array<Doc<'questionLabels'>> = []
      for (const link of links) {
        const label = await ctx.db.get(link.labelId)
        if (label) labels.push(label)
      }
      labels.sort((a, b) => a.label.localeCompare(b.label, 'it'))
      result[questionId] = labels
    }
    return result
  }
})

export const addLabelToQuestion = mutation({
  args: {
    questionDomain: questionDomainValidator,
    questionId: v.string(),
    labelId: v.id('questionLabels')
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx)
    const label = await ctx.db.get(args.labelId)
    if (!label) throw new Error('Label non trovata')

    const existingLinks =
      args.questionDomain === 'keydev'
        ? await ctx.db
            .query('questionToLabels')
            .withIndex('by_keyDevQuestion', (q) => q.eq('keyDevQuestionId', toKeyDevQuestionId(args.questionId)))
            .collect()
        : await ctx.db
            .query('questionToLabels')
            .withIndex('by_coreAppQuestion', (q) => q.eq('coreAppQuestionId', toCoreAppQuestionId(args.questionId)))
            .collect()

    const alreadyLinked = existingLinks.some((link) => link.labelId === args.labelId)
    if (alreadyLinked) return null

    await ctx.db.insert('questionToLabels', {
      questionDomain: args.questionDomain,
      keyDevQuestionId: args.questionDomain === 'keydev' ? toKeyDevQuestionId(args.questionId) : undefined,
      coreAppQuestionId: args.questionDomain === 'coreapp' ? toCoreAppQuestionId(args.questionId) : undefined,
      labelId: args.labelId,
      createdById: user._id,
      createdAt: Date.now()
    })
    return null
  }
})

export const removeLabelFromQuestion = mutation({
  args: {
    questionDomain: questionDomainValidator,
    questionId: v.string(),
    labelId: v.id('questionLabels')
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const links =
      args.questionDomain === 'keydev'
        ? await ctx.db
            .query('questionToLabels')
            .withIndex('by_keyDevQuestion', (q) => q.eq('keyDevQuestionId', toKeyDevQuestionId(args.questionId)))
            .collect()
        : await ctx.db
            .query('questionToLabels')
            .withIndex('by_coreAppQuestion', (q) => q.eq('coreAppQuestionId', toCoreAppQuestionId(args.questionId)))
            .collect()

    const target = links.find((link) => link.labelId === args.labelId)
    if (!target) return null

    await ctx.db.delete(target._id)
    return null
  }
})
