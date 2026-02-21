# Abstract Realms - College Event Web App

## Stack
- Next.js 14 (App Router, static export)
- Cloudflare Pages + Functions (Workers)
- Cloudflare D1 (SQLite database)
- Cloudinary (image uploads)

## Local Development

### Prerequisites
- Node.js 18+
- npm 9+
- Wrangler CLI (`npm i -g wrangler`)

### Setup
```bash
npm install
```

### Run Next.js dev server (frontend only)
```bash
npm run dev
```

### Build static site
```bash
npm run build
```

### Run full stack locally (frontend + API)
```bash
npm run build
npm run pages:dev
```
This serves the `/out` directory and wires up `/functions/api/*` as Workers endpoints with D1.

### Deploy to Cloudflare Pages
```bash
npm run pages:deploy
```

## Environment Variables
Set these in Cloudflare Pages dashboard or in `.dev.vars` for local dev:

| Variable | Description |
|---|---|
| `ADMIN_PASSWORD` | Password for admin dashboard |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_UPLOAD_PRESET` | Cloudinary unsigned upload preset |

## D1 Database Setup
```bash
wrangler d1 create abstract-realms-db
wrangler d1 execute abstract-realms-db --file=./schema.sql
```
