import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { keydevStatusValidator } from './schema'
import { hasRole, isAdmin } from './users'

// Tipo per i ruoli
type Role = 'Requester' | 'BusinessValidator' | 'TechValidator' | 'Admin'

const keydevReturnValidator = v.object({
  _id: v.id('keydevs'),
  _creationTime: v.number(),
  readableId: v.string(),
  title: v.string(),
  desc: v.string(),
  monthRef: v.optional(v.string()),
  categoryId: v.id('categories'),
  deptId: v.id('departments'),
  requesterId: v.id('users'),
  businessValidatorId: v.optional(v.id('users')),
  techValidatorId: v.optional(v.id('users')),
  ownerId: v.optional(v.id('users')),
  status: keydevStatusValidator,
  rejectionReason: v.optional(v.string()),
  rejectedById: v.optional(v.id('users')),
  mockupRepoUrl: v.optional(v.string()),
  mockupTag: v.optional(v.string()),
  repoUrl: v.optional(v.string()),
  repoTag: v.optional(v.string()),
  approvedAt: v.optional(v.number()),
  frontValidatedAt: v.optional(v.number()),
  releasedAt: v.optional(v.number()),
  donePerc: v.optional(v.number()),
  prNumber: v.optional(v.number()),
  prMerged: v.optional(v.boolean())
})

/**
 * Lista KeyDevs per mese (filtro obbligatorio).
 * Include anche le bozze senza mese associato che compaiono in tutti i mesi.
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
    
    // Ottieni tutte le bozze senza mese associato (che compaiono in tutti i mesi)
    const allDrafts = await ctx.db
      .query('keydevs')
      .withIndex('by_status', (q) => q.eq('status', 'Draft'))
      .collect()
    
    const draftsToInclude = allDrafts.filter((kd) => !kd.monthRef)
    
    // Combina i risultati
    return [...keydevsByMonth, ...draftsToInclude]
  }
})

/**
 * Ottiene un KeyDev per ID.
 */
export const getById = query({
  args: { id: v.id('keydevs') },
  returns: v.union(keydevReturnValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  }
})

/**
 * Ottiene un KeyDev per readableId.
 */
export const getByReadableId = query({
  args: { readableId: v.string() },
  returns: v.union(keydevReturnValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('keydevs')
      .withIndex('by_readableId', (q) => q.eq('readableId', args.readableId))
      .first()
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
    const allKeyDevs = await ctx.db.query('keydevs').collect()
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
  }
})

/**
 * Ottiene i contatori degli status per un mese specifico.
 * Include anche le bozze senza mese associato.
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
    
    // Ottieni tutte le bozze senza mese associato
    const allDrafts = await ctx.db
      .query('keydevs')
      .withIndex('by_status', (q) => q.eq('status', 'Draft'))
      .collect()
    const draftsWithoutMonth = allDrafts.filter((kd) => !kd.monthRef)
    
    // Combina i risultati
    const allKeydevsForMonth = [...keydevsByMonth, ...draftsWithoutMonth]
    
    // Calcola i contatori per ogni status
    const counts: Record<string, number> = {}
    for (const kd of allKeydevsForMonth) {
      counts[kd.status] = (counts[kd.status] || 0) + 1
    }
    
    return counts
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
    categoryId: v.id('categories'),
    deptId: v.id('departments')
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
      categoryId: args.categoryId,
      deptId: args.deptId,
      requesterId: user._id,
      status: 'Draft'
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
 * 6. InProgress → Done (solo owner)
 * 
 * Admin può fare qualsiasi transizione.
 */
