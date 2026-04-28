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
