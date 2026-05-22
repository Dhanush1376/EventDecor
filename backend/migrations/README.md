# Database migrations

Schema changes are not applied automatically on deploy. Use [migrate-mongo](https://github.com/seppevs/migrate-mongo) for versioned migrations.

## Setup (one-time)

```bash
cd backend
npm install --save-dev migrate-mongo
npx migrate-mongo init
```

Configure `migrate-mongo-config.js` with your `MONGO_URI` (never commit production URIs).

## Workflow

1. Create: `npx migrate-mongo create add-index-example`
2. Edit the new file under `migrations/`
3. Run locally: `npx migrate-mongo up`
4. Run on staging before production
5. Roll back if needed: `npx migrate-mongo down`

## Atlas alternative

For Atlas-only teams, use **Atlas UI → Online Archive / Triggers** or **Atlas CLI** for index builds, and document each change in this folder.
