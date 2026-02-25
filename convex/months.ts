import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

/**
 * Lista tutti i mesi configurati.
 */
export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('months'),
      _creationTime: v.number(),
      monthRef: v.string(),
      teamId: v.optional(v.id('teams')),
      totalKeyDev: v.number()
    })
  ),
  handler: async (ctx) => {
    return await ctx.db.query('months').collect()
  }
})

/**
 * Ottiene un mese per riferimento.
 */
export const getByRef = query({
  args: { monthRef: v.string() },
  returns: v.union(
    v.object({
      _id: v.id('months'),
      _creationTime: v.number(),
      monthRef: v.string(),
      teamId: v.optional(v.id('teams')),
      totalKeyDev: v.number()
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const months = await ctx.db
      .query('months')
      .withIndex('by_monthRef', (q) => q.eq('monthRef', args.monthRef))
      .collect()
    return months.find((m) => !m.teamId) ?? null
  }
})

/**
 * Ottiene il limite sviluppatori per uno specifico mese+team.
 */
export const getByMonthAndTeam = query({
  args: {
    monthRef: v.string(),
    teamId: v.id('teams')
  },
  returns: v.union(
    v.object({
      _id: v.id('months'),
      _creationTime: v.number(),
      monthRef: v.string(),
      teamId: v.id('teams'),
      totalKeyDev: v.number()
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const month = await ctx.db
      .query('months')
      .withIndex('by_monthRef_and_team', (q) =>
        q.eq('monthRef', args.monthRef).eq('teamId', args.teamId)
      )
      .first()

    if (!month || !month.teamId) {
      return null
    }

    return {
      ...month,
      teamId: month.teamId
    }
  }
})

/**
 * Ottiene tutti i limiti configurati per team in un mese.
 */
export const listByMonth = query({
  args: { monthRef: v.string() },
  returns: v.array(
    v.object({
      _id: v.id('months'),
      _creationTime: v.number(),
      monthRef: v.string(),
      teamId: v.id('teams'),
      totalKeyDev: v.number()
    })
  ),
  handler: async (ctx, args) => {
    const months = await ctx.db
      .query('months')
      .withIndex('by_monthRef', (q) => q.eq('monthRef', args.monthRef))
      .collect()

    return months
      .filter((m) => !!m.teamId)
      .map((m) => ({
        ...m,
        teamId: m.teamId!
      }))
  }
})

/**
 * Crea o aggiorna un mese.
 */
export const upsert = mutation({
  args: {
    monthRef: v.string(),
    teamId: v.optional(v.id('teams')),
    totalKeyDev: v.number()
  },
  returns: v.id('months'),
  handler: async (ctx, args) => {
    if (args.teamId) {
      const existingTeam = await ctx.db
        .query('months')
        .withIndex('by_monthRef_and_team', (q) =>
          q.eq('monthRef', args.monthRef).eq('teamId', args.teamId!)
        )
        .first()

      if (existingTeam) {
        await ctx.db.patch(existingTeam._id, { totalKeyDev: args.totalKeyDev })
        return existingTeam._id
      }

      return await ctx.db.insert('months', {
        monthRef: args.monthRef,
        teamId: args.teamId,
        totalKeyDev: args.totalKeyDev
      })
    }

    const existingByMonth = await ctx.db
      .query('months')
      .withIndex('by_monthRef', (q) => q.eq('monthRef', args.monthRef))
      .collect()
    const existingLegacy = existingByMonth.find((m) => !m.teamId)

    if (existingLegacy) {
      await ctx.db.patch(existingLegacy._id, { totalKeyDev: args.totalKeyDev })
      return existingLegacy._id
    }

    return await ctx.db.insert('months', {
      monthRef: args.monthRef,
      totalKeyDev: args.totalKeyDev
    })
  }
})

/**
 * Copia i limiti sviluppatori per team da un mese sorgente al mese di destinazione.
 * Copia solo i record con teamId (limiti per team). Sovrascrive quelli esistenti.
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

    const sourceMonths = await ctx.db
      .query('months')
      .withIndex('by_monthRef', (q) => q.eq('monthRef', args.sourceMonthRef))
      .collect()

    const sourceByTeam = sourceMonths.filter((m) => !!m.teamId)
    let copied = 0

    for (const m of sourceByTeam) {
      const existing = await ctx.db
        .query('months')
        .withIndex('by_monthRef_and_team', (q) =>
          q.eq('monthRef', args.targetMonthRef).eq('teamId', m.teamId!)
        )
        .first()

      if (existing) {
        await ctx.db.patch(existing._id, { totalKeyDev: m.totalKeyDev })
      } else {
        await ctx.db.insert('months', {
          monthRef: args.targetMonthRef,
          teamId: m.teamId,
          totalKeyDev: m.totalKeyDev
        })
      }
      copied++
    }

    return { copied }
  }
})

/**
 * Migrazione one-time: converte i record months legacy (senza teamId) in record per team.
 * Distribuisce totalKeyDev in modo equo tra tutti i team.
 * I record legacy vengono mantenuti per compatibilità; la nuova logica userà i record per team.
 *
 * Eseguire manualmente dalla Dashboard Convex: Functions → months → migrateLegacyMonthsToTeamLimits → Run
 */
export const migrateLegacyMonthsToTeamLimits = mutation({
  args: {},
  returns: v.object({
    migrated: v.number(),
    created: v.number(),
    skipped: v.number(),
    message: v.string()
  }),
  handler: async (ctx) => {
    const teams = await ctx.db.query('teams').collect()
    if (teams.length === 0) {
      return {
        migrated: 0,
        created: 0,
        skipped: 0,
        message: 'Nessun team trovato. Crea prima i team.'
      }
    }

    const allMonths = await ctx.db.query('months').collect()
    const legacyMonths = allMonths.filter((m) => !m.teamId)

    if (legacyMonths.length === 0) {
      return {
        migrated: 0,
        created: 0,
        skipped: 0,
        message: 'Nessun record months legacy da migrare.'
      }
    }

    let created = 0
    let skipped = 0

    for (const month of legacyMonths) {
      const total = month.totalKeyDev
      const perTeam = Math.floor(total / teams.length)
      const remainder = total - perTeam * teams.length

      for (let i = 0; i < teams.length; i++) {
        const amount = perTeam + (i < remainder ? 1 : 0)
        const existing = await ctx.db
          .query('months')
          .withIndex('by_monthRef_and_team', (q) =>
            q.eq('monthRef', month.monthRef).eq('teamId', teams[i]._id)
          )
          .first()

        if (existing) {
          skipped++
          continue
        }

        await ctx.db.insert('months', {
          monthRef: month.monthRef,
          teamId: teams[i]._id,
          totalKeyDev: amount
        })
        created++
      }
    }

    return {
      migrated: legacyMonths.length,
      created,
      skipped,
      message: `Migrati ${legacyMonths.length} mesi legacy, creati ${created} record per team${skipped > 0 ? `, ${skipped} già esistenti saltati` : ''}.`
    }
  }
})
