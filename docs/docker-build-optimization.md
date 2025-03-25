# Docker Build Optimization

This document explains the optimizations and requirements for building the Docker image for Bun Badges.

## System Dependencies

The following system dependencies are required for building the application:

```
curl
python3
build-essential
pkg-config
libpixman-1-dev
libcairo2-dev
libpango1.0-dev
libjpeg-dev
libgif-dev
librsvg2-dev (≥ 2.48.0)
nodejs
node-gyp
```

## Canvas Package Requirements

The `canvas` package has specific build requirements:

1. **librsvg2-dev**: We need at least version 2.48.0 which provides the `rsvg_handle_get_intrinsic_size_in_pixels` function. We get this from Debian backports.
2. **node-gyp**: Required for building native modules.
3. **python3**: Required by node-gyp.

## Build Optimizations

Our Dockerfile includes the following optimizations:

1. **Multi-stage build**: We use separate stages for dependency installation, building, and the final image.
2. **BuildKit cache mounts**: We use `--mount=type=cache` to cache package installations.
3. **Minimal production image**: Only production dependencies are included in the final image.

## Verification

To verify the Docker build:

```bash
# Run the test script
./scripts/test-docker-build.sh

# Or manually:
docker build -t bun-badges .
docker run --rm bun-badges node scripts/canvas-diagnostic.js
```

The diagnostic script will check that both canvas and SVG functionality are working properly.

## Known Issues

### Fast-BitSet Module

The fast-bitset module sometimes has reference errors in the runtime container. If you encounter "BitSet is not defined" errors, try:

1. Ensuring that the module is properly installed in production dependencies
2. Running the bun build process with sourcemaps for better debugging

### Canvas Module

If encountering canvas-related errors:

1. Verify librsvg2-dev is from backports (≥ 2.48.0)
2. Ensure that node-gyp and python3 are installed
3. Run the diagnostic script to check functionality 