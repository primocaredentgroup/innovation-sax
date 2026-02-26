import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import type { Doc } from './_generated/dataModel'
import { internal } from './_generated/api'
import { keydevStatusValidator, keydevWeightValidator, keydevPriorityValidator } from './schema'
import { hasRole, isAdmin } from './users'

// Tipo per i ruoli
type Role = 'Requester' | 'BusinessValidator' | 'TechValidator' | 'Admin'

// Ordine degli stati nel processo
const statusOrder = ['Draft', 'MockupDone', 'Rejected', 'Approved', 'FrontValidated', 'InProgress', 'Done']

// Helper per determinare se si sta andando avanti o indietro nello stato
const isMovingForward = (currentStatus: string, newStatus: string): boolean => {
  const currentIndex = statusOrder.indexOf(currentStatus)
  const newIndex = statusOrder.indexOf(newStatus)
  if (currentIndex === -1 || newIndex === -1) return false
  return newIndex > currentIndex
}

const keydevReturnValidator = v.object({
  _id: v.id('keydevs'),
  _creationTime: v.number(),
  readableId: v.string(),
  title: v.string(),
  desc: v.string(),
  monthRef: v.optional(v.string()),
  teamId: v.id('teams'),
  deptId: v.id('departments'),
  requesterId: v.id('users'),
  businessValidatorId: v.optional(v.id('users')),
  techValidatorId: v.optional(v.id('users')),
  ownerId: v.optional(v.id('users')),
  status: keydevStatusValidator,
  mockupRepoUrl: v.optional(v.string()),
  repoUrl: v.optional(v.string()),
  weight: v.optional(keydevWeightValidator),
  priority: v.optional(keydevPriorityValidator),
  approvedAt: v.optional(v.number()),
  frontValidatedAt: v.optional(v.number()),
  techValidatedAt: v.optional(v.number()),
  businessValidatedAt: v.optional(v.number()),
  releasedAt: v.optional(v.number()),
  notesCount: v.optional(v.number()),
  deletedAt: v.optional(v.number())
})

/**
 * Lista KeyDevs per mese (filtro obbligatorio).
 * Tutti gli stati con monthRef vengono filtrati per mese.
 */
export const listByMonth = query({
  args: { monthRef: v.string() },
  returns: v.array(keydevReturnValidator),
  handler: async (ctx, args) => {
    // Ottieni tutte le keydevs per il mese specificato
    const keydevsByMonth = await ctx.db
      .query('keydevs')
      .withIndex('by_month', (q) => q.eq('monthRef', args.monthRef))
      .collect()
      .then(kds => kds.filter(kd => !kd.deletedAt))
    
    // Non includiamo più le bozze senza mese - ora i Draft rispondono ai filtri mensili
    return keydevsByMonth
  }
})

/**
 * Lista tutti i KeyDevs senza filtro per mese.
 * Include tutti gli stati e tutti i mesi.
 */
export const listAll = query({
  args: {},
  returns: v.array(keydevReturnValidator),
  handler: async (ctx) => {
    return await ctx.db.query('keydevs').collect().then(kds => kds.filter(kd => !kd.deletedAt))
  }
})

/**
 * Ricerca KeyDevs per titolo o readableId tramite full-text search.
 * Usa search index per efficienza. Restituisce risultati in ordine di rilevanza.
 * Include tutti i KeyDevs (indipendente da mese, dipartimento, team, stato).
 */
export const search = query({
  args: { q: v.string() },
  returns: v.array(keydevReturnValidator),
  handler: async (ctx, args) => {
    const q = args.q.trim()
    if (!q) return []

    const seen = new Set<string>()
    const results: Array<typeof byTitle[number]> = []

    // Cerca per titolo
    const byTitle = await ctx.db
      .query('keydevs')
      .withSearchIndex('search_title', (qry) => qry.search('title', q))
      .take(100)
    for (const kd of byTitle) {
      if (!kd.deletedAt && !seen.has(kd._id)) {
        seen.add(kd._id)
        results.push(kd)
      }
    }

    // Cerca per readableId
    const byReadableId = await ctx.db
      .query('keydevs')
      .withSearchIndex('search_readableId', (qry) => qry.search('readableId', q))
      .take(100)
    for (const kd of byReadableId) {
      if (!kd.deletedAt && !seen.has(kd._id)) {
        seen.add(kd._id)
        results.push(kd)
      }
    }

    return results
  }
})

/**
 * Ottiene un KeyDev per ID.
 */
export const getById = query({
  args: { id: v.id('keydevs') },
  returns: v.union(keydevReturnValidator, v.null()),
  handler: async (ctx, args) => {
    const keydev = await ctx.db.get(args.id)
    if (!keydev || keydev.deletedAt) {
      return null
    }
    return keydev
  }
})

/**
 * Ottiene un KeyDev per readableId.
 */
export const getByReadableId = query({
  args: { readableId: v.string() },
  returns: v.union(keydevReturnValidator, v.null()),
  handler: async (ctx, args) => {
    const keydev = await ctx.db
      .query('keydevs')
      .withIndex('by_readableId', (q) => q.eq('readableId', args.readableId))
      .first()
    if (!keydev || keydev.deletedAt) {
      return null
    }
    return keydev
  }
})

/**
 * Lista KeyDevs in ritardo (mese passato e non Done).
 * Esclude le bozze senza mese associato.
 */
export const listDelayed = query({
  args: { currentMonth: v.string() },
  returns: v.array(keydevReturnValidator),
  handler: async (ctx, args) => {
    const allKeyDevs = await ctx.db.query('keydevs').collect().then(kds => kds.filter(kd => !kd.deletedAt))
    return allKeyDevs.filter(
      (kd) => kd.monthRef && kd.monthRef < args.currentMonth && kd.status !== 'Done'
    )
  }
})

