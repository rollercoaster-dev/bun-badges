# Start with the Node 18 image which has better support for native modules
FROM node:18-bullseye as builder

WORKDIR /app

# Install Python and other dependencies needed for Canvas
RUN apt-get update && apt-get install -y \
    python3 \
    python-is-python3 \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    pkg-config \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

# Install canvas globally first to help with dependency resolution
RUN npm install -g canvas@2.11.2

# Copy package.json and install dependencies
COPY package.json ./

# Pin canvas to a specific version
RUN sed -i 's/"canvas": "^3.1.0"/"canvas": "2.11.2"/g' package.json

# Install dependencies
RUN bun install --no-cache

# Copy the rest of the application code
COPY . .

# Build the application
RUN bun run build

# Production stage
FROM node:18-bullseye

WORKDIR /app

# Install production dependencies for Canvas
RUN apt-get update && apt-get install -y \
    libcairo2 \
    libpango1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

# Copy built files from builder stage
COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/package.json /app/package.json

# Copy necessary configuration files
COPY --from=builder /app/drizzle /app/drizzle
COPY --from=builder /app/src/db/schema /app/src/db/schema
COPY --from=builder /app/src/db/migrations /app/src/db/migrations

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose the port
EXPOSE 3000

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || exit 1

# Start the application
CMD ["bun", "run", "dist/index.js"]