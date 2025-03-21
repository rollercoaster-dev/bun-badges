#!/bin/bash
# Script to generate self-signed SSL certificates for development

# Exit on error
set -e

CERTS_DIR="./certs"
CERT_FILE="$CERTS_DIR/cert.pem"
KEY_FILE="$CERTS_DIR/key.pem"
COUNTRY="US"
STATE="State"
LOCALITY="City"
ORGANIZATION="Bun Badges"
ORG_UNIT="Development"
COMMON_NAME="localhost"
EMAIL="admin@example.com"
DAYS=365

# Print colored output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Generating self-signed SSL certificates for development...${NC}"

# Create certificates directory if it doesn't exist
if [ ! -d "$CERTS_DIR" ]; then
  echo -e "${YELLOW}Creating certificates directory at $CERTS_DIR...${NC}"
  mkdir -p "$CERTS_DIR"
fi

# Check if certificates already exist
if [ -f "$CERT_FILE" ] && [ -f "$KEY_FILE" ]; then
  echo -e "${YELLOW}Certificates already exist. Overwrite? (y/n)${NC}"
  read -r overwrite
  if [ "$overwrite" != "y" ]; then
    echo -e "${GREEN}Keeping existing certificates.${NC}"
    exit 0
  fi
fi

# Generate private key and self-signed certificate
echo -e "${YELLOW}Generating private key and self-signed certificate...${NC}"
openssl req -x509 -newkey rsa:4096 -keyout "$KEY_FILE" -out "$CERT_FILE" -days "$DAYS" -nodes -subj "/C=$COUNTRY/ST=$STATE/L=$LOCALITY/O=$ORGANIZATION/OU=$ORG_UNIT/CN=$COMMON_NAME/emailAddress=$EMAIL"

# Set proper permissions
chmod 600 "$KEY_FILE"
chmod 644 "$CERT_FILE"

echo -e "${GREEN}Certificates generated successfully:${NC}"
echo -e "${GREEN}- Certificate: $CERT_FILE${NC}"
echo -e "${GREEN}- Private Key: $KEY_FILE${NC}"
echo ""
echo -e "${YELLOW}NOTE: These are self-signed certificates and are not suitable for production use.${NC}"
echo -e "${YELLOW}Browsers will show a security warning when accessing sites with these certificates.${NC}"
echo ""
echo -e "${BLUE}To use these certificates:${NC}"
echo -e "1. Set ${YELLOW}USE_HTTPS=true${NC} in your .env file"
echo -e "2. Set ${YELLOW}TLS_CERT_FILE=${CERT_FILE}${NC} in your .env file"
echo -e "3. Set ${YELLOW}TLS_KEY_FILE=${KEY_FILE}${NC} in your .env file"
echo ""
echo -e "${GREEN}Done!${NC}" 