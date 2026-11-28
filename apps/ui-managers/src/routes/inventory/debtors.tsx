import { createFileRoute } from '@tanstack/react-router'
import { DebtorRegistry } from '../../features/inventory/DebtorRegistry.js'

export const Route = createFileRoute('/inventory/debtors')({
  component: RouteComponent,
})

function RouteComponent() {
  return <DebtorRegistry />
}
