# Deploying to Coolify

Steps to deploy a project from this boilerplate to Coolify.

## 1. Sanity datasets

Make sure the project has both datasets (the `setup` script does this):

```sh
npx sanity dataset create development --visibility public
npx sanity dataset create production --visibility public
```

## 2. Coolify application

1. **New Resource → Application → Public/Private Repository (with GitHub App)**
2. Repository: select the repo. Branch: `main`.
3. Build Pack: **Dockerfile**.
4. Network → Domain (FQDN): your domain. Port: `4321`.
5. Health Check → Path: `/api/health`.
6. **General → Auto Deploy: ON.**
7. Environment Variables — add the values from your `.env`, **and tick "Build Variable"** on these (needed at `npm run build`):
   - `PUBLIC_SANITY_PROJECT_ID`
   - `PUBLIC_SANITY_DATASET` (= `production`)
   - `PUBLIC_SANITY_STUDIO_ROUTE`
   - `PUBLIC_SANITY_VISUAL_EDITING_ENABLED`
   - `SANITY_API_READ_TOKEN`
   - `SITE_URL` — **must** be the full deployed URL (e.g. `https://example.com`). Read by `astro.config.mjs` at build time and used as Astro's `site`. If missing, `robots.txt` and `sitemap-index.xml` will reference `https://localhost:4321`. After changing it, **trigger a fresh deploy** (a restart won't rebuild).
8. Deploy.

## 3. Development environment (separate Coolify application)

Run a second Coolify application that tracks the `develop` branch so feature work is continuously deployed to a staging URL before it reaches production.

1. **New Resource → Application → Public/Private Repository (with GitHub App)** — point at the same repo as production.
2. Repository: same repo. Branch: **`develop`**.
3. Build Pack: **Dockerfile**.
4. Network → Domain (FQDN): a separate subdomain (e.g. `https://develop.<your-domain>`). Port: `4321`.
5. Health Check → Path: `/api/health`.
6. **General → Auto Deploy: ON.**
7. (Optional but recommended) **Add HTTP Basic Auth** at the Traefik/proxy level so the develop site isn't publicly indexed by search engines and can't be discovered before launch. In Coolify this is usually configured via custom Traefik labels on the application.
8. Environment Variables — same set as production, but adjusted for staging:
   - `PUBLIC_SANITY_PROJECT_ID`
   - `PUBLIC_SANITY_DATASET` — set to `development` (so Studio editors can iterate on content separately from production)
   - `PUBLIC_SANITY_STUDIO_ROUTE`
   - `PUBLIC_SANITY_VISUAL_EDITING_ENABLED`
   - `SANITY_API_READ_TOKEN` — a token scoped to the development dataset
   - `SITE_URL` — the develop FQDN (e.g. `https://develop.<your-domain>`)
   - All marked as **Build Variable** (same reason as production).
9. **Add the develop FQDN as a CORS origin in Sanity:**
   - Go to your Sanity project → **API → CORS origins → Add origin**
   - Origin: `https://develop.<your-domain>`
   - Allow credentials: **on** (needed for Visual Editing / draft mode auth)
10. Deploy.

### Preview deployments (per-PR)

Once the develop application is set up, enable Coolify's **Preview Deployments** so each pull request opened against `develop` gets its own ephemeral environment:

1. On the develop application → **Preview Deployments** → enable, and set a preview URL template (e.g. `https://pr-{{pr_id}}.develop.<your-domain>`). This requires a wildcard DNS `A` record `*.develop.<your-domain>` pointing at the server.
2. Ensure the GitHub App has `Pull Requests: Read and write` permission and is subscribed to the `Pull requests` event — this enables Coolify's automatic PR comments with the deploy status and preview link.
3. **Important:** Coolify scopes environment variables. Production env vars are NOT exposed to PR previews by default. Open **Preview Deployment Environment Variables** on the develop application and re-add at minimum the build-time vars (`PUBLIC_SANITY_PROJECT_ID`, `PUBLIC_SANITY_DATASET`, `PUBLIC_SANITY_STUDIO_ROUTE`, `PUBLIC_SANITY_VISUAL_EDITING_ENABLED`, and a value for `SITE_URL`). Without these the preview build will fail with errors like `Configuration must contain "projectId"`.
4. **Add a wildcard CORS origin in Sanity for the preview subdomains:**
   - Sanity project → **API → CORS origins → Add origin**
   - Origin: `https://*.develop.<your-domain>` (matches every per-PR preview URL generated from the `{{pr_id}}` template)
   - Allow credentials: **on**
   - Without this, preview deployments will hit CORS errors when they try to talk to Sanity from the browser (Studio embed, Visual Editing, draft-mode auth).

Reference: [Coolify — GitHub Preview Deploy](https://coolify.io/docs/applications/ci-cd/github/preview-deploy).

## Branching workflow

- **Never commit directly to `develop` or `main`.**
- For every change (feature, fix, chore), create a feature branch off `develop`:
  ```sh
  git checkout develop
  git pull
  git checkout -b feat/<short-description>   # or fix/, chore/, docs/, etc.
  ```
- Push the branch and open a PR into `develop`. Merge the PR (squash or merge commit is fine for feature → develop).
- `develop` is the integration branch; `main` is production. Only `develop` → `main` release PRs land on `main`.

## Releasing

- Work on feature branches → merge to `develop` → run `npm run release` to open the release PR from `develop` to `main`.
- **Always merge the release PR with "Create a merge commit"** — never "Squash and merge". Squashing rewrites SHAs and detaches `develop` from `main`, causing future release PRs to show conflicts.

If a release PR ever shows conflicts:

```sh
git checkout develop
git pull
git merge origin/main      # prefer develop's side when conflicting
git push
```
