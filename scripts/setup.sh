#!/bin/bash
set -e

echo "=== OmniCare Setup ==="
echo "This script will set up the OmniCare development environment."

# Check prerequisites
echo ""
echo "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo ""
    echo "Creating .env file..."
    cp .env.example .env
    echo "✅ Created .env file. Please update with your settings."
    echo "   Especially: SECRET_KEY, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN"
fi
