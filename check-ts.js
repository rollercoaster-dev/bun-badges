// Simple TypeScript check script
const { spawn } = require('child_process');

console.log('Running TypeScript checks...');
const tsc = spawn('node_modules/.bin/tsc', ['--noEmit']);

tsc.stdout.on('data', (data) => {
  console.log(`${data}`);
});

tsc.stderr.on('data', (data) => {
  console.error(`${data}`);
});

tsc.on('close', (code) => {
  console.log(`TypeScript check completed with code ${code}`);
});
