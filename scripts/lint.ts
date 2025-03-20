#!/usr/bin/env bun
/**
 * ESLint script to lint and fix issues in the codebase
 */
import { spawnSync } from 'child_process';
import { resolve } from 'path';

const rootDir = resolve(import.meta.dir, '..');

console.log('🔍 Running ESLint to find and fix issues...');

const eslintCommand = 'eslint';
const eslintArgs = ['"src/**/*.{ts,tsx}"', '--fix'];

try {
  const result = spawnSync('npx', [eslintCommand, ...eslintArgs], {
    cwd: rootDir,
    shell: true,
    stdio: 'inherit',
    encoding: 'utf-8'
  });

  if (result.status === 0) {
    console.log('✅ Linting completed successfully!');
    process.exit(0);
  } else {
    console.error('❌ Linting failed. Please fix the issues and try again.');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ An error occurred while running ESLint:', error);
  process.exit(1);
}
