#!/bin/bash
# Script to set up GitHub Actions variables and secrets using the gh CLI
# Requires GitHub CLI (gh) to be installed and authenticated

set -e # Exit on error

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Function to check if gh is installed and authenticated
check_gh() {
  if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed. Please install it from https://cli.github.com/"
    exit 1
  fi
  
  if ! gh auth status &> /dev/null; then
    echo "❌ You are not authenticated with GitHub CLI. Please run 'gh auth login'"
    exit 1
  fi
  
  echo "✅ GitHub CLI is installed and authenticated"
}

# Get repository name from git remote or from user input
get_repo() {
  # Try to get the repository from git remote
  REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
  
  if [[ $REMOTE_URL == *"github.com"* ]]; then
    REPO=$(echo $REMOTE_URL | sed -n 's/.*github.com[:/]\(.*\).git/\1/p')
    if [[ -z "$REPO" ]]; then
      REPO=$(echo $REMOTE_URL | sed -n 's/.*github.com[:/]\(.*\)/\1/p')
    fi
  fi
  
  # If we couldn't parse the repository from git remote, ask the user
  if [[ -z "$REPO" ]]; then
    read -p "Enter GitHub repository (format: owner/repo): " REPO
  fi
  
  echo "📂 Using repository: $REPO"
  return 0
}

