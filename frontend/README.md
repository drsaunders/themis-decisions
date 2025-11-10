# Themis Frontend

React + Vite frontend for the Themis blind poll system.

## Setup

```bash
npm install
```

## Environment Variables

Create a `.env` file:

```
VITE_API_URL=http://localhost:10000
VITE_WS_URL=ws://localhost:10000
```

For production (Render), set these to your backend URL:
- `VITE_API_URL`: Backend API URL (e.g., `https://themis-backend.onrender.com`)
- `VITE_WS_URL`: Backend WebSocket URL (e.g., `wss://themis-backend.onrender.com`)

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

The built files will be in the `dist/` directory.