/**
 * Lista KeyDevs rifiutati (per audit trail).
 */
export const listRejected = query({
  args: {},
  returns: v.array(keydevReturnValidator),
  handler: async (ctx) => {
    return await ctx.db
      .query('keydevs')
      .withIndex('by_status_and_month', (q) => q.eq('status', 'Rejected'))
      .collect()
      .then(kds => kds.filter(kd => !kd.deletedAt))
  }
})

/**
 * Ottiene i contatori degli status per un mese specifico.
 * Tutti gli stati con monthRef vengono filtrati per mese.
 */
export const getStatusCounts = query({
  args: { monthRef: v.string() },
  returns: v.record(v.string(), v.number()),
  handler: async (ctx, args) => {
    // Ottieni tutte le keydevs per il mese specificato
    const keydevsByMonth = await ctx.db
      .query('keydevs')
      .withIndex('by_month', (q) => q.eq('monthRef', args.monthRef))
      .collect()
      .then(kds => kds.filter(kd => !kd.deletedAt))
    
    // Calcola i contatori per ogni status (le bozze senza mese non sono incluse)
    const counts: Record<string, number> = {}
    for (const kd of keydevsByMonth) {
      counts[kd.status] = (counts[kd.status] || 0) + 1
    }
    
    return counts
  }
})

/**
 * Ottiene i contatori per le fasi FrontValidated, InProgress e Done per più mesi.
 * Restituisce un record dove ogni chiave è un monthRef e il valore è un oggetto con i contatori.
 * Opzionalmente filtra per dipartimento se deptId è fornito.
 */
export const getPhaseCountsByMonths = query({
  args: { 
    monthRefs: v.array(v.string()),
    deptId: v.optional(v.id('departments'))
  },
  returns: v.record(
    v.string(),
    v.object({
      FrontValidated: v.number(),
      InProgress: v.number(),
      Done: v.number()
    })
  ),
  handler: async (ctx, args) => {
    const result: Record<string, { FrontValidated: number; InProgress: number; Done: number }> = {}
    
    // Inizializza tutti i mesi con contatori a zero
    for (const monthRef of args.monthRefs) {
      result[monthRef] = { FrontValidated: 0, InProgress: 0, Done: 0 }
    }
    
    // Ottieni tutte le bozze senza mese associato (che compaiono in tutti i mesi)
    const allDrafts = await ctx.db
      .query('keydevs')
      .withIndex('by_status', (q) => q.eq('status', 'Draft'))
      .collect()
      .then(kds => kds.filter(kd => !kd.deletedAt))
    let draftsWithoutMonth = allDrafts.filter((kd) => !kd.monthRef)
    
    // Filtra per dipartimento se specificato
    if (args.deptId) {
      draftsWithoutMonth = draftsWithoutMonth.filter((kd) => kd.deptId === args.deptId)
    }
    
    // Per ogni mese, conta i keydevs nelle fasi specificate
    for (const monthRef of args.monthRefs) {
      // Ottieni tutte le keydevs per il mese specificato
      const keydevsByMonth = await ctx.db
        .query('keydevs')
        .withIndex('by_month', (q) => q.eq('monthRef', monthRef))
        .collect()
        .then(kds => kds.filter(kd => !kd.deletedAt))
      
      // Filtra per dipartimento se specificato
      let filteredKeydevsByMonth = keydevsByMonth
      if (args.deptId) {
        filteredKeydevsByMonth = keydevsByMonth.filter((kd) => kd.deptId === args.deptId)
      }
      
      // Combina con le bozze senza mese
      const allKeydevsForMonth = [...filteredKeydevsByMonth, ...draftsWithoutMonth]
      
      // Conta solo le fasi richieste
      for (const kd of allKeydevsForMonth) {
        if (kd.status === 'FrontValidated') {
          result[monthRef].FrontValidated++
        } else if (kd.status === 'InProgress') {
          result[monthRef].InProgress++
        } else if (kd.status === 'Done') {
          result[monthRef].Done++
        }
      }
    }
    
    return result
  }
})

/**
 * Ottiene i dati di budget e slot occupati per più mesi.
 * Restituisce per ogni mese: slot occupati, budget assegnato ai dipartimenti, budget massimo del mese.
 */
export const getBudgetUtilizationByMonths = query({
  args: { 
    monthRefs: v.array(v.string()),
    deptId: v.optional(v.id('departments')),
    teamId: v.optional(v.id('teams'))
  },
  returns: v.record(
    v.string(),
    v.object({
      occupiedSlots: v.number(),
      budgetAssigned: v.number(),
      maxSlots: v.number()
    })
  ),
  handler: async (ctx, args) => {
    const result: Record<string, { occupiedSlots: number; budgetAssigned: number; maxSlots: number }> = {}
    
    // Ottieni tutti i limiti mesi (legacy + per team)
    const allMonths = await ctx.db.query('months').collect()
    const monthsMap = new Map<
      string,
      { legacyLimit?: number; teamLimits: Map<string, number> }
    >()
    for (const month of allMonths) {
      const current = monthsMap.get(month.monthRef) ?? {
        legacyLimit: undefined,
        teamLimits: new Map<string, number>()
      }
      if (month.teamId) {
        current.teamLimits.set(month.teamId, month.totalKeyDev)
      } else {
        current.legacyLimit = month.totalKeyDev
      }
      monthsMap.set(month.monthRef, current)
    }
    
    // Ottieni tutte le allocazioni budget
    const allBudgetAllocations = await ctx.db.query('budgetKeyDev').collect()
    
    // Stati che occupano slot
    const occupiedStatuses = ['FrontValidated', 'InProgress', 'Done']
    
    // Inizializza tutti i mesi con valori a zero
    for (const monthRef of args.monthRefs) {
      result[monthRef] = { occupiedSlots: 0, budgetAssigned: 0, maxSlots: 0 }
      
      // Imposta il budget massimo:
      // - se teamId è specificato: limite del team per quel mese (hard block => 0 se assente)
      // - altrimenti: somma limiti team del mese, con fallback legacy se assenti
      const month = monthsMap.get(monthRef)
      if (month) {
        if (args.teamId) {
          result[monthRef].maxSlots = month.teamLimits.get(args.teamId) ?? 0
        } else if (month.teamLimits.size > 0) {
          result[monthRef].maxSlots = Array.from(month.teamLimits.values()).reduce((sum, v) => sum + v, 0)
        } else {
          result[monthRef].maxSlots = month.legacyLimit ?? 0
        }
      }
      
      // Calcola budget assegnato ai dipartimenti (filtrato per dept/team se specificati)
      const budgetForMonth = allBudgetAllocations.filter(b => 
        b.monthRef === monthRef &&
        (!args.deptId || b.deptId === args.deptId) &&
        (!args.teamId || b.teamId === args.teamId)
      )
      result[monthRef].budgetAssigned = budgetForMonth.reduce((sum, b) => sum + b.maxAlloc, 0)
    }
    
    // Per ogni mese, calcola gli slot occupati
    for (const monthRef of args.monthRefs) {
      // Ottieni tutte le keydevs per il mese specificato
      const keydevsByMonth = await ctx.db
        .query('keydevs')
        .withIndex('by_month', (q) => q.eq('monthRef', monthRef))
        .collect()
        .then(kds => kds.filter(kd => !kd.deletedAt))
      
      // Filtra per dipartimento/team se specificati
      let filteredKeydevsByMonth = keydevsByMonth
      if (args.deptId) {
        filteredKeydevsByMonth = filteredKeydevsByMonth.filter((kd) => kd.deptId === args.deptId)
      }
      if (args.teamId) {
        filteredKeydevsByMonth = filteredKeydevsByMonth.filter((kd) => kd.teamId === args.teamId)
      }
      
      // Calcola slot occupati (somma dei weight, default 1)
      const occupiedSlots = filteredKeydevsByMonth
        .filter(kd => occupiedStatuses.includes(kd.status))
        .reduce((sum, kd) => sum + (kd.weight ?? 1), 0)
      
      result[monthRef].occupiedSlots = occupiedSlots
    }
    
    return result
  }
})

/**
 * Ottiene i contatori totali per le fasi FrontValidated, InProgress e Done per tutti i keydevs.
 * Opzionalmente filtra per dipartimento se deptId è fornito.
 */
export const getTotalPhaseCounts = query({
  args: {
    deptId: v.optional(v.id('departments'))
  },
  returns: v.object({
    FrontValidated: v.number(),
    InProgress: v.number(),
    Done: v.number()
  }),
  handler: async (ctx, args) => {
    let allKeydevs = await ctx.db.query('keydevs').collect().then(kds => kds.filter(kd => !kd.deletedAt))
    
    // Filtra per dipartimento se specificato
    if (args.deptId) {
      allKeydevs = allKeydevs.filter((kd) => kd.deptId === args.deptId)
    }
    
    let frontValidated = 0
    let inProgress = 0
    let done = 0
    
    for (const kd of allKeydevs) {
      if (kd.status === 'FrontValidated') {
        frontValidated++
      } else if (kd.status === 'InProgress') {
        inProgress++
      } else if (kd.status === 'Done') {
        done++
      }
    }
    
    return { FrontValidated: frontValidated, InProgress: inProgress, Done: done }
  }
})

/**
 * Crea un nuovo KeyDev.
 */
export const create = mutation({
  args: {
    title: v.string(),
    desc: v.string(),
    monthRef: v.optional(v.string()), // Opzionale per le bozze
    teamId: v.id('teams'),
    deptId: v.id('departments'),
    weight: v.optional(keydevWeightValidator) // Default: 1 (sviluppo completo)
  },
  returns: v.object({
    id: v.id('keydevs'),
    readableId: v.string()
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Non autenticato')
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_sub', (q) => q.eq('sub', identity.subject))
      .first()

    if (!user) {
      throw new Error('Utente non trovato')
    }

    // Genera il readableId incrementale
    // Ottieni tutti i keydevs ordinati per readableId
    const allKeyDevs = await ctx.db
      .query('keydevs')
      .withIndex('by_readableId')
      .collect()
    
    // Trova il numero più alto
    let maxNumber = 0
    for (const kd of allKeyDevs) {
      const match = kd.readableId.match(/^KD-(\d+)$/)
      if (match) {
        const num = parseInt(match[1], 10)
        if (num > maxNumber) {
          maxNumber = num
        }
      }
    }
    
    // Genera il prossimo ID
    const nextNumber = maxNumber + 1
    const readableId = `KD-${String(nextNumber).padStart(3, '0')}`

    const id = await ctx.db.insert('keydevs', {
      readableId,
      title: args.title,
      desc: args.desc,
      monthRef: args.monthRef, // Può essere undefined per le bozze
      teamId: args.teamId,
      deptId: args.deptId,
      requesterId: user._id,
      status: 'Draft',
      weight: args.weight ?? 1 // Default: sviluppo completo (100%)
    })

    return { id, readableId }
  }
})

/**
 * Aggiorna un KeyDev.
 */
export const update = mutation({
  args: {
    id: v.id('keydevs'),
    title: v.optional(v.string()),
    desc: v.optional(v.string())
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const keydev = await ctx.db.get(args.id)
    if (!keydev) {
      throw new Error('KeyDev non trovato')
    }
    if (keydev.deletedAt) {
      throw new Error('Non è possibile modificare un KeyDev eliminato')
    }
    const { id, ...updates } = args
    await ctx.db.patch(id, updates)
    return null
  }
})

/**
 * Aggiorna lo stato di un KeyDev con validazione del flusso.
 * 
 * Flusso degli stati:
 * 1. Draft → MockupDone (automatico quando si aggiunge mockupRepoUrl)
 * 2. MockupDone → Approved (TechValidator approva)
 * 3. MockupDone → Rejected (TechValidator rifiuta con motivo)
 * 4. Approved → FrontValidated (BusinessValidator del dipartimento)
 * 5. FrontValidated → InProgress (TechValidator prende ownership)
 * 6. InProgress → Done (solo owner) - stato finale
 * 
 * Admin può fare qualsiasi transizione.
 */
export const updateStatus = mutation({
  args: {
    id: v.id('keydevs'),
    status: keydevStatusValidator,
    monthRef: v.optional(v.string()), // Richiesto per FrontValidated
    weight: v.optional(keydevWeightValidator) // Peso obbligatorio quando TechValidator approva (MockupDone → Approved)
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const keydev = await ctx.db.get(args.id)
    if (!keydev) {
      throw new Error('KeyDev non trovato')
    }
    if (keydev.deletedAt) {
      throw new Error('Non è possibile modificare un KeyDev eliminato')
    }

    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Non autenticato')
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_sub', (q) => q.eq('sub', identity.subject))
      .first()

    if (!user) {
      throw new Error('Utente non trovato')
    }

    const userRoles = user.roles as Role[] | undefined
    const userIsAdmin = isAdmin(userRoles)

    // Validazione transizioni di stato
    const updates: Record<string, unknown> = { status: args.status }

    // Admin può fare qualsiasi cosa
    if (!userIsAdmin) {
      // Validazione specifica per ogni transizione
      switch (args.status) {
        case 'MockupDone':
          // Chiunque può passare a MockupDone se c'è un mockupRepoUrl
          if (keydev.status !== 'Draft') {
            throw new Error('Transizione non valida: solo da Draft a MockupDone')
          }
          if (!keydev.mockupRepoUrl) {
            throw new Error('Devi prima creare o aggiungere il mockupRepoUrl')
          }
          break

        case 'Approved': {
          // Solo TechValidator può approvare un MockupDone
          const isMovingToApproved = isMovingForward(keydev.status, 'Approved')
          if (isMovingToApproved && keydev.status !== 'MockupDone') {
            throw new Error('Transizione non valida: solo da MockupDone a Approved')
          }
          if (!hasRole(userRoles, 'TechValidator')) {
            throw new Error('Solo i TechValidator possono approvare')
          }
          // Weight è obbligatorio solo quando si va avanti e non esiste già
          if (isMovingToApproved && args.weight === undefined && keydev.weight === undefined) {
            throw new Error('Devi specificare il peso (weight) dello sviluppo per la validazione tech')
          }
          break
        }

        case 'Rejected':
          // Solo TechValidator può impostare Rejected (il flusso principale è via questions)
          if (keydev.status !== 'MockupDone') {
            throw new Error('Transizione non valida: solo da MockupDone a Rejected')
          }
          if (!hasRole(userRoles, 'TechValidator')) {
            throw new Error('Solo i TechValidator possono rifiutare')
          }
          break

        case 'FrontValidated': {
          // Solo BusinessValidator del dipartimento può validare il front
          const isMovingToFrontValidated = isMovingForward(keydev.status, 'FrontValidated')
          if (isMovingToFrontValidated && keydev.status !== 'Approved') {
            throw new Error('Transizione non valida: solo da Approved a FrontValidated')
          }
          if (!hasRole(userRoles, 'BusinessValidator')) {
            throw new Error('Solo i BusinessValidator possono validare il frontend')
          }
          // Verifica che il BusinessValidator sia del dipartimento corretto (solo quando si va avanti)
          if (isMovingToFrontValidated && user.deptId !== keydev.deptId) {
            throw new Error('Solo il BusinessValidator del dipartimento associato può validare')
          }
          // Verifica che sia stato specificato un mese (solo quando si va avanti)
          if (isMovingToFrontValidated && !args.monthRef && !keydev.monthRef) {
            throw new Error('Devi specificare il mese di riferimento per la validazione')
          }
          break
        }

        case 'InProgress':
          // Qualsiasi TechValidator può prendere ownership
          if (keydev.status !== 'FrontValidated') {
            throw new Error('Transizione non valida: solo da FrontValidated a InProgress')
          }
          if (!hasRole(userRoles, 'TechValidator')) {
            throw new Error('Solo i TechValidator possono prendere in carico')
          }
          break

        case 'Done':
          // Solo l'owner può dichiarare completato
          if (keydev.status !== 'InProgress') {
            throw new Error('Transizione non valida: solo da InProgress a Done')
          }
          if (keydev.ownerId !== user._id) {
            throw new Error('Solo l\'owner può dichiarare completato')
          }
          break

        case 'Draft':
          // Requester o admin possono riportare un Rejected in Draft
          if (keydev.status !== 'Rejected') {
            throw new Error('Transizione non valida: solo da Rejected a Draft')
          }
          // Verifica che l'utente sia il requester o admin
          if (!userIsAdmin && keydev.requesterId !== user._id) {
            throw new Error('Solo il requester o un admin possono riportare in Bozza')
          }
          // I dati di rifiuto verranno rimossi nel blocco successivo tramite destructuring
          break

        default:
          throw new Error('Transizione di stato non valida')
      }
    }

    // Determina se si sta andando avanti o indietro
    const movingForward = isMovingForward(keydev.status, args.status)

    // Applica gli aggiornamenti specifici per ogni stato
    if (args.status === 'Approved') {
      // Se si sta andando avanti, richiedi il weight
      // Se si sta tornando indietro, usa quello esistente se disponibile
      if (movingForward) {
        if (args.weight === undefined) {
          throw new Error('Devi specificare il peso (weight) dello sviluppo per la validazione tech')
        }
        const now = Date.now()
        updates.approvedAt = now
        updates.techValidatedAt = now // Traccia timestamp validazione tecnica
        updates.techValidatorId = user._id
        updates.weight = args.weight // Salva il peso dello sviluppo
      } else {
        // Tornando indietro: mantieni i valori esistenti se disponibili
        if (keydev.weight !== undefined && args.weight === undefined) {
          // Mantieni il peso esistente
          updates.weight = keydev.weight
        } else if (args.weight !== undefined) {
          // Se viene passato un nuovo peso, usalo
          updates.weight = args.weight
        }
        // Aggiorna i timestamp solo se si sta andando avanti, altrimenti mantieni quelli esistenti
        if (keydev.approvedAt) updates.approvedAt = keydev.approvedAt
        if (keydev.techValidatedAt) updates.techValidatedAt = keydev.techValidatedAt
        if (keydev.techValidatorId) updates.techValidatorId = keydev.techValidatorId
      }
    }

    if (args.status === 'FrontValidated') {
      // Determina il mese di riferimento: usa quello passato o quello esistente se si torna indietro
      const monthRefToUse = args.monthRef || keydev.monthRef
      
      // Verifica budget disponibile per il mese specificato (solo se si va avanti)
      if (movingForward && monthRefToUse) {
        const monthTeamLimit = await ctx.db
          .query('months')
          .withIndex('by_monthRef_and_team', (q) =>
            q.eq('monthRef', monthRefToUse).eq('teamId', keydev.teamId)
          )
          .first()
        const teamLimit = monthTeamLimit?.totalKeyDev ?? 0
        if (teamLimit <= 0) {
          throw new Error(`Nessun limite sviluppatori disponibile per il team nel mese ${monthRefToUse}. Contatta l'amministratore.`)
        }

        const budgetAlloc = await ctx.db
          .query('budgetKeyDev')
          .withIndex('by_month_dept_team', (q) =>
            q
              .eq('monthRef', monthRefToUse)
              .eq('deptId', keydev.deptId)
              .eq('teamId', keydev.teamId)
          )
          .first()
        
        if (!budgetAlloc || budgetAlloc.maxAlloc <= 0) {
          throw new Error(`Nessun budget disponibile per il mese ${monthRefToUse}. Contatta l'amministratore per allocare il budget.`)
        }
        const effectiveTeamLimit = Math.min(budgetAlloc.maxAlloc, teamLimit)
        if (effectiveTeamLimit <= 0) {
          throw new Error(`Nessuno slot effettivo disponibile per il mese ${monthRefToUse} e team corrente.`)
        }
        
        // Conta i keydevs già validati per questo mese/dept/team
        const existingKeydevs = await ctx.db
          .query('keydevs')
          .withIndex('by_dept_and_month', (q) =>
            q.eq('deptId', keydev.deptId).eq('monthRef', monthRefToUse)
          )
          .collect()
        
        const validatedCount = existingKeydevs.filter(
          (kd) => 
            kd._id !== keydev._id && // Escludi il keydev corrente
            kd.teamId === keydev.teamId && 
            ['FrontValidated', 'InProgress', 'Done'].includes(kd.status)
        ).length
        
        if (validatedCount >= effectiveTeamLimit) {
          throw new Error(`Budget esaurito per il mese ${monthRefToUse}. Già ${validatedCount}/${effectiveTeamLimit} KeyDevs validati per questo team/dipartimento (limite effettivo).`)
        }
      }
      
      // Usa il mese esistente o quello passato
      if (monthRefToUse) {
        updates.monthRef = monthRefToUse
      }

      // Aggiorna i timestamp solo se si va avanti, altrimenti mantieni quelli esistenti
      if (movingForward) {
        const now = Date.now()
        updates.frontValidatedAt = now
        updates.businessValidatedAt = now // Traccia timestamp validazione business
        updates.businessValidatorId = user._id
      } else {
        // Mantieni i timestamp esistenti se disponibili
        if (keydev.frontValidatedAt) updates.frontValidatedAt = keydev.frontValidatedAt
        if (keydev.businessValidatedAt) updates.businessValidatedAt = keydev.businessValidatedAt
        if (keydev.businessValidatorId) updates.businessValidatorId = keydev.businessValidatorId
      }
    }

    if (args.status === 'InProgress') {
      updates.ownerId = user._id
    }

    if (args.status === 'Done') {
      updates.releasedAt = Date.now()
    }

    // Passando da Rejected a Draft: usa replace() per escludere eventuali campi legacy (rejectionReason, rejectedById)
    const needsRejectionFieldsCleanup = args.status === 'Draft' && keydev.status === 'Rejected'
    
    if (needsRejectionFieldsCleanup) {
      const existing = await ctx.db.get(args.id)
      if (!existing) {
        throw new Error('KeyDev non trovato')
      }
      type KeydevWithLegacy = Doc<'keydevs'> & { rejectionReason?: string; rejectedById?: unknown }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, _creationTime, rejectionReason, rejectedById, ...docWithoutSystemAndLegacy } = existing as KeydevWithLegacy
      const updatedDoc: Omit<Doc<'keydevs'>, '_id' | '_creationTime'> = {
        ...docWithoutSystemAndLegacy,
        ...updates
      }
      await ctx.db.replace(args.id, updatedDoc)
    } else {
      await ctx.db.patch(args.id, updates)
    }

    // Notifica email al requester per transizioni InProgress e Done
    if (args.status === 'InProgress' && keydev.status === 'FrontValidated') {
      await ctx.scheduler.runAfter(0, internal.emails.sendKeyDevStatusChangeNotification, {
        keyDevId: args.id,
        newStatus: 'InProgress'
      })
    } else if (args.status === 'Done' && keydev.status === 'InProgress') {
      await ctx.scheduler.runAfter(0, internal.emails.sendKeyDevStatusChangeNotification, {
        keyDevId: args.id,
        newStatus: 'Done'
      })
    }

    return null
  }
})

/**
 * Prende in carico un KeyDev (diventa owner).
 * Solo TechValidator può farlo su KeyDev in stato FrontValidated.
 * Permette di confermare/modificare il peso sviluppo (weight).
 */
export const takeOwnership = mutation({
  args: {
    id: v.id('keydevs'),
    weight: v.optional(keydevWeightValidator) // Peso opzionale per confermare/modificare
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const keydev = await ctx.db.get(args.id)
    if (!keydev) {
      throw new Error('KeyDev non trovato')
    }
    if (keydev.deletedAt) {
      throw new Error('Non è possibile modificare un KeyDev eliminato')
    }

    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Non autenticato')
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_sub', (q) => q.eq('sub', identity.subject))
      .first()

    if (!user) {
      throw new Error('Utente non trovato')
    }

    const userRoles = user.roles as Role[] | undefined
    const userIsAdmin = isAdmin(userRoles)

    if (!userIsAdmin && !hasRole(userRoles, 'TechValidator')) {
      throw new Error('Solo i TechValidator possono prendere in carico')
    }

    if (keydev.status !== 'FrontValidated') {
      throw new Error('Il KeyDev deve essere in stato FrontValidated')
    }

    const updates: Record<string, unknown> = {
      ownerId: user._id,
      status: 'InProgress'
    }

    // Se viene fornito un weight, aggiornalo
    if (args.weight !== undefined) {
      updates.weight = args.weight
    }

    await ctx.db.patch(args.id, updates)

    // Notifica email al requester quando il KeyDev diventa InProgress
    await ctx.scheduler.runAfter(0, internal.emails.sendKeyDevStatusChangeNotification, {
      keyDevId: args.id,
      newStatus: 'InProgress'
    })

    return null
  }
})

/**
 * Dichiara completato un KeyDev (solo owner o admin).
 * Richiede la repoUrl definitiva del repository di sviluppo.
 */
export const markAsDone = mutation({
  args: {
    id: v.id('keydevs'),
    repoUrl: v.string() // URL del repository definitivo di sviluppo
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const keydev = await ctx.db.get(args.id)
    if (!keydev) {
      throw new Error('KeyDev non trovato')
    }
    if (keydev.deletedAt) {
      throw new Error('Non è possibile modificare un KeyDev eliminato')
    }

    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Non autenticato')
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_sub', (q) => q.eq('sub', identity.subject))
      .first()

    if (!user) {
      throw new Error('Utente non trovato')
    }

    const userRoles = user.roles as Role[] | undefined
    const userIsAdmin = isAdmin(userRoles)

    if (!userIsAdmin && keydev.ownerId !== user._id) {
      throw new Error('Solo l\'owner può dichiarare completato')
    }

    if (keydev.status !== 'InProgress') {
      throw new Error('Il KeyDev deve essere in stato InProgress')
    }

    if (!args.repoUrl || args.repoUrl.trim() === '') {
      throw new Error('Devi specificare l\'URL del repository definitivo')
    }

    await ctx.db.patch(args.id, {
      status: 'Done',
      repoUrl: args.repoUrl.trim(),
      releasedAt: Date.now()
    })

    // Notifica email al requester quando il KeyDev viene completato
    await ctx.scheduler.runAfter(0, internal.emails.sendKeyDevStatusChangeNotification, {
      keyDevId: args.id,
      newStatus: 'Done'
    })

    return null
  }
})

/**
 * Collega un mockup repository a un KeyDev.
 * Non cambia automaticamente lo stato - l'utente deve dichiarare esplicitamente "Mockup Terminato".
 */
export const linkMockupRepo = mutation({
  args: {
    id: v.id('keydevs'),
    mockupRepoUrl: v.string()
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const keydev = await ctx.db.get(args.id)
    if (!keydev) {
      throw new Error('KeyDev non trovato')
    }
    if (keydev.deletedAt) {
      throw new Error('Non è possibile modificare un KeyDev eliminato')
    }

    await ctx.db.patch(args.id, {
      mockupRepoUrl: args.mockupRepoUrl
    })
    return null
  }
})

/**
 * Aggiorna il repository URL ufficiale di un KeyDev.
 * Può essere aggiornato in qualsiasi momento.
 */
export const updateRepoUrl = mutation({
  args: {
    id: v.id('keydevs'),
    repoUrl: v.string()
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const keydev = await ctx.db.get(args.id)
    if (!keydev) {
      throw new Error('KeyDev non trovato')
    }
    if (keydev.deletedAt) {
      throw new Error('Non è possibile modificare un KeyDev eliminato')
    }

    await ctx.db.patch(args.id, {
      repoUrl: args.repoUrl
    })
    return null
  }
})

/**
 * Assegna un owner a un KeyDev.
 * Solo Admin o TechValidator possono assegnare l'owner in qualsiasi momento.
 */
export const assignOwner = mutation({
  args: {
    id: v.id('keydevs'),
    ownerId: v.id('users')
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const keydev = await ctx.db.get(args.id)
    if (!keydev) {
      throw new Error('KeyDev non trovato')
    }
    if (keydev.deletedAt) {
      throw new Error('Non è possibile modificare un KeyDev eliminato')
    }

    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Non autenticato')
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_sub', (q) => q.eq('sub', identity.subject))
      .first()

    if (!user) {
      throw new Error('Utente non trovato')
    }

    const userRoles = user.roles as Role[] | undefined
    const userIsAdmin = isAdmin(userRoles)

    if (!userIsAdmin && !hasRole(userRoles, 'TechValidator')) {
      throw new Error('Solo Admin o TechValidator possono assegnare l\'owner')
    }

    // Verifica che l'ownerId esista
    const owner = await ctx.db.get(args.ownerId)
    if (!owner) {
      throw new Error('Utente owner non trovato')
    }

    await ctx.db.patch(args.id, {
      ownerId: args.ownerId
    })
    return null
  }
})

/**
 * Assegna un requester a un KeyDev.
 * Solo Admin o TechValidator possono assegnare il requester.
 */
export const assignRequester = mutation({
  args: {
    id: v.id('keydevs'),
    requesterId: v.id('users')
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const keydev = await ctx.db.get(args.id)
    if (!keydev) {
      throw new Error('KeyDev non trovato')
    }
    if (keydev.deletedAt) {
      throw new Error('Non è possibile modificare un KeyDev eliminato')
    }

    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Non autenticato')
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_sub', (q) => q.eq('sub', identity.subject))
      .first()

    if (!user) {
      throw new Error('Utente non trovato')
    }

    const userRoles = user.roles as Role[] | undefined
    const userIsAdmin = isAdmin(userRoles)

    if (!userIsAdmin && !hasRole(userRoles, 'TechValidator')) {
      throw new Error('Solo Admin o TechValidator possono assegnare il requester')
    }

    const requester = await ctx.db.get(args.requesterId)
    if (!requester) {
      throw new Error('Utente requester non trovato')
    }

    await ctx.db.patch(args.id, {
      requesterId: args.requesterId
    })
    return null
  }
})

/**
 * Assegna/aggiorna il team di riferimento di un KeyDev.
 * Solo Admin o TechValidator possono modificare il team.
 * Il dipartimento viene aggiornato automaticamente in base al team scelto.
 */
export const assignTeam = mutation({
  args: {
    id: v.id('keydevs'),
    teamId: v.id('teams')
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const keydev = await ctx.db.get(args.id)
    if (!keydev) {
      throw new Error('KeyDev non trovato')
    }
    if (keydev.deletedAt) {
      throw new Error('Non è possibile modificare un KeyDev eliminato')
    }

    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Non autenticato')
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_sub', (q) => q.eq('sub', identity.subject))
      .first()

    if (!user) {
      throw new Error('Utente non trovato')
    }

    const userRoles = user.roles as Role[] | undefined
    const userIsAdmin = isAdmin(userRoles)
    if (!userIsAdmin && !hasRole(userRoles, 'TechValidator')) {
      throw new Error('Solo Admin o TechValidator possono modificare il team')
    }

    const team = await ctx.db.get(args.teamId)
    if (!team) {
      throw new Error('Team non trovato')
    }

    // Manteniamo coerenza con il ciclo di vita: dopo FrontValidated il team è bloccato.
    const allowedStatuses = ['Draft', 'MockupDone', 'Approved']
    if (!allowedStatuses.includes(keydev.status)) {
      throw new Error(`Non è possibile modificare il team di un KeyDev in stato "${keydev.status}"`)
    }

    const departments = await ctx.db.query('departments').collect()
    const matchedDepartment = departments.find((d) => d.teamIds.includes(args.teamId))
    if (!matchedDepartment) {
      throw new Error('Nessun dipartimento associato al team selezionato')
    }

    await ctx.db.patch(args.id, {
      teamId: args.teamId,
      deptId: matchedDepartment._id
    })

    return null
  }
})

/**
 * Aggiorna la priorità di un KeyDev.
 * Chiunque può modificare la priorità.
 */
export const updatePriority = mutation({
  args: {
    id: v.id('keydevs'),
    priority: keydevPriorityValidator
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const keydev = await ctx.db.get(args.id)
    if (!keydev) {
      throw new Error('KeyDev non trovato')
    }
    if (keydev.deletedAt) {
      throw new Error('Non è possibile modificare un KeyDev eliminato')
    }

    await ctx.db.patch(args.id, {
      priority: args.priority
    })
    return null
  }
})

/**
 * Aggiorna il peso (weight) di un KeyDev.
 * Chiunque può modificare il peso, indipendentemente dalla fase.
 */
export const updateWeight = mutation({
  args: {
    id: v.id('keydevs'),
    weight: keydevWeightValidator
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const keydev = await ctx.db.get(args.id)
    if (!keydev) {
      throw new Error('KeyDev non trovato')
    }
    if (keydev.deletedAt) {
      throw new Error('Non è possibile modificare un KeyDev eliminato')
    }

    await ctx.db.patch(args.id, {
      weight: args.weight
    })
    return null
  }
})

