// Migrate all tests using Bun
import { mkdir, copyFile, readFile, writeFile, exists } from 'fs/promises';
import { join, dirname } from 'path';
import { execSync } from 'child_process';

// Helper function to normalize path and extract test type
function getTestInfo(filePath) {
  // Check if it's an integration test
  const isIntegration = filePath.includes('.integration.test.ts');
  const testType = isIntegration ? 'integration' : 'unit';
  
  // Extract module path without src prefix and test file name
  let modulePath = '';
  let fileName = '';
  
  if (filePath.includes('/__tests__/')) {
    // Handle src/__tests__ structure
    const parts = filePath.split('/__tests__/');
    modulePath = parts[1].split('/');
    fileName = modulePath.pop();
    modulePath = modulePath.join('/');
  } else if (filePath.includes('/__tests__')) {
    // Handle component-local tests in __tests__ subdirectory
    const parts = filePath.split('/__tests__');
    const parentPath = parts[0].replace(/^src\//, '');
    fileName = parts[1].replace(/^\//, '');
    modulePath = parentPath;
  } else if (filePath.includes('/integration/')) {
    // Handle integration directory structure
    const parts = filePath.split('/integration/');
    const parentPath = parts[0].replace(/^src\//, '');
    fileName = parts[1];
    modulePath = join(parentPath, 'integration');
  } else {
    // Handle component-local tests
    const parts = filePath.split('/');
    fileName = parts.pop();
    const parentDirectory = parts.pop();
    parts.pop(); // Remove 'src'
    modulePath = [...parts, parentDirectory].join('/');
  }
  
  return {
    testType,
    modulePath,
    fileName,
    originalPath: filePath
  };
}

// Determine target path for a test file
function getTargetPath(fileInfo) {
  const { testType, modulePath, fileName } = fileInfo;
  
  // Handle special case for badge-baker and similar top-level tests
  if (fileInfo.originalPath === 'src/tests/badge-baker.test.ts') {
    return 'tests/unit/utils/badge-baker.test.ts';
  }
  
  return join('tests', testType, modulePath, fileName);
}

// Get list of source files
async function getSourceFiles() {
  // Get list of all test files using find command
  const result = execSync('find src -name "*.test.ts"').toString().trim();
  return result.split('\n').filter(Boolean);
}

// Check if a file has already been migrated
async function isAlreadyMigrated(sourcePath, targetPath) {
  if (await exists(targetPath)) {
    return true;
  }
  
  // Also check for potential alternative locations
  // E.g., if utils/badge-baker.test.ts has been migrated to utils/badge-baker/badge-baker.test.ts
  const baseName = targetPath.split('/').pop();
  const dirName = dirname(targetPath);
  const fileNameWithoutExt = baseName.replace('.test.ts', '');
  
  const alternativePath = join(dirName, fileNameWithoutExt, baseName);
  
  return await exists(alternativePath);
}

// Ensure directories exist
async function ensureDirectoryExists(filePath) {
  const dir = dirname(filePath);
  try {
    await mkdir(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  } catch (err) {
    if (err.code !== 'EEXIST') {
      throw err;
    }
  }
}

// Update import paths in test files
function updateImportPaths(content) {
  let updatedContent = content;
  
  // Replace relative imports with path aliases
  updatedContent = updatedContent.replace(
    /from ["']\.\.\/\.\.\/(.+?)["']/g,
    'from "@/$1"'
  );
  
  updatedContent = updatedContent.replace(
    /from ["']\.\.\/\.\.\/\.\.\/(.+?)["']/g,
    'from "@/$1"'
  );
  
  updatedContent = updatedContent.replace(
    /from ["']\.\.\/\.\.\/\.\.\/\.\.\/(.+?)["']/g,
    'from "@/$1"'
  );
  
  // Update fixture paths
  updatedContent = updatedContent.replace(
    /path\.join\(import\.meta\.dir,\s*["']fixtures["']/g,
    'path.join("tests", "fixtures"'
  );
  
  updatedContent = updatedContent.replace(
    /path\.join\(import\.meta\.dir,\s*["']\.\.\/fixtures["']/g,
    'path.join("tests", "fixtures"'
  );
  
  return updatedContent;
}

// Copy fixture files
async function copyFixtures() {
  // Create fixtures output directory
  await ensureDirectoryExists('tests/fixtures/output/placeholder.txt');
  
  // Copy fixture files from src/tests/fixtures if they exist and don't already exist in tests/fixtures
  try {
    const srcFixtures = ['sample-badge.png', 'sample-badge.svg'];
    for (const fixture of srcFixtures) {
      const srcPath = join('src', 'tests', 'fixtures', fixture);
      const targetPath = join('tests', 'fixtures', fixture);
      
      if (await exists(srcPath) && !(await exists(targetPath))) {
        await copyFile(srcPath, targetPath);
        console.log(`Copied ${fixture} to tests/fixtures/`);
      }
    }
  } catch (err) {
    console.error('Error copying fixtures:', err);
  }
}

// Migrate all test files
async function migrateAllTests() {
  // Copy fixtures first
  await copyFixtures();
  
  // Get list of source files
  const sourceFiles = await getSourceFiles();
  console.log(`Found ${sourceFiles.length} test files to process`);
  
  // Track statistics
  let migrated = 0;
  let skipped = 0;
  let failed = 0;
  
  // Process each file
  for (const sourcePath of sourceFiles) {
    try {
      // Get test info and target path
      const fileInfo = getTestInfo(sourcePath);
      const targetPath = getTargetPath(fileInfo);
      
      // Skip if already migrated
      if (await isAlreadyMigrated(sourcePath, targetPath)) {
        console.log(`Skipped (already exists): ${sourcePath} → ${targetPath}`);
        skipped++;
        continue;
      }
      
      // Create directory for target file
      await ensureDirectoryExists(targetPath);
      
      // Read, update, and write file
      const content = await readFile(sourcePath, 'utf8');
      const updatedContent = updateImportPaths(content);
      
      await writeFile(targetPath, updatedContent);
      console.log(`Migrated: ${sourcePath} → ${targetPath}`);
      migrated++;
    } catch (err) {
      console.error(`Failed to migrate ${sourcePath}: ${err.message}`);
      failed++;
    }
  }
  
  // Print summary
  console.log('\nMigration completed!');
  console.log(`  - ${migrated} files migrated`);
  console.log(`  - ${skipped} files skipped (already migrated)`);
  console.log(`  - ${failed} files failed`);
  console.log('\nYou may need to update the tsconfig path aliases and resolve any remaining linter errors.');
}

// Run the migration
migrateAllTests().catch(console.error); 