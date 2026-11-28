# GitHub Actions CI/CD Strategy

## Overview
This document outlines the strategy for migrating from manual local deployments to an automated CI/CD pipeline using GitHub Actions. The goal is to increase deployment reliability, enforce quality gates, and leverage cloud parallelism for faster builds.

## Philosophy: "The Hybrid Approach"
We will avoid "fighting the tool" by using GitHub Actions as an **Orchestrator** (Task Runner) and keeping our complex deployment logic in our existing Bash scripts.

- **GitHub Actions (The Muscle):** Handles parallelism (builds), authentication, and triggering.
- **Bash Scripts (The Brain):** Handles secret mapping, conditional logic, and specific GCP commands.

---

## 1. Workload Identity Federation (Security)
Instead of storing long-lived Service Account JSON keys in GitHub Secrets (high security risk), we will use **Workload Identity Federation**.
- Allows GitHub Actions to impersonate a GCP Service Account for the duration of the job.
- **Action:** We will create a `github-deployer` Service Account and bind it to this GitHub repository.

## 2. Pipeline Structure

### Phase 1: Continuous Integration (CI) - The Quality Gate
**Trigger:** `pull_request` (on open/synchronize) to `main` or `staging` branches.

1.  **Lint Check:** Runs `pnpm lint` to ensure code style compliance.
2.  **Unit Tests:** Runs `pnpm test` to verify logic.
3.  **Build Check:** Runs `pnpm build` to ensure the project compiles (no TypeErrors).

*Goal: Prevent broken code from ever entering the codebase.*

### Phase 2: Continuous Deployment (CD) - Staging
**Trigger:** `push` (merge) to `staging` branch.

#### Job 1: Build & Push (Parallel)
- Uses a **Matrix Strategy** to spin up 10 parallel jobs.
- Uses `apps/*/Dockerfile.e2e` to ensure consistent, self-contained builds.
- Pushes images to Google Artifact Registry.
- **Benefit:** Reduces build time from ~15 mins (serial) to ~2 mins (parallel).

#### Job 2: Deploy (Serial)
- Runs **after** Job 1 completes.
- Authenticates via Workload Identity.
- Executes: `./scripts/deploy-all-staging.sh --skip-build`
- **Benefit:** Reuses existing, battle-tested deployment logic (Pub/Sub creation, Secret mapping).

#### Job 3: Verification (E2E)
- Runs **after** Job 2 completes.
- Executes: `pnpm e2e:test` (Playwright/Jest) against the *live* staging URL.
- **Benefit:** Immediate feedback if a deployment broke critical user flows.

---

## 3. Implementation Steps

### Step 1: Pre-Requisites (Manual)
- [ ] Audit and fix any failing Unit Tests (`pnpm test`).
- [ ] Audit and fix any failing Lint errors (`pnpm lint`).
- [ ] Verify E2E tests are passing locally against Staging.
- [ ] Set up Workload Identity Federation in GCP.

### Step 2: Configuration
- [ ] Create `.github/workflows/ci.yml` (Lint/Test).
- [ ] Create `.github/workflows/cd-staging.yml` (Build/Deploy/Verify).
- [ ] Add necessary GitHub Secrets (e.g., `GCP_PROJECT_ID`, `WIF_PROVIDER`, `WIF_SERVICE_ACCOUNT`).

### Step 3: Deployment Script Refactor
- [ ] Minor update to `deploy-all-staging.sh` to ensure it works in a non-interactive CI environment (mostly ensuring logs are clear and errors exit with code 1).

---

## 4. Future Improvements (Post-MVP)
- **Production Pipeline:** Duplicate the Staging pipeline for Production (triggered by Release tags).
- **Slack Notifications:** Notify the team on deployment success/failure.
- **Downtime Migration:** Add database migration steps explicitly in the pipeline.
