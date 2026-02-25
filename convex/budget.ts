import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

/**
 * Ottiene tutte le allocazioni budget per un mese.
 */
export const getByMonth = query({
  args: { monthRef: v.string() },
  returns: v.array(
    v.object({
      _id: v.id('budgetKeyDev'),
      _creationTime: v.number(),
      monthRef: v.string(),
      deptId: v.id('departments'),
      teamId: v.id('teams'),
      maxAlloc: v.number()
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('budgetKeyDev')
      .withIndex('by_month', (q) => q.eq('monthRef', args.monthRef))
      .collect()
  }
})

/**
 * Ottiene l'allocazione per una specifica combinazione mese/dept/team.
 */
export const getByMonthDeptTeam = query({
  args: {
    monthRef: v.string(),
    deptId: v.id('departments'),
    teamId: v.id('teams')
  },
  returns: v.union(
    v.object({
      _id: v.id('budgetKeyDev'),
      _creationTime: v.number(),
      monthRef: v.string(),
      deptId: v.id('departments'),
      teamId: v.id('teams'),
      maxAlloc: v.number()
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('budgetKeyDev')
      .withIndex('by_month_dept_team', (q) =>
        q
          .eq('monthRef', args.monthRef)
          .eq('deptId', args.deptId)
          .eq('teamId', args.teamId)
      )
      .first()
  }
})

/**
 * Crea o aggiorna un'allocazione budget.
 */
export const upsert = mutation({
  args: {
    monthRef: v.string(),
    deptId: v.id('departments'),
    teamId: v.id('teams'),
    maxAlloc: v.number()
  },
  returns: v.id('budgetKeyDev'),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('budgetKeyDev')
      .withIndex('by_month_dept_team', (q) =>
        q
          .eq('monthRef', args.monthRef)
          .eq('deptId', args.deptId)
          .eq('teamId', args.teamId)
      )
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, { maxAlloc: args.maxAlloc })
      return existing._id
    }

    return await ctx.db.insert('budgetKeyDev', {
      monthRef: args.monthRef,
      deptId: args.deptId,
      teamId: args.teamId,
      maxAlloc: args.maxAlloc
    })
  }
})

/**
 * Elimina un'allocazione budget.
 */
export const remove = mutation({
  args: { id: v.id('budgetKeyDev') },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id)
    return null
  }
})

/**
 * Copia tutte le allocazioni budget da un mese sorgente al mese di destinazione.
 * Sovrascrive le allocazioni esistenti per il mese di destinazione.
 */
export const copyFromMonth = mutation({
  args: {
    sourceMonthRef: v.string(),
    targetMonthRef: v.string()
  },
  returns: v.object({
    copied: v.number()
  }),
  handler: async (ctx, args) => {
    if (args.sourceMonthRef === args.targetMonthRef) {
      return { copied: 0 }
    }

    const sourceAllocations = await ctx.db
      .query('budgetKeyDev')
      .withIndex('by_month', (q) => q.eq('monthRef', args.sourceMonthRef))
      .collect()

    let copied = 0
    for (const alloc of sourceAllocations) {
      const existing = await ctx.db
        .query('budgetKeyDev')
        .withIndex('by_month_dept_team', (q) =>
          q
            .eq('monthRef', args.targetMonthRef)
            .eq('deptId', alloc.deptId)
            .eq('teamId', alloc.teamId)
        )
        .first()

      if (existing) {
        await ctx.db.patch(existing._id, { maxAlloc: alloc.maxAlloc })
      } else {
        await ctx.db.insert('budgetKeyDev', {
          monthRef: args.targetMonthRef,
          deptId: alloc.deptId,
          teamId: alloc.teamId,
          maxAlloc: alloc.maxAlloc
        })
      }
      copied++
    }

    return { copied }
  }
})
