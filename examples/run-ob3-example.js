#!/usr/bin/env bun

/**
 * Script to run the OB3 workflow example
 * This script ignores Canvas-related modules to focus on the Open Badges 3.0 functionality
 */

// Override canvas module to prevent errors
process.env.SKIP_CANVAS = 'true';

// Run the example
console.log('Running Open Badges 3.0 workflow example...');
console.log('------------------------------------------\n');

import('./ob3-workflow.ts')
  .then(() => {
    console.log('\nExample completed successfully!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\nError running example:', err);
    process.exit(1);
  });
