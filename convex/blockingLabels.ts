import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { blockingLabelStatusValidator } from './schema'

const blockingLabelReturnValidator = v.object({
  _id: v.id('blockingLabels'),
  _creationTime: v.number(),
  keyDevId: v.id('keydevs'),
  labelId: v.id('labels'),
  label: v.object({
    _id: v.id('labels'),
    _creationTime: v.number(),
    value: v.string(),
    label: v.string()
  }),
  status: blockingLabelStatusValidator
})

/**
 * Lista le label bloccanti di un KeyDev.
 */
export const listByKeyDev = query({
  args: { keyDevId: v.id('keydevs') },
  returns: v.array(blockingLabelReturnValidator),
  handler: async (ctx, args) => {
    const blockingLabels = await ctx.db
      .query('blockingLabels')
      .withIndex('by_keydev', (q) => q.eq('keyDevId', args.keyDevId))
      .collect()
    
    return await Promise.all(
      blockingLabels.map(async (bl) => {
        const label = await ctx.db.get(bl.labelId)
        if (!label) {
          throw new Error(`Label non trovata per labelId: ${bl.labelId}`)
        }
        return {
          ...bl,
          label
        }
      })
    )
  }
})

/**
 * Lista tutte le label bloccanti aperte.
 */
export const listOpen = query({
  args: {},
  returns: v.array(blockingLabelReturnValidator),
  handler: async (ctx) => {
    const blockingLabels = await ctx.db
      .query('blockingLabels')
      .withIndex('by_status', (q) => q.eq('status', 'Open'))
      .collect()
    
    return await Promise.all(
      blockingLabels.map(async (bl) => {
        const label = await ctx.db.get(bl.labelId)
        if (!label) {
          throw new Error(`Label non trovata per labelId: ${bl.labelId}`)
        }
        return {
          ...bl,
          label
        }
      })
    )
  }
})

/**
 * Lista tutte le label bloccanti (per admin).
 */
export const list = query({
  args: {},
  returns: v.array(blockingLabelReturnValidator),
  handler: async (ctx) => {
    const blockingLabels = await ctx.db.query('blockingLabels').collect()
    
    return await Promise.all(
      blockingLabels.map(async (bl) => {
        const label = await ctx.db.get(bl.labelId)
        if (!label) {
          throw new Error(`Label non trovata per labelId: ${bl.labelId}`)
        }
        return {
          ...bl,
          label
        }
      })
    )
  }
})

/**
 * Crea una nuova label bloccante.
 */
export const create = mutation({
  args: {
    keyDevId: v.id('keydevs'),
    labelId: v.id('labels')
  },
  returns: v.id('blockingLabels'),
  handler: async (ctx, args) => {
    // Verifica che la label esista
    const label = await ctx.db.get(args.labelId)
    if (!label) {
      throw new Error('Label non trovata')
    }

    // Verifica che non esista già una blocking label aperta dello stesso tipo per questo KeyDev
    const existing = await ctx.db
      .query('blockingLabels')
      .withIndex('by_keydev', (q) => q.eq('keyDevId', args.keyDevId))
      .collect()
    
    const existingOpen = existing.find((bl) => bl.labelId === args.labelId && bl.status === 'Open')
    if (existingOpen) {
      throw new Error('Esiste già una blocking label aperta di questo tipo per questo KeyDev')
    }

    return await ctx.db.insert('blockingLabels', {
      keyDevId: args.keyDevId,
      labelId: args.labelId,
      status: 'Open'
    })
  }
})

/**
 * Aggiorna lo stato di una label bloccante.
 */
export const updateStatus = mutation({
  args: {
    id: v.id('blockingLabels'),
    status: blockingLabelStatusValidator
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status })
    return null
  }
})

/**
 * Elimina una label bloccante.
 */
export const remove = mutation({
  args: { id: v.id('blockingLabels') },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id)
    return null
  }
})