# Find all .env files in the project root
find_env_files() {
  echo "🔍 Searching for .env files in project root..."
  ENV_FILES=()
  
  # Find all .env* files in the project root
  while IFS= read -r file; do
    ENV_FILES+=("$file")
  done < <(find "$PROJECT_ROOT" -maxdepth 1 -name ".env*" | sort)
  
  if [ ${#ENV_FILES[@]} -eq 0 ]; then
    echo "⚠️ No .env files found in project root"
    return 1
  fi
  
  echo "✅ Found ${#ENV_FILES[@]} .env files"
  return 0
}

# Let user select an env file
select_env_file() {
  if [ ${#ENV_FILES[@]} -eq 1 ]; then
    ENV_FILE="${ENV_FILES[0]}"
    echo "📄 Using the only available .env file: $ENV_FILE"
    return 0
  fi
  
  echo "Please select an .env file to use:"
  select ENV_FILE in "${ENV_FILES[@]}" "Enter custom path" "Cancel"; do
    if [ "$ENV_FILE" = "Enter custom path" ]; then
      read -p "Enter path to .env file: " ENV_FILE
      if [ -f "$ENV_FILE" ]; then
        echo "📄 Using custom .env file: $ENV_FILE"
        return 0
      else
        echo "❌ File does not exist: $ENV_FILE"
        return 1
      fi
    elif [ "$ENV_FILE" = "Cancel" ]; then
      echo "❌ Operation canceled"
      exit 0
    elif [ -n "$ENV_FILE" ]; then
      echo "📄 Using selected .env file: $ENV_FILE"
      return 0
    else
      echo "❌ Invalid selection"
      return 1
    fi
  done
}

# Load variables from .env file using simple arrays
load_env_file() {
  if [ ! -f "$ENV_FILE" ]; then
    echo "⚠️ $ENV_FILE file not found"
    return 1
  fi
  
  echo "📝 Loading variables from $ENV_FILE"
  
  # Initialize arrays
  PUBLIC_VARS=()
  PUBLIC_VALUES=()
  SECRET_VARS=()
  SECRET_VALUES=()
  
  # Read the .env file line by line
  while IFS= read -r line || [ -n "$line" ]; do
    # Skip comments and empty lines
    if [[ $line =~ ^\s*# ]] || [[ -z $line ]]; then
      continue
    fi
    
    # Extract variable name and value
    if [[ $line =~ ^([^=]+)=(.*)$ ]]; then
      var_name="${BASH_REMATCH[1]}"
      var_value="${BASH_REMATCH[2]}"
      
      # Remove quotes if present
      var_value="${var_value#\"}"
      var_value="${var_value%\"}"
      var_value="${var_value#\'}"
      var_value="${var_value%\'}"
      
      # Check if this is a secret variable (contains password, secret, key, or token)
      if [[ $var_name =~ [Pp][Aa][Ss][Ss][Ww][Oo][Rr][Dd] ]] || 
         [[ $var_name =~ [Ss][Ee][Cc][Rr][Ee][Tt] ]] || 
         [[ $var_name =~ [Kk][Ee][Yy] ]] || 
         [[ $var_name =~ [Tt][Oo][Kk][Ee][Nn] ]]; then
        # Store as secret
        SECRET_VARS+=("$var_name")
        SECRET_VALUES+=("$var_value")
      else
        # Store as public variable
        PUBLIC_VARS+=("$var_name")
        PUBLIC_VALUES+=("$var_value")
      fi
    fi
  done < "$ENV_FILE"
  
  echo "✅ Found ${#PUBLIC_VARS[@]} public variables and ${#SECRET_VARS[@]} secrets"
  return 0
}

# Prompt for confirmation to set variables
confirm_variables() {
  echo "📋 The following variables will be set:"
  echo
  echo "Public Variables (not encrypted):"
  for i in "${!PUBLIC_VARS[@]}"; do
    echo "  - ${PUBLIC_VARS[$i]}=${PUBLIC_VALUES[$i]}"
  done
  
  echo
  echo "Secret Variables (encrypted):"
  for i in "${!SECRET_VARS[@]}"; do
    echo "  - ${SECRET_VARS[$i]}=********"
  done
  
  echo
  read -p "Do you want to set these variables? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    return 1
  fi
  
  return 0
}

# Set GitHub Actions Variables (public, not encrypted)
set_variables() {
  echo "🔄 Setting GitHub Actions variables..."
  
  for i in "${!PUBLIC_VARS[@]}"; do
    var_name="${PUBLIC_VARS[$i]}"
    var_value="${PUBLIC_VALUES[$i]}"
    
    echo "Setting $var_name..."
    gh variable set "$var_name" --repo "$REPO" --body "$var_value"
  done
  
  echo "✅ GitHub Actions variables set successfully!"
}

# Set GitHub Actions Secrets (encrypted)
set_secrets() {
  echo "🔒 Setting GitHub Actions secrets..."
  
  for i in "${!SECRET_VARS[@]}"; do
    var_name="${SECRET_VARS[$i]}"
    var_value="${SECRET_VALUES[$i]}"
    
    echo "Setting secret $var_name..."
    gh secret set "$var_name" --repo "$REPO" --body "$var_value"
  done
  
  echo "✅ GitHub Actions secrets set successfully!"
}

# Main function
main() {
  echo "====================================="
  echo "GitHub Actions Variables Setup Script"
  echo "====================================="
  
  # Check for GitHub CLI
  check_gh
  
  # Get repository
  get_repo
  
  # Find and select .env file
  if find_env_files; then
    select_env_file
  else
    # If no .env files found, ask for path
    read -p "Enter path to .env file: " ENV_FILE
    if [ ! -f "$ENV_FILE" ]; then
      echo "❌ File not found: $ENV_FILE"
      exit 1
    fi
  fi
  
  # Load variables from .env file
  if ! load_env_file; then
    echo "❌ Failed to load variables from $ENV_FILE"
    exit 1
  fi
  
  # Confirm variables
  if ! confirm_variables; then
    echo "❌ Operation canceled"
    exit 1
  fi
  
  # Set variables and secrets
  set_variables
  set_secrets
  
  echo "====================================="
  echo "✅ Setup complete!"
  echo "✅ Repository: $REPO"
  echo "====================================="
  echo "The following have been configured:"
  echo "- Public variables: ${PUBLIC_VARS[*]}"
  echo "- Secret variables: ${SECRET_VARS[*]}"
  echo
  echo "You can verify these in your repository settings:"
  echo "https://github.com/$REPO/settings/secrets/actions"
  echo "https://github.com/$REPO/settings/variables/actions"
  echo "====================================="
}

# Execute main function
main 