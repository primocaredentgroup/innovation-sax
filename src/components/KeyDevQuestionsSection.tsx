import type { Id } from '../../convex/_generated/dataModel'
import QuestionsSection from './questions/QuestionsSection'
import type { Role, UserLite } from './questions/types'

interface KeyDevQuestionsSectionProps {
  keydev: {
    _id: Id<'keydevs'>
    ownerId?: Id<'users'>
    requesterId: Id<'users'>
  }
  keyDevRouteId: string
  users: Array<UserLite> | undefined
  currentUser: { _id: Id<'users'>; roles?: Array<Role> } | null | undefined
  questionSearchTerm?: string
  questionIdFromSearch?: string
  highlightedAnswerFromSearch?: string
  answersPageFromSearch?: string | number
}

export default function KeyDevQuestionsSection({
  keydev,
  keyDevRouteId,
  users,
  currentUser,
  questionSearchTerm,
  questionIdFromSearch,
  highlightedAnswerFromSearch,
  answersPageFromSearch
}: KeyDevQuestionsSectionProps) {
  return (
    <QuestionsSection
      domain="keydev"
      entityId={String(keydev._id)}
      routeTo="/keydevs/$id/questions"
      routeParamKey="id"
      routeParamValue={keyDevRouteId}
      participants={{ ownerId: keydev.ownerId, requesterId: keydev.requesterId }}
      users={users}
      currentUser={currentUser}
      questionSearchTerm={questionSearchTerm}
      questionIdFromSearch={questionIdFromSearch}
      highlightedAnswerFromSearch={highlightedAnswerFromSearch}
      answersPageFromSearch={answersPageFromSearch}
    />
  )
}
