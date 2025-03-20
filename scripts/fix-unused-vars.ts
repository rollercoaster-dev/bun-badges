#!/usr/bin/env bun
/**
 * Script to automatically fix 'no-unused-vars' eslint errors by prefixing unused variables with an underscore
 */
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { resolve } from 'path';

// Get the path to the project root
const projectRoot = resolve(import.meta.dir, '..');

// Run eslint to get the errors
console.log('Running ESLint to identify unused variables...');
const eslintOutput = execSync(
  'npx eslint "src/**/*.{ts,tsx}" --format json',
  { cwd: projectRoot, encoding: 'utf8' }
);

// Parse the JSON output
const eslintResults = JSON.parse(eslintOutput);

// Map to store files that need to be fixed and their fixes
const filesToFix = new Map();

// Filter for no-unused-vars errors
eslintResults.forEach((result) => {
  if (result.messages && result.messages.length > 0) {
    const unusedVarsErrors = result.messages.filter(
      (msg) => 
        msg.ruleId === '@typescript-eslint/no-unused-vars' && 
        (msg.message.includes('is defined but never used') || 
         msg.message.includes('is assigned a value but never used'))
    );

    if (unusedVarsErrors.length > 0) {
      filesToFix.set(result.filePath, unusedVarsErrors);
    }
  }
});

// Process each file and apply fixes
console.log(`Found ${filesToFix.size} files with unused variables to fix.`);

filesToFix.forEach((errors, filePath) => {
  try {
    console.log(`Fixing ${filePath}`);
    let fileContent = readFileSync(filePath, 'utf8');
    
    // Sort errors by location to fix from bottom to top (to avoid position shifts)
    const sortedErrors = errors.sort((a, b) => {
      if (a.line !== b.line) return b.line - a.line;
      return b.column - a.column;
    });

    // Process each error
    for (const error of sortedErrors) {
      const lines = fileContent.split('\n');
      const line = lines[error.line - 1];
      
      // Extract the variable name from the error message
      const matches = error.message.match(/'([^']+)' is .* never used/);
      if (!matches || !matches[1]) continue;
      
      const varName = matches[1];
      
      // Skip if variable already starts with underscore
      if (varName.startsWith('_')) continue;
      
      // Find the exact position of the variable in the line
      // This is a simplification and might need to be more robust
      const varPosition = line.indexOf(varName);
      if (varPosition === -1) continue;
      
      // Replace the variable with a prefixed version
      const newLine = 
        line.substring(0, varPosition) + 
        '_' + varName + 
        line.substring(varPosition + varName.length);
      
      lines[error.line - 1] = newLine;
      fileContent = lines.join('\n');
    }
    
    // Write the updated content back to the file
    writeFileSync(filePath, fileContent, 'utf8');
  } catch (err) {
    console.error(`Error fixing ${filePath}:`, err);
  }
});

console.log('Fix completed. Running eslint again to check remaining issues...');
try {
  execSync('npx eslint "src/**/*.{ts,tsx}" --fix', { 
    cwd: projectRoot, 
    stdio: 'inherit' 
  });
  console.log('ESLint fixes applied successfully!');
} catch (err) {
  console.error('There are still some ESLint issues to fix manually.', err);
}
