// Clean up original test files after migration
import { unlink, exists } from 'fs/promises';
import { execSync } from 'child_process';

// Get list of all test files in src directory
async function getSourceTestFiles() {
  const result = execSync('find src -name "*.test.ts"').toString().trim();
  return result.split('\n').filter(Boolean);
}

// Check if a file has been migrated to tests directory
async function hasBeenMigrated(sourcePath) {
  // Extract the file name
  const fileName = sourcePath.split('/').pop();
  
  // Check if the file exists anywhere in the tests directory
  const result = execSync(`find tests -name "${fileName}" | wc -l`).toString().trim();
  return parseInt(result, 10) > 0;
}

// Remove original test files
async function cleanupOriginalTests() {
  // Get all test files in src
  const sourceFiles = await getSourceTestFiles();
  console.log(`Found ${sourceFiles.length} test files in src directory`);
  
  // Counters
  let removed = 0;
  let skipped = 0;
  let failed = 0;
  
  // Process each file
  for (const sourcePath of sourceFiles) {
    try {
      // Check if file has been migrated
      if (await hasBeenMigrated(sourcePath)) {
        // File has been migrated, safe to remove
        await unlink(sourcePath);
        console.log(`Removed: ${sourcePath}`);
        removed++;
      } else {
        // File has not been migrated, skip
        console.log(`Skipped (not migrated): ${sourcePath}`);
        skipped++;
      }
    } catch (err) {
      console.error(`Failed to process ${sourcePath}: ${err.message}`);
      failed++;
    }
  }
  
  // Print summary
  console.log('\nCleanup completed!');
  console.log(`  - ${removed} files removed`);
  console.log(`  - ${skipped} files skipped (not migrated)`);
  console.log(`  - ${failed} files failed`);
}

// Run the cleanup
cleanupOriginalTests().catch(console.error); 