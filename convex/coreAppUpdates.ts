import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

const coreAppUpdateReturnValidator = v.object({
  _id: v.id('coreAppUpdates'),
  _creationTime: v.number(),
  coreAppId: v.id('coreApps'),
  weekRef: v.string(),
  monthRef: v.optional(v.string()),
  loomUrl: v.optional(v.string()),
  title: v.optional(v.string()),
  notes: v.optional(v.string()),
  createdAt: v.number()
})

/**
 * Lista gli aggiornamenti di una Core App.
 */
export const listByCoreApp = query({
  args: { 
    coreAppId: v.id('coreApps'),
    monthRef: v.optional(v.string())
  },
  returns: v.array(coreAppUpdateReturnValidator),
  handler: async (ctx, args) => {
    if (args.monthRef) {
      return await ctx.db
        .query('coreAppUpdates')
        .withIndex('by_coreApp_and_month', (q) => 
          q.eq('coreAppId', args.coreAppId).eq('monthRef', args.monthRef)
        )
        .order('desc')
        .collect()
    }
    return await ctx.db
      .query('coreAppUpdates')
      .withIndex('by_coreApp', (q) => q.eq('coreAppId', args.coreAppId))
      .order('desc')
      .collect()
  }
})

/**
 * Lista tutti gli aggiornamenti di una settimana.
 */
export const listByWeek = query({
  args: { weekRef: v.string() },
  returns: v.array(coreAppUpdateReturnValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('coreAppUpdates')
      .withIndex('by_week', (q) => q.eq('weekRef', args.weekRef))
      .collect()
  }
})

/**
 * Lista tutti gli aggiornamenti di un mese.
 */
export const listByMonth = query({
  args: { monthRef: v.string() },
  returns: v.array(coreAppUpdateReturnValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('coreAppUpdates')
      .withIndex('by_month', (q) => q.eq('monthRef', args.monthRef))
      .order('desc')
      .collect()
  }
})

/**
 * Crea un nuovo aggiornamento settimanale.
 */
export const create = mutation({
  args: {
    coreAppId: v.id('coreApps'),
    weekRef: v.string(),
    monthRef: v.optional(v.string()),
    loomUrl: v.optional(v.string()),
    title: v.optional(v.string()),
    notes: v.optional(v.string())
  },
  returns: v.id('coreAppUpdates'),
  handler: async (ctx, args) => {
    return await ctx.db.insert('coreAppUpdates', {
      coreAppId: args.coreAppId,
      weekRef: args.weekRef,
      monthRef: args.monthRef,
      loomUrl: args.loomUrl,
      title: args.title,
      notes: args.notes,
      createdAt: Date.now()
    })
  }
})

/**
 * Aggiorna un aggiornamento settimanale.
 */
export const update = mutation({
  args: {
    id: v.id('coreAppUpdates'),
    monthRef: v.optional(v.string()),
    loomUrl: v.optional(v.string()),
    title: v.optional(v.string()),
    notes: v.optional(v.string())
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...updates } = args
    
    // Verifica se dobbiamo cancellare qualche campo (stringa vuota per title/notes)
    const needsDeletion = 
      (updates.title !== undefined && updates.title.trim() === '') ||
      (updates.notes !== undefined && updates.notes.trim() === '')
    
    if (needsDeletion) {
      // Se dobbiamo cancellare campi, usa replace per poter impostare i campi a undefined
      const existing = await ctx.db.get(id)
      if (!existing) {
        throw new Error('Update non trovato')
      }
      
      // Costruisce il documento aggiornato rimuovendo i campi di sistema
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id: _unusedId, _creationTime: _unusedCreationTime, ...docWithoutSystemFields } = existing
      const updatedDoc = {
        ...docWithoutSystemFields,
        monthRef: updates.monthRef !== undefined ? (updates.monthRef || undefined) : existing.monthRef,
        loomUrl: updates.loomUrl !== undefined ? (updates.loomUrl || undefined) : existing.loomUrl,
        title: updates.title !== undefined ? (updates.title.trim() === '' ? undefined : updates.title.trim()) : existing.title,
        notes: updates.notes !== undefined ? (updates.notes.trim() === '' ? undefined : updates.notes.trim()) : existing.notes
      }
      
      await ctx.db.replace(id, updatedDoc)
    } else {
      // Altrimenti usa patch per aggiornare solo i campi modificati
      const filteredUpdates: {
        monthRef?: string
        loomUrl?: string
        title?: string
        notes?: string
      } = {}
      
      if (updates.monthRef !== undefined) {
        filteredUpdates.monthRef = updates.monthRef || undefined
      }
      if (updates.loomUrl !== undefined) {
        filteredUpdates.loomUrl = updates.loomUrl || undefined
      }
      if (updates.title !== undefined) {
        filteredUpdates.title = updates.title.trim()
      }
      if (updates.notes !== undefined) {
        filteredUpdates.notes = updates.notes.trim()
      }
      
      await ctx.db.patch(id, filteredUpdates)
    }
    
    return null
  }
})

/**
 * Elimina un aggiornamento settimanale.
 */
export const remove = mutation({
  args: { id: v.id('coreAppUpdates') },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id)
    return null
  }
})
