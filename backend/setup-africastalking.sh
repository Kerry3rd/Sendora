#!/bin/bash

echo "🇹🇿 AfricasTalking Setup Assistant"
echo "=================================="
echo ""

# Get username
read -p " kersonkolrlynce@gmail.com: " username
echo ""

# Get API key
read -p "tsk_c4deb614022bcc480b0e8292b8aa7c5d56f0d5280b1cd4fc8f43612a04c367ee35c3a640: " apikey
echo ""

# Get sender ID
read -p "Enter sender ID (max 11 chars, default: SENDORA): " senderid
senderid=${senderid:-SENDORA}
echo ""

# Update .env file
echo "Updating .env file..."

# Check if .env exists
if [ -f .env ]; then
  # Remove existing AfricasTalking config
  sed -i '/AFRICASTALKING_/d' .env
fi

# Append new config
cat >> .env << EOF

# ============ AFRICASTALKING CONFIGURATION ============
AFRICASTALKING_USERNAME=$username
AFRICASTALKING_API_KEY=$apikey
AFRICASTALKING_FROM=$senderid
AFRICASTALKING_ENABLED=true
AFRICASTALKING_PRIORITY=1
