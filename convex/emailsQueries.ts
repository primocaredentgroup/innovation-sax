import { internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { noteTypeValidator } from "./schema";
import type { Id } from "./_generated/dataModel";

/**
 * Query interna per recuperare i dati completi della nota con contesto.
 * Supporta note collegate sia a KeyDev che a CoreApp.
 */
export const getNoteWithContext = internalQuery({
  args: {
    noteId: v.id("notes"),
    keyDevId: v.id("keydevs"), // Per ora manteniamo obbligatorio per retrocompatibilità con emails.ts
    mentionedUserId: v.id("users"),
  },
  returns: v.union(
    v.object({
      note: v.object({
        _id: v.id("notes"),
        _creationTime: v.number(),
        keyDevId: v.optional(v.id("keydevs")),
        coreAppId: v.optional(v.id("coreApps")),
        authorId: v.id("users"),
        body: v.string(),
        ts: v.number(),
        type: noteTypeValidator,
        mentionedUserIds: v.optional(v.array(v.id("users"))),
      }),
      keyDev: v.object({
        _id: v.id("keydevs"),
        readableId: v.string(),
        title: v.string(),
      }),
      author: v.object({
        _id: v.id("users"),
        name: v.string(),
      }),
      mentionedUser: v.object({
        _id: v.id("users"),
        name: v.string(),
        email: v.optional(v.string()),
      }),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // Recupera la nota
    const note = await ctx.db.get(args.noteId);
    if (!note) {
      return null;
    }

    // Recupera il KeyDev
    const keyDev = await ctx.db.get(args.keyDevId);
    if (!keyDev) {
      return null;
    }

    // Recupera l'autore della nota
    const author = await ctx.db.get(note.authorId);
    if (!author) {
      return null;
    }

    // Recupera l'utente menzionato
    const mentionedUser = await ctx.db.get(args.mentionedUserId);
    if (!mentionedUser) {
      return null;
    }

    return {
      note: {
        _id: note._id,
        _creationTime: note._creationTime,
        keyDevId: note.keyDevId,
        coreAppId: note.coreAppId,
        authorId: note.authorId,
        body: note.body,
        ts: note.ts,
        type: note.type,
        mentionedUserIds: note.mentionedUserIds,
      },
      keyDev: {
        _id: keyDev._id,
        readableId: keyDev.readableId,
        title: keyDev.title,
      },
      author: {
        _id: author._id,
        name: author.name,
      },
      mentionedUser: {
        _id: mentionedUser._id,
        name: mentionedUser.name,
        email: mentionedUser.email,
      },
    };
  },
});

const coreAppStatusValidator = v.union(
  v.literal('Planning'),
  v.literal('InProgress'),
  v.literal('Completed')
);

/**
 * Query interna per recuperare tutti gli owner di CoreApps con status InProgress
 */
export const getOwnersOfInProgressApps = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      owner: v.object({
        _id: v.id("users"),
        name: v.string(),
        email: v.optional(v.string()),
      }),
      coreApp: v.object({
        _id: v.id("coreApps"),
        name: v.string(),
        slug: v.string(),
      }),
    })
  ),
  handler: async (ctx) => {
    // Recupera tutte le CoreApps con status InProgress
    const coreApps = await ctx.db
      .query("coreApps")
      .withIndex("by_status", (q) => q.eq("status", "InProgress"))
      .collect();

    const result: Array<{
      owner: { _id: Id<"users">; name: string; email?: string };
      coreApp: { _id: Id<"coreApps">; name: string; slug: string };
    }> = [];

    for (const coreApp of coreApps) {
      if (!coreApp.ownerId) {
        continue; // Skip se non ha owner
      }
      const owner = await ctx.db.get(coreApp.ownerId);
      if (owner) {
        result.push({
          owner: {
            _id: owner._id,
            name: owner.name,
            email: owner.email,
          },
          coreApp: {
            _id: coreApp._id,
            name: coreApp.name,
            slug: coreApp.slug,
          },
        });
      }
    }

    return result;
  },
});

/**
 * Query interna per recuperare CoreApp con subscribers per notifica nuovo update.
 * I subscribers vengono recuperati dalla categoria della CoreApp.
 * Se la CoreApp non ha una categoria assegnata, l'array di subscribers sarà vuoto.
 */
