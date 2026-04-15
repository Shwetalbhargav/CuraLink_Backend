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
