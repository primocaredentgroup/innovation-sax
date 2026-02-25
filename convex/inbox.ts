import { query } from './_generated/server'
import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import type { Doc } from './_generated/dataModel'

const entityRefValidator = v.object({
  type: v.union(v.literal('keydev'), v.literal('coreapp')),
  id: v.union(v.id('keydevs'), v.id('coreApps')),
  title: v.string(),
  identifier: v.string() // readableId per KeyDev, slug per CoreApp
})

const inboxItemValidator = v.object({
  kind: v.union(
    v.literal('note'),
    v.literal('keydev_answer'),
    v.literal('coreapp_answer')
  ),
  direction: v.union(v.literal('sent'), v.literal('received')),
  itemId: v.union(v.id('notes'), v.id('keyDevQuestionAnswers'), v.id('coreAppQuestionAnswers')),
  questionId: v.optional(v.union(v.id('keyDevQuestions'), v.id('coreAppQuestions'))),
  ts: v.number(),
  body: v.string(),
  authorName: v.string(),
  recipients: v.optional(v.array(v.string())),
  entityRef: entityRefValidator,
  questionText: v.optional(v.string())
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

/**
 * Lista gli item della Inbox per l'utente corrente.
 * Include note, risposte KeyDev e CoreApp (inviati e ricevuti).
 */
export const listInboxItems = query({
  args: {
    direction: v.optional(v.union(v.literal('sent'), v.literal('received'))),
    itemType: v.optional(
      v.union(
        v.literal('note'),
        v.literal('keydev_answer'),
        v.literal('coreapp_answer')
      )
    ),
    keyDevId: v.optional(v.id('keydevs')),
    coreAppId: v.optional(v.id('coreApps')),
    searchQuery: v.optional(v.string()),
    sinceTs: v.optional(v.number()),
    limit: v.optional(v.number()),
    beforeTs: v.optional(v.number()) // cursor per paginazione: solo item con ts < beforeTs
  },
  returns: v.array(inboxItemValidator),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx)
    const limit = args.limit ?? 20
    const sinceTs = args.sinceTs ?? 0
    const searchLower = args.searchQuery?.toLowerCase().trim()

    const items: Array<{
      kind: 'note' | 'keydev_answer' | 'coreapp_answer'
      direction: 'sent' | 'received'
      itemId: Id<'notes'> | Id<'keyDevQuestionAnswers'> | Id<'coreAppQuestionAnswers'>
      questionId?: Id<'keyDevQuestions'> | Id<'coreAppQuestions'>
      ts: number
      body: string
      authorName: string
      recipients?: string[]
      entityRef: {
        type: 'keydev' | 'coreapp'
        id: Id<'keydevs'> | Id<'coreApps'>
        title: string
        identifier: string
      }
      questionText?: string
    }> = []

    const userCache = new Map<Id<'users'>, string>()
    async function getUserName(id: Id<'users'>): Promise<string> {
      if (userCache.has(id)) return userCache.get(id)!
      const u = await ctx.db.get(id)
      const name = u?.name ?? 'Utente'
      userCache.set(id, name)
      return name
    }

    // --- Notes inviate ---
    if (!args.itemType || args.itemType === 'note') {
      if (!args.direction || args.direction === 'sent') {
        const notesSent = await ctx.db
          .query('notes')
          .withIndex('by_author', (q) => q.eq('authorId', user._id))
          .order('desc')
          .take(500)
        for (const note of notesSent) {
          if (note.ts < sinceTs) continue
          if (args.keyDevId && note.keyDevId !== args.keyDevId) continue
          if (args.coreAppId && note.coreAppId !== args.coreAppId) continue
          if (searchLower && !note.body.toLowerCase().includes(searchLower)) continue

          let entityRef: { type: 'keydev' | 'coreapp'; id: Id<'keydevs'> | Id<'coreApps'>; title: string; identifier: string }
          if (note.keyDevId) {
            const kd = await ctx.db.get(note.keyDevId)
            entityRef = {
              type: 'keydev',
              id: note.keyDevId,
              title: kd?.title ?? '',
              identifier: kd?.readableId ?? ''
            }
          } else if (note.coreAppId) {
            const ca = await ctx.db.get(note.coreAppId)
            entityRef = {
              type: 'coreapp',
              id: note.coreAppId,
              title: ca?.name ?? '',
              identifier: ca?.slug ?? ''
            }
          } else continue
          const authorName = await getUserName(note.authorId)
          const recipients =
            note.type === 'Mention' && note.mentionedUserIds
              ? await Promise.all(note.mentionedUserIds.map((id) => getUserName(id)))
              : undefined
          items.push({
            kind: 'note',
            direction: 'sent',
            itemId: note._id,
            ts: note.ts,
            body: note.body,
            authorName,
            recipients,
            entityRef
          })
        }
      }
    }

    // --- Notes ricevute (menzionati) ---
    if (!args.itemType || args.itemType === 'note') {
      if (!args.direction || args.direction === 'received') {
        const notesAll = await ctx.db.query('notes').order('desc').take(3000)
        const notesReceived = notesAll.filter(
          (n) =>
            n.type === 'Mention' &&
            n.mentionedUserIds?.includes(user._id) &&
            n.authorId !== user._id
        )
        for (const note of notesReceived) {
          if (note.ts < sinceTs) continue
          if (args.keyDevId && note.keyDevId !== args.keyDevId) continue
          if (args.coreAppId && note.coreAppId !== args.coreAppId) continue
          if (searchLower && !note.body.toLowerCase().includes(searchLower)) continue

          let entityRef: { type: 'keydev' | 'coreapp'; id: Id<'keydevs'> | Id<'coreApps'>; title: string; identifier: string }
          if (note.keyDevId) {
            const kd = await ctx.db.get(note.keyDevId)
            entityRef = {
              type: 'keydev',
              id: note.keyDevId,
              title: kd?.title ?? '',
              identifier: kd?.readableId ?? ''
            }
          } else if (note.coreAppId) {
            const ca = await ctx.db.get(note.coreAppId)
            entityRef = {
              type: 'coreapp',
              id: note.coreAppId,
              title: ca?.name ?? '',
              identifier: ca?.slug ?? ''
            }
          } else continue
          const authorName = await getUserName(note.authorId)
          const recipients = note.mentionedUserIds
            ? await Promise.all(note.mentionedUserIds.map((id) => getUserName(id)))
            : undefined
          items.push({
            kind: 'note',
            direction: 'received',
            itemId: note._id,
            ts: note.ts,
            body: note.body,
            authorName,
            recipients,
            entityRef
          })
        }
      }
    }

    // --- KeyDevQuestionAnswers inviate ---
    if (!args.itemType || args.itemType === 'keydev_answer') {
      if (!args.direction || args.direction === 'sent') {
        const answersSent = await ctx.db
          .query('keyDevQuestionAnswers')
          .withIndex('by_sender', (q) => q.eq('senderId', user._id))
          .order('desc')
          .take(500)
        for (const ans of answersSent) {
          if (ans.ts < sinceTs) continue
          const question = await ctx.db.get(ans.questionId)
          if (!question) continue
          if (args.keyDevId && question.keyDevId !== args.keyDevId) continue
          const keydev = await ctx.db.get(question.keyDevId)
          if (!keydev) continue

          let recipients: string[] = []
          if (ans.recipientRole === 'user' && ans.recipientUserId) {
            recipients = [await getUserName(ans.recipientUserId)]
          } else if (ans.recipientRole === 'owner' && keydev.ownerId) {
            recipients = [await getUserName(keydev.ownerId)]
          } else if (ans.recipientRole === 'requester') {
            recipients = [await getUserName(keydev.requesterId)]
          }
          if (ans.mentionedUserIds) {
            recipients = [...recipients, ...(await Promise.all(ans.mentionedUserIds.map((id) => getUserName(id))))]
          }

          if (searchLower && !ans.body.toLowerCase().includes(searchLower)) continue

          items.push({
            kind: 'keydev_answer',
            direction: 'sent',
            itemId: ans._id,
            questionId: question._id,
            ts: ans.ts,
            body: ans.body,
            authorName: await getUserName(ans.senderId),
            recipients: recipients.length > 0 ? recipients : undefined,
            entityRef: {
              type: 'keydev',
              id: keydev._id,
              title: keydev.title,
              identifier: keydev.readableId
            },
            questionText: question.text
          })
        }
      }
    }

    // --- KeyDevQuestionAnswers ricevute ---
    if (!args.itemType || args.itemType === 'keydev_answer') {
      if (!args.direction || args.direction === 'received') {
        // 1) By recipientUserId (indexed)
        const byRecipient = await ctx.db
          .query('keyDevQuestionAnswers')
          .withIndex('by_recipientUser', (q) => q.eq('recipientUserId', user._id))
          .order('desc')
          .take(500)
        for (const ans of byRecipient) {
          if (ans.senderId === user._id) continue // già in inviati
          if (ans.ts < sinceTs) continue
          const question = await ctx.db.get(ans.questionId)
          if (!question) continue
          if (args.keyDevId && question.keyDevId !== args.keyDevId) continue
          const keydev = await ctx.db.get(question.keyDevId)
          if (!keydev) continue
          if (searchLower && !ans.body.toLowerCase().includes(searchLower)) continue

          items.push({
            kind: 'keydev_answer',
            direction: 'received',
            itemId: ans._id,
            questionId: question._id,
            ts: ans.ts,
            body: ans.body,
            authorName: await getUserName(ans.senderId),
            recipients: [await getUserName(user._id)],
            entityRef: {
              type: 'keydev',
              id: keydev._id,
              title: keydev.title,
              identifier: keydev.readableId
            },
            questionText: question.text
          })
        }
        // 2) By owner/requester (keydev.ownerId/requesterId = user)
        const keydevsAsOwner = await ctx.db
          .query('keydevs')
          .withIndex('by_owner', (q) => q.eq('ownerId', user._id))
          .collect()
        const keydevsAsRequester = await ctx.db
          .query('keydevs')
          .withIndex('by_requester', (q) => q.eq('requesterId', user._id))
          .collect()
        const relevantKeyDevIds = new Set([
          ...keydevsAsOwner.map((k) => k._id),
          ...keydevsAsRequester.map((k) => k._id)
        ])
        for (const kdId of relevantKeyDevIds) {
          if (args.keyDevId && kdId !== args.keyDevId) continue
          const questions = await ctx.db
            .query('keyDevQuestions')
            .withIndex('by_keyDev', (q) => q.eq('keyDevId', kdId))
            .collect()
          const keydev = await ctx.db.get(kdId)
          if (!keydev) continue
          for (const q of questions) {
            const answers = await ctx.db
              .query('keyDevQuestionAnswers')
              .withIndex('by_question_and_ts', (qidx) => qidx.eq('questionId', q._id))
              .collect()
            for (const ans of answers) {
              if (ans.senderId === user._id) continue
              if (ans.ts < sinceTs) continue
              const isRecipient =
                (ans.recipientRole === 'owner' && keydev.ownerId === user._id) ||
                (ans.recipientRole === 'requester' && keydev.requesterId === user._id) ||
                (ans.mentionedUserIds?.includes(user._id) ?? false)
              if (!isRecipient) continue
              if (
                byRecipient.some((a) => a._id === ans._id)
              ) continue // già incluso sopra
              if (searchLower && !ans.body.toLowerCase().includes(searchLower)) continue

              items.push({
                kind: 'keydev_answer',
                direction: 'received',
                itemId: ans._id,
                questionId: q._id,
                ts: ans.ts,
                body: ans.body,
                authorName: await getUserName(ans.senderId),
                recipients: [await getUserName(user._id)],
                entityRef: {
                  type: 'keydev',
                  id: keydev._id,
                  title: keydev.title,
                  identifier: keydev.readableId
                },
                questionText: q.text
              })
            }
          }
        }
      }
    }

    // --- CoreAppQuestionAnswers inviate ---
    if (!args.itemType || args.itemType === 'coreapp_answer') {
      if (!args.direction || args.direction === 'sent') {
        const answersSent = await ctx.db
          .query('coreAppQuestionAnswers')
          .withIndex('by_sender', (q) => q.eq('senderId', user._id))
          .order('desc')
          .take(500)
        for (const ans of answersSent) {
          if (ans.ts < sinceTs) continue
          const question = await ctx.db.get(ans.questionId)
          if (!question) continue
          if (args.coreAppId && question.coreAppId !== args.coreAppId) continue
          const coreApp = await ctx.db.get(question.coreAppId)
          if (!coreApp) continue

          let recipients: string[] = []
          if (ans.recipientRole === 'user' && ans.recipientUserId) {
            recipients = [await getUserName(ans.recipientUserId)]
          } else if (ans.recipientRole === 'owner' && coreApp.ownerId) {
            recipients = [await getUserName(coreApp.ownerId)]
          }
          if (ans.mentionedUserIds) {
            recipients = [...recipients, ...(await Promise.all(ans.mentionedUserIds.map((id) => getUserName(id))))]
          }

          if (searchLower && !ans.body.toLowerCase().includes(searchLower)) continue

          items.push({
            kind: 'coreapp_answer',
            direction: 'sent',
            itemId: ans._id,
            questionId: question._id,
            ts: ans.ts,
            body: ans.body,
            authorName: await getUserName(ans.senderId),
            recipients: recipients.length > 0 ? recipients : undefined,
            entityRef: {
              type: 'coreapp',
              id: coreApp._id,
              title: coreApp.name,
              identifier: coreApp.slug
            },
            questionText: question.text
          })
        }
      }
    }

    // --- CoreAppQuestionAnswers ricevute ---
    if (!args.itemType || args.itemType === 'coreapp_answer') {
      if (!args.direction || args.direction === 'received') {
        const byRecipient = await ctx.db
          .query('coreAppQuestionAnswers')
          .withIndex('by_recipientUser', (q) => q.eq('recipientUserId', user._id))
          .order('desc')
          .take(500)
        for (const ans of byRecipient) {
          if (ans.senderId === user._id) continue
          if (ans.ts < sinceTs) continue
          const question = await ctx.db.get(ans.questionId)
          if (!question) continue
          if (args.coreAppId && question.coreAppId !== args.coreAppId) continue
          const coreApp = await ctx.db.get(question.coreAppId)
          if (!coreApp) continue
          if (searchLower && !ans.body.toLowerCase().includes(searchLower)) continue

          items.push({
            kind: 'coreapp_answer',
            direction: 'received',
            itemId: ans._id,
            questionId: question._id,
            ts: ans.ts,
            body: ans.body,
            authorName: await getUserName(ans.senderId),
            recipients: [await getUserName(user._id)],
            entityRef: {
              type: 'coreapp',
              id: coreApp._id,
              title: coreApp.name,
              identifier: coreApp.slug
            },
            questionText: question.text
          })
        }
        // By owner (coreApp.ownerId = user)
        const coreAppsAsOwner = await ctx.db
          .query('coreApps')
          .withIndex('by_owner', (q) => q.eq('ownerId', user._id))
          .collect()
        for (const coreApp of coreAppsAsOwner) {
          if (args.coreAppId && coreApp._id !== args.coreAppId) continue
          const questions = await ctx.db
            .query('coreAppQuestions')
            .withIndex('by_coreApp', (q) => q.eq('coreAppId', coreApp._id))
            .collect()
          for (const q of questions) {
            const answers = await ctx.db
              .query('coreAppQuestionAnswers')
              .withIndex('by_question_and_ts', (qidx) => qidx.eq('questionId', q._id))
              .collect()
            for (const ans of answers) {
              if (ans.senderId === user._id) continue
              if (ans.ts < sinceTs) continue
              const isRecipient =
                (ans.recipientRole === 'owner' && coreApp.ownerId === user._id) ||
                (ans.mentionedUserIds?.includes(user._id) ?? false)
              if (!isRecipient) continue
              if (byRecipient.some((a) => a._id === ans._id)) continue
              if (searchLower && !ans.body.toLowerCase().includes(searchLower)) continue

              items.push({
                kind: 'coreapp_answer',
                direction: 'received',
                itemId: ans._id,
                questionId: q._id,
                ts: ans.ts,
                body: ans.body,
                authorName: await getUserName(ans.senderId),
                recipients: [await getUserName(user._id)],
                entityRef: {
                  type: 'coreapp',
                  id: coreApp._id,
                  title: coreApp.name,
                  identifier: coreApp.slug
                },
                questionText: q.text
              })
            }
          }
        }
      }
    }

    // Ordina per ts desc, applica cursor e limit
    items.sort((a, b) => b.ts - a.ts)
    const uniqueItems = Array.from(
      new Map(items.map((i) => [i.kind + i.itemId + i.direction, i])).values()
    )
    const afterCursor = args.beforeTs
      ? uniqueItems.filter((i) => i.ts < args.beforeTs!)
      : uniqueItems
    return afterCursor.slice(0, limit).map((i) => ({
      ...i,
      body: i.body.length > 200 ? i.body.slice(0, 200) + '...' : i.body
    }))
  }
})
