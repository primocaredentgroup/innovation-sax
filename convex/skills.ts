import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

const skillListItemValidator = v.object({
  _id: v.id('skills'),
  _creationTime: v.number(),
  name: v.string(),
  description: v.string(),
  text: v.string(),
  hasZipFile: v.boolean(),
  starsCount: v.number()
})

const skillDetailValidator = v.object({
  _id: v.id('skills'),
  _creationTime: v.number(),
  name: v.string(),
  description: v.string(),
  text: v.string(),
  zipFile: v.optional(v.id('_storage')),
  zipFileUrl: v.optional(v.string()),
  stars: v.array(v.id('users')),
  starsCount: v.number(),
  starredByCurrentUser: v.boolean(),
  starredUsers: v.array(
    v.object({
      _id: v.id('users'),
      name: v.string(),
      pictureUrl: v.optional(v.string())
    })
  )
})

/**
 * Lista skills (con ricerca per nome).
 */
export const list = query({
  args: {
    search: v.optional(v.string())
  },
  returns: v.array(skillListItemValidator),
  handler: async (ctx, args) => {
    const search = args.search?.trim()
    const skills = search
      ? await ctx.db
          .query('skills')
          .withSearchIndex('search_name', (q) => q.search('name', search))
          .take(100)
      : await ctx.db.query('skills').order('desc').collect()

    return skills.map((skill) => ({
      _id: skill._id,
      _creationTime: skill._creationTime,
      name: skill.name,
      description: skill.description,
      text: skill.text,
      hasZipFile: Boolean(skill.zipFile),
      starsCount: skill.stars?.length ?? 0
    }))
  }
})

/**
 * Dettaglio skill.
 */
export const getById = query({
  args: { id: v.id('skills') },
  returns: v.union(skillDetailValidator, v.null()),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    const skill = await ctx.db.get(args.id)
    if (!skill) return null

    const stars = skill.stars ?? []
    const zipFileUrl = skill.zipFile
      ? ((await ctx.storage.getUrl(skill.zipFile)) ?? undefined)
      : undefined

    const starredUsers = await Promise.all(
      stars.map(async (userId) => {
        const user = await ctx.db.get(userId)
        if (!user) return null

        let pictureUrl: string | undefined
        if (user.pictureStorageId) {
          pictureUrl = (await ctx.storage.getUrl(user.pictureStorageId)) ?? undefined
        } else if (user.picture) {
          pictureUrl = user.picture
        }

        return {
          _id: user._id,
          name: user.name,
          pictureUrl
        }
      })
    )

    const currentUser = identity
      ? await ctx.db
          .query('users')
          .withIndex('by_sub', (q) => q.eq('sub', identity.subject))
          .first()
      : null

    return {
      ...skill,
      stars,
      starsCount: stars.length,
      starredByCurrentUser: currentUser ? stars.includes(currentUser._id) : false,
      starredUsers: starredUsers.filter((user) => user !== null),
      zipFileUrl
    }
  }
})

/**
 * Crea una skill.
 */
export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    text: v.string(),
    zipFile: v.optional(v.id('_storage'))
  },
  returns: v.id('skills'),
  handler: async (ctx, args) => {
    return await ctx.db.insert('skills', {
      name: args.name,
      description: args.description,
      text: args.text,
      zipFile: args.zipFile,
      stars: []
    })
  }
})

/**
 * Aggiorna una skill.
 */
export const update = mutation({
  args: {
    id: v.id('skills'),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    text: v.optional(v.string()),
    zipFile: v.optional(v.id('_storage'))
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id)
    if (!existing) {
      throw new Error('Skill non trovata')
    }

    if (args.zipFile && existing.zipFile && existing.zipFile !== args.zipFile) {
      await ctx.storage.delete(existing.zipFile)
    }

    const { id, ...updates } = args
    await ctx.db.patch(id, updates)
    return null
  }
})

/**
 * Elimina una skill.
 */
export const remove = mutation({
  args: {
    id: v.id('skills')
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id)
    if (!existing) {
      return null
    }

    if (existing.zipFile) {
      await ctx.storage.delete(existing.zipFile)
    }

    await ctx.db.delete(args.id)
    return null
  }
})

/**
 * Genera URL per upload di Skill.zip.
 */
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl()
  }
})

/**
 * Aggiunge/rimuove la stella della skill dall'utente corrente.
 */
export const toggleStar = mutation({
  args: {
    skillId: v.id('skills')
  },
  returns: v.object({
    starred: v.boolean(),
    starsCount: v.number()
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Non autenticato')
    }

    const currentUser = await ctx.db
      .query('users')
      .withIndex('by_sub', (q) => q.eq('sub', identity.subject))
      .first()

    if (!currentUser) {
      throw new Error('Utente non trovato')
    }

    const skill = await ctx.db.get(args.skillId)
    if (!skill) {
      throw new Error('Skill non trovata')
    }

    const currentStars = skill.stars ?? []
    const isStarred = currentStars.includes(currentUser._id)
    const nextStars = isStarred
      ? currentStars.filter((userId) => userId !== currentUser._id)
      : [...currentStars, currentUser._id]

    await ctx.db.patch(args.skillId, { stars: nextStars })

    return {
      starred: !isStarred,
      starsCount: nextStars.length
    }
  }
})
