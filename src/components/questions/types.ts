import type { Id } from '../../../convex/_generated/dataModel'

export type Role = 'Requester' | 'BusinessValidator' | 'TechValidator' | 'Admin'
export type QuestionDomain = 'keydev' | 'coreapp'
export type RecipientRole = 'owner' | 'requester'

export type UserLite = {
  _id: Id<'users'>
  name: string
  email?: string
}

export type QuestionParticipantConfig = {
  ownerId?: Id<'users'>
  requesterId?: Id<'users'>
}

export type QuestionLite = {
  _id: string
  text: string
  source: 'Template' | 'Manual'
  validatedAnswerId?: string
  validatedAnswer?: {
    _id: string
    body: string
    senderId: Id<'users'>
    recipientRole: RecipientRole
    ts: number
  }
}

export type QuestionAnswerLite = {
  _id: string
  body: string
  senderId: Id<'users'>
  recipientRole: RecipientRole
  ts: number
}

export type QuestionLabelLite = {
  _id: string
  value: string
  label: string
}
