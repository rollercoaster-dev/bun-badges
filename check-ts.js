// Check TypeScript errors
import { spawnSync } from 'node:child_process';

console.log('Running TypeScript checks...');
const tscResult = spawnSync('npx', ['tsc', '--noEmit'], { 
  stdio: 'inherit',
  encoding: 'utf-8' 
});

if (tscResult.status !== 0) {
  console.error('TypeScript check failed');
  process.exit(1);
}

console.log('All TypeScript checks passed!');
