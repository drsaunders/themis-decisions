# Themis Backend

FastAPI backend for blind polling system.

## Setup

```bash
pip install -U pip
pip install .
```

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `PORT`: Server port (default: 10000)
- `ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins

## Run Migrations

```bash
alembic upgrade head
```

## Run Server

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

## Health Check

```bash
curl http://localhost:10000/healthz
```

