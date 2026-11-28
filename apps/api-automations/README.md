# API Automations

**Automation Execution Engine for Verichron Debt Collection Platform**

## Overview

The `api-automations` microservice is responsible for executing automation workflows triggered by `api-workflows`. This service handles:

- **Auto-Assignment**: Intelligent assignment of debts/accounts to collectors using multiple strategies
- **Escalation**: Automated escalation of critical issues to managers with multi-channel notifications
- **Cross-Service Orchestration**: Queries data from multiple services to make intelligent decisions

## Architecture

### Service Boundary

```
┌─────────────────┐
│  api-workflows  │  Defines automation rules, triggers commands
└────────┬────────┘
         │ publishes EXECUTE_AUTO_ASSIGNMENT
         ↓
┌─────────────────┐
│ api-automations │  Executes automation logic, queries data
└────────┬────────┘
         │ uses EventOrchestratorClient
         ↓
┌─────────────────┐
│ api-collectors  │  Provides collector data (workload, skills, territories)
└─────────────────┘
```

### Why a Separate Service?

1. **EventOrchestratorClient Access**: Only `api-automations` and `api-collectors` have access to the orchestrator client for cross-service queries
2. **Domain Separation**: `api-workflows` defines WHAT to automate, `api-automations` defines HOW to execute
3. **Independent Scaling**: Automation execution can scale independently of rule management
4. **Future-Proof**: Allows adding more automation types without modifying workflows service

## Features

### Auto-Assignment Strategies

#### 1. Round Robin
Rotates through collector pool sequentially based on last assigned collector.

**Use Case**: Ensure fair distribution when all collectors have similar capabilities.

#### 2. Least Workload
Assigns to collector with fewest active accounts.

**Use Case**: Balance workload dynamically, prevent overloading collectors.

#### 3. Skill-Based
Matches account attributes to collector skills.

**Use Case**: Assign medical debts to collectors with medical debt expertise.

#### 4. Geographic
Matches account location to collector territories.

**Use Case**: Assign accounts to local collectors familiar with regional laws.

### Escalation

Automatically escalates critical issues to managers with multi-channel notifications (Email, SMS, In-App).

## Event-Driven API

This service has **no HTTP endpoints**. All interactions are event-driven.

### Consumed Events

- `AUTOMATIONS_EXECUTE_AUTO_ASSIGNMENT` (from api-workflows)
- `AUTOMATIONS_EXECUTE_ESCALATION` (from api-workflows)

### Published Events

- `AUTOMATIONS_AUTO_ASSIGNMENT_COMPLETED`
- `AUTOMATIONS_AUTO_ASSIGNMENT_FAILED`
- `AUTOMATIONS_ESCALATION_COMPLETED`
- `AUTOMATIONS_ESCALATION_FAILED`
- `COLLECTORS_WORK_QUEUE_ITEM_ASSIGNED` (to api-collectors)

## Documentation

- **[IMPLEMENTATION-COMPLETE.md](./IMPLEMENTATION-COMPLETE.md)**: Full implementation details, architecture decisions, and testing guide
- **[IMPLEMENTATION-PLAN.md](./IMPLEMENTATION-PLAN.md)**: Original implementation plan and design decisions

## Configuration

```env
PUBSUB_PROJECT_ID=your-gcp-project-id
PUBSUB_EMULATOR_HOST=localhost:8085  # For local development
API_COLLECTORS_URL=http://localhost:3007
API_COMMUNICATIONS_URL=http://localhost:3006
```

## Development

```bash
# Install dependencies
pnpm install

# Start the service
pnpm run start:dev

# Build for production
pnpm run build
```

## Status

✅ **Implementation Complete** (December 17, 2025)
✅ **All Services Building Successfully**
⏳ **Pending**: Real collector data implementation in api-collectors

---

**Version**: 1.0.0
**Port**: 3010
**Maintained By**: Verichron Platform Team
