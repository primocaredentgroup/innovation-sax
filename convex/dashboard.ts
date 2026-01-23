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

/**
 * Ottiene i KeyDev filtrati per mese con status >= "FrontValidated".
 * Mostra solo FrontValidated, InProgress, Done.
 */
export const getKeyDevsByStatus = query({
  args: { monthRef: v.string() },
  returns: v.object({
    byStatus: v.array(
      v.object({
        status: v.string(),
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

    // Filtra solo quelli con status >= FrontValidated
    const validStatuses = ['FrontValidated', 'InProgress', 'Done'] as const
    const filteredKeydevs = keydevsByMonth.filter((kd) =>
      validStatuses.includes(kd.status as typeof validStatuses[number])
    )

    // Raggruppa per stato
    const statusCounts: Record<string, number> = {}
    for (const kd of filteredKeydevs) {
      statusCounts[kd.status] = (statusCounts[kd.status] || 0) + 1
    }

    // Assicurati che tutti gli stati validi siano presenti (anche con count 0)
    const byStatus = validStatuses.map((status) => ({
      status,
      count: statusCounts[status] || 0
    }))

    return {
      byStatus
    }
  }
})

/**
 * Ottiene i KeyDev filtrati per mese con status >= "FrontValidated", raggruppati per categoria e stato.
 */
export const getKeyDevsByCategoryAndStatus = query({
  args: { monthRef: v.string() },
  returns: v.object({
    byCategory: v.array(
      v.object({
        categoryId: v.id('categories'),
        categoryName: v.string(),
        byStatus: v.array(
          v.object({
            status: v.string(),
            count: v.number()
          })
        )
      })
    )
  }),
  handler: async (ctx, args) => {
    // Ottieni tutti i KeyDev del mese
    const keydevsByMonth = await ctx.db
      .query('keydevs')
      .withIndex('by_month', (q) => q.eq('monthRef', args.monthRef))
      .collect()

    // Filtra solo quelli con status >= FrontValidated
    const validStatuses = ['FrontValidated', 'InProgress', 'Done'] as const
    const filteredKeydevs = keydevsByMonth.filter((kd) =>
      validStatuses.includes(kd.status as typeof validStatuses[number])
    )

    // Ottieni tutte le categorie
    const categories = await ctx.db.query('categories').collect()

    // Raggruppa per categoria e stato
    const byCategory = categories.map((cat) => {
      const catKeydevs = filteredKeydevs.filter((kd) => kd.categoryId === cat._id)
      
      const statusCounts: Record<string, number> = {}
      for (const kd of catKeydevs) {
        statusCounts[kd.status] = (statusCounts[kd.status] || 0) + 1
      }

      const byStatus = validStatuses.map((status) => ({
        status,
        count: statusCounts[status] || 0
      }))

      return {
        categoryId: cat._id,
        categoryName: cat.name,
        byStatus
      }
    }).filter((cat) => cat.byStatus.some((s) => s.count > 0))

    return {
      byCategory
    }
  }
})

/**
 * Ottiene tutte le Core Apps con le loro percentuali di completamento.
 */
export const getCoreAppsStats = query({
  args: {},
  returns: v.object({
    total: v.number(),
    apps: v.array(
      v.object({
        _id: v.id('coreApps'),
        name: v.string(),
        percentComplete: v.number(),
        status: v.union(
          v.literal('Planning'),
          v.literal('InProgress'),
          v.literal('Completed')
        )
      })
    ),
    averagePercentComplete: v.number()
  }),
  handler: async (ctx) => {
    const coreApps = await ctx.db.query('coreApps').collect()

    const total = coreApps.length
    const sumPercent = coreApps.reduce((sum, app) => sum + app.percentComplete, 0)
    const averagePercentComplete = total > 0 ? sumPercent / total : 0

    return {
      total,
      apps: coreApps.map((app) => ({
        _id: app._id,
        name: app.name,
        percentComplete: app.percentComplete,
        status: app.status
      })),
      averagePercentComplete
    }
  }
})

/**
 * Ottiene i KeyDev passati (Done di mesi precedenti).
 */
export const getPastKeyDevs = query({
  args: { currentMonth: v.string() },
  returns: v.array(
    v.object({
      _id: v.id('keydevs'),
      readableId: v.string(),
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
      .filter((kd) => kd.status === 'Done' && kd.monthRef && kd.monthRef < args.currentMonth)
      .map((kd) => ({
        _id: kd._id,
        readableId: kd.readableId,
        title: kd.title,
        monthRef: kd.monthRef,
        status: kd.status,
        deptId: kd.deptId,
        categoryId: kd.categoryId
      }))
  }
})

/**
 * Ottiene tutti gli update divisi per settimana.
 */
export const getUpdatesByWeek = query({
  args: {},
  returns: v.array(
    v.object({
      weekRef: v.string(),
      updates: v.array(
        v.object({
          _id: v.id('coreAppUpdates'),
          coreAppId: v.id('coreApps'),
          coreAppName: v.string(),
          percentComplete: v.number(),
          loomUrl: v.optional(v.string()),
          title: v.optional(v.string()),
          notes: v.optional(v.string()),
          createdAt: v.number()
        })
      )
    })
  ),
  handler: async (ctx) => {
    const allUpdates = await ctx.db.query('coreAppUpdates').collect()
    const coreApps = await ctx.db.query('coreApps').collect()
    const coreAppsMap = new Map(coreApps.map((app) => [app._id, { name: app.name, percentComplete: app.percentComplete }]))

    // Raggruppa per settimana
    const byWeek: Record<string, typeof allUpdates> = {}
    for (const update of allUpdates) {
      if (!byWeek[update.weekRef]) {
        byWeek[update.weekRef] = []
      }
      byWeek[update.weekRef].push(update)
    }

    // Converti in array e ordina per settimana (decrescente)
    const result = Object.entries(byWeek)
      .map(([weekRef, updates]) => ({
        weekRef,
        updates: updates
          .map((update) => {
            const appInfo = coreAppsMap.get(update.coreAppId)
            return {
              _id: update._id,
              coreAppId: update.coreAppId,
              coreAppName: appInfo?.name || 'Unknown',
              percentComplete: appInfo?.percentComplete || 0,
              loomUrl: update.loomUrl,
              title: update.title,
              notes: update.notes,
              createdAt: update.createdAt
            }
          })
          .sort((a, b) => b.createdAt - a.createdAt)
      }))
      .sort((a, b) => b.weekRef.localeCompare(a.weekRef))

    return result
  }
})
