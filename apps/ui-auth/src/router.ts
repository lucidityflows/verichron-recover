// apps/ui-auth/src/router.ts
import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen'; // Import the generated route tree

// Create the router instance
const router = createRouter({
  routeTree, // Use the generated route tree directly
  // Add any other router options here
});

export default router;

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
