import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useAuth0 } from '@auth0/auth0-react'
import { Authenticated, Unauthenticated } from 'convex/react'
import { useState, useRef } from 'react'
import type { Id } from '../../convex/_generated/dataModel'

export default function ProfilePage() {
  const { user, loginWithRedirect } = useAuth0()
  const currentUser = useQuery(api.users.getCurrentUser)
  const departments = useQuery(api.departments.list)

  const updateOwnProfile = useMutation(api.users.updateOwnProfile)
  const generateOwnUploadUrl = useMutation(api.users.generateOwnUploadUrl)
  const updateOwnPicture = useMutation(api.users.updateOwnPicture)
  const removeOwnPicture = useMutation(api.users.removeOwnPicture)

  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [editedDeptId, setEditedDeptId] = useState<Id<'departments'> | ''>('')
  const [pictureUploading, setPictureUploading] = useState(false)
  const [pictureError, setPictureError] = useState('')
  const [saveError, setSaveError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleStartEdit = () => {
    setEditedName(currentUser?.name || user?.name || '')
    setEditedDeptId(currentUser?.deptId ?? '')
    setSaveError('')
    setPictureError('')
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setEditedName('')
    setEditedDeptId('')
    setSaveError('')
    setPictureError('')
    setIsEditing(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSave = async () => {
    setSaveError('')
    try {
      const updates: { name?: string; deptId?: Id<'departments'> | null } = {}
      if (editedName.trim()) {
        updates.name = editedName.trim()
      }
      if (editedDeptId !== (currentUser?.deptId ?? '')) {
        updates.deptId = editedDeptId === '' ? null : (editedDeptId as Id<'departments'>)
      }
      if (Object.keys(updates).length > 0) {
        await updateOwnProfile(updates)
      }
      setIsEditing(false)
      setEditedName('')
      setEditedDeptId('')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Errore durante il salvataggio')
    }
  }

  const handleUploadPhoto = async (file: File) => {
    setPictureError('')
    setPictureUploading(true)
    try {
      const postUrl = await generateOwnUploadUrl()
      const result = await fetch(postUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file
      })
      const { storageId } = await result.json()
      await updateOwnPicture({ storageId })
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      setPictureError(err instanceof Error ? err.message : 'Errore durante il caricamento')
    } finally {
      setPictureUploading(false)
    }
  }

  const handleRemovePhoto = async () => {
    setPictureError('')
    setPictureUploading(true)
    try {
      await removeOwnPicture()
    } catch (err) {
      setPictureError(err instanceof Error ? err.message : 'Errore durante la rimozione')
    } finally {
      setPictureUploading(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Profilo</h1>

      <Unauthenticated>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <p className="text-gray-600 dark:text-gray-400 mb-4">Accedi per vedere il tuo profilo</p>
          <button
            onClick={() => loginWithRedirect()}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
          >
            Accedi con Auth0
          </button>
        </div>
      </Unauthenticated>

      <Authenticated>
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Informazioni Utente</h2>
              {!isEditing ? (
                <button
                  onClick={handleStartEdit}
                  className="text-sm px-3 py-1.5 rounded-md bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600"
                >
                  Modifica
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleCancelEdit}
                    className="text-sm px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={handleSave}
                    className="text-sm px-3 py-1.5 rounded-md bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600"
                  >
                    Salva
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
              <div className="flex flex-col items-center gap-2 shrink-0">
                {(currentUser?.pictureUrl ?? user?.picture) ? (
                  <img
                    src={currentUser?.pictureUrl ?? user?.picture ?? ''}
                    alt="Avatar"
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-green-600 dark:bg-green-700 flex items-center justify-center">
                    <span className="text-white text-2xl sm:text-3xl font-semibold">
                      {(currentUser?.name || user?.name || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                {isEditing && (
                  <div className="flex flex-col items-center gap-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="text-xs text-gray-600 dark:text-gray-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-blue-100 file:text-blue-700 dark:file:bg-blue-900/30 dark:file:text-blue-300 file:text-xs max-w-[140px]"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleUploadPhoto(file)
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      disabled={pictureUploading}
                      className="text-xs text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
                    >
                      Rimuovi foto
                    </button>
                    {pictureError && (
                      <span className="text-xs text-red-600 dark:text-red-400 text-center">{pictureError}</span>
                    )}
                    {pictureUploading && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">Caricamento...</span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex-1 w-full min-w-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-4">
                  <div className="min-w-0">
                    <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">Nome</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 text-sm sm:text-base"
                        placeholder="Il tuo nome"
                      />
                    ) : (
                      <p className="font-medium wrap-break-word text-sm sm:text-base">
                        {currentUser?.name || user?.name || 'N/A'}
                      </p>
                    )}
                  </div>
                  <div className="min-w-0">
                    <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">Email</label>
                    <p className="font-medium wrap-break-word text-sm sm:text-base">{currentUser?.email || user?.email || 'N/A'}</p>
                  </div>
                  <div className="min-w-0">
                    <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">Ruoli</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(currentUser?.roles || ['Requester']).map((role) => (
                        <span
                          key={role}
                          className={`inline-flex px-2 py-1 text-xs rounded-full ${
                            role === 'Admin'
                              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                              : role === 'BusinessValidator'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                : role === 'TechValidator'
                                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                          }`}
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">Dipartimento</label>
                    {isEditing ? (
                      <select
                        value={editedDeptId}
                        onChange={(e) => setEditedDeptId(e.target.value as Id<'departments'> | '')}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 text-sm sm:text-base"
                      >
                        <option value="">Non assegnato</option>
                        {departments?.map((d) => (
                          <option key={d._id} value={d._id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="font-medium wrap-break-word text-sm sm:text-base">
                        {currentUser?.deptId
                          ? departments?.find((d) => d._id === currentUser.deptId)?.name || 'N/A'
                          : 'Non assegnato'}
                      </p>
                    )}
                  </div>
                </div>
                {saveError && (
                  <p className="mt-3 text-sm text-red-600 dark:text-red-400">{saveError}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </Authenticated>
    </div>
  )
}
