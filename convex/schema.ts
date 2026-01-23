import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

// Enums come validators riutilizzabili
export const roleValidator = v.union(
  v.literal('Requester'),
  v.literal('BusinessValidator'),
  v.literal('TechValidator'),
  v.literal('InnovLead'),
  v.literal('Admin')
)

export const keydevStatusValidator = v.union(
  v.literal('Draft'),
  v.literal('PendingBusinessApproval'),
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

export const blockingLabelValidator = v.union(
  v.literal('Improvement'),
  v.literal('Bug'),
  v.literal('TechDebt')
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
    role: v.optional(roleValidator),
    deptId: v.optional(v.id('departments')),
    githubLogin: v.optional(v.string()),
    githubAccessToken: v.optional(v.string())
  })
    .index('by_sub', ['sub'])
    .index('by_dept', ['deptId'])
    .index('by_role', ['role']),

  // Categories
  categories: defineTable({
    name: v.string()
  }),

  // Departments
  departments: defineTable({
    name: v.string(),
    categoryIds: v.array(v.id('categories'))
  }),

  // Months (riferimento mese e budget totale)
  months: defineTable({
    monthRef: v.string(), // formato "2026-01"
    totalKeyDev: v.number() // budget X totale per il mese
  }).index('by_monthRef', ['monthRef']),

  // KeyDevs - entità principale
  keydevs: defineTable({
    title: v.string(),
    desc: v.string(),
    monthRef: v.string(), // riferimento al mese (es. "2026-01")
    categoryId: v.id('categories'),
    deptId: v.id('departments'),
    requesterId: v.id('users'),
    businessValidatorId: v.optional(v.id('users')),
    techValidatorId: v.optional(v.id('users')),
    status: keydevStatusValidator,
    // Mockup repo (React-TS template)
    mockupRepoUrl: v.optional(v.string()),
    mockupTag: v.optional(v.string()), // "v0.9.0-business"
    // Real development repo
    repoUrl: v.optional(v.string()),
    repoTag: v.optional(v.string()),
    // Timestamps
    approvedAt: v.optional(v.number()),
    frontValidatedAt: v.optional(v.number()),
    releasedAt: v.optional(v.number()),
    // Progress
    donePerc: v.optional(v.number()),
    // GitHub PR for business approval
    prNumber: v.optional(v.number()),
    prMerged: v.optional(v.boolean())
  })
    .index('by_month', ['monthRef'])
    .index('by_dept_and_month', ['deptId', 'monthRef'])
    .index('by_status_and_month', ['status', 'monthRef'])
    .index('by_category_and_month', ['categoryId', 'monthRef'])
    .index('by_requester', ['requesterId']),

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
    label: blockingLabelValidator,
    status: blockingLabelStatusValidator
  })
    .index('by_keydev', ['keyDevId'])
    .index('by_status', ['status']),

  // Budget allocation per Dept/Category/Month
  budgetKeyDev: defineTable({
    monthRef: v.string(),
    deptId: v.id('departments'),
    categoryId: v.id('categories'),
    maxAlloc: v.number()
  })
    .index('by_month', ['monthRef'])
    .index('by_month_dept_category', ['monthRef', 'deptId', 'categoryId']),

  // Core Apps
  coreApps: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    percentComplete: v.number(), // 0-100
    repoUrl: v.optional(v.string()),
    status: v.union(
      v.literal('Planning'),
      v.literal('InProgress'),
      v.literal('Completed')
    )
  }),

  // Core App Weekly Updates (Loom videos)
  coreAppUpdates: defineTable({
    coreAppId: v.id('coreApps'),
    weekRef: v.string(), // formato "2026-W04"
    loomUrl: v.string(),
    title: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number()
  })
    .index('by_coreApp', ['coreAppId'])
    .index('by_week', ['weekRef'])
})
