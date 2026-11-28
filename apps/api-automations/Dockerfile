# ---- Base Stage ----
# Use a specific Node.js version for consistency. 'alpine' is lightweight.
FROM node:20-alpine AS base
WORKDIR /usr/src/app
# PNPM is our monorepo tool, install it globally.
RUN npm install -g pnpm

# ---- Dependencies Stage ----
# This stage is dedicated to installing dependencies. It's cached by Docker unless package.json changes.
FROM base AS dependencies
# Copy only the files needed to install dependencies.
COPY package.json pnpm-lock.yaml ./
# Copy the root workspace config to understand the monorepo structure.
COPY pnpm-workspace.yaml ./
# Install ALL dependencies for the entire monorepo. This is simpler and leverages caching well.
RUN pnpm install --frozen-lockfile

# ---- Development Stage ----
# This stage is used when running 'docker-compose up'. It enables hot-reloading.
FROM dependencies AS development
WORKDIR /usr/src/app
# Copy all source code into the container.
COPY . .
# The command will be provided by docker-compose to start the dev server.
# Use npx to ensure nest CLI is found, and skip dotenv since we use docker-compose env vars
CMD [ "sh", "-c", "cd apps/api-automations && npx nest start --watch" ]

# ---- Production Build Stage ----
# This stage builds the optimized production artifact.
FROM dependencies AS builder
WORKDIR /usr/src/app
# Copy all source code.
COPY . .
# Run the build command for the specific application we are building.
# The --filter argument is crucial for monorepo builds.
RUN pnpm --filter @verichron/api-automations build

# ---- Production Run Stage ----
# This is the final, small, and secure image that will be deployed.
FROM base AS production
WORKDIR /usr/src/app
# Copy only the built application from the 'builder' stage.
COPY --from=builder /usr/src/app/apps/api-automations/dist ./dist
# Copy production dependencies from the 'dependencies' stage.
# 'pnpm deploy' is designed for this, copying only what's needed.
COPY --from=dependencies /usr/src/app/node_modules ./node_modules
# Expose the port the app runs on.
EXPOSE 3010
# The command to start the production server.
CMD [ "node", "dist/main" ]
