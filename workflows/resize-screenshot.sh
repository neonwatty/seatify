#!/bin/bash
# Resize iOS simulator screenshots to a reasonable size for documentation
# Usage: ./resize-screenshot.sh <input.png> [output.png] [max_dimension]
#
# Examples:
#   ./resize-screenshot.sh screenshot.png                    # Resize in place to 800px
#   ./resize-screenshot.sh screenshot.png resized.png        # Resize to new file
#   ./resize-screenshot.sh screenshot.png resized.png 600    # Resize to 600px max

INPUT="$1"
OUTPUT="${2:-$1}"
MAX_DIM="${3:-800}"

if [ -z "$INPUT" ]; then
    echo "Usage: $0 <input.png> [output.png] [max_dimension]"
    exit 1
fi

if [ ! -f "$INPUT" ]; then
    echo "Error: File not found: $INPUT"
    exit 1
fi

# Get original dimensions
ORIG_SIZE=$(sips -g pixelWidth -g pixelHeight "$INPUT" 2>/dev/null | grep pixel | awk '{print $2}' | tr '\n' 'x' | sed 's/x$//')

# Resize using sips (macOS built-in)
sips -Z "$MAX_DIM" "$INPUT" --out "$OUTPUT" >/dev/null 2>&1

# Get new dimensions
NEW_SIZE=$(sips -g pixelWidth -g pixelHeight "$OUTPUT" 2>/dev/null | grep pixel | awk '{print $2}' | tr '\n' 'x' | sed 's/x$//')

# Get file sizes
ORIG_BYTES=$(stat -f%z "$INPUT" 2>/dev/null || echo "?")
NEW_BYTES=$(stat -f%z "$OUTPUT" 2>/dev/null || echo "?")

echo "Resized: ${ORIG_SIZE} -> ${NEW_SIZE} ($(echo "scale=0; $NEW_BYTES/1024" | bc)KB)"
