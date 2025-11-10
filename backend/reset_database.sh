#!/bin/bash
# Script to reset the database from scratch

# Get database URL from environment or use default
DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/themis}"

# Extract database name from URL
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

# Extract connection info (without database name)
BASE_URL=$(echo $DATABASE_URL | sed 's/\/[^\/]*$/\/postgres/')

echo "Dropping database: $DB_NAME"
psql "$BASE_URL" -c "DROP DATABASE IF EXISTS $DB_NAME;"

echo "Creating database: $DB_NAME"
psql "$BASE_URL" -c "CREATE DATABASE $DB_NAME;"

echo "Running migrations..."
cd "$(dirname "$0")"
alembic upgrade head

echo "Database reset complete!"

