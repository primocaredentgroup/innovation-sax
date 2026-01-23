import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { blockingLabelValidator, blockingLabelStatusValidator } from './schema'

const blockingLabelReturnValidator = v.object({
  _id: v.id('blockingLabels'),
  _creationTime: v.number(),
  keyDevId: v.id('keydevs'),
  label: blockingLabelValidator,
  status: blockingLabelStatusValidator
})

/**
 * Lista le label bloccanti di un KeyDev.
 */
export const listByKeyDev = query({
  args: { keyDevId: v.id('keydevs') },
  returns: v.array(blockingLabelReturnValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('blockingLabels')
      .withIndex('by_keydev', (q) => q.eq('keyDevId', args.keyDevId))
      .collect()
  }
})

/**
 * Lista tutte le label bloccanti aperte.
 */
export const listOpen = query({
  args: {},
  returns: v.array(blockingLabelReturnValidator),
  handler: async (ctx) => {
    return await ctx.db
      .query('blockingLabels')
      .withIndex('by_status', (q) => q.eq('status', 'Open'))
      .collect()
  }
})

/**
 * Crea una nuova label bloccante.
 */
export const create = mutation({
  args: {
    keyDevId: v.id('keydevs'),
    label: blockingLabelValidator
  },
  returns: v.id('blockingLabels'),
  handler: async (ctx, args) => {
    return await ctx.db.insert('blockingLabels', {
      keyDevId: args.keyDevId,
      label: args.label,
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
