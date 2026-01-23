'use node'

import { action } from './_generated/server'
import { v } from 'convex/values'
import { internal } from './_generated/api'
import type { Id } from './_generated/dataModel'

// Type for KeyDev data from internal query
type KeyDevActionData = {
  _id: Id<'keydevs'>
  mockupRepoUrl?: string
  prNumber?: number
  prMerged?: boolean
} | null

/**
 * Scambia il code OAuth con un access token GitHub.
 */
export const exchangeCodeForToken = action({
  args: {
    code: v.string()
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string())
  }),
  handler: async (ctx, args) => {
    const clientId = process.env.GITHUB_CLIENT_ID
    const clientSecret = process.env.GITHUB_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      return { success: false, error: 'GitHub OAuth non configurato' }
    }

    try {
      // Scambia il code con un token
      const tokenResponse = await fetch(
        'https://github.com/login/oauth/access_token',
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            code: args.code
          })
        }
      )

      const tokenData = await tokenResponse.json()

      if (tokenData.error) {
        return { success: false, error: tokenData.error_description }
      }

      // Ottieni le info dell'utente GitHub
      const userResponse = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: 'application/vnd.github.v3+json'
        }
      })

      const userData = await userResponse.json()

      // Salva il token e il login nel database
      await ctx.runMutation(internal.github.saveGitHubCredentials, {
        accessToken: tokenData.access_token,
        githubLogin: userData.login
      })

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Errore sconosciuto'
      }
    }
  }
})

/**
 * Ottiene lo stato della PR di un KeyDev.
 */
export const getPRStatus = action({
  args: {
    keyDevId: v.id('keydevs')
  },
  returns: v.object({
    success: v.boolean(),
    prState: v.optional(v.string()),
    prMerged: v.optional(v.boolean()),
    error: v.optional(v.string())
  }),
  handler: async (ctx, args): Promise<{
    success: boolean
    prState?: string
    prMerged?: boolean
    error?: string
  }> => {
    // Ottieni il KeyDev
    const keydev: KeyDevActionData = await ctx.runQuery(
      internal.github.getKeyDevForAction,
      { keyDevId: args.keyDevId }
    )

    if (!keydev) {
      return { success: false, error: 'KeyDev non trovato' }
    }

    if (!keydev.mockupRepoUrl || !keydev.prNumber) {
      return { success: false, error: 'Nessuna PR associata' }
    }

    // In produzione, qui chiameremmo l'API GitHub per ottenere lo stato della PR
    // Per ora restituiamo i dati salvati nel database
    return {
      success: true,
      prState: keydev.prMerged ? 'merged' : 'open',
      prMerged: keydev.prMerged
    }
  }
})

/**
 * Merge della PR di approvazione business.
 * Solo BusinessValidator o Admin possono farlo.
 */
export const mergePR = action({
  args: {
    keyDevId: v.id('keydevs')
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string())
  }),
  handler: async (ctx, args) => {
    // In produzione, qui chiameremmo l'API GitHub per fare il merge
    // e poi aggiorneremmo lo stato del KeyDev tramite una mutation

    // Per ora, aggiorniamo direttamente lo stato
    await ctx.runMutation(internal.github.markPRMerged, {
      keyDevId: args.keyDevId
    })

    return { success: true }
  }
})
