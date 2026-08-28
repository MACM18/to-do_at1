#!/bin/sh
set -e

echo "Starting Daily Task & Team Tracker container..."

# Run database schema push
echo "Syncing database schema with PostgreSQL..."
npx prisma db push --skip-generate

# Seed default data if database is empty
echo "Checking initial seed data..."
npm run seed || true

echo "Starting Next.js application on port $PORT..."
exec "$@"
