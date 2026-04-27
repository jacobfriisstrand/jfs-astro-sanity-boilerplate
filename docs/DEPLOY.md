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
   - `SITE_URL`
8. Deploy.

## Releasing

- Work on `develop`, run `npm run release` to open the PR to `main`.
- **Always merge with "Create a merge commit"** — never "Squash and merge". Squashing rewrites SHAs and detaches `develop` from `main`, causing future release PRs to show conflicts.

If a release PR ever shows conflicts:

```sh
git checkout develop
git pull
git merge origin/main      # prefer develop's side when conflicting
git push
```
