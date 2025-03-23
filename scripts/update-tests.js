#!/usr/bin/env node
/**
 * E2E Test Update Script
 * 
 * This script enables/disables test files in the e2e/index.ts file
 * to make it easier to run selected tests while debugging.
 * 
 * Usage:
 *   bun run scripts/update-tests.js enable [test-pattern]
 *   bun run scripts/update-tests.js disable [test-pattern]
 *   
 * Examples:
 *   bun run scripts/update-tests.js enable basic
 *   bun run scripts/update-tests.js enable lifecycle
 *   bun run scripts/update-tests.js enable all
 *   bun run scripts/update-tests.js disable all
 */

import fs from 'fs';
import path from 'path';

// Path to index.ts
const indexFile = path.resolve('./tests/e2e/index.ts');

// Read the file content
try {
  const fileContent = fs.readFileSync(indexFile, 'utf-8');
  const lines = fileContent.split('\n');
  
  // Get command and pattern
  const command = process.argv[2]?.toLowerCase();
  const pattern = process.argv[3]?.toLowerCase();
  
  if (!command || !pattern) {
    console.error('Usage: bun run scripts/update-tests.js [enable|disable] [test-pattern|all]');
    process.exit(1);
  }
  
  // Process the file line by line
  const updatedLines = lines.map(line => {
    // Skip non-import lines
    if (!line.trim().startsWith('import "./flows/') && 
        !line.trim().startsWith('// import "./flows/')) {
      return line;
    }
    
    // Get the test file name from the import
    const match = line.match(/flows\/[^/]+\/([^/"]+)/);
    if (!match) return line;
    
    const testName = match[1].toLowerCase();
    
    // Enable/disable based on pattern
    if (pattern === 'all' || testName.includes(pattern)) {
      if (command === 'enable') {
        return line.replace(/\/\/ import/, 'import');
      } else if (command === 'disable') {
        return line.replace(/^import/, '// import');
      }
    }
    
    return line;
  });
  
  // Write the updated content back
  fs.writeFileSync(indexFile, updatedLines.join('\n'));
  console.log(`Successfully ${command}d tests matching "${pattern}"`);
} catch (error) {
  console.error('Error updating tests:', error);
  process.exit(1);
}
