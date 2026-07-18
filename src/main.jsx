import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PostHogErrorBoundary, PostHogProvider } from '@posthog/react'
import posthog from 'posthog-js'
import './index.css'
import App from './App.jsx'

const posthogToken = import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN
const posthogHost = import.meta.env.VITE_PUBLIC_POSTHOG_HOST

if (posthogToken && posthogHost) {
  posthog.init(posthogToken, {
    api_host: posthogHost,
    defaults: '2026-01-30',
  })
}

const app = posthogToken && posthogHost ? (
  <PostHogProvider client={posthog}>
    <PostHogErrorBoundary>
      <App />
    </PostHogErrorBoundary>
  </PostHogProvider>
) : (
  <App />
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {app}
  </StrictMode>,
)
