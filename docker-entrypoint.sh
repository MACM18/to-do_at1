#!/bin/sh
set -e

echo "Starting Daily Task & Team Tracker container..."

# Check database provider
if echo "$DATABASE_URL" | grep -qE '^postgres(ql)?://'; then
  echo "PostgreSQL database detected. Using PostgreSQL Prisma schema..."
  cp prisma/schema.postgresql.prisma prisma/schema.prisma
  npx prisma generate
fi

echo "Syncing database schema..."
npx prisma db push --skip-generate

echo "Starting Next.js application on port $PORT..."
exec "$@"
