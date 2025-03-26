#!/usr/bin/env bun

import fs from "fs";
import { execSync } from "child_process";

// Read the current version from package.json
const packageJson = JSON.parse(fs.readFileSync("./package.json", "utf8"));
const version = packageJson.version;

// Read the current changelog
const changelog = fs.readFileSync("./CHANGELOG.md", "utf8");

// Get the date for the release
const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

// Check if this is a pre-release version (alpha, beta, etc.)
const isPrerelease = version.includes("-");
const prereleaseSuffix = isPrerelease ? ` (${version.split("-")[1]})` : "";

// Extract the unreleased section content
const unreleasedMatch = changelog.match(
  /## \[Unreleased\]\n\n([\s\S]*?)(?=\n## \[|$)/,
);
const unreleasedContent = unreleasedMatch ? unreleasedMatch[1].trim() : "";

if (!unreleasedContent) {
  console.log("No unreleased changes found in CHANGELOG.md");
  process.exit(0);
}

// Create the new release section
const newReleaseSection = `## [${version}]${prereleaseSuffix} - ${today}\n\n${unreleasedContent}`;

// Update the changelog with the new release
let updatedChangelog = changelog.replace(
  /## \[Unreleased\]\n\n[\s\S]*?(?=\n## \[|$)/,
  `## [Unreleased]\n\n### Added\n\n### Fixed\n\n### Changed\n\n## [${version}]${prereleaseSuffix} - ${today}\n\n${unreleasedContent}`,
);

// Update the links at the bottom of the file
if (updatedChangelog.includes("[Unreleased]:")) {
  // Update the unreleased link
  updatedChangelog = updatedChangelog.replace(
    /\[Unreleased\]: .*$/m,
    `[Unreleased]: https://github.com/YOUR-USERNAME/bun-badges/compare/v${version}...HEAD`,
  );

  // Add the new version link
  const previousVersionMatch = updatedChangelog.match(
    /\[Unreleased\]: .*\/compare\/v(.*?)\.\.\.HEAD/,
  );
  const previousVersion = previousVersionMatch
    ? previousVersionMatch[1]
    : "0.0.1";

  if (!updatedChangelog.includes(`[${version}]:`)) {
    const versionLink = `[${version}]: https://github.com/YOUR-USERNAME/bun-badges/compare/v${previousVersion}...v${version}`;
    updatedChangelog = updatedChangelog.replace(
      /(\[Unreleased\]: .*$)/m,
      `$1\n${versionLink}`,
    );
  }
} else {
  // If no links section exists, add one
  updatedChangelog += `\n\n[Unreleased]: https://github.com/YOUR-USERNAME/bun-badges/compare/v${version}...HEAD\n`;
  updatedChangelog += `[${version}]: https://github.com/YOUR-USERNAME/bun-badges/releases/tag/v${version}\n`;
}

// Write the updated changelog back to the file
fs.writeFileSync("./CHANGELOG.md", updatedChangelog);

console.log(`Updated CHANGELOG.md for version ${version}`);

// Stage the CHANGELOG.md file
try {
  execSync("git add CHANGELOG.md");
  console.log("Staged CHANGELOG.md for commit");
} catch (error) {
  console.error("Failed to stage CHANGELOG.md:", error);
}
