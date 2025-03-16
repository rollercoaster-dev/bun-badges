# Use the official Bun image
FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies stage - improves caching
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock* ./temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# Development dependencies - needed for builds
RUN mkdir -p /temp/prod
COPY package.json bun.lock* ./temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# Build stage - compile with all development dependencies
FROM base AS build
COPY --from=install /temp/dev/node_modules ./node_modules
COPY . .
RUN bun run build

# Production stage - only include what's needed to run
FROM base AS release
COPY --from=install /temp/prod/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/drizzle ./drizzle
COPY package.json .

# Set production environment
ENV NODE_ENV=production
ENV PORT=7777

# Expose the port the app will run on
EXPOSE 7777

# Run migrations and start the application
CMD bun run db:migrate && bun run start 