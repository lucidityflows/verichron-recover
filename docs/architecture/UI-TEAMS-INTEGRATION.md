# UI Team Management Integration Strategy

**Document Version:** 1.0
**Created:** 2025-12-19
**Purpose:** Outline the strategy for integrating the new Team Management features into the `ui-organizations` frontend application, leveraging existing design patterns and tools.

---

## 🎯 Executive Summary

The Team Management backend (Phase 1 & 2) is complete, providing robust API endpoints for team and team member management. This document details the UI integration strategy (Phase 3) within `ui-organizations`, focusing on:

1.  **Orval Integration:** Utilizing newly generated API clients.
2.  **Global Team Context:** Implementing a React Context to manage the currently selected team.
3.  **Core Components:** Developing a reusable `TeamSelector` and dedicated Team Management pages.
4.  **Data Flow:** Integrating team-based filtering into existing dashboards and work queues.
5.  **Adherence to Patterns:** Strictly following established `ui-organizations` design patterns for state management, styling, routing, and role-based access control.

---

## 🏗️ Observed Design Patterns in `ui-organizations`

Before detailing the strategy, it's crucial to acknowledge the existing patterns that will be adhered to:

*   **Technology Stack:** React (TypeScript), Vite, Tailwind CSS, Tanstack React Query, Tanstack Router.
*   **Feature-Sliced Architecture:** UI is organized by domain (`features/analytics`, `features/collector`, `features/manager`, etc.).
*   **Shared Components:** Generic, reusable UI elements are centralized in `shared/components/`.
*   **Data Fetching:** Heavily relies on `@tanstack/react-query` hooks, wrapping Orval-generated API clients (located in `shared/services/` and `api/generated/`).
*   **Global State:** `zustand` is used for application-wide UI state and user/role information.
*   **Styling:** Tailwind CSS with a consistent theming system (CSS variables). The `cn` utility is used for class management.
*   **Interaction Patterns:** Consistent use of `Modal` components, form elements (`shared/components/Form`), `LoadingSpinner`/`ErrorState` for async operations, `useToastContext` for notifications, and keyboard shortcuts (`useGlobalShortcuts`).
*   **Routing:** `Tanstack Router` is used for navigation, with routes defined in `src/routes/`.
*   **Role-Based Access Control (RBAC):** `RoleGuard` component and `useUser().hasRole()` are used to conditionally render UI elements based on user roles (`Organization Manager`, `Organization Admin`, `Collector`).

---

## 📋 Integration Strategy

The integration will proceed in a phased approach, building foundational elements first before integrating into existing pages and creating new dedicated management UIs.

### **Phase 1: Foundation & Data Access**

1.  **Verify Orval Generation:**
    *   **Action:** Confirm that the recent OpenAPI spec updates for `api-organizations` and `api-collectors` have been processed by Orval.
    *   **Expected Outcome:** `src/api/generated/organizations/endpoints` and `src/api/generated/collectors/endpoints` should contain new React Query hooks and type definitions for team-related APIs (e.g., `useGetOrgsOrgIdTeams`, `usePostOrgsOrgIdTeams`, `useGetOrgsOrgIdUsersUserIdTeams`, `useGetOrgsOrgIdCollectorsDashboard`, `useGetOrgsOrgIdWorkQueues`).

2.  **Establish Global Team Context:**
    *   **Goal:** Provide the currently selected `teamId` (or "All Teams" state) to all relevant parts of the application and facilitate its update.
    *   **Location:** Create `apps/ui-organizations/src/shared/contexts/TeamContext.tsx`.
    *   **Implementation:**
        *   Define a `TeamProvider` component and an accompanying `useTeam` hook.
        *   The context will manage `selectedTeamId: string | null` (where `null` signifies "All Teams") and a `setSelectedTeamId` function.
        *   It will internally use `useGetOrgsOrgIdUsersUserIdTeams` (from generated `organizations` API client) to fetch the list of teams the current user belongs to. This list will be exposed for the `TeamSelector` component.
        *   **Default Logic:** Implement logic to determine the initial `selectedTeamId`, e.g., using the user's primary team (if available from the API) or falling back to `null` ("All Teams") or the first available team.
    *   **Integration:** Wrap the main application content (e.g., in `src/app/App.tsx` or a high-level router component) with `<TeamProvider>`.

### **Phase 2: UI Components & Integration**

1.  **Develop `TeamSelector` Component:**
    *   **Goal:** Create a reusable UI component for selecting the active team, which will drive team-based data filtering across the application.
    *   **Location:** `apps/ui-organizations/src/shared/components/TeamSelector.tsx`.
    *   **Functionality:**
        *   Consume `selectedTeamId` and `setSelectedTeamId` from the `TeamContext` via the `useTeam` hook.
        *   Use the `currentUserTeams` data (also from `TeamContext`) to populate the dropdown options.
        *   **UI:** Utilize the `<Select>` component from `src/shared/components/Form.tsx` to maintain consistency with other form elements.
        *   **Options:** Include an "All Teams" option (value `null`) alongside individual teams. Display team names and member counts (if provided by the API).
        *   **Role-Based Access:** Apply `RoleGuard` or conditional rendering logic to the "All Teams" option, as it's typically restricted to `Organization Manager` and `Organization Admin` roles.
    *   **Integration:**
        *   Place the `TeamSelector` in the header or filter areas of relevant pages:
            *   `apps/ui-organizations/src/features/dashboard/ManagerHomePage.tsx`
            *   `apps/ui-organizations/src/features/collector/CollectorDashboard.tsx`
            *   `apps/ui-organizations/src/features/collector/WorkQueuePage.tsx`
            *   Other analytics pages where team-aware filtering is required.

