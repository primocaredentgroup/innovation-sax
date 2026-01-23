import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { ConvexReactClient } from 'convex/react'
import { ConvexProviderWithAuth0 } from 'convex/react-auth0'
import { Auth0Provider } from '@auth0/auth0-react'
import { RouterProvider } from '@tanstack/react-router'
import { router } from './router'

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: window.location.origin
      }}
      useRefreshTokens={true}
      cacheLocation="localstorage"
    >
      <ConvexProviderWithAuth0 client={convex}>
        <RouterProvider router={router} />
      </ConvexProviderWithAuth0>
    </Auth0Provider>
  </StrictMode>
)
