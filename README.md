# Themis - Tiny Blind Poll

A minimal blind polling system built with FastAPI (Python 3.11) and React (Vite). Users can create polls, add options, rate them 0-10 (or veto), and when everyone is ready, the system reveals a single winner using harmonic mean scoring.

## Features

- **Blind Polling**: No names or partial results shown during voting
- **Real-time Updates**: WebSocket-based live updates for participant counts and options
- **Harmonic Mean Scoring**: Fair winner selection with tie-breakers
- **Simple UX**: Four screens - Name, Home, Poll, Result

## Project Structure

```
themis/
├── backend/          # FastAPI backend
│   ├── app/         # Application code
│   ├── alembic/     # Database migrations
│   └── pyproject.toml
├── frontend/        # React + Vite frontend
│   ├── src/
│   └── package.json
└── render.yaml      # Render.com deployment config
```

## Local Development

### Backend

```bash
cd backend

# Install dependencies
pip install -U pip
pip install .

# Set environment variables
export DATABASE_URL="postgresql://user:pass@localhost/themis"
export PORT=10000
export ALLOWED_ORIGINS="http://localhost:5173"

# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

To run a local database:
```
docker run --name themis-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=themis -p 5432:5432 -d postgres:14
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/themis"
cd backend
mkdir alembic/versions
./generate_migration.sh
alembic upgrade head
```   

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Set environment variables (create .env file)
echo "VITE_API_URL=http://localhost:10000" > .env
echo "VITE_WS_URL=ws://localhost:10000" >> .env

# Start dev server
npm run dev
```

## Deployment to Render

1. Push this repository to GitHub
2. Connect the repository to Render
3. Render will detect `render.yaml` and create services:
   - PostgreSQL database
   - Backend web service
   - Frontend static site

4. After first deploy:
   - Set `ALLOWED_ORIGINS` in backend to include frontend URL
   - Set `VITE_API_URL` and `VITE_WS_URL` in frontend to backend URL
   - Redeploy both services

## API Endpoints

- `POST /users` - Create user
- `GET /polls` - List polls
- `POST /polls` - Create poll
- `POST /polls/{pollId}/join` - Join poll
- `GET /polls/{pollId}/options` - List options
- `POST /polls/{pollId}/options` - Add option
- `PUT /polls/{pollId}/vote` - Submit votes
- `POST /polls/{pollId}/ready` - Mark ready
- `GET /polls/{pollId}/status` - Get status
- `POST /polls/{pollId}/reveal` - Reveal winner
- `WS /ws/polls/{pollId}` - WebSocket for real-time updates

## Scoring Algorithm

The winner is determined using harmonic mean of ratings:
1. For each option, collect non-veto ratings
2. Exclude users who vetoed that option
3. Compute harmonic mean: `n / sum(1/rating)`
4. Tie-breakers (in order):
   - Lower variance (more consistent)
   - Higher median
   - More raters
   - Seeded random (using poll ID)

## License

See LICENSE file.
