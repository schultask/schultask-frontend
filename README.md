# schultask-frontend

Next.js UI for Schultask (corporate L&D platform). Deployed as a container — see [schultask-deployment](https://github.com/abdulaziz-bd/schultask-deployment) for the full stack this runs alongside, or [schultask-backend](https://github.com/abdulaziz-bd/schultask-backend) for the API it talks to.

## Prerequisites

- Node.js 22+
- npm
- A running `schultask-backend` instance to point at

## Local development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the env file and point it at your backend:
   ```bash
   cp .env.example .env.local
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000

## Building the container image

```bash
docker build --build-arg NEXT_PUBLIC_API_URL=https://api.yourdomain.com \
  -t ghcr.io/abdulaziz-bd/schultask-frontend:latest .
```

`NEXT_PUBLIC_API_URL` is inlined into the client bundle at build time (Next.js `output: "standalone"`), so it must be set at build time, not just as a container runtime env var. Pushed automatically to GHCR by `.github/workflows/docker-publish.yml` on every push to `main` — set the `NEXT_PUBLIC_API_URL` repository variable once under **Settings → Secrets and variables → Actions → Variables** before the first run.
