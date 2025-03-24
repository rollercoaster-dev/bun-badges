// Migrate tests using Bun
import { mkdir, copyFile, readFile, writeFile, exists } from 'fs/promises';
import { join, dirname } from 'path';
import { spawn } from 'child_process';

// Define source and target directories for different test types
const migrations = [
  // Unit tests
  {
    source: 'src/tests/badge-baker.test.ts',
    target: 'tests/unit/utils/badge-baker.test.ts',
    type: 'unit'
  },
  {
    source: 'src/routes/__tests__/uuid_validation.test.ts',
    target: 'tests/unit/routes/uuid_validation.test.ts',
    type: 'unit'
  },
  // Integration tests
  {
    source: 'src/routes/__tests__/assertions_uuid_fix.integration.test.ts',
    target: 'tests/integration/routes/assertions_uuid_fix.test.ts', 
    type: 'integration'
  }
];

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

// Copy fixture files
async function copyFixtures() {
  // Create fixtures output directory
  await ensureDirectoryExists('tests/fixtures/output/placeholder.txt');
  
  // Copy PNG fixture if it doesn't exist
  if (!(await exists('tests/fixtures/sample-badge.png'))) {
    await copyFile('src/tests/fixtures/sample-badge.png', 'tests/fixtures/sample-badge.png');
    console.log('Copied sample-badge.png to tests/fixtures/');
  }
}

// Update import paths in test files
function updateImportPaths(content, type) {
  // Update relative imports to use path aliases
  let updatedContent = content;
  
  updatedContent = updatedContent.replace(
    /from ["']\.\.\/\.\.\/utils\/badge-baker["']/g,
    'from "@/utils/badge-baker"'
  );
  
  updatedContent = updatedContent.replace(
    /from ["']\.\.\/\.\.\/utils\/auth\/codeGenerator["']/g,
    'from "@/utils/auth/codeGenerator"'
  );
  
  updatedContent = updatedContent.replace(
    /from ["']\.\.\/\.\.\/routes\/assertions\.routes["']/g,
    'from "@/routes/assertions.routes"'
  );
  
  updatedContent = updatedContent.replace(
    /from ["']\.\.\/\.\.\/utils\/test\/db-helpers["']/g,
    'from "@/utils/test/db-helpers"'
  );
  
  // Update fixture paths
  updatedContent = updatedContent.replace(
    /path\.join\(import\.meta\.dir, ["']fixtures["']/g,
    'path.join("tests", "fixtures"'
  );
  
  updatedContent = updatedContent.replace(
    /path\.join\(import\.meta\.dir, ["']\.\.\/fixtures["']/g,
    'path.join("tests", "fixtures"'
  );
  
  return updatedContent;
}

// Migrate each test file
async function migrateTests() {
  await copyFixtures();
  
  for (const { source, target, type } of migrations) {
    if (!(await exists(source))) {
      console.log(`Source file does not exist: ${source}`);
      continue;
    }
    
    await ensureDirectoryExists(target);
    
    const content = await readFile(source, 'utf8');
    const updatedContent = updateImportPaths(content, type);
    
    await writeFile(target, updatedContent);
    console.log(`Migrated: ${source} → ${target}`);
  }
  
  console.log('\nMigration completed!');
  console.log('\nYou may need to update the tsconfig path aliases and resolve any remaining linter errors.');
}

// Run the migration
migrateTests().catch(console.error); 