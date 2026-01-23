import { query } from './_generated/server'
import { v } from 'convex/values'
import { keydevStatusValidator } from './schema'

/**
 * Calcola l'OKR score per un mese.
 * Score = (KeyDev Done / Budget Totale) * 100
 * Include anche le bozze senza mese associato.
 */
export const getOKRScore = query({
  args: { monthRef: v.string() },
  returns: v.object({
    score: v.number(),
    doneCount: v.number(),
    totalBudget: v.number(),
    byCategory: v.array(
      v.object({
        categoryId: v.id('categories'),
        categoryName: v.string(),
        done: v.number(),
        total: v.number()
      })
    )
  }),
  handler: async (ctx, args) => {
    // Ottieni il budget del mese
    const month = await ctx.db
      .query('months')
      .withIndex('by_monthRef', (q) => q.eq('monthRef', args.monthRef))
      .first()

    const totalBudget = month?.totalKeyDev ?? 0

    // Ottieni tutti i KeyDev del mese
    const keydevsByMonth = await ctx.db
      .query('keydevs')
      .withIndex('by_month', (q) => q.eq('monthRef', args.monthRef))
      .collect()

    // Ottieni tutte le bozze senza mese associato (che compaiono in tutti i mesi)
    const allDrafts = await ctx.db
      .query('keydevs')
      .withIndex('by_status', (q) => q.eq('status', 'Draft'))
      .collect()
    const draftsWithoutMonth = allDrafts.filter((kd) => !kd.monthRef)

    // Combina i risultati
    const keydevs = [...keydevsByMonth, ...draftsWithoutMonth]

    const doneCount = keydevs.filter((kd) => kd.status === 'Done').length
    const score = totalBudget > 0 ? (doneCount / totalBudget) * 100 : 0

    // Raggruppa per categoria
    const categories = await ctx.db.query('categories').collect()
    const byCategory = categories.map((cat) => {
      const catKeyDevs = keydevs.filter((kd) => kd.categoryId === cat._id)
      return {
        categoryId: cat._id,
        categoryName: cat.name,
        done: catKeyDevs.filter((kd) => kd.status === 'Done').length,
        total: catKeyDevs.length
      }
    }).filter((c) => c.total > 0)

    return {
      score,
      doneCount,
      totalBudget,
      byCategory
    }
  }
})

/**
 * Ottiene i KeyDev in ritardo (mese passato, non Done).
 * Esclude le bozze senza mese associato.
 */
export const getDelayedKeyDevs = query({
  args: { currentMonth: v.string() },
  returns: v.array(
    v.object({
      _id: v.id('keydevs'),
      title: v.string(),
      monthRef: v.optional(v.string()),
      status: keydevStatusValidator,
      deptId: v.id('departments'),
      categoryId: v.id('categories')
    })
  ),
  handler: async (ctx, args) => {
    const allKeyDevs = await ctx.db.query('keydevs').collect()

    return allKeyDevs
      .filter((kd) => kd.monthRef && kd.monthRef < args.currentMonth && kd.status !== 'Done')
      .map((kd) => ({
        _id: kd._id,
        title: kd.title,
        monthRef: kd.monthRef,
        status: kd.status,
        deptId: kd.deptId,
        categoryId: kd.categoryId
      }))
  }
})

/**
 * Statistiche mensili per la dashboard.
 * Include anche le bozze senza mese associato.
 */
export const getMonthlyStats = query({
  args: { monthRef: v.string() },
  returns: v.object({
    total: v.number(),
    byStatus: v.array(
      v.object({
        status: v.string(),
        count: v.number()
      })
    ),
    byDept: v.array(
      v.object({
        deptId: v.id('departments'),
        deptName: v.string(),
        count: v.number()
      })
    )
  }),
  handler: async (ctx, args) => {
    // Ottieni tutti i KeyDev del mese
    const keydevsByMonth = await ctx.db
      .query('keydevs')
      .withIndex('by_month', (q) => q.eq('monthRef', args.monthRef))
      .collect()

    // Ottieni tutte le bozze senza mese associato (che compaiono in tutti i mesi)
    const allDrafts = await ctx.db
      .query('keydevs')
      .withIndex('by_status', (q) => q.eq('status', 'Draft'))
      .collect()
    const draftsWithoutMonth = allDrafts.filter((kd) => !kd.monthRef)

    // Combina i risultati
    const keydevs = [...keydevsByMonth, ...draftsWithoutMonth]

    const departments = await ctx.db.query('departments').collect()

    // Raggruppa per stato
    const statusCounts: Record<string, number> = {}
    for (const kd of keydevs) {
      statusCounts[kd.status] = (statusCounts[kd.status] || 0) + 1
    }

    const byStatus = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count
    }))

    // Raggruppa per dipartimento
    const byDept = departments.map((dept) => ({
      deptId: dept._id,
      deptName: dept.name,
      count: keydevs.filter((kd) => kd.deptId === dept._id).length
    })).filter((d) => d.count > 0)

    return {
      total: keydevs.length,
      byStatus,
      byDept
    }
  }
})
