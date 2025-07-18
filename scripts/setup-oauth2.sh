#!/bin/bash
# BookDrive OAuth2 Setup Script
# Usage: Run this script to get step-by-step instructions for setting up your Google OAuth2 Client ID for BookDrive.

set -e

GREEN='\033[1;32m'
YELLOW='\033[1;33m'
RED='\033[1;31m'
NC='\033[0m' # No Color

printf "\n${GREEN}=== BookDrive OAuth2 Client ID Setup ===${NC}\n\n"

if [ ! -f ../src/manifest.json ]; then
  printf "${RED}Error: src/manifest.json not found! Please run this script from the scripts/ directory in your BookDrive repo.${NC}\n"
  exit 1
fi

printf "${YELLOW}1.${NC} Go to https://console.cloud.google.com/apis/credentials\n"
printf "${YELLOW}2.${NC} Create a new project (or select an existing one) named 'BookDrive'\n"
printf "${YELLOW}3.${NC} Click 'Create Credentials' > 'OAuth client ID'\n"
printf "${YELLOW}4.${NC} Select 'Chrome App' and enter the extension ID (from chrome://extensions, in developer mode)\n"
printf "${YELLOW}5.${NC} Download or copy the generated client_id (looks like: xxxxxxxx.apps.googleusercontent.com)\n"
printf "${YELLOW}6.${NC} Open src/manifest.json and replace the value of 'client_id' in the 'oauth2' section with your new client_id\n"
printf "${YELLOW}7.${NC} Save and reload the extension in your browser.\n\n"
printf "For more details, see the README or Google OAuth2 documentation.\n"
printf "If you need help, see: https://developers.google.com/identity/protocols/oauth2\n\n"

# Optionally, check for jq if automating manifest update in the future
# if ! command -v jq &> /dev/null; then
#   printf "${YELLOW}Note:${NC} 'jq' not found. If you want to automate manifest.json updates, please install jq.\n"
# fi 