/**
 * Aggiorna il mese di riferimento di un KeyDev senza cambiare lo stato.
 * Permette di "prenotare" un mese per ragionare sul budget.
 * 
 * Solo gli stati Draft, MockupDone, Approved possono MODIFICARE il mese.
 * Da FrontValidated in poi il mese è OBBLIGATORIO (richiesto per la transizione)
 * ma non più modificabile perché matchato con uno slot del budget.
 * 
 * Restituisce anche info sul budget per quel mese.
 */
export const updateMonth = mutation({
  args: {
    id: v.id('keydevs'),
    monthRef: v.union(v.string(), v.null()) // null per rimuovere il mese
  },
  returns: v.object({
    success: v.boolean(),
    budgetInfo: v.optional(v.object({
      maxAlloc: v.number(),
      currentlyUsed: v.number(),
      available: v.number()
    }))
  }),
  handler: async (ctx, args) => {
    const keydev = await ctx.db.get(args.id)
    if (!keydev) {
      throw new Error('KeyDev non trovato')
    }
    if (keydev.deletedAt) {
      throw new Error('Non è possibile modificare un KeyDev eliminato')
    }

    // Solo certi stati possono MODIFICARE il mese (prima di FrontValidated)
    // Da FrontValidated in poi il mese è obbligatorio ma non più modificabile
    // perché già matchato con uno slot del budget
    const allowedStatuses = ['Draft', 'MockupDone', 'Approved']
    if (!allowedStatuses.includes(keydev.status)) {
      throw new Error(`Non è possibile modificare il mese di un KeyDev in stato "${keydev.status}". Da FrontValidated in poi il mese è bloccato.`)
    }

    // Se si sta assegnando un mese (non rimuovendo)
    if (args.monthRef) {
      const monthRef = args.monthRef
      const monthTeamLimit = await ctx.db
        .query('months')
        .withIndex('by_monthRef_and_team', (q) =>
          q.eq('monthRef', monthRef).eq('teamId', keydev.teamId)
        )
        .first()
      const teamLimit = monthTeamLimit?.totalKeyDev ?? 0
      if (teamLimit <= 0) {
        throw new Error(`Nessun limite sviluppatori disponibile per il team nel mese ${monthRef}. Configura prima il limite in Planning.`)
      }

      // Verifica info budget per quel mese
      const budgetAlloc = await ctx.db
        .query('budgetKeyDev')
        .withIndex('by_month_dept_team', (q) =>
          q
            .eq('monthRef', monthRef)
            .eq('deptId', keydev.deptId)
            .eq('teamId', keydev.teamId)
        )
        .first()
      const effectiveTeamLimit = Math.min(budgetAlloc?.maxAlloc ?? 0, teamLimit)

      // Conta i keydevs già assegnati a quel mese per questo dept/team
      // (stati che occupano slot: FrontValidated, InProgress, Done)
      const occupiedStatuses = ['FrontValidated', 'InProgress', 'Done']
      const existingKeydevs = await ctx.db
        .query('keydevs')
        .withIndex('by_dept_and_month', (q) =>
          q.eq('deptId', keydev.deptId).eq('monthRef', monthRef)
        )
        .collect()

      const occupiedCount = existingKeydevs.filter(
        (kd) =>
          kd._id !== keydev._id && // Escludi il keydev corrente
          kd.teamId === keydev.teamId &&
          occupiedStatuses.includes(kd.status) &&
          !kd.deletedAt
      ).reduce((sum, kd) => sum + (kd.weight ?? 1), 0)

      // Aggiorna il mese
      await ctx.db.patch(args.id, {
        monthRef
      })

      return {
        success: true,
        budgetInfo: budgetAlloc ? {
          maxAlloc: effectiveTeamLimit,
          currentlyUsed: occupiedCount,
          available: Math.max(0, effectiveTeamLimit - occupiedCount)
        } : undefined
      }
    } else {
      // Rimuovi il mese (imposta a undefined)
      // Usiamo replace per rimuovere il campo
      const existing = await ctx.db.get(args.id)
      if (!existing) {
        throw new Error('KeyDev non trovato')
      }
      
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, _creationTime, monthRef: _monthRef, ...docWithoutSystemFields } = existing
      await ctx.db.replace(args.id, docWithoutSystemFields)
      
      return { success: true }
    }
  }
})

/**
 * Soft-delete un KeyDev impostando deletedAt.
 * Il keydev non apparirà più nelle liste e nei conteggi.
 * Solo gli Admin, il requester o l'owner possono eliminare un KeyDev.
 */
export const softDelete = mutation({
  args: {
    id: v.id('keydevs')
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const keydev = await ctx.db.get(args.id)
    if (!keydev) {
      throw new Error('KeyDev non trovato')
    }
    if (keydev.deletedAt) {
      throw new Error('KeyDev già eliminato')
    }

    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Non autenticato')
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_sub', (q) => q.eq('sub', identity.subject))
      .first()

    if (!user) {
      throw new Error('Utente non trovato')
    }

    const userRoles = user.roles as Role[] | undefined
    const userIsAdmin = isAdmin(userRoles)
    const isRequester = keydev.requesterId === user._id
    const isOwner = keydev.ownerId === user._id

    if (!userIsAdmin && !isRequester && !isOwner) {
      throw new Error('Solo gli Admin, il requester o l\'owner possono eliminare un KeyDev')
    }

    await ctx.db.patch(args.id, {
      deletedAt: Date.now()
    })
    return null
  }
})
