# Astro + Sanity Boilerplate

Starter template for building content-driven websites with [Astro](https://astro.build) and [Sanity](https://www.sanity.io). Includes visual editing, component builder, Mux video support, and automated tooling.

## Setup

Run the setup script to configure your project:

```sh
npm install
npm run setup
```

The script will:

1. **Create a Sanity project** via the CLI (or prompt for manual entry)
2. **Create `production` and `development` datasets**
3. **Generate an API read token** for visual editing
4. **Add CORS origin** for `localhost:4321`
5. **Prompt for the studio route** (defaults to `/studio`)
6. **Optionally configure Mux** video credentials
7. **Write your `.env` file**

### Manual Setup

If you prefer to set things up manually, copy `.env.example` to `.env` and fill in the values:

```sh
cp .env.example .env
```

| Variable                               | Description                                         |
| :------------------------------------- | :-------------------------------------------------- |
| `PUBLIC_SANITY_PROJECT_ID`             | Your Sanity project ID                              |
| `PUBLIC_SANITY_DATASET`                | Dataset name (`development` or `production`)        |
| `SANITY_API_READ_TOKEN`                | API token with viewer role for visual editing       |
| `PUBLIC_SANITY_VISUAL_EDITING_ENABLED` | Enable visual editing overlays (`true`/`false`)     |
| `PUBLIC_SANITY_STUDIO_ROUTE`           | Path where Sanity Studio is served (e.g. `/studio`) |
| `SITE_URL`                             | Public site URL — used by `robots.txt`, `sitemap-index.xml`, and Open Graph. Must be set as a **build variable** in production (e.g. `https://example.com`). Falls back to `https://localhost:4321` if missing. |
| `MUX_TOKEN_ID`                         | _(Optional)_ Mux API token ID                       |
| `MUX_TOKEN_SECRET`                     | _(Optional)_ Mux API token secret                   |

## Commands

| Command                          | Action                                     |
| :------------------------------- | :----------------------------------------- |
| `npm run dev`                    | Start local dev server at `localhost:4321` |
| `npm run build`                  | Build production site to `./dist/`         |
| `npm run setup`                  | Interactive project setup (creates `.env`) |
| `npm run create:page-type`       | Scaffold a new page type                   |
| `npm run create:component`       | Scaffold a new component                   |
| `npm run delete:page-type`       | Remove a page type                         |
| `npm run delete:component`       | Remove a component                         |
| `npm run manage:page-components` | Add/remove components from page types      |
| `npm run typegen`                | Regenerate Sanity TypeScript types         |

## Deployment

See [docs/DEPLOY.md](docs/DEPLOY.md) for the Coolify deployment steps.
