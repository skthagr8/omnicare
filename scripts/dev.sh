#!/bin/bash
set -e

# Start development environment
echo "Starting OmniCare development environment..."

# Start all services
docker-compose up -d

# Wait for database
echo "Waiting for database..."
sleep 5

# Run migrations
echo "Running migrations..."
docker-compose exec backend alembic upgrade head

# Follow logs
echo "Following logs..."
docker-compose logs -f backend
