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
      categoryId: v.id('categories'),
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
 * Ottiene l'allocazione per una specifica combinazione mese/dept/category.
 */
export const getByMonthDeptCategory = query({
  args: {
    monthRef: v.string(),
    deptId: v.id('departments'),
    categoryId: v.id('categories')
  },
  returns: v.union(
    v.object({
      _id: v.id('budgetKeyDev'),
      _creationTime: v.number(),
      monthRef: v.string(),
      deptId: v.id('departments'),
      categoryId: v.id('categories'),
      maxAlloc: v.number()
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('budgetKeyDev')
      .withIndex('by_month_dept_category', (q) =>
        q
          .eq('monthRef', args.monthRef)
          .eq('deptId', args.deptId)
          .eq('categoryId', args.categoryId)
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
    categoryId: v.id('categories'),
    maxAlloc: v.number()
  },
  returns: v.id('budgetKeyDev'),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('budgetKeyDev')
      .withIndex('by_month_dept_category', (q) =>
        q
          .eq('monthRef', args.monthRef)
          .eq('deptId', args.deptId)
          .eq('categoryId', args.categoryId)
      )
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, { maxAlloc: args.maxAlloc })
      return existing._id
    }

    return await ctx.db.insert('budgetKeyDev', {
      monthRef: args.monthRef,
      deptId: args.deptId,
      categoryId: args.categoryId,
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
