#!/usr/bin/env bash

echo "Running TypeScript checks..."
cd /Users/joeczarnecki/Code/rollercoaster.dev/bun-badges
bun run tsc

echo "Running ESLint checks..."
bun run lint

echo "Done!"