2.  **Integrate Team Filtering into Data-Fetching Hooks:**
    *   **Goal:** Dynamically apply the `selectedTeamId` from `TeamContext` to backend API requests for team-filterable data.
    *   **Implementation:**
        *   **Modify Service Methods:** Update the signatures and implementations of relevant service methods in `src/shared/services/` (e.g., `workQueuesService.getWorkQueue`, `collectorService.getDashboardSummary`, `analyticsService.getRecoveryTrends`, `analyticsService.getPortfolioPerformance`) to accept an optional `teamId: string | null` parameter. This parameter should then be passed to the corresponding Orval-generated API client function as a query parameter.
        *   **Update `useQuery` Calls:** In components that fetch team-filterable data (e.g., `CollectorDashboard.tsx`, `WorkQueuePage.tsx`, `ManagerHomePage.tsx`, and analytics pages), import the `useTeam` hook and pass `selectedTeamId` to the data-fetching service functions.

3.  **Develop Team Management Pages:**
    *   **Goal:** Provide UI for full CRUD (Create, Read, Update, Delete) operations on teams and team members.
    *   **Location:** `apps/ui-organizations/src/features/manager/teams/`. This path is chosen to align with other manager-specific functionalities like `GoalsPage` and `PerformancePage`.
        *   `TeamListPage.tsx`: Displays a list/table of all teams.
        *   `TeamFormModal.tsx`: A modal component for creating new teams or editing existing ones.
        *   `TeamMembersPage.tsx`: A page or section within `TeamListPage` to manage members of a specific team.
    *   **Routing:** Add new routes to the Tanstack Router in `apps/ui-organizations/src/routes/` for:
        *   `/manager/teams` (Lists all teams in the organization).
        *   `/manager/teams/new` (Form for creating a new team).
        *   `/manager/teams/:teamId` (Details page for a specific team, including member management).
    *   **Functionality:**
        *   **`TeamListPage`:**
            *   Fetch all teams using `useGetOrgsOrgIdTeams`.
            *   Render the list using `shared/components/DataTable`, displaying team name, description, member count, etc.
            *   Include action buttons (e.g., "Edit," "Delete," "Manage Members") in a `DataTable` column.
            *   **RBAC:** Use `RoleGuard` to restrict access to the page and action buttons to `Organization Manager` and `Organization Admin` roles.
        *   **`TeamFormModal`:**
            *   Utilize shared `Input`, `Textarea`, and `Select` components from `shared/components/Form.tsx` for team properties (`name`, `description`, `managerUserId`).
            *   Use Orval-generated mutation hooks (`usePostOrgsOrgIdTeams` for creation, `usePatchOrgsOrgIdTeamsTeamId` for updates).
            *   For `managerUserId` selection, fetch a list of available users (e.g., via `usersService.listUsers`) and provide a dropdown.
        *   **`TeamMembersPage` (or integrated within `TeamListPage`):**
            *   Fetch team details and its members using `useGetOrgsOrgIdTeamsTeamId` and `useGetOrgsOrgIdTeamsTeamIdMembers`.
            *   Display members with their roles and primary team status.
            *   Provide UI for adding new members (e.g., a search/select input for existing users, then use `usePostOrgsOrgIdTeamsTeamIdMembers`) and removing existing ones (`useDeleteOrgsOrgIdTeamsTeamIdMembersUserId`).
            *   Implement UI for updating member roles and `isPrimary` status (`usePatchOrgsOrgIdTeamsTeamIdMembersUserId`).
            *   **RBAC:** Restrict member management actions to authorized roles.

### **Phase 3: Refinement & Testing**

1.  **Update Navigation (`Sidebar.tsx`):**
    *   Modify the existing "Team" navigation item in `apps/ui-organizations/src/shared/components/Sidebar.tsx`. Its `path` should point to the new Team List Page (e.g., `/manager/teams`).
    *   Ensure the `allowedRoles` for this navigation item correctly reflect the permissions (`Organization Manager`, `Organization Admin`).

2.  **Granular Permissions and Roles:**
    *   **Action:** Beyond route-level guarding, implement `RoleGuard` or conditional rendering for individual UI elements (buttons, forms) within the Team Management pages.
    *   **Example:** Only `Org Admin` may see a "Delete Team" button, while `Org Manager` can only edit teams they manage.

3.  **Styling Consistency:**
    *   **Action:** Apply existing Tailwind CSS utility classes and ensure all new components (especially modals, forms, tables, cards) align visually with the current `ui-organizations` design system.
    *   **Tools:** Leverage the `cn` utility for combining classes and the theming CSS variables.

4.  **Error Handling & Loading States:**
    *   **Action:** Implement robust error handling and display appropriate `LoadingSpinner` and `ErrorState` components for all new API calls.
    *   **Feedback:** Use the `useToastContext` to provide clear success/failure notifications for user actions (e.g., "Team created successfully!").

5.  **Testing:**
    *   **Unit Tests:** Develop comprehensive unit tests for `TeamContext`, `TeamSelector`, and all new components within the Team Management pages.
    *   **Integration Tests:** Write tests to verify the end-to-end data flow, ensuring that selecting a team in the `TeamSelector` correctly filters data in integrated dashboards and work queues.
    *   **E2E Tests:** (If the project includes this layer) Develop E2E tests to simulate user journeys for team creation, modification, member management, and observing team-filtered data across the application.

This strategy ensures a systematic, consistent, and robust integration of the Team Management features into the `ui-organizations` application.