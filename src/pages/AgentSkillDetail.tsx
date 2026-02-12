import { Link, useParams } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { useState } from 'react'

export default function AgentSkillDetailPage() {
  const { skillId } = useParams({ strict: false }) as { skillId: string }
  const currentUser = useQuery(api.users.getCurrentUser)
  const skill = useQuery(api.skills.getById, { id: skillId as Id<'skills'> })
  const toggleSkillStar = useMutation(api.skills.toggleStar)
  const [copied, setCopied] = useState(false)
  const [isTogglingStar, setIsTogglingStar] = useState(false)
  const [activeTab, setActiveTab] = useState<'skill' | 'consigliataDa'>('skill')

  const handleCopy = async () => {
    if (!skill) return
    await navigator.clipboard.writeText(skill.text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  const handleToggleStar = async () => {
    if (!skill || isTogglingStar) return
    setIsTogglingStar(true)
    try {
      await toggleSkillStar({ skillId: skill._id })
    } finally {
      setIsTogglingStar(false)
    }
  }

  if (currentUser === undefined || skill === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Caricamento...</div>
      </div>
    )
  }

  if (!currentUser?.roles?.includes('Admin')) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
        <p className="text-red-600 dark:text-red-400">Accesso negato. Solo gli amministratori possono accedere a questa pagina.</p>
      </div>
    )
  }

  if (skill === null) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">Skill non trovata.</p>
        <Link to="/admin/agents" className="inline-block mt-4 text-blue-600 dark:text-blue-400 hover:underline">
          Torna ad Agenti
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-full space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/admin/agents" className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
          ← Torna ad Agenti
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{skill.name}</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">{skill.description}</p>
          </div>
          <button
            onClick={handleToggleStar}
            disabled={isTogglingStar}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 ${
              skill.starredByCurrentUser
                ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <span>{skill.starredByCurrentUser ? '★' : '☆'}</span>
            <span>{skill.starredByCurrentUser ? 'Consigliata' : 'Consiglia skill'}</span>
          </button>
        </div>
        <div className="mt-4 space-y-2">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Stelle ricevute: <span className="font-semibold">{skill.starsCount}</span>
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 pt-4">
          <nav className="-mb-px flex gap-6">
            <button
              onClick={() => setActiveTab('skill')}
              className={`pb-3 border-b-2 text-sm font-medium ${
                activeTab === 'skill'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Skill
            </button>
            <button
              onClick={() => setActiveTab('consigliataDa')}
              className={`pb-3 border-b-2 text-sm font-medium ${
                activeTab === 'consigliataDa'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Consigliata da ({skill.starsCount})
            </button>
          </nav>
        </div>

        {activeTab === 'skill' ? (
          <div className="p-6 space-y-6">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Testo completo della skill (.md)</h2>
                <button
                  onClick={handleCopy}
                  className="px-4 py-2 text-sm bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
                >
                  {copied ? 'Copiato!' : 'Copia testo skill'}
                </button>
              </div>
              <pre className="w-full max-h-[520px] overflow-auto text-sm bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-4 rounded-md whitespace-pre-wrap break-words">
                {skill.text}
              </pre>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Pacchetto skill (.zip/.tar.gz)</h2>
              {skill.zipFileUrl ? (
                <div className="space-y-3">
                  <a
                    href={skill.zipFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-4 py-2 text-sm bg-green-600 dark:bg-green-700 text-white rounded-md hover:bg-green-700 dark:hover:bg-green-600"
                  >
                    Scarica archivio skill
                  </a>
                  <ol className="list-decimal list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>Scarica il file `.zip` o `.tar.gz` dal pulsante sopra.</li>
                    <li>Apri OpenClaw e caricagli la skill in .zip dicendo di impararla.</li>
                    <li>Fai sapere ai tuoi colleghi come sta andando ^^</li>
                  </ol>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Nessun archivio skill associato a questa skill. Puoi usare il testo markdown copiabile qui sopra.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Utenti che hanno consigliato la skill</h2>
            {skill.starredUsers.length > 0 ? (
              <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc list-inside space-y-1">
                {skill.starredUsers.map((user) => (
                  <li key={user._id}>{user.name}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">Nessun utente l'ha ancora consigliata.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
