import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState } from 'react'
import type { Id } from '../../convex/_generated/dataModel'
import { useNavigate } from '@tanstack/react-router'

type AgentsTab = 'agentApps' | 'agents' | 'skills'

export default function AgentsPage() {
  const navigate = useNavigate()
  const currentUser = useQuery(api.users.getCurrentUser)

  const agentApps = useQuery(api.agentApps.list)
  const createAgentApp = useMutation(api.agentApps.create)
  const updateAgentApp = useMutation(api.agentApps.update)
  const removeAgentApp = useMutation(api.agentApps.remove)

  const agents = useQuery(api.agents.list)
  const createAgent = useMutation(api.agents.create)
  const updateAgent = useMutation(api.agents.update)
  const removeAgent = useMutation(api.agents.remove)

  const [skillsSearch, setSkillsSearch] = useState('')
  const skills = useQuery(api.skills.list, {
    search: skillsSearch.trim() ? skillsSearch.trim() : undefined
  })
  const createSkill = useMutation(api.skills.create)
  const updateSkill = useMutation(api.skills.update)
  const removeSkill = useMutation(api.skills.remove)
  const generateSkillUploadUrl = useMutation(api.skills.generateUploadUrl)

  const [activeTab, setActiveTab] = useState<AgentsTab>('agentApps')

  const [newAgentAppName, setNewAgentAppName] = useState('')
  const [newAgentAppBaseUrl, setNewAgentAppBaseUrl] = useState('')
  const [newAgentAppKey, setNewAgentAppKey] = useState('')
  const [editingAgentApp, setEditingAgentApp] = useState<Id<'agentApps'> | null>(null)
  const [editAgentAppName, setEditAgentAppName] = useState('')
  const [editAgentAppBaseUrl, setEditAgentAppBaseUrl] = useState('')
  const [editAgentAppKey, setEditAgentAppKey] = useState('')

  const [newAgentName, setNewAgentName] = useState('')
  const [newAgentProvider, setNewAgentProvider] = useState('')
  const [newAgentProviderUserId, setNewAgentProviderUserId] = useState('')
  const [editingAgent, setEditingAgent] = useState<Id<'agents'> | null>(null)
  const [editAgentName, setEditAgentName] = useState('')
  const [editAgentProvider, setEditAgentProvider] = useState('')
  const [editAgentProviderUserId, setEditAgentProviderUserId] = useState('')

  const [newSkillName, setNewSkillName] = useState('')
  const [newSkillDescription, setNewSkillDescription] = useState('')
  const [newSkillText, setNewSkillText] = useState('')
  const [newSkillZipFile, setNewSkillZipFile] = useState<File | null>(null)
  const [skillUploading, setSkillUploading] = useState(false)
  const [isCreateSkillDialogOpen, setIsCreateSkillDialogOpen] = useState(false)
  const [editingSkill, setEditingSkill] = useState<Id<'skills'> | null>(null)
  const [editSkillName, setEditSkillName] = useState('')
  const [editSkillDescription, setEditSkillDescription] = useState('')
  const [editSkillText, setEditSkillText] = useState('')
  const [editSkillZipFile, setEditSkillZipFile] = useState<File | null>(null)

  if (!currentUser?.roles?.includes('Admin')) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
        <p className="text-red-600 dark:text-red-400">Accesso negato. Solo gli amministratori possono accedere a questa pagina.</p>
      </div>
    )
  }

  const handleCreateAgentApp = async () => {
    if (!newAgentAppName.trim() || !newAgentAppBaseUrl.trim() || !newAgentAppKey.trim()) return

    await createAgentApp({
      name: newAgentAppName.trim(),
      baseUrl: newAgentAppBaseUrl.trim(),
      appKey: newAgentAppKey.trim()
    })

    setNewAgentAppName('')
    setNewAgentAppBaseUrl('')
    setNewAgentAppKey('')
  }

  const handleStartEditAgentApp = (app: {
    _id: Id<'agentApps'>
    name: string
    baseUrl: string
    appKey: string
  }) => {
    setEditingAgentApp(app._id)
    setEditAgentAppName(app.name)
    setEditAgentAppBaseUrl(app.baseUrl)
    setEditAgentAppKey(app.appKey)
  }

  const handleUpdateAgentApp = async (id: Id<'agentApps'>) => {
    if (!editAgentAppName.trim() || !editAgentAppBaseUrl.trim() || !editAgentAppKey.trim()) return

    await updateAgentApp({
      id,
      name: editAgentAppName.trim(),
      baseUrl: editAgentAppBaseUrl.trim(),
      appKey: editAgentAppKey.trim()
    })

    setEditingAgentApp(null)
    setEditAgentAppName('')
    setEditAgentAppBaseUrl('')
    setEditAgentAppKey('')
  }

  const handleCancelEditAgentApp = () => {
    setEditingAgentApp(null)
    setEditAgentAppName('')
    setEditAgentAppBaseUrl('')
    setEditAgentAppKey('')
  }

  const handleRemoveAgentApp = async (id: Id<'agentApps'>) => {
    if (!confirm('Sei sicuro di voler eliminare questa Agent App?')) return
    await removeAgentApp({ id })
  }

  const handleCreateAgent = async () => {
    if (!newAgentName.trim() || !newAgentProvider.trim() || !newAgentProviderUserId.trim()) return

    await createAgent({
      name: newAgentName.trim(),
      provider: newAgentProvider.trim(),
      providerUserId: newAgentProviderUserId.trim()
    })

    setNewAgentName('')
    setNewAgentProvider('')
    setNewAgentProviderUserId('')
  }

  const handleStartEditAgent = (agent: {
    _id: Id<'agents'>
    name: string
    provider: string
    providerUserId: string
  }) => {
    setEditingAgent(agent._id)
    setEditAgentName(agent.name)
    setEditAgentProvider(agent.provider)
    setEditAgentProviderUserId(agent.providerUserId)
  }

  const handleUpdateAgent = async (id: Id<'agents'>) => {
    if (!editAgentName.trim() || !editAgentProvider.trim() || !editAgentProviderUserId.trim()) return

    await updateAgent({
      id,
      name: editAgentName.trim(),
      provider: editAgentProvider.trim(),
      providerUserId: editAgentProviderUserId.trim()
    })

    setEditingAgent(null)
    setEditAgentName('')
    setEditAgentProvider('')
    setEditAgentProviderUserId('')
  }

  const handleCancelEditAgent = () => {
    setEditingAgent(null)
    setEditAgentName('')
    setEditAgentProvider('')
    setEditAgentProviderUserId('')
  }

  const handleRemoveAgent = async (id: Id<'agents'>) => {
    if (!confirm('Sei sicuro di voler eliminare questo agent?')) return
    await removeAgent({ id })
  }

  const uploadSkillZipIfNeeded = async (zipFile: File | null) => {
    if (!zipFile) return undefined
    const postUrl = await generateSkillUploadUrl()
    const result = await fetch(postUrl, {
      method: 'POST',
      headers: { 'Content-Type': zipFile.type || 'application/zip' },
      body: zipFile
    })
    const { storageId } = await result.json()
    return storageId as Id<'_storage'>
  }

  const handleCreateSkill = async () => {
    if (!newSkillName.trim() || !newSkillDescription.trim() || !newSkillText.trim()) return
    setSkillUploading(true)
    try {
      const zipStorageId = await uploadSkillZipIfNeeded(newSkillZipFile)
      await createSkill({
        name: newSkillName.trim(),
        description: newSkillDescription.trim(),
        text: newSkillText,
        zipFile: zipStorageId
      })
      setNewSkillName('')
      setNewSkillDescription('')
      setNewSkillText('')
      setNewSkillZipFile(null)
      setIsCreateSkillDialogOpen(false)
    } finally {
      setSkillUploading(false)
    }
  }

  const handleStartEditSkill = (skill: {
    _id: Id<'skills'>
    name: string
    description: string
    text: string
  }) => {
    setEditingSkill(skill._id)
    setEditSkillName(skill.name)
    setEditSkillDescription(skill.description)
    setEditSkillText(skill.text)
    setEditSkillZipFile(null)
  }

  const handleUpdateSkill = async (id: Id<'skills'>) => {
    if (!editSkillName.trim() || !editSkillDescription.trim() || !editSkillText.trim()) return
    setSkillUploading(true)
    try {
      const zipStorageId = await uploadSkillZipIfNeeded(editSkillZipFile)
      await updateSkill({
        id,
        name: editSkillName.trim(),
        description: editSkillDescription.trim(),
        text: editSkillText,
        zipFile: zipStorageId
      })
      setEditingSkill(null)
      setEditSkillName('')
      setEditSkillDescription('')
      setEditSkillText('')
      setEditSkillZipFile(null)
    } finally {
      setSkillUploading(false)
    }
  }

  const handleCancelEditSkill = () => {
    setEditingSkill(null)
    setEditSkillName('')
    setEditSkillDescription('')
    setEditSkillText('')
    setEditSkillZipFile(null)
  }

  const handleRemoveSkill = async (id: Id<'skills'>) => {
    if (!confirm('Sei sicuro di voler eliminare questa skill?')) return
    await removeSkill({ id })
  }

  return (
    <div className="w-full max-w-full">
      <div className="mb-4 lg:mb-6">
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-gray-100">Agenti</h1>
        <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400 mt-1">Gestisci Agent Apps e Agents</p>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700 mb-4 lg:mb-6 overflow-x-auto">
        <nav className="-mb-px flex space-x-4 lg:space-x-8 min-w-max lg:min-w-0">
          <button
            onClick={() => setActiveTab('agentApps')}
            className={`py-3 lg:py-4 px-1 border-b-2 font-medium text-xs lg:text-sm whitespace-nowrap ${
              activeTab === 'agentApps'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Agent Apps
          </button>
          <button
            onClick={() => setActiveTab('agents')}
            className={`py-3 lg:py-4 px-1 border-b-2 font-medium text-xs lg:text-sm whitespace-nowrap ${
              activeTab === 'agents'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Agents
          </button>
          <button
            onClick={() => setActiveTab('skills')}
            className={`py-3 lg:py-4 px-1 border-b-2 font-medium text-xs lg:text-sm whitespace-nowrap ${
              activeTab === 'skills'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Skills
          </button>
        </nav>
      </div>

      {activeTab === 'agentApps' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-4 lg:px-6 py-3 lg:py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-gray-100">Agent Apps</h2>
          </div>

          <div className="p-4 lg:p-6">
            <div className="mb-4 grid grid-cols-1 lg:grid-cols-3 gap-2">
              <input
                type="text"
                value={newAgentAppName}
                onChange={(e) => setNewAgentAppName(e.target.value)}
                placeholder="Nome app"
                className="px-3 py-2 text-sm lg:text-base border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
              />
              <input
                type="text"
                value={newAgentAppBaseUrl}
                onChange={(e) => setNewAgentAppBaseUrl(e.target.value)}
                placeholder="Base URL"
                className="px-3 py-2 text-sm lg:text-base border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
              />
              <input
                type="text"
                value={newAgentAppKey}
                onChange={(e) => setNewAgentAppKey(e.target.value)}
                placeholder="App Key"
                className="px-3 py-2 text-sm lg:text-base border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <button
              onClick={handleCreateAgentApp}
              className="mb-4 px-4 py-2 text-sm lg:text-base bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
            >
              Aggiungi Agent App
            </button>

            <div className="overflow-x-auto -mx-4 lg:mx-0">
              <div className="inline-block min-w-full align-middle">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700">
                      <th className="px-3 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold text-gray-900 dark:text-gray-100">Nome</th>
                      <th className="px-3 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold text-gray-900 dark:text-gray-100">Base URL</th>
                      <th className="px-3 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold text-gray-900 dark:text-gray-100">App Key</th>
                      <th className="px-3 lg:px-4 py-2 lg:py-3 text-center text-xs lg:text-sm font-semibold text-gray-900 dark:text-gray-100">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {agentApps?.map((app) => {
                      const isEditing = editingAgentApp === app._id

                      return (
                        <tr key={app._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-3 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-900 dark:text-gray-100">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editAgentAppName}
                                onChange={(e) => setEditAgentAppName(e.target.value)}
                                className="w-full px-2 py-1 text-xs lg:text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:text-gray-100"
                              />
                            ) : (
                              app.name
                            )}
                          </td>
                          <td className="px-3 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-900 dark:text-gray-100">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editAgentAppBaseUrl}
                                onChange={(e) => setEditAgentAppBaseUrl(e.target.value)}
                                className="w-full px-2 py-1 text-xs lg:text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:text-gray-100"
                              />
                            ) : (
                              app.baseUrl
                            )}
                          </td>
                          <td className="px-3 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-900 dark:text-gray-100">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editAgentAppKey}
                                onChange={(e) => setEditAgentAppKey(e.target.value)}
                                className="w-full px-2 py-1 text-xs lg:text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:text-gray-100"
                              />
                            ) : (
                              app.appKey
                            )}
                          </td>
                          <td className="px-3 lg:px-4 py-2 lg:py-3 text-center">
                            {isEditing ? (
                              <div className="flex gap-1 lg:gap-2 justify-center flex-wrap">
                                <button
                                  onClick={() => handleUpdateAgentApp(app._id)}
                                  className="px-2 lg:px-3 py-1 text-xs lg:text-sm bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
                                >
                                  Salva
                                </button>
                                <button
                                  onClick={handleCancelEditAgentApp}
                                  className="px-2 lg:px-3 py-1 text-xs lg:text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
                                >
                                  Annulla
                                </button>
                              </div>
                            ) : (
                              <div className="flex gap-1 lg:gap-2 justify-center flex-wrap">
                                <button
                                  onClick={() => handleStartEditAgentApp(app)}
                                  className="px-2 lg:px-3 py-1 text-xs lg:text-sm bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
                                >
                                  Modifica
                                </button>
                                <button
                                  onClick={() => handleRemoveAgentApp(app._id)}
                                  className="px-2 lg:px-3 py-1 text-xs lg:text-sm bg-red-600 dark:bg-red-700 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-600"
                                >
                                  Elimina
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {agentApps?.length === 0 && (
                <div className="p-6 lg:p-8 text-center text-sm lg:text-base text-gray-500 dark:text-gray-400">Nessuna Agent App presente</div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'agents' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-4 lg:px-6 py-3 lg:py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-gray-100">Agents</h2>
          </div>

          <div className="p-4 lg:p-6">
            <div className="mb-4 grid grid-cols-1 lg:grid-cols-3 gap-2">
              <input
                type="text"
                value={newAgentName}
                onChange={(e) => setNewAgentName(e.target.value)}
                placeholder="Nome agent"
                className="px-3 py-2 text-sm lg:text-base border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
              />
              <input
                type="text"
                value={newAgentProvider}
                onChange={(e) => setNewAgentProvider(e.target.value)}
                placeholder="Provider"
                className="px-3 py-2 text-sm lg:text-base border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
              />
              <input
                type="text"
                value={newAgentProviderUserId}
                onChange={(e) => setNewAgentProviderUserId(e.target.value)}
                placeholder="Provider User ID"
                className="px-3 py-2 text-sm lg:text-base border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <button
              onClick={handleCreateAgent}
              className="mb-4 px-4 py-2 text-sm lg:text-base bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
            >
              Aggiungi Agent
            </button>

            <div className="overflow-x-auto -mx-4 lg:mx-0">
              <div className="inline-block min-w-full align-middle">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700">
                      <th className="px-3 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold text-gray-900 dark:text-gray-100">Nome</th>
                      <th className="px-3 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold text-gray-900 dark:text-gray-100">Provider</th>
                      <th className="px-3 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold text-gray-900 dark:text-gray-100">Provider User ID</th>
                      <th className="px-3 lg:px-4 py-2 lg:py-3 text-center text-xs lg:text-sm font-semibold text-gray-900 dark:text-gray-100">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {agents?.map((agent) => {
                      const isEditing = editingAgent === agent._id

                      return (
                        <tr key={agent._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-3 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-900 dark:text-gray-100">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editAgentName}
                                onChange={(e) => setEditAgentName(e.target.value)}
                                className="w-full px-2 py-1 text-xs lg:text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:text-gray-100"
                              />
                            ) : (
                              agent.name
                            )}
                          </td>
                          <td className="px-3 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-900 dark:text-gray-100">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editAgentProvider}
                                onChange={(e) => setEditAgentProvider(e.target.value)}
                                className="w-full px-2 py-1 text-xs lg:text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:text-gray-100"
                              />
                            ) : (
                              agent.provider
                            )}
                          </td>
                          <td className="px-3 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm text-gray-900 dark:text-gray-100">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editAgentProviderUserId}
                                onChange={(e) => setEditAgentProviderUserId(e.target.value)}
                                className="w-full px-2 py-1 text-xs lg:text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:text-gray-100"
                              />
                            ) : (
                              agent.providerUserId
                            )}
                          </td>
                          <td className="px-3 lg:px-4 py-2 lg:py-3 text-center">
                            {isEditing ? (
                              <div className="flex gap-1 lg:gap-2 justify-center flex-wrap">
                                <button
                                  onClick={() => handleUpdateAgent(agent._id)}
                                  className="px-2 lg:px-3 py-1 text-xs lg:text-sm bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
                                >
                                  Salva
                                </button>
                                <button
                                  onClick={handleCancelEditAgent}
                                  className="px-2 lg:px-3 py-1 text-xs lg:text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
                                >
                                  Annulla
                                </button>
                              </div>
                            ) : (
                              <div className="flex gap-1 lg:gap-2 justify-center flex-wrap">
                                <button
                                  onClick={() => handleStartEditAgent(agent)}
                                  className="px-2 lg:px-3 py-1 text-xs lg:text-sm bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
                                >
                                  Modifica
                                </button>
                                <button
                                  onClick={() => handleRemoveAgent(agent._id)}
                                  className="px-2 lg:px-3 py-1 text-xs lg:text-sm bg-red-600 dark:bg-red-700 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-600"
                                >
                                  Elimina
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {agents?.length === 0 && (
                <div className="p-6 lg:p-8 text-center text-sm lg:text-base text-gray-500 dark:text-gray-400">Nessun agent presente</div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'skills' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-4 lg:px-6 py-3 lg:py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-gray-100">Skills</h2>
          </div>

          <div className="p-4 lg:p-6 space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => setIsCreateSkillDialogOpen(true)}
                className="px-4 py-2 text-sm lg:text-base bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
              >
                Nuova Skill
              </button>
            </div>

            <div className="pt-2">
              <input
                type="text"
                value={skillsSearch}
                onChange={(e) => setSkillsSearch(e.target.value)}
                placeholder="Cerca skill per nome..."
                className="w-full px-3 py-2 text-sm lg:text-base border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>

            <div className="space-y-3">
              {skills?.map((skill) => {
                const isEditing = editingSkill === skill._id
                return (
                  <div
                    key={skill._id}
                    onClick={() => {
                      if (isEditing) return
                      navigate({ to: '/admin/agents/skills/$skillId', params: { skillId: skill._id } })
                    }}
                    className={`border border-gray-200 dark:border-gray-700 rounded-lg p-4 ${
                      isEditing
                        ? ''
                        : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors'
                    }`}
                  >
                    {isEditing ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editSkillName}
                          onChange={(e) => setEditSkillName(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                        />
                        <input
                          type="text"
                          value={editSkillDescription}
                          onChange={(e) => setEditSkillDescription(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                        />
                        <textarea
                          value={editSkillText}
                          onChange={(e) => setEditSkillText(e.target.value)}
                          rows={8}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                        />
                        <input
                          type="file"
                          accept=".zip,.tar.gz,.tgz,application/zip,application/gzip,application/x-gzip"
                          onChange={(e) => setEditSkillZipFile(e.target.files?.[0] ?? null)}
                          className="text-sm text-gray-700 dark:text-gray-300"
                        />
                        {editSkillZipFile && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            File selezionato: {editSkillZipFile.name}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateSkill(skill._id)}
                            disabled={skillUploading}
                            className="px-3 py-1 text-sm bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
                          >
                            Salva
                          </button>
                          <button
                            onClick={handleCancelEditSkill}
                            className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
                          >
                            Annulla
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                        <div>
                          <h3 className="text-sm lg:text-base font-medium text-gray-900 dark:text-gray-100">{skill.name}</h3>
                          <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400">{skill.description}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {skill.hasZipFile ? 'Archivio disponibile (.zip/.tar.gz)' : 'Solo markdown'}
                          </p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleStartEditSkill(skill)
                            }}
                            className="px-3 py-1 text-xs lg:text-sm bg-gray-700 dark:bg-gray-600 text-white rounded-md hover:bg-gray-800 dark:hover:bg-gray-500"
                          >
                            Modifica
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemoveSkill(skill._id)
                            }}
                            className="px-3 py-1 text-xs lg:text-sm bg-red-600 dark:bg-red-700 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-600"
                          >
                            Elimina
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
              {skills?.length === 0 && (
                <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">Nessuna skill presente</div>
              )}
            </div>
          </div>
        </div>
      )}

      {isCreateSkillDialogOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
            <div className="px-4 lg:px-6 py-3 lg:py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-gray-100">Nuova Skill</h3>
              <button
                onClick={() => {
                  setIsCreateSkillDialogOpen(false)
                  setNewSkillName('')
                  setNewSkillDescription('')
                  setNewSkillText('')
                  setNewSkillZipFile(null)
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="p-4 lg:p-6 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  placeholder="Nome skill"
                  className="px-3 py-2 text-sm lg:text-base border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                />
                <input
                  type="text"
                  value={newSkillDescription}
                  onChange={(e) => setNewSkillDescription(e.target.value)}
                  placeholder="Descrizione skill"
                  className="px-3 py-2 text-sm lg:text-base border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
              <textarea
                value={newSkillText}
                onChange={(e) => setNewSkillText(e.target.value)}
                placeholder="Testo completo markdown (.md) della skill"
                rows={10}
                className="w-full px-3 py-2 text-sm lg:text-base border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
              />
              <div className="flex flex-col gap-2">
                <input
                  type="file"
                  accept=".zip,.tar.gz,.tgz,application/zip,application/gzip,application/x-gzip"
                  onChange={(e) => setNewSkillZipFile(e.target.files?.[0] ?? null)}
                  className="text-sm text-gray-700 dark:text-gray-300"
                />
                {newSkillZipFile && (
                  <span className="text-xs lg:text-sm text-gray-500 dark:text-gray-400">
                    File selezionato: {newSkillZipFile.name}
                  </span>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setIsCreateSkillDialogOpen(false)
                    setNewSkillName('')
                    setNewSkillDescription('')
                    setNewSkillText('')
                    setNewSkillZipFile(null)
                  }}
                  className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
                >
                  Annulla
                </button>
                <button
                  onClick={handleCreateSkill}
                  disabled={skillUploading}
                  className="px-4 py-2 text-sm bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
                >
                  {skillUploading ? 'Caricamento...' : 'Crea Skill'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
