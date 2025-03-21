FROM oven/bun:1.0-alpine as base
WORKDIR /app

# Stage for installing dependencies
FROM base as install
RUN mkdir -p /temp/dev
COPY package.json /temp/dev/
RUN cd /temp/dev && ls -al && bun install

# Final build stage
FROM base as final
COPY --from=install /temp/dev/node_modules ./node_modules
COPY . .
CMD ["bun", "run", "src/index.ts"] 