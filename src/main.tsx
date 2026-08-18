import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Nothing here changes underneath us — terrain and place names are static on any
      // timescale that matters — so a returning tab should never re-request on focus alone.
      staleTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      gcTime: 60 * 60 * 1000,
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