export const getCoreAppWithSubscribers = internalQuery({
  args: {
    coreAppId: v.id("coreApps"),
    updateId: v.id("coreAppUpdates"),
  },
  returns: v.union(
    v.object({
      coreApp: v.object({
        _id: v.id("coreApps"),
        name: v.string(),
        slug: v.string(),
        status: coreAppStatusValidator,
      }),
      category: v.optional(v.object({
        _id: v.id("coreAppsCategories"),
        name: v.string(),
        slug: v.string(),
      })),
      update: v.object({
        _id: v.id("coreAppUpdates"),
        weekRef: v.string(),
        title: v.optional(v.string()),
        loomUrl: v.optional(v.string()),
      }),
      subscribers: v.array(
        v.object({
          _id: v.id("users"),
          name: v.string(),
          email: v.optional(v.string()),
        })
      ),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const coreApp = await ctx.db.get(args.coreAppId);
    if (!coreApp) {
      return null;
    }

    const update = await ctx.db.get(args.updateId);
    if (!update) {
      return null;
    }

    const subscribers: Array<{ _id: Id<"users">; name: string; email?: string }> = [];

    // Recupera i subscribers dalla categoria
    let category = null;

    if (coreApp.categoryId) {
      const categoryDoc = await ctx.db.get(coreApp.categoryId);
      if (categoryDoc) {
        category = {
          _id: categoryDoc._id,
          name: categoryDoc.name,
          slug: categoryDoc.slug,
        };
        const subscriberIds = categoryDoc.subscriberIds || [];
        for (const subscriberId of subscriberIds) {
          const subscriber = await ctx.db.get(subscriberId);
          if (subscriber) {
            subscribers.push({
              _id: subscriber._id,
              name: subscriber.name,
              email: subscriber.email,
            });
          }
        }
      }
    }

    return {
      coreApp: {
        _id: coreApp._id,
        name: coreApp.name,
        slug: coreApp.slug,
        status: coreApp.status,
      },
      category: category || undefined,
      update: {
        _id: update._id,
        weekRef: update.weekRef,
        title: update.title,
        loomUrl: update.loomUrl,
      },
      subscribers,
    };
  },
});

/**
 * Query interna per recuperare il contesto completo di una answer su KeyDev questions.
 */
export const getKeyDevQuestionAnswerContext = internalQuery({
  args: {
    answerId: v.id('keyDevQuestionAnswers')
  },
  returns: v.union(
    v.object({
      answer: v.object({
        _id: v.id('keyDevQuestionAnswers'),
        _creationTime: v.number(),
        questionId: v.id('keyDevQuestions'),
        body: v.string(),
        senderId: v.id('users'),
        recipientRole: v.union(v.literal('owner'), v.literal('requester')),
        mentionedUserIds: v.optional(v.array(v.id('users'))),
        ts: v.number()
      }),
      question: v.object({
        _id: v.id('keyDevQuestions'),
        text: v.string()
      }),
      keyDev: v.object({
        _id: v.id('keydevs'),
        readableId: v.string(),
        title: v.string(),
        ownerId: v.optional(v.id('users')),
        requesterId: v.id('users')
      }),
      sender: v.object({
        _id: v.id('users'),
        name: v.string(),
        email: v.optional(v.string())
      }),
      primaryRecipient: v.optional(
        v.object({
          _id: v.id('users'),
          name: v.string(),
          email: v.optional(v.string())
        })
      ),
      mentionedUsers: v.array(
        v.object({
          _id: v.id('users'),
          name: v.string(),
          email: v.optional(v.string())
        })
      )
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const answer = await ctx.db.get(args.answerId)
    if (!answer) return null

    const question = await ctx.db.get(answer.questionId)
    if (!question) return null

    const keyDev = await ctx.db.get(question.keyDevId)
    if (!keyDev) return null

    const sender = await ctx.db.get(answer.senderId)
    if (!sender) return null

    const primaryRecipientId =
      answer.recipientRole === 'owner' ? keyDev.ownerId : keyDev.requesterId
    const primaryRecipient = primaryRecipientId
      ? await ctx.db.get(primaryRecipientId)
      : null

    const mentionedUsers: Array<{
      _id: Id<'users'>
      name: string
      email?: string
    }> = []

    const mentionedIds = answer.mentionedUserIds || []
    for (const userId of mentionedIds) {
      const user = await ctx.db.get(userId)
      if (user) {
        mentionedUsers.push({
          _id: user._id,
          name: user.name,
          email: user.email
        })
      }
    }

    return {
      answer: {
        _id: answer._id,
        _creationTime: answer._creationTime,
        questionId: answer.questionId,
        body: answer.body,
        senderId: answer.senderId,
        recipientRole: answer.recipientRole,
        mentionedUserIds: answer.mentionedUserIds,
        ts: answer.ts
      },
      question: {
        _id: question._id,
        text: question.text
      },
      keyDev: {
        _id: keyDev._id,
        readableId: keyDev.readableId,
        title: keyDev.title,
        ownerId: keyDev.ownerId,
        requesterId: keyDev.requesterId
      },
      sender: {
        _id: sender._id,
        name: sender.name,
        email: sender.email
      },
      primaryRecipient: primaryRecipient
        ? {
            _id: primaryRecipient._id,
            name: primaryRecipient.name,
            email: primaryRecipient.email
          }
        : undefined,
      mentionedUsers
    }
  }
})
