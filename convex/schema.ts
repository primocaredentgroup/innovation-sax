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
export const keydevStatusValidator = v.union(
  v.literal('Draft'),
  v.literal('MockupDone'),
  v.literal('Approved'),
  v.literal('Rejected'),
  v.literal('FrontValidated'),
  v.literal('InProgress'),
  v.literal('Done')
)

export const noteTypeValidator = v.union(
  v.literal('Comment'),
  v.literal('Task'),
  v.literal('Improvement')
)

export const blockingLabelStatusValidator = v.union(
  v.literal('Open'),
  v.literal('Closed')
)

export default defineSchema({
  // Users & Roles
  users: defineTable({
    name: v.string(),
    email: v.optional(v.string()),
    picture: v.optional(v.string()),
    sub: v.string(), // Auth0 user ID
    roles: v.optional(rolesValidator), // Array di ruoli (utenti possono avere più ruoli)
    deptId: v.optional(v.id('departments'))
  })
    .index('by_sub', ['sub'])
    .index('by_dept', ['deptId']),

  // Teams (ex Categories - rappresentano i team aziendali)
  teams: defineTable({
    name: v.string()
  }),

  // Labels (tipologie di blocking labels)
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
    repoTag: v.optional(v.string()),
    // Timestamps
    approvedAt: v.optional(v.number()),
    frontValidatedAt: v.optional(v.number()),
    techValidatedAt: v.optional(v.number()), // Quando TechValidator approva (MockupDone → Approved)
    businessValidatedAt: v.optional(v.number()), // Quando BusinessValidator valida (Approved → FrontValidated)
    releasedAt: v.optional(v.number())
  })
    .index('by_month', ['monthRef'])
    .index('by_dept_and_month', ['deptId', 'monthRef'])
    .index('by_status_and_month', ['status', 'monthRef'])
    .index('by_team_and_month', ['teamId', 'monthRef'])
    .index('by_requester', ['requesterId'])
    .index('by_status', ['status'])
    .index('by_owner', ['ownerId'])
    .index('by_readableId', ['readableId']),

  // Notes (commenti, task, improvement)
  notes: defineTable({
    keyDevId: v.id('keydevs'),
    authorId: v.id('users'),
    body: v.string(),
    ts: v.number(),
    type: noteTypeValidator
  })
    .index('by_keydev', ['keyDevId'])
    .index('by_author', ['authorId']),

  // Blocking Labels
  blockingLabels: defineTable({
    keyDevId: v.id('keydevs'),
    labelId: v.id('labels'),
    status: blockingLabelStatusValidator
  })
    .index('by_keydev', ['keyDevId'])
    .index('by_status', ['status'])
    .index('by_label', ['labelId']),

  // Budget allocation per Dept/Team/Month
  budgetKeyDev: defineTable({
    monthRef: v.string(),
    deptId: v.id('departments'),
    teamId: v.id('teams'),
    maxAlloc: v.number()
  })
    .index('by_month', ['monthRef'])
    .index('by_month_dept_team', ['monthRef', 'deptId', 'teamId']),

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
    )
  }).index('by_slug', ['slug']),

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
    .index('by_coreApp_and_month', ['coreAppId', 'monthRef'])
})
