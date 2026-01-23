import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { api } from './_generated/api'

// Note: GitHub OAuth actions are in githubActions.ts

const http = httpRouter()

/**
 * GitHub OAuth callback endpoint.
 * Riceve il code da GitHub e lo scambia per un access token.
 */
http.route({
  path: '/api/github/callback',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const error = url.searchParams.get('error')

    if (error) {
      return new Response(
        `<html>
          <body>
            <h1>Errore</h1>
            <p>${url.searchParams.get('error_description') || error}</p>
            <a href="/profile">Torna al profilo</a>
          </body>
        </html>`,
        {
          status: 400,
          headers: { 'Content-Type': 'text/html' }
        }
      )
    }

    if (!code) {
      return new Response(
        `<html>
          <body>
            <h1>Errore</h1>
            <p>Codice OAuth mancante</p>
            <a href="/profile">Torna al profilo</a>
          </body>
        </html>`,
        {
          status: 400,
          headers: { 'Content-Type': 'text/html' }
        }
      )
    }

    try {
      // Scambia il code con un token
      const result = await ctx.runAction(api.githubActions.exchangeCodeForToken, {
        code
      })

      if (!result.success) {
        return new Response(
          `<html>
            <body>
              <h1>Errore</h1>
              <p>${result.error || 'Errore sconosciuto'}</p>
              <a href="/profile">Torna al profilo</a>
            </body>
          </html>`,
          {
            status: 400,
            headers: { 'Content-Type': 'text/html' }
          }
        )
      }

      // Redirect al profilo con successo
      // Nota: in produzione useresti l'URL del frontend
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${frontendUrl}/profile?github=connected`
        }
      })
    } catch (error) {
      return new Response(
        `<html>
          <body>
            <h1>Errore</h1>
            <p>${error instanceof Error ? error.message : 'Errore sconosciuto'}</p>
            <a href="/profile">Torna al profilo</a>
          </body>
        </html>`,
        {
          status: 500,
          headers: { 'Content-Type': 'text/html' }
        }
      )
    }
  })
})

export default http
