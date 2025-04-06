# Fix Docker Build Canvas Issues

## Task Summary
Resolve issues with building the Docker image for the Bun Badges application, specifically focusing on the native module compilation problems with the `canvas` package.

## Current Issues
- `secp256k1` package takes an extremely long time to build (3m+)
- `canvas` package fails to build due to missing `node-gyp`
- `rsvg_handle_get_intrinsic_size_in_pixels` function missing in the installed librsvg version
- Compilation errors during the Docker build process

## Required Investigation
- [x] Analyze dependencies required by the canvas package v3.1.0
- [x] Research compatibility between librsvg versions and canvas package versions
- [x] Explore potential alternatives to simplify the build process
- [x] Investigate if prebuilt binaries are available for arm64 architecture

## Approach Options

### Option 1: Fix Current Build Process
- [x] Ensure Node.js LTS is properly installed (for node-gyp)
- [x] Install all required system dependencies for canvas compilation
- [x] Set proper environment variables for native module building
- [x] Configure caching to speed up subsequent builds
- [x] Implement build flags to optimize compilation time

### Option 2: Use Alternative Base Image
- [ ] Research alternative base images with better native module support
- [ ] Evaluate using a Node.js-based image with Bun installed after
- [ ] Compare build performance with different base images
- [ ] Test compatibility of alternative images with the application

### Option 3: Pre-compiled Canvas Module
- [x] Investigate if pre-compiled binaries exist for canvas on arm64
- [x] Create a custom build stage to compile canvas separately
- [ ] Explore using GitHub Actions to pre-build native modules
- [ ] Consider creating a custom base image with dependencies pre-installed

## Implementation Plan

### 1. Diagnostic Phase
- [x] Create a minimal reproduction case to isolate canvas build issues
- [x] Test different versions of librsvg and canvas to find compatible combinations
- [x] Benchmark build times for different approaches
- [x] Document all system dependencies required for successful builds

### 2. Build Process Improvements
- [x] Update Dockerfile with proper multi-stage build process
- [x] Optimize installation order for better layer caching
- [x] Implement BuildKit cache mounts for node_modules and native builds
- [x] Configure environment variables for optimized compilation

### 3. Dependency Management
- [x] Audit and potentially update dependencies with build issues
- [x] Evaluate if all dependencies are necessary for production builds
- [x] Create separate dependency installation for development and production
- [x] Document dependency requirements for future maintenance

### 4. Testing and Validation
- [x] Create test scripts to validate canvas functionality
- [ ] Test builds on both x86_64 and arm64 architectures
- [ ] Validate that the built image functions correctly
- [x] Measure and optimize build time and image size
- [ ] Ensure all application features dependent on canvas work properly

## Technical Details

### Critical System Dependencies
```
# Debian/Ubuntu dependencies for canvas v3.1.0
libpixman-1-dev
libcairo2-dev
libpango1.0-dev
libjpeg-dev
libgif-dev
librsvg2-dev (version 2.54.* provides rsvg_handle_get_intrinsic_size_in_pixels)
```

### Build Environment Variables
```
CFLAGS="-O3"
CXXFLAGS="-O3"
npm_config_build_from_source=true
npm_config_canvas_binary_host_mirror="https://github.com/Automattic/node-canvas/releases/download/"
CANVAS_PREBUILT=0
npm_config_node_gyp=/usr/local/lib/node_modules/node-gyp/bin/node-gyp.js
npm_config_cache=/tmp/.npm
```

### Compatible Versions Research
The canvas v3.1.0 package requires librsvg 2.54.* or newer which provides the required functions. We've updated the Dockerfile to:
1. Install this specific version of librsvg
2. Pre-install canvas separately to avoid dependency issues
3. Use proper caching to speed up builds
4. Set up diagnostic tools to quickly identify issues

## Success Criteria
- Docker image builds successfully within a reasonable time (under 5 minutes)
- All application features that depend on canvas function correctly
- Build process is documented and reproducible
- Solution works across different architectures (x86_64, arm64) 

## Implemented Solutions
1. Updated Dockerfile with optimized build process
2. Created diagnostic tools for canvas installation
3. Added documentation for Docker build optimizations
4. Verified the main canvas issues:
   - Need to use backports for librsvg2-dev to get version ≥ 2.48.0
   - Need to install canvas separately to avoid dependency issues
   - Need python3 for node-gyp builds
   - Need nodejs and node-gyp for building native modules
   - The fast-bitset module requires special handling to avoid reference errors

## Current Status
- Docker image builds successfully
- Canvas and SVG functionality are confirmed working (via diagnostic script)
- Adding `npm install fast-bitset@1.3.2` to the Dockerfile resolves the BitSet reference error
- All system dependencies are properly installed
- Build time is now reasonable (under 20 seconds with caching)

## Remaining Issues 
- The fast-bitset module exhibits "BitSet is not defined" errors in the runtime container
- Need to validate full application functionality (not just diagnostic tests)

## Next Steps
1. Test the build on both x86_64 and arm64 architectures
2. Validate all canvas functionality in the application
3. Create a CI verification process that confirms canvas and SVG work correctly
4. Complete a full test of the application in the Docker container
5. Document the Docker build requirements and dependencies in a way that's easy for developers to understand 