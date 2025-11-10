#!/bin/bash
# Helper script to generate initial Alembic migration
# Usage: ./generate_migration.sh

export DATABASE_URL="${DATABASE_URL:-postgresql://localhost/themis}"

alembic revision --autogenerate -m "Initial migration"

