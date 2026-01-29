import { internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { noteTypeValidator } from "./schema";

/**
 * Query interna per recuperare i dati completi della nota con contesto
 */
export const getNoteWithContext = internalQuery({
  args: {
    noteId: v.id("notes"),
    keyDevId: v.id("keydevs"),
    mentionedUserId: v.id("users"),
  },
  returns: v.union(
    v.object({
      note: v.object({
        _id: v.id("notes"),
        _creationTime: v.number(),
        keyDevId: v.id("keydevs"),
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
