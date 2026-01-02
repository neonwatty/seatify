#!/bin/bash
# UTM Link Generator for Seatify
# Usage: ./scripts/utm-link.sh <source> <medium> [campaign] [content]
#
# Examples:
#   ./scripts/utm-link.sh twitter social
#   ./scripts/utm-link.sh newsletter email weekly-update
#   ./scripts/utm-link.sh reddit social weddingplanning post1
#
# Common sources: twitter, reddit, linkedin, facebook, newsletter, youtube, tiktok, discord
# Common mediums: social, email, referral, video, community

BASE_URL="https://seatify.app"

# Colors for output
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

if [ -z "$1" ] || [ -z "$2" ]; then
    echo "UTM Link Generator for Seatify"
    echo ""
    echo "Usage: $0 <source> <medium> [campaign] [content]"
    echo ""
    echo "Required:"
    echo "  source   - Where the traffic comes from (twitter, reddit, newsletter, etc.)"
    echo "  medium   - Marketing medium (social, email, referral, video, community)"
    echo ""
    echo "Optional:"
    echo "  campaign - Campaign name (launch, weekly-update, etc.)"
    echo "  content  - Differentiate links (post1, bio-link, etc.)"
    echo ""
    echo "Examples:"
    echo "  $0 twitter social"
    echo "  $0 newsletter email january-2025"
    echo "  $0 reddit social weddingplanning show-hn"
    echo ""
    echo "Common presets:"
    echo "  $0 twitter social          # Twitter/X posts"
    echo "  $0 twitter social bio      # Twitter bio link"
    echo "  $0 reddit social           # Reddit posts"
    echo "  $0 linkedin social         # LinkedIn posts"
    echo "  $0 youtube video           # YouTube description"
    echo "  $0 newsletter email        # Email newsletter"
    echo "  $0 discord community       # Discord server"
    echo "  $0 hn referral             # Hacker News"
    echo "  $0 producthunt referral    # Product Hunt"
    exit 1
fi

SOURCE="$1"
MEDIUM="$2"
CAMPAIGN="${3:-}"
CONTENT="${4:-}"

# Build the URL
URL="${BASE_URL}/?utm_source=${SOURCE}&utm_medium=${MEDIUM}"

if [ -n "$CAMPAIGN" ]; then
    URL="${URL}&utm_campaign=${CAMPAIGN}"
fi

if [ -n "$CONTENT" ]; then
    URL="${URL}&utm_content=${CONTENT}"
fi

echo ""
echo -e "${GREEN}Generated UTM Link:${NC}"
echo ""
echo -e "${CYAN}${URL}${NC}"
echo ""

# Copy to clipboard if pbcopy is available (macOS)
if command -v pbcopy &> /dev/null; then
    echo -n "$URL" | pbcopy
    echo "✓ Copied to clipboard!"
    echo ""
fi

# Show what GA4 will report
echo "GA4 will show this as:"
echo "  Source:   $SOURCE"
echo "  Medium:   $MEDIUM"
if [ -n "$CAMPAIGN" ]; then
    echo "  Campaign: $CAMPAIGN"
fi
if [ -n "$CONTENT" ]; then
    echo "  Content:  $CONTENT"
fi
echo ""
