# ---- Stage 1: Builder ----
FROM oven/bun:1 AS builder

# Ensure we're running as root for package installation
USER root

# Add backports for newer librsvg
RUN echo "deb http://deb.debian.org/debian bookworm-backports main" >> /etc/apt/sources.list

# Install system dependencies with specific versions for better compatibility
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    python3 \
    build-essential \
    pkg-config \
    libpixman-1-dev \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    && apt-get install -y -t bookworm-backports librsvg2-dev \
    && apt-get install -y ca-certificates gnupg \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list \
    && apt-get update \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install node-gyp globally
RUN npm install -g node-gyp

WORKDIR /app

# Copy package manifests and install dependencies (including devDeps for build)
COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

# Copy application code except for node_modules
COPY . .

# Build the application using our custom build script that preserves module structure
ENV NODE_ENV=production
RUN bun build.ts

# Prune devDependencies by installing prod-only deps in a separate folder
RUN mkdir -p /app/prod_node_modules && \
    cp package.json bun.lock /app/prod_node_modules/ && \
    cd /app/prod_node_modules && \
    bun install --frozen-lockfile --production

# ---- Stage 2: Production Image ----
FROM oven/bun:1 AS production

# Ensure we're running as root for package installation
USER root

# Add backports for newer librsvg
RUN echo "deb http://deb.debian.org/debian bookworm-backports main" >> /etc/apt/sources.list

# Install only the runtime libraries needed for canvas (no compilers or -dev packages)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libpixman-1-0 \
    libcairo2 \
    libpango-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    && apt-get install -y -t bookworm-backports librsvg2-2 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m appuser && \
    mkdir -p /app && \
    chown -R appuser:appuser /app

WORKDIR /app

# Copy the app code and production node_modules from the builder
COPY --from=builder /app/prod_node_modules/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/package.json ./package.json

# Environment variables
ARG PORT=3000
ENV NODE_ENV=production \
    PORT=${PORT} \
    LOG_LEVEL="info" \
    HOST="0.0.0.0"

# Use non-root user
USER appuser

# Expose the port
EXPOSE ${PORT}

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Run the application
CMD ["bun", "dist/index.js"]