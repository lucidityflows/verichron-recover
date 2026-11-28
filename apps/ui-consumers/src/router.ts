// apps/ui-debtors/src/router.ts
import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen.js';

// Create the router instance
const router = createRouter({
  routeTree,
});

export default router;

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
