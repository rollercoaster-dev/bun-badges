// Script to detect and remove duplicate test files
import { unlink, readdir, stat } from 'fs/promises';
import { join, basename } from 'path';
import { execSync } from 'child_process';

// Function to get all files in a directory recursively
async function getAllFiles(dir) {
  const files = [];
  const items = await readdir(dir);
  
  for (const item of items) {
    const path = join(dir, item);
    const stats = await stat(path);
    
    if (stats.isDirectory()) {
      const subFiles = await getAllFiles(path);
      files.push(...subFiles);
    } else if (stats.isFile() && path.endsWith('.test.ts')) {
      files.push(path);
    }
  }
  
  return files;
}

// Group files by basename
async function groupTestsByName() {
  const testFiles = await getAllFiles('tests');
  const groups = {};
  
  for (const file of testFiles) {
    const name = basename(file);
    if (!groups[name]) {
      groups[name] = [];
    }
    groups[name].push(file);
  }
  
  return groups;
}

// Fix import paths in files with issues
async function fixImportPaths() {
  console.log("Fixing import paths in problematic files...");
  
  // Fix path in badge-baker test
  try {
    execSync('sed -i "" "s|from \\"../utils/badge-baker\\"|from \\"@/utils/badge-baker\\"|g" tests/unit/utils/badge-baker.test.ts');
    console.log("Fixed import in badge-baker.test.ts");
  } catch (err) {
    console.error("Error fixing badge-baker.test.ts:", err.message);
  }
  
  // Fix path in auth test
  try {
    execSync('sed -i "" "s|from \\"@/auth\\"|from \\"@/middleware/auth\\"|g" tests/unit/src/auth/auth.test.ts');
    console.log("Fixed import in auth.test.ts");
  } catch (err) {
    console.error("Error fixing auth.test.ts:", err.message);
  }
  
  // Fix path in codeGenerator test
  try {
    execSync('sed -i "" "s|from \\"@/auth/codeGenerator\\"|from \\"@/utils/auth/codeGenerator\\"|g" tests/unit/src/codeGenerator/codeGenerator.test.ts');
    console.log("Fixed import in codeGenerator.test.ts");
  } catch (err) {
    console.error("Error fixing codeGenerator.test.ts:", err.message);
  }
  
  // Fix path in rateLimiter test
  try {
    execSync('sed -i "" "s|from \\"@/../../utils/auth/rateLimiter\\"|from \\"@/utils/auth/rateLimiter\\"|g" tests/unit/src/rateLimiter/rateLimiter.test.ts');
    console.log("Fixed import in rateLimiter.test.ts");
  } catch (err) {
    console.error("Error fixing rateLimiter.test.ts:", err.message);
  }
  
  // Fix path in issuers test
  try {
    execSync('sed -i "" "s|from \\"@/../utils/test/route-test-utils\\"|from \\"@/utils/test/route-test-utils\\"|g" tests/unit/src/issuers/issuers.test.ts');
    console.log("Fixed import in issuers.test.ts");
  } catch (err) {
    console.error("Error fixing issuers.test.ts:", err.message);
  }
  
  // Fix path in signing test
  try {
    execSync('sed -i "" "s|from \\"@/test/crypto-setup\\"|from \\"@/tests/crypto-setup\\"|g" tests/unit/signing.test.ts');
    console.log("Fixed import in signing.test.ts");
  } catch (err) {
    console.error("Error fixing signing.test.ts:", err.message);
  }
}

// Remove duplicate test files
async function removeDuplicateTests() {
  console.log("Finding duplicate test files...");
  const groups = await groupTestsByName();
  
  // Which files to keep: Prefer tests/unit/{module} or tests/integration/{module} paths
  // Identify and remove duplicates
  let removed = 0;
  
  for (const [name, files] of Object.entries(groups)) {
    if (files.length === 1) continue;
    
    console.log(`Found ${files.length} files named ${name}:`);
    files.forEach(f => console.log(`  - ${f}`));
    
    // Choose which one to keep
    let keepIndex = 0;
    
    // Prefer paths that don't have "src" folder in them
    const nonSrcPaths = files.filter((f, i) => {
      if (!f.includes('/src/')) {
        keepIndex = i;
        return true;
      }
      return false;
    });
    
    if (nonSrcPaths.length > 0) {
      // If multiple non-src paths, prefer the shortest path
      if (nonSrcPaths.length > 1) {
        nonSrcPaths.sort((a, b) => a.length - b.length);
        keepIndex = files.indexOf(nonSrcPaths[0]);
      }
    }
    
    // Remove all but the one we're keeping
    for (let i = 0; i < files.length; i++) {
      if (i !== keepIndex) {
        try {
          await unlink(files[i]);
          console.log(`Removed duplicate: ${files[i]}`);
          removed++;
        } catch (err) {
          console.error(`Error removing ${files[i]}: ${err.message}`);
        }
      } else {
        console.log(`Keeping: ${files[i]}`);
      }
    }
  }
  
  console.log(`\nRemoved ${removed} duplicate test files`);
}

// Main function
async function main() {
  console.log("Starting test cleanup process...");
  
  await fixImportPaths();
  await removeDuplicateTests();
  
  console.log("\nCleanup completed!");
}

main().catch(console.error); 