#!/usr/bin/env bun
/**
 * Custom build script for Bun Badges
 *
 * This script builds the application with multiple entrypoints to ensure
 * proper code splitting for better debugging and maintenance.
 */

import fs from "fs";
import { join } from "path";
import { readdirSync } from "fs";

console.log("🔨 Starting build process...");

// Gather source files for splitting
function getMainEntrypoints(): string[] {
  const srcDir = "./src";
  const routes = join(srcDir, "routes");
  const utils = join(srcDir, "utils");
  const lib = join(srcDir, "lib");

  // Add key utilities as entrypoints
  const entrypoints: string[] = [];

  if (fs.existsSync(utils)) {
    const utilFiles = readdirSync(utils, { withFileTypes: true })
      .filter((dirent) => !dirent.isDirectory() && dirent.name.endsWith(".ts"))
      .map((dirent) => join(utils, dirent.name));

    entrypoints.push(...utilFiles);
  }

  // Add key libraries as entrypoints
  if (fs.existsSync(lib)) {
    const libFiles = readdirSync(lib, { withFileTypes: true })
      .filter((dirent) => !dirent.isDirectory() && dirent.name.endsWith(".ts"))
      .map((dirent) => join(lib, dirent.name));

    entrypoints.push(...libFiles);
  }

  // Add key routes as entrypoints for better splitting
  if (fs.existsSync(routes)) {
    const routeFiles = readdirSync(routes, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => join(routes, dirent.name, "index.ts"))
      .filter((file) => fs.existsSync(file));

    entrypoints.push(...routeFiles);
  }

  console.log(
    `📊 Found ${entrypoints.length} utility and route entry points for splitting`,
  );
  return entrypoints;
}

// Use async function to handle the builds
async function runBuild(): Promise<void> {
  // First build the main index.ts entry point to dist/index.js for Docker compatibility
  console.log("📦 Building main application entry point...");
  try {
    const mainEntryBuild = await Bun.build({
      entrypoints: ["./src/index.ts"],
      outdir: "./dist",
      target: "bun",
      format: "esm",
      sourcemap: "external",
      minify: process.env.NODE_ENV === "production",
    });

    if (!mainEntryBuild.success) {
      console.error("❌ Main entry point build failed:", mainEntryBuild.logs);
      process.exit(1);
    }

    console.log("✅ Main entry point built successfully at dist/index.js");
  } catch (error) {
    console.error("❌ Error building main entry point:", error);
    process.exit(1);
  }

  // Then build the rest of the application with code splitting
  console.log("📦 Building application modules with code splitting...");
  try {
    const entrypoints = getMainEntrypoints();

    const modulesBuild = await Bun.build({
      entrypoints,
      outdir: "./dist/modules",
      target: "bun",
      format: "esm",
      sourcemap: "external",
      splitting: true,
      minify: process.env.NODE_ENV === "production",
    });

    if (!modulesBuild.success) {
      console.error("❌ Modules build failed:", modulesBuild.logs);
      process.exit(1);
    }

    console.log(
      "✅ Application modules built successfully with code splitting",
    );
    if (modulesBuild.outputs) {
      console.log(
        `📊 Successfully built ${modulesBuild.outputs.length} modules`,
      );
    }
  } catch (error) {
    console.error("❌ Error building application modules:", error);
    process.exit(1);
  }

  // Now build important utility files separately for direct access
  console.log("📁 Building utility modules for direct access...");

  // Create directories if they don't exist
  fs.mkdirSync("./dist/utils", { recursive: true });
  fs.mkdirSync("./dist/utils/signing", { recursive: true });

  // Build BitSet module separately
  try {
    const bitsetBuild = await Bun.build({
      entrypoints: ["./src/utils/bitset.ts"],
      outdir: "./dist/utils",
      target: "bun",
      format: "esm",
      sourcemap: "external",
      minify: false,
    });

    if (!bitsetBuild.success) {
      console.error("❌ BitSet module build failed:", bitsetBuild.logs);
    } else {
      console.log("✅ BitSet module built successfully");
    }
  } catch (error) {
    console.error("❌ Error building BitSet module:", error);
  }

  // Build status-list module separately
  try {
    const statusListBuild = await Bun.build({
      entrypoints: ["./src/utils/signing/status-list.ts"],
      outdir: "./dist/utils/signing",
      target: "bun",
      format: "esm",
      sourcemap: "external",
      minify: false,
    });

    if (!statusListBuild.success) {
      console.error(
        "❌ Status list module build failed:",
        statusListBuild.logs,
      );
    } else {
      console.log("✅ Status list module built successfully");
    }
  } catch (error) {
    console.error("❌ Error building status-list module:", error);
  }

  console.log("✅ Build completed successfully");
}

// Run the build
runBuild();