export const updateStatus = mutation({
  args: {
    id: v.id('keydevs'),
    status: keydevStatusValidator,
    rejectionReason: v.optional(v.string())
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const keydev = await ctx.db.get(args.id)
    if (!keydev) {
      throw new Error('KeyDev non trovato')
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

        case 'Approved':
          // Solo TechValidator può approvare un MockupDone
          if (keydev.status !== 'MockupDone') {
            throw new Error('Transizione non valida: solo da MockupDone a Approved')
          }
          if (!hasRole(userRoles, 'TechValidator')) {
            throw new Error('Solo i TechValidator possono approvare')
          }
          break

        case 'Rejected':
          // Solo TechValidator può rifiutare un MockupDone
          if (keydev.status !== 'MockupDone') {
            throw new Error('Transizione non valida: solo da MockupDone a Rejected')
          }
          if (!hasRole(userRoles, 'TechValidator')) {
            throw new Error('Solo i TechValidator possono rifiutare')
          }
          if (!args.rejectionReason || args.rejectionReason.trim() === '') {
            throw new Error('Devi specificare un motivo per il rifiuto')
          }
          break

        case 'FrontValidated':
          // Solo BusinessValidator del dipartimento può validare il front
          if (keydev.status !== 'Approved') {
            throw new Error('Transizione non valida: solo da Approved a FrontValidated')
          }
          if (!hasRole(userRoles, 'BusinessValidator')) {
            throw new Error('Solo i BusinessValidator possono validare il frontend')
          }
          // Verifica che il BusinessValidator sia del dipartimento corretto
          if (user.deptId !== keydev.deptId) {
            throw new Error('Solo il BusinessValidator del dipartimento associato può validare')
          }
          break

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

        default:
          throw new Error('Transizione di stato non valida')
      }
    }

    // Applica gli aggiornamenti specifici per ogni stato
    if (args.status === 'Approved') {
      updates.approvedAt = Date.now()
      updates.techValidatorId = user._id
      updates.prMerged = true
      updates.mockupTag = 'v0.9.0-business'
      // Pulisci eventuali dati di rifiuto precedenti
      updates.rejectionReason = undefined
      updates.rejectedById = undefined
    }

    if (args.status === 'Rejected') {
      updates.rejectionReason = args.rejectionReason
      updates.rejectedById = user._id
    }

    if (args.status === 'FrontValidated') {
      updates.frontValidatedAt = Date.now()
      updates.businessValidatorId = user._id
    }

    if (args.status === 'InProgress') {
      updates.ownerId = user._id
    }

    if (args.status === 'Done') {
      updates.releasedAt = Date.now()
      updates.donePerc = 100
    }

    await ctx.db.patch(args.id, updates)
    return null
  }
})

/**
 * Prende in carico un KeyDev (diventa owner).
 * Solo TechValidator può farlo su KeyDev in stato FrontValidated.
 */
export const takeOwnership = mutation({
  args: {
    id: v.id('keydevs')
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const keydev = await ctx.db.get(args.id)
    if (!keydev) {
      throw new Error('KeyDev non trovato')
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

    await ctx.db.patch(args.id, {
      ownerId: user._id,
      status: 'InProgress'
    })
    return null
  }
})

/**
 * Dichiara completato un KeyDev (solo owner o admin).
 */
export const markAsDone = mutation({
  args: {
    id: v.id('keydevs')
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const keydev = await ctx.db.get(args.id)
    if (!keydev) {
      throw new Error('KeyDev non trovato')
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

    await ctx.db.patch(args.id, {
      status: 'Done',
      releasedAt: Date.now(),
      donePerc: 100
    })
    return null
  }
})

/**
 * Collega un mockup repository a un KeyDev.
 * Se il KeyDev è in stato Draft, passa automaticamente a MockupDone.
 */
export const linkMockupRepo = mutation({
  args: {
    id: v.id('keydevs'),
    mockupRepoUrl: v.string(),
    prNumber: v.optional(v.number())
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const keydev = await ctx.db.get(args.id)
    if (!keydev) {
      throw new Error('KeyDev non trovato')
    }

    const updates: Record<string, unknown> = {
      mockupRepoUrl: args.mockupRepoUrl
    }
    
    // Se il KeyDev è in Draft, passa a MockupDone
    if (keydev.status === 'Draft') {
      updates.status = 'MockupDone'
    }
    
    if (args.prNumber) {
      updates.prNumber = args.prNumber
      updates.prMerged = false
    }
    await ctx.db.patch(args.id, updates)
    return null
  }
})

/**
 * Aggiorna il progresso di un KeyDev.
 */
export const updateProgress = mutation({
  args: {
    id: v.id('keydevs'),
    donePerc: v.number()
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { donePerc: args.donePerc })
    return null
  }
})
