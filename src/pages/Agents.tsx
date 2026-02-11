import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState } from 'react'
import type { Id } from '../../convex/_generated/dataModel'

type AgentsTab = 'agentApps' | 'agents'

export default function AgentsPage() {
  const currentUser = useQuery(api.users.getCurrentUser)

  const agentApps = useQuery(api.agentApps.list)
  const createAgentApp = useMutation(api.agentApps.create)
  const updateAgentApp = useMutation(api.agentApps.update)
  const removeAgentApp = useMutation(api.agentApps.remove)

  const agents = useQuery(api.agents.list)
  const createAgent = useMutation(api.agents.create)
  const updateAgent = useMutation(api.agents.update)
  const removeAgent = useMutation(api.agents.remove)

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
    </div>
  )
}
