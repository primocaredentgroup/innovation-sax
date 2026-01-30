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
    byTeam: v.array(
      v.object({
        teamId: v.id('teams'),
        teamName: v.string(),
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
      .then(kds => kds.filter(kd => !kd.deletedAt))

    // Ottieni tutte le bozze senza mese associato (che compaiono in tutti i mesi)
    const allDrafts = await ctx.db
      .query('keydevs')
      .withIndex('by_status', (q) => q.eq('status', 'Draft'))
      .collect()
      .then(kds => kds.filter(kd => !kd.deletedAt))
    const draftsWithoutMonth = allDrafts.filter((kd) => !kd.monthRef)

    // Combina i risultati
    const keydevs = [...keydevsByMonth, ...draftsWithoutMonth]

    const doneCount = keydevs.filter((kd) => kd.status === 'Done').length
    const score = totalBudget > 0 ? (doneCount / totalBudget) * 100 : 0

    // Raggruppa per team
    const teams = await ctx.db.query('teams').collect()
    const byTeam = teams.map((team) => {
      const teamKeyDevs = keydevs.filter((kd) => kd.teamId === team._id)
      return {
        teamId: team._id,
        teamName: team.name,
        done: teamKeyDevs.filter((kd) => kd.status === 'Done').length,
        total: teamKeyDevs.length
      }
    }).filter((t) => t.total > 0)

    return {
      score,
      doneCount,
      totalBudget,
      byTeam
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
      teamId: v.id('teams')
    })
  ),
  handler: async (ctx, args) => {
    const allKeyDevs = await ctx.db.query('keydevs').collect().then(kds => kds.filter(kd => !kd.deletedAt))

    return allKeyDevs
      .filter((kd) => kd.monthRef && kd.monthRef < args.currentMonth && kd.status !== 'Done')
      .map((kd) => ({
        _id: kd._id,
        title: kd.title,
        monthRef: kd.monthRef,
        status: kd.status,
        deptId: kd.deptId,
        teamId: kd.teamId
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
      .then(kds => kds.filter(kd => !kd.deletedAt))

    // Ottieni tutte le bozze senza mese associato (che compaiono in tutti i mesi)
    const allDrafts = await ctx.db
      .query('keydevs')
      .withIndex('by_status', (q) => q.eq('status', 'Draft'))
      .collect()
      .then(kds => kds.filter(kd => !kd.deletedAt))
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
      .then(kds => kds.filter(kd => !kd.deletedAt))

    // Filtra solo quelli con status >= FrontValidated
    const validStatuses = ['FrontValidated', 'InProgress', 'Done', 'Checked'] as const
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
 * Ottiene i KeyDev filtrati per mese con status >= "FrontValidated", raggruppati per team e stato.
 */
export const getKeyDevsByTeamAndStatus = query({
  args: { monthRef: v.string() },
  returns: v.object({
    byTeam: v.array(
      v.object({
        teamId: v.id('teams'),
        teamName: v.string(),
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
      .then(kds => kds.filter(kd => !kd.deletedAt))

    // Filtra solo quelli con status >= FrontValidated
    const validStatuses = ['FrontValidated', 'InProgress', 'Done', 'Checked'] as const
    const filteredKeydevs = keydevsByMonth.filter((kd) =>
      validStatuses.includes(kd.status as typeof validStatuses[number])
    )

    // Ottieni tutti i team
    const teams = await ctx.db.query('teams').collect()

    // Raggruppa per team e stato
    const byTeam = teams.map((team) => {
      const teamKeydevs = filteredKeydevs.filter((kd) => kd.teamId === team._id)
      
      const statusCounts: Record<string, number> = {}
      for (const kd of teamKeydevs) {
        statusCounts[kd.status] = (statusCounts[kd.status] || 0) + 1
      }

      const byStatus = validStatuses.map((status) => ({
        status,
        count: statusCounts[status] || 0
      }))

      return {
        teamId: team._id,
        teamName: team.name,
        byStatus
      }
    }).filter((team) => team.byStatus.some((s) => s.count > 0))

    return {
      byTeam
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
 * Ottiene i KeyDev scaduti (mese precedente all'attuale e non ancora in stato "Checked").
 * Mostra sempre tutti i keydevs scaduti, indipendentemente dal mese selezionato.
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
      teamId: v.id('teams')
    })
  ),
  handler: async (ctx, args) => {
    const allKeyDevs = await ctx.db.query('keydevs').collect().then(kds => kds.filter(kd => !kd.deletedAt))

    return allKeyDevs
      .filter((kd) => kd.monthRef && kd.monthRef < args.currentMonth && kd.status !== 'Checked')
      .map((kd) => ({
        _id: kd._id,
        readableId: kd.readableId,
        title: kd.title,
        monthRef: kd.monthRef,
        status: kd.status,
        deptId: kd.deptId,
        teamId: kd.teamId
      }))
  }
})

/**
 * Ottiene tutti gli update divisi per settimana.
 */
export const getUpdatesByWeek = query({
  args: { monthRef: v.optional(v.string()) },
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
  handler: async (ctx, args) => {
    let allUpdates
    if (args.monthRef) {
      allUpdates = await ctx.db
        .query('coreAppUpdates')
        .withIndex('by_month', (q) => q.eq('monthRef', args.monthRef))
        .collect()
    } else {
      allUpdates = await ctx.db.query('coreAppUpdates').collect()
    }
    
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
