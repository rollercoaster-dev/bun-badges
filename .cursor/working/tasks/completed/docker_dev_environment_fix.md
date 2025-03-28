# Docker Development Environment Fix

**Date Created:** Mar 26, 2025
**Priority:** High
**Status:** In Progress
**Assigned:** Claude

## Task Description

Fix Docker development environment setup for the bun-badges project. The Docker development setup currently fails with errors related to Node.js installation.

## Problem Analysis

The development Docker environment is failing with:
1. Initial error: The Node.js setup was failing with npm not being available after installing nodejs
2. Second error: After fixing the Node.js installation method, getting error with "stat /app/start-dev.sh: no such file or directory"
3. Investigate why the container can't find the start-dev.sh script despite it being created in the Dockerfile.

## Progress & Findings

1. ✅ Identified the Node.js installation issue in Dockerfile.dev
2. ✅ Updated the installation to match the production Dockerfile's more reliable method:
   - Added ca-certificates and gnupg packages
   - Used gpg key installation and apt sources list approach instead of the setup script
   - Explicitly updated apt after adding the new source
3. 🔄 Still encountering an issue with the start-dev.sh script not being found
4. ✅ Examined docker-compose.dev.yml and found the critical issue:
   - The file mounts the local directory to /app with: `- .:/app:delegated`
   - This volume mount OVERWRITES the container's /app directory, including the start-dev.sh script
   - While there's a volume mount to preserve node_modules: `- /app/node_modules`, there's no equivalent for the startup script

## Action Items

- [ ] Modify the Dockerfile.dev to place the start-dev.sh script in a location that won't be overwritten by the volume mount
- [ ] Alternatively, modify docker-compose.dev.yml to add a volume exclusion for the start-dev.sh script
- [ ] Test the solution to ensure the development environment starts correctly
- [ ] Document the fix for future reference

## Next Steps

1. Implement one of these potential solutions:
   - Move the start-dev.sh script to /usr/local/bin in Dockerfile.dev to avoid the volume mount
   - Add a volume mount in docker-compose.dev.yml to preserve the script: `- /app/start-dev.sh`
   - Change the ENTRYPOINT to use a command directly instead of a script
2. Rebuild and test the development environment
3. Document the solution and lessons learned

## Related Files
- Dockerfile.dev
- docker-compose.dev.yml
- Dockerfile (for reference on working Node.js installation) 