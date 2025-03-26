# Semantic Versioning Guide

This project follows [Semantic Versioning](https://semver.org/) principles to manage releases.

## Version Numbers

Version numbers follow the `MAJOR.MINOR.PATCH` format:

- **MAJOR**: Incompatible API changes
- **MINOR**: New functionality in a backward-compatible manner
- **PATCH**: Backward-compatible bug fixes

For pre-releases, we use suffixes like `-alpha.0`, `-beta.1`, etc.

## Creating Releases

We use the `commit-and-tag-version` tool to manage versioning. It automatically:

1. Determines the next version based on commit messages
2. Updates the version in package.json
3. Updates CHANGELOG.md with all changes
4. Creates a git commit and tag

### Commit Message Format

To enable automatic version determination, use conventional commit messages:

- `feat:` - New feature (minor version bump)
- `fix:` - Bug fix (patch version bump)
- `docs:` - Documentation changes (no version bump)
- `style:` - Code style changes (no version bump)
- `refactor:` - Code refactoring (no version bump)
- `perf:` - Performance improvements (no version bump)
- `test:` - Adding/updating tests (no version bump)
- `chore:` - Maintenance tasks (no version bump)
- `BREAKING CHANGE:` - Breaking changes (major version bump)

Example: `feat: add new badge issuance endpoint`

For breaking changes, include `BREAKING CHANGE:` in the commit message body:

```
feat: completely redesign API

BREAKING CHANGE: The API has been completely redesigned and is not backward compatible.
```

### Release Commands

Choose the appropriate command based on the type of release:

```bash
# Let the tool determine the version bump (based on commits):
bun run release

# Force a specific version bump:
bun run release:patch  # 0.0.x
bun run release:minor  # 0.x.0
bun run release:major  # x.0.0

# Create pre-releases:
bun run release:alpha  # x.x.x-alpha.n
bun run release:beta   # x.x.x-beta.n
```

### Publishing a Release

After creating a release, push the changes and tags to GitHub:

```bash
git push --follow-tags origin main
```

This will trigger the GitHub Actions workflow that:

1. Validates the release with tests
2. Creates a GitHub Release with notes from CHANGELOG.md
3. Builds and publishes a Docker image to GitHub Container Registry (ghcr.io)
4. Tags the Docker image with appropriate version tags

### Docker Image

The Docker image will be published to:
`ghcr.io/YOUR-USERNAME/bun-badges`

With the following tags:
- Exact version: `v1.2.3`
- Minor version: `v1.2`
- Major version: `v1`
- Latest: `latest` (only for non-prerelease versions)

### Pre-releases

Pre-releases use the following format:
- `x.y.z-alpha.n` - Alpha releases (very early testing)
- `x.y.z-beta.n` - Beta releases (feature complete but may have bugs)

Pre-releases are marked as such on GitHub Releases and don't get the `latest` tag on Docker images. 