import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname, basename, relative } from "node:path";

interface TestFile {
  sourcePath: string;
  targetPath: string;
  content: string;
}

const SRC_DIR = "src";
const TEST_DIR = "src/__tests__";

async function findTestFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findTestFiles(fullPath)));
    } else if (entry.isFile() && /\.test\.ts$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function determineNewLocation(testPath: string): string {
  // Remove __tests__ from path and get the module type (routes, controllers, etc.)
  const pathParts = testPath.split("/__tests__/")[1].split("/");
  const moduleType = pathParts[0]; // routes, controllers, etc.
  const fileName = basename(testPath);

  // Handle special case for integration tests
  if (pathParts.includes("integration")) {
    const moduleName = fileName
      .replace(".test.ts", "")
      .replace(".integration", "");
    return join(SRC_DIR, moduleType, moduleName, fileName);
  }

  // For regular tests, determine the module name from the file name
  const moduleName = fileName
    .replace(".test.ts", "")
    .replace(".routes", "")
    .replace(".controller", "");
  return join(SRC_DIR, moduleType, moduleName, fileName);
}

async function updateImportPaths(
  content: string,
  oldPath: string,
  newPath: string,
): Promise<string> {
  const relativeToSrc = (path: string) =>
    relative(dirname(path), SRC_DIR).replace(/^\.\.\//, "");

  // Update relative imports to use new paths
  return content.replace(/from ['"]\.\.?\/(.*?)['"]/g, (match, importPath) => {
    // Don't modify node_modules imports
    if (importPath.startsWith("node_modules")) {
      return match;
    }

    // Calculate new relative path
    const absoluteImportPath = join(SRC_DIR, importPath);
    const newRelativePath = relative(dirname(newPath), absoluteImportPath);
    return `from '${newRelativePath.startsWith(".") ? newRelativePath : "./" + newRelativePath}'`;
  });
}

async function migrateTests() {
  try {
    // Find all test files
    console.log("Finding test files...");
    const testFiles = await findTestFiles(TEST_DIR);

    // Process each test file
    for (const testPath of testFiles) {
      console.log(`Processing ${testPath}...`);

      // Determine new location
      const newPath = determineNewLocation(testPath);
      console.log(`New location: ${newPath}`);

      // Read file content
      const content = await readFile(testPath, "utf-8");

      // Update import paths
      const updatedContent = await updateImportPaths(
        content,
        testPath,
        newPath,
      );

      // Create directory if it doesn't exist
      const targetDir = dirname(newPath);
      if (!existsSync(targetDir)) {
        await mkdir(targetDir, { recursive: true });
      }

      // Write file to new location
      await writeFile(newPath, updatedContent);

      console.log(`Migrated ${basename(testPath)} to new location`);
    }

    console.log("Migration complete!");
  } catch (error) {
    console.error("Error during migration:", error);
    process.exit(1);
  }
}

// Add dry run capability
const isDryRun = process.argv.includes("--dry-run");
if (isDryRun) {
  console.log("Performing dry run...");
}

migrateTests().catch(console.error);
