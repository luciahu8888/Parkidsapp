#!/bin/bash

# Download golf performance icons from icons8
# Make sure you have wget or curl installed

echo "Downloading golf performance icons from icons8..."

# Create icons directory if it doesn't exist
mkdir -p public/icons

# Download icons (you may need to adjust URLs based on actual icons8 links)
# These are placeholder URLs - you'll need to get the actual download links from icons8

# Eagle icon
curl -L "https://img.icons8.com/?size=100&id=123&format=png&color=000000" -o public/icons/eagle.png 2>/dev/null || echo "Please download eagle icon manually"

# Birdie icon
curl -L "https://img.icons8.com/?size=100&id=456&format=png&color=000000" -o public/icons/birdie.png 2>/dev/null || echo "Please download birdie icon manually"

# Par icon
curl -L "https://img.icons8.com/?size=100&id=789&format=png&color=000000" -o public/icons/par.png 2>/dev/null || echo "Please download par icon manually"

# Bogey icon
curl -L "https://img.icons8.com/?size=100&id=101&format=png&color=000000" -o public/icons/bogey.png 2>/dev/null || echo "Please download bogey icon manually"

echo "Icons downloaded! Please check public/icons/ directory"
echo "Note: You may need to manually download icons from icons8.com with the correct URLs"