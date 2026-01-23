import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

const labelReturnValidator = v.object({
  _id: v.id('labels'),
  _creationTime: v.number(),
  value: v.string(),
  label: v.string()
})

/**
 * Lista tutte le labels disponibili.
 */
export const list = query({
  args: {},
  returns: v.array(labelReturnValidator),
  handler: async (ctx) => {
    return await ctx.db.query('labels').collect()
  }
})

/**
 * Ottiene una label per ID.
 */
export const get = query({
  args: { id: v.id('labels') },
  returns: v.union(labelReturnValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  }
})

/**
 * Ottiene una label per valore.
 */
export const getByValue = query({
  args: { value: v.string() },
  returns: v.union(labelReturnValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('labels')
      .withIndex('by_value', (q) => q.eq('value', args.value))
      .first()
  }
})

/**
 * Crea una nuova label.
 */
export const create = mutation({
  args: {
    value: v.string(),
    label: v.string()
  },
  returns: v.id('labels'),
  handler: async (ctx, args) => {
    // Verifica che non esista già una label con lo stesso valore
    const existing = await ctx.db
      .query('labels')
      .withIndex('by_value', (q) => q.eq('value', args.value))
      .first()
    
    if (existing) {
      throw new Error(`Esiste già una label con il valore "${args.value}"`)
    }

    return await ctx.db.insert('labels', {
      value: args.value,
      label: args.label
    })
  }
})

/**
 * Aggiorna una label esistente.
 */
export const update = mutation({
  args: {
    id: v.id('labels'),
    value: v.optional(v.string()),
    label: v.optional(v.string())
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const label = await ctx.db.get(args.id)
    if (!label) {
      throw new Error('Label non trovata')
    }

    // Se si sta cambiando il valore, verifica che non esista già
    if (args.value !== undefined && args.value !== label.value) {
      const newValue = args.value
      const existing = await ctx.db
        .query('labels')
        .withIndex('by_value', (q) => q.eq('value', newValue))
        .first()
      
      if (existing) {
        throw new Error(`Esiste già una label con il valore "${newValue}"`)
      }
    }

    const updates: { value?: string; label?: string } = {}
    if (args.value !== undefined) updates.value = args.value
    if (args.label !== undefined) updates.label = args.label

    await ctx.db.patch(args.id, updates)
    return null
  }
})

/**
 * Elimina una label.
 */
export const remove = mutation({
  args: { id: v.id('labels') },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verifica che non ci siano blocking labels che usano questa label
    const blockingLabels = await ctx.db
      .query('blockingLabels')
      .withIndex('by_label', (q) => q.eq('labelId', args.id))
      .first()
    
    if (blockingLabels) {
      throw new Error('Non è possibile eliminare una label che è ancora in uso da blocking labels')
    }

    await ctx.db.delete(args.id)
    return null
  }
})

/**
 * Inizializza le labels predefinite se non esistono già.
 * Questa funzione può essere chiamata dall'admin per popolare le labels iniziali.
 */
export const initializeDefaults = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const defaultLabels = [
      { value: 'Improvement', label: 'Miglioramento' },
      { value: 'Bug', label: 'Bug' },
      { value: 'TechDebt', label: 'Debito Tecnico' }
    ]

    for (const defaultLabel of defaultLabels) {
      const existing = await ctx.db
        .query('labels')
        .withIndex('by_value', (q) => q.eq('value', defaultLabel.value))
        .first()
      
      if (!existing) {
        await ctx.db.insert('labels', defaultLabel)
      }
    }

    return null
  }
})
