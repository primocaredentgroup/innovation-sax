import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

// Enums come validators riutilizzabili
// Ruolo singolo (per validazione)
export const singleRoleValidator = v.union(
  v.literal('Requester'),
  v.literal('BusinessValidator'),
  v.literal('TechValidator'),
  v.literal('Admin')
)

// Array di ruoli (utenti possono avere più ruoli)
export const rolesValidator = v.array(singleRoleValidator)

// Stati del KeyDev - flusso:
// 1. Draft (Bozza) - stato iniziale
// 2. MockupDone (Mockup Terminato) - quando viene aggiunto mockupRepoUrl
// 3. Approved (Approvato) - dopo approvazione TechValidator
// 4. Rejected (Rifiutato) - se TechValidator rifiuta (con motivo)
// 5. FrontValidated (Front Validato) - dopo validazione BusinessValidator del dipartimento
// 6. InProgress (In Corso) - quando un TechValidator diventa owner
// 7. Done (Completato) - quando l'owner dichiara completato
// 8. Checked (Controllato) - quando l'admin aziendale ha controllato e applicato eventuali penalità
export const keydevStatusValidator = v.union(
  v.literal('Draft'),
  v.literal('MockupDone'),
  v.literal('Approved'),
  v.literal('Rejected'),
  v.literal('FrontValidated'),
  v.literal('InProgress'),
  v.literal('Done'),
  v.literal('Checked')
)

export const noteTypeValidator = v.union(
  v.literal('Comment'),
  v.literal('Mention')
)

// Weight validator per keydevs (peso dello sviluppo per validazione tech)
export const keydevWeightValidator = v.union(
  v.literal(0),
  v.literal(0.25),
  v.literal(0.50),
  v.literal(0.75),
  v.literal(1)
)

// Weight validator per penalità (peso della penalità da 0 a 1, multipli di 0.05)
export const penaltyWeightValidator = v.union(
  v.literal(0),
  v.literal(0.05),
  v.literal(0.10),
  v.literal(0.15),
  v.literal(0.20),
  v.literal(0.25),
  v.literal(0.30),
  v.literal(0.35),
  v.literal(0.40),
  v.literal(0.45),
  v.literal(0.50),
  v.literal(0.55),
  v.literal(0.60),
  v.literal(0.65),
  v.literal(0.70),
  v.literal(0.75),
  v.literal(0.80),
  v.literal(0.85),
  v.literal(0.90),
  v.literal(0.95),
  v.literal(1)
)

// Priority validator per keydevs (priorità da 0 a 4)
// 0 = No priority, 1 = Urgent, 2 = High, 3 = Medium, 4 = Low
export const keydevPriorityValidator = v.union(
  v.literal(0),
  v.literal(1),
  v.literal(2),
  v.literal(3),
  v.literal(4)
)

