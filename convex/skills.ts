import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

const skillListItemValidator = v.object({
  _id: v.id('skills'),
  _creationTime: v.number(),
  name: v.string(),
  description: v.string(),
  text: v.string(),
  hasZipFile: v.boolean()
})

const skillDetailValidator = v.object({
  _id: v.id('skills'),
  _creationTime: v.number(),
  name: v.string(),
  description: v.string(),
  text: v.string(),
  zipFile: v.optional(v.id('_storage')),
  zipFileUrl: v.optional(v.string())
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
      hasZipFile: Boolean(skill.zipFile)
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
    const skill = await ctx.db.get(args.id)
    if (!skill) return null

    const zipFileUrl = skill.zipFile
      ? ((await ctx.storage.getUrl(skill.zipFile)) ?? undefined)
      : undefined

    return {
      ...skill,
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
      zipFile: args.zipFile
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
