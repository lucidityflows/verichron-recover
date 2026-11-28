# API Collectors Endpoints

This document lists all the API endpoints for the `api-collectors` service.

## App Controller

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/` | Get Hello |
| `GET` | `/health` | Get service health status |

## Collector Note Controller

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/collectors/notes/orgs/:orgId/search` | Search and filter notes |
| `GET` | `/collectors/notes/orgs/:orgId/debtor/:debtorId` | Get all notes for a debtor |
| `GET` | `/collectors/notes/orgs/:orgId/:noteId` | Get note by ID |
| `POST` | `/collectors/notes/orgs/:orgId` | Create note |
| `PATCH` | `/collectors/notes/orgs/:orgId/:noteId` | Update note |
| `DELETE` | `/collectors/notes/orgs/:orgId/:noteId` | Delete note |
| `PATCH` | `/collectors/notes/orgs/:orgId/:noteId/toggle-pin` | Toggle pin status |

## Workstation Controller

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/organizations/:organizationId/workstation/debtors/:debtorProfileId/focus` | Get comprehensive debtor focus view |
| `POST` | `/organizations/:organizationId/workstation/debtors/:debtorProfileId/actions` | Log a collector action on a debtor |
| `GET` | `/organizations/:organizationId/workstation/actions` | Get recent collector actions for live activity feed |

## Performance Controller

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/organizations/:organizationId/performance/stats/today` | Get today's collector performance stats |
| `GET` | `/organizations/:organizationId/performance/stats/week` | Get this week's collector performance stats |
| `GET` | `/organizations/:organizationId/performance/history/:collectorUserId` | Get historical performance metrics for a collector |
| `GET` | `/organizations/:organizationId/performance/dashboard-summary` | Get complete collector dashboard summary |
| `GET` | `/organizations/:organizationId/performance/leaderboard` | Get team leaderboard |

## Internal Collector Controller

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/internal/collectors/workload` | Get collector workload counts (internal) |
| `POST` | `/internal/collectors/skills` | Get collector skills (internal) |
| `POST` | `/internal/collectors/territories` | Get collector territories (internal) |

## Time Tracking Controller

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/collectors/time-tracking/orgs/:orgId/sessions` | Start time tracking session |
| `PATCH` | `/collectors/time-tracking/orgs/:orgId/sessions/:sessionId/end` | End time tracking session |
| `PATCH` | `/collectors/time-tracking/orgs/:orgId/sessions/:sessionId/pause` | Pause time tracking session |
| `PATCH` | `/collectors/time-tracking/orgs/:orgId/sessions/:sessionId/resume` | Resume paused session |
| `GET` | `/collectors/time-tracking/orgs/:orgId/sessions/active` | Get active session |
| `GET` | `/collectors/time-tracking/orgs/:orgId/sessions/:sessionId` | Get session by ID |
| `GET` | `/collectors/time-tracking/orgs/:orgId/sessions` | Query time tracking sessions |
| `GET` | `/collectors/time-tracking/orgs/:orgId/reports/utilization` | Generate time utilization report |

## Notification Controller

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/notifications/orgs/:orgId/summary` | Get notification summary |
| `GET` | `/notifications/orgs/:orgId` | Get notifications |
| `PATCH` | `/notifications/orgs/:orgId/:notificationId/read` | Mark notification as read/unread |
| `PATCH` | `/notifications/orgs/:orgId/mark-all-read` | Mark all notifications as read |

## Internal Work Queue Controller

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/internal/work-queues/unassigned` | Get unassigned work queue items (internal) |

## Saved View Controller

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/work-queue/saved-views/orgs/:orgId` | Get saved views |
| `GET` | `/work-queue/saved-views/orgs/:orgId/default` | Get default view |
| `GET` | `/work-queue/saved-views/orgs/:orgId/:viewId` | Get saved view by ID |
| `POST` | `/work-queue/saved-views/orgs/:orgId` | Create saved view |
| `PATCH` | `/work-queue/saved-views/orgs/:orgId/:viewId` | Update saved view |
| `DELETE` | `/work-queue/saved-views/orgs/:orgId/:viewId` | Delete saved view |
| `PATCH` | `/work-queue/saved-views/orgs/:orgId/set-default` | Set default view |

## Work Queue Controller

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/orgs/:orgId/work-queues` | Get work queue items |
| `POST` | `/orgs/:orgId/work-queues/:itemId/assign` | Manually assign work queue item to collector |
| `POST` | `/orgs/:orgId/work-queues/:itemId/reassign` | Reassign work queue item to different collector |
| `POST` | `/orgs/:orgId/work-queues/bulk/assign` | Bulk assign multiple work queue items to a collector |
| `POST` | `/orgs/:orgId/work-queues/bulk/defer` | Bulk defer multiple work queue items to a future date |
| `POST` | `/orgs/:orgId/work-queues/bulk/priority` | Bulk update priority for multiple work queue items |
| `PATCH` | `/orgs/:orgId/work-queues/:itemId/complete` | Complete a work queue item with resolution type |
| `PATCH` | `/orgs/:orgId/work-queues/:itemId/defer` | Defer a work queue item to a future date |
| `PATCH` | `/orgs/:orgId/work-queues/:itemId/status` | Update work queue item status (generic) |
