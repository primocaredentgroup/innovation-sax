import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import type { QuestionDomain, QuestionLabelLite, QuestionLite, RecipientRole } from './types'

type UseQuestionsDomainAdapterArgs = {
  domain: QuestionDomain
  entityId: string
}

export function useQuestionsDomainAdapter({ domain, entityId }: UseQuestionsDomainAdapterArgs) {
  const isKeyDev = domain === 'keydev'

  const keyDevQuestions = useQuery(
    api.keydevQuestions.listByKeyDev,
    isKeyDev ? { keyDevId: entityId as Id<'keydevs'> } : 'skip'
  )
  const coreAppQuestions = useQuery(
    api.coreAppQuestions.listByCoreApp,
    !isKeyDev ? { coreAppId: entityId as Id<'coreApps'> } : 'skip'
  )

  const keyDevGetStatus = useQuery(
    api.keydevQuestions.getQuestionsStatus,
    isKeyDev ? { keyDevId: entityId as Id<'keydevs'> } : 'skip'
  )
  const coreAppGetStatus = useQuery(
    api.coreAppQuestions.getQuestionsStatus,
    !isKeyDev ? { coreAppId: entityId as Id<'coreApps'> } : 'skip'
  )

  const questionsRaw = (isKeyDev ? keyDevQuestions : coreAppQuestions) || []
  const questions: Array<QuestionLite> = questionsRaw.map((question) => ({
    _id: String(question._id),
    text: question.text,
    source: question.source,
    createdById: question.createdById,
    requesterId: 'requesterId' in question ? question.requesterId : undefined,
    validatedAnswerId: question.validatedAnswerId ? String(question.validatedAnswerId) : undefined,
    validatedAnswer: question.validatedAnswer
      ? {
          _id: String(question.validatedAnswer._id),
          body: question.validatedAnswer.body,
          senderId: question.validatedAnswer.senderId,
          recipientRole: question.validatedAnswer.recipientRole,
          ts: question.validatedAnswer.ts
        }
      : undefined
  }))

  const availableLabelsRaw = useQuery(api.questionLabels.listQuestionLabels, {}) || []
  const availableLabels: Array<QuestionLabelLite> = availableLabelsRaw.map((label) => ({
    _id: String(label._id),
    value: label.value,
    label: label.label
  }))

  const labelsByQuestionRaw = useQuery(api.questionLabels.listLabelsForQuestions, {
    questionDomain: domain,
    questionIds: questions.map((q) => q._id)
  })

  const labelsByQuestion = labelsByQuestionRaw || {}

  const createQuestionKeyDev = useMutation(api.keydevQuestions.createQuestion)
  const createQuestionCoreApp = useMutation(api.coreAppQuestions.createQuestion)
  const updateQuestionKeyDev = useMutation(api.keydevQuestions.updateQuestion)
  const updateQuestionCoreApp = useMutation(api.coreAppQuestions.updateQuestion)
  const createAnswerKeyDev = useMutation(api.keydevQuestions.createAnswer)
  const createAnswerCoreApp = useMutation(api.coreAppQuestions.createAnswer)
  const updateAnswerKeyDev = useMutation(api.keydevQuestions.updateAnswer)
  const updateAnswerCoreApp = useMutation(api.coreAppQuestions.updateAnswer)
  const validateAnswerKeyDev = useMutation(api.keydevQuestions.validateAnswer)
  const validateAnswerCoreApp = useMutation(api.coreAppQuestions.validateAnswer)
  const deleteQuestionKeyDev = useMutation(api.keydevQuestions.deleteQuestion)
  const deleteQuestionCoreApp = useMutation(api.coreAppQuestions.deleteQuestion)
  const startQuestionsKeyDev = useMutation(api.keydevQuestions.startQuestions)
  const startQuestionsCoreApp = useMutation(api.coreAppQuestions.startQuestions)

  const createQuestionLabel = useMutation(api.questionLabels.createQuestionLabel)
  const addLabelToQuestion = useMutation(api.questionLabels.addLabelToQuestion)
  const removeLabelFromQuestion = useMutation(api.questionLabels.removeLabelFromQuestion)

  return {
    questions,
    questionsStatus: isKeyDev ? keyDevGetStatus : coreAppGetStatus,
    availableLabels,
    labelsByQuestion,
    async startQuestions() {
      if (isKeyDev) {
        await startQuestionsKeyDev({ keyDevId: entityId as Id<'keydevs'> })
        return
      }
      await startQuestionsCoreApp({ coreAppId: entityId as Id<'coreApps'> })
    },
    async createQuestion(text: string) {
      if (isKeyDev) {
        return String(await createQuestionKeyDev({ keyDevId: entityId as Id<'keydevs'>, text }))
      }
      return String(await createQuestionCoreApp({ coreAppId: entityId as Id<'coreApps'>, text }))
    },
    async updateQuestion(questionId: string, text: string) {
      if (isKeyDev) {
        await updateQuestionKeyDev({ questionId: questionId as Id<'keyDevQuestions'>, text })
        return
      }
      await updateQuestionCoreApp({ questionId: questionId as Id<'coreAppQuestions'>, text })
    },
    async createAnswer(args: {
      questionId: string
      body: string
      recipientRole: RecipientRole
      recipientUserId?: Id<'users'>
      mentionedUserIds?: Array<Id<'users'>>
    }) {
      if (isKeyDev) {
        return String(
          await createAnswerKeyDev({
            questionId: args.questionId as Id<'keyDevQuestions'>,
            body: args.body,
            recipientRole: args.recipientRole,
            recipientUserId: args.recipientUserId,
            mentionedUserIds: args.mentionedUserIds
          })
        )
      }
      return String(
        await createAnswerCoreApp({
          questionId: args.questionId as Id<'coreAppQuestions'>,
          body: args.body,
          recipientRole: args.recipientRole,
          recipientUserId: args.recipientUserId,
          mentionedUserIds: args.mentionedUserIds
        })
      )
    },
    async updateAnswer(args: {
      answerId: string
      body: string
      recipientRole: RecipientRole
      recipientUserId?: Id<'users'>
      mentionedUserIds?: Array<Id<'users'>>
    }) {
      if (isKeyDev) {
        await updateAnswerKeyDev({
          answerId: args.answerId as Id<'keyDevQuestionAnswers'>,
          body: args.body,
          recipientRole: args.recipientRole,
          recipientUserId: args.recipientUserId,
          mentionedUserIds: args.mentionedUserIds
        })
        return
      }
      await updateAnswerCoreApp({
        answerId: args.answerId as Id<'coreAppQuestionAnswers'>,
        body: args.body,
        recipientRole: args.recipientRole,
        recipientUserId: args.recipientUserId,
        mentionedUserIds: args.mentionedUserIds
      })
    },
    async validateAnswer(questionId: string, answerId: string) {
      if (isKeyDev) {
        await validateAnswerKeyDev({
          questionId: questionId as Id<'keyDevQuestions'>,
          answerId: answerId as Id<'keyDevQuestionAnswers'>
        })
        return
      }
      await validateAnswerCoreApp({
        questionId: questionId as Id<'coreAppQuestions'>,
        answerId: answerId as Id<'coreAppQuestionAnswers'>
      })
    },
    async deleteQuestion(questionId: string) {
      if (isKeyDev) {
        await deleteQuestionKeyDev({ questionId: questionId as Id<'keyDevQuestions'> })
        return
      }
      await deleteQuestionCoreApp({ questionId: questionId as Id<'coreAppQuestions'> })
    },
    async addLabel(questionId: string, labelText: string) {
      const createdLabel = await createQuestionLabel({ label: labelText })
      await addLabelToQuestion({
        questionDomain: domain,
        questionId,
        labelId: createdLabel._id
      })
    },
    async removeLabel(questionId: string, labelId: string) {
      await removeLabelFromQuestion({
        questionDomain: domain,
        questionId,
        labelId: labelId as Id<'questionLabels'>
      })
    }
  }
}
