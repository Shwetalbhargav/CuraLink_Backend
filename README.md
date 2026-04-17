# CuraLink Backend

Minimal Node.js and Express backend prepared for deployment on Render.

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment file:

   ```bash
   copy .env.example .env
   ```

3. Start the server:

   ```bash
   npm run dev
   ```

## Environment variables

Core variables used by the backend:

- `PORT`
- `NODE_ENV`
- `API_PREFIX`
- `CLIENT_ORIGIN`
- `MONGODB_URI`
- `REQUEST_TIMEOUT_MS`
- `OPENALEX_BASE_URL`
- `OPENALEX_API_KEY`
- `OPENALEX_MAILTO`
- `PUBMED_BASE_URL`
- `PUBMED_API_KEY`
- `PUBMED_TOOL`
- `PUBMED_EMAIL`
- `CLINICAL_TRIALS_BASE_URL`
- `OLLAMA_BASE_URL`
- `OLLAMA_MODEL`
- `PYTHON_EXECUTABLE`
- `PYTHON_RENDER_TIMEOUT_MS`
- `PYTHON_RENDERER_SCRIPT`

Startup now validates these settings and reports warnings for optional-but-recommended fields such as `OPENALEX_MAILTO`, `PUBMED_EMAIL`, `MONGODB_URI`, and `OLLAMA_MODEL`.

## Available routes

- `GET /` returns a basic service message
- `GET /health` returns API health status

## Deploy on Render

1. Push this project to a Git repository.
2. Create a new Web Service on Render and connect the repository.
3. Render will detect `render.yaml` and use:
   - Build command: `npm install`
   - Start command: `npm start`

The service binds to the `PORT` environment variable provided by Render.
