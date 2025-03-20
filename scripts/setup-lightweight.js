// Script to create a lightweight development package.json without Canvas dependency
import fs from 'fs';
import path from 'path';

// Load the original package.json
const packageJsonPath = path.join(process.cwd(), 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Create a lightweight version without Canvas
const lightweightPackageJson = structuredClone(packageJson);

// Remove Canvas dependency
if (lightweightPackageJson.dependencies.canvas) {
  console.log('Removing canvas dependency from package.json');
  delete lightweightPackageJson.dependencies.canvas;
}

// Save to package.json.lightweight
const lightweightPath = path.join(process.cwd(), 'package.json.lightweight');
fs.writeFileSync(lightweightPath, JSON.stringify(lightweightPackageJson, null, 2));

console.log(`Lightweight package.json created at ${lightweightPath}`);
console.log('To use it:');
console.log('1. Copy it to package.json: cp package.json.lightweight package.json');
console.log('2. Install dependencies: bun install');
console.log('3. Start the development server: bun run dev');
console.log('');
console.log('NOTE: Image-related features will not work with this configuration.');
