import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { LoadingState } from '@/components/amixof/states'

export const router = createRouter({
  routeTree,
  scrollRestoration: true,
  defaultPreloadStaleTime: 0,
  // only shows if a route takes longer than pendingMs to load
  defaultPendingMs: 400,
  defaultPendingComponent: () => <LoadingState className="min-h-[60vh]" />,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
