FROM oven/bun:1.0-alpine as base
WORKDIR /app

# Install needed system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    openssl \
    ca-certificates \
    curl

# Stage for installing dependencies
FROM base as install
RUN mkdir -p /temp/dev
COPY package.json bun.lockb /temp/dev/
RUN cd /temp/dev && bun install --production=false

# Final build stage
FROM base as final
COPY --from=install /temp/dev/node_modules ./node_modules
COPY . .
CMD ["bun", "run", "src/index.ts"] 