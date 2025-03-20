#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Ensure we're in the project root
if [ ! -d "src/__tests__" ]; then
    echo -e "${RED}Error: Must be run from project root${NC}"
    exit 1
fi

# Check if there are any uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${RED}Error: You have uncommitted changes. Please commit or stash them first.${NC}"
    exit 1
fi

# Create a backup branch
BACKUP_BRANCH="backup/test-migration-$(date +%Y%m%d_%H%M%S)"
echo -e "${YELLOW}Creating backup branch: ${BACKUP_BRANCH}${NC}"
git checkout -b $BACKUP_BRANCH

# First do a dry run
echo -e "${YELLOW}Performing dry run...${NC}"
bun run scripts/migrate-tests.ts --dry-run

# Ask for confirmation
echo -e "${YELLOW}Do you want to proceed with the actual migration? (y/N)${NC}"
read -r response

if [[ "$response" =~ ^([yY][eE][sS]|[yY])+$ ]]; then
    echo -e "${GREEN}Running migration...${NC}"
    bun run scripts/migrate-tests.ts
    
    # Check if migration was successful
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Migration completed successfully!${NC}"
        echo -e "${YELLOW}Please review the changes and run your tests.${NC}"
        echo -e "${YELLOW}To revert changes if needed:${NC}"
        echo -e "git checkout main"
        echo -e "git branch -D $BACKUP_BRANCH"
    else
        echo -e "${RED}Migration failed!${NC}"
        echo -e "${YELLOW}Restoring from backup branch...${NC}"
        git checkout main
        echo -e "${YELLOW}Backup branch ${BACKUP_BRANCH} preserved for reference${NC}"
    fi
else
    echo -e "${YELLOW}Migration cancelled.${NC}"
    git checkout main
    git branch -D $BACKUP_BRANCH
fi 