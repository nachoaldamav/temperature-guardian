import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createHashHistory, createRouter } from '@tanstack/react-router'
import './App.css'

// Import the generated route tree
import { routeTree } from './routeTree.gen'
import {  QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/client'

const hashHistory = createHashHistory()

// Create a new router instance
const router = createRouter({ routeTree, history: hashHistory })

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Render the app
const rootElement = document.getElementById('root') as HTMLElement
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  )
}