export default defineSchema({
  // Users & Roles
  users: defineTable({
    name: v.string(),
    email: v.optional(v.string()),
    picture: v.optional(v.string()),
    sub: v.string(), // Auth0 user ID
    roles: v.optional(rolesValidator), // Array di ruoli (utenti possono avere più ruoli)
    deptId: v.optional(v.id('departments')),
    teamId: v.optional(v.id('teams'))
  })
    .index('by_sub', ['sub'])
    .index('by_dept', ['deptId'])
    .index('by_team', ['teamId']),

  // Teams (ex Categories - rappresentano i team aziendali)
  teams: defineTable({
    name: v.string()
  }),

  // Labels
  labels: defineTable({
    value: v.string(), // Valore tecnico/identificativo (es. "Improvement", "Bug", "TechDebt")
    label: v.string() // Etichetta visualizzata (es. "Miglioramento", "Bug", "Debito Tecnico")
  }).index('by_value', ['value']),

  // Departments
  departments: defineTable({
    name: v.string(),
    teamIds: v.array(v.id('teams'))
  }),

  // Months (riferimento mese e budget totale)
  months: defineTable({
    monthRef: v.string(), // formato "2026-01"
    totalKeyDev: v.number() // budget X totale per il mese
  }).index('by_monthRef', ['monthRef']),

  // KeyDevs - entità principale
  keydevs: defineTable({
    readableId: v.string(), // ID incrementale leggibile (es. "KD-001", "KD-002")
    title: v.string(),
    desc: v.string(),
    monthRef: v.optional(v.string()), // riferimento al mese (es. "2026-01"), opzionale per bozze
    teamId: v.id('teams'),
    deptId: v.id('departments'),
    requesterId: v.id('users'),
    businessValidatorId: v.optional(v.id('users')), // BusinessValidator che ha validato il front
    techValidatorId: v.optional(v.id('users')), // TechValidator che ha approvato il mockup
    ownerId: v.optional(v.id('users')), // TechValidator assegnatario (sviluppatore)
    status: keydevStatusValidator,
    // Rejection info
    rejectionReason: v.optional(v.string()), // Motivo del rifiuto da parte del TechValidator
    rejectedById: v.optional(v.id('users')), // Chi ha rifiutato
    // Mockup repo (React-TS template)
    mockupRepoUrl: v.optional(v.string()),
    validatedMockupCommit: v.optional(v.string()), // Commit validato dal BusinessValidator
    // Real development repo
    repoUrl: v.optional(v.string()),
    releaseCommit: v.optional(v.string()), // Commit rilasciato dall'owner quando completa lo sviluppo
    // Weight (peso dello sviluppo per validazione tech)
    weight: v.optional(keydevWeightValidator), // Peso da 0 a 1 (0, 0.25, 0.50, 0.75, 1)
    // Priority (priorità del keydev)
    priority: v.optional(keydevPriorityValidator), // Priorità da 0 a 4 (0 = No priority, 1 = Urgent, 2 = High, 3 = Medium, 4 = Low)
    // Timestamps
    approvedAt: v.optional(v.number()),
    frontValidatedAt: v.optional(v.number()),
    techValidatedAt: v.optional(v.number()), // Quando TechValidator approva (MockupDone → Approved)
    businessValidatedAt: v.optional(v.number()), // Quando BusinessValidator valida (Approved → FrontValidated)
    releasedAt: v.optional(v.number()),
    // Notes count (denormalized)
    notesCount: v.optional(v.number()), // Contatore delle note associate (default: 0)
    // Soft delete
    deletedAt: v.optional(v.number()) // Timestamp di eliminazione (soft delete)
  })
    .index('by_month', ['monthRef'])
    .index('by_dept_and_month', ['deptId', 'monthRef'])
    .index('by_status_and_month', ['status', 'monthRef'])
    .index('by_team_and_month', ['teamId', 'monthRef'])
    .index('by_requester', ['requesterId'])
    .index('by_status', ['status'])
    .index('by_owner', ['ownerId'])
    .index('by_readableId', ['readableId'])
    .searchIndex('search_title', { searchField: 'title' })
    .searchIndex('search_readableId', { searchField: 'readableId' }),

  // Notes (commenti, menzioni) - possono essere collegate a keydevs o coreApps
  notes: defineTable({
    keyDevId: v.optional(v.id('keydevs')), // Opzionale: presente se la nota è collegata a un KeyDev
    coreAppId: v.optional(v.id('coreApps')), // Opzionale: presente se la nota è collegata a una CoreApp
    authorId: v.id('users'),
    body: v.string(),
    ts: v.number(),
    type: noteTypeValidator,
    mentionedUserIds: v.optional(v.array(v.id('users'))) // Utenti menzionati (solo per type='Mention')
  })
    .index('by_keydev', ['keyDevId'])
    .index('by_coreApp', ['coreAppId'])
    .index('by_author', ['authorId']),

  // Budget allocation per Dept/Team/Month
  budgetKeyDev: defineTable({
    monthRef: v.string(),
    deptId: v.id('departments'),
    teamId: v.id('teams'),
    maxAlloc: v.number()
  })
    .index('by_month', ['monthRef'])
    .index('by_month_dept_team', ['monthRef', 'deptId', 'teamId']),

  // Core App Categories (per raggruppare le Core Apps e gestire le subscription)
  coreAppsCategories: defineTable({
    name: v.string(),
    slug: v.string(), // URL-friendly identifier
    description: v.optional(v.string()),
    subscriberIds: v.optional(v.array(v.id('users'))) // Utenti iscritti alle notifiche di questa categoria
  })
    .index('by_slug', ['slug']),

  // Core Apps
  coreApps: defineTable({
    name: v.string(),
    slug: v.string(), // URL-friendly identifier
    description: v.optional(v.string()),
    percentComplete: v.number(), // 0-100
    repoUrl: v.optional(v.string()),
    hubMilestonesUrl: v.optional(v.string()), // URL per collegare la percentuale a milestone in altro applicativo
    status: v.union(
      v.literal('Planning'),
      v.literal('InProgress'),
      v.literal('Completed')
    ),
    ownerId: v.optional(v.id('users')), // Owner responsabile dell'app (temporaneamente opzionale per migrazione)
    categoryId: v.optional(v.id('coreAppsCategories')), // Categoria di appartenenza
    notesCount: v.optional(v.number()) // Contatore delle note associate (default: 0)
  })
    .index('by_slug', ['slug'])
    .index('by_owner', ['ownerId'])
    .index('by_status', ['status'])
    .index('by_category', ['categoryId']),

  // Core App Weekly Updates (Loom videos)
  coreAppUpdates: defineTable({
    coreAppId: v.id('coreApps'),
    weekRef: v.string(), // formato "2026-W04"
    monthRef: v.optional(v.string()), // formato "2026-01"
    loomUrl: v.optional(v.string()),
    title: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number()
  })
    .index('by_coreApp', ['coreAppId'])
    .index('by_week', ['weekRef'])
    .index('by_month', ['monthRef'])
    .index('by_coreApp_and_month', ['coreAppId', 'monthRef']),

  // Penalties (penalità applicate dall'admin aziendale dopo il controllo)
  penalties: defineTable({
    keyDevId: v.id('keydevs'),
    weight: penaltyWeightValidator, // Peso della penalità da 0 a 1 (multipli di 0.05)
    description: v.optional(v.string()), // Descrizione della penalità
    createdById: v.id('users'), // Admin che ha creato la penalità
    createdAt: v.number()
  })
    .index('by_keydev', ['keyDevId'])
})
