# Deploy — development on Vercel + Neon

How the development deployment is built and how to rebuild it from nothing. No secret is written
here: each one is created once, stored in the password manager, then pasted where it is used.

Production moves to Hetzner + Coolify behind Cloudflare before launch (roadmap item
`production host`); Vercel's Hobby plan is for non-commercial use only.

## What runs where

| Piece | Where | Notes |
|---|---|---|
| Application | Vercel project, Hobby plan, functions in `fra1` | `vercel.json` turns Git deploys off |
| Database | Neon Free, Frankfurt, through the Vercel Marketplace | 0.5 GB, scales to zero |
| Deploy | `.github/workflows/deploy.yml` on push to `master` | CI first, then `vercel deploy --prod` |
| Migrations | `npm run vercel-build` on Vercel | `payload migrate` over the direct connection, then `next build` |
| Access | Vercel Authentication, scope All Deployments | only the account owner gets in |

## Secrets and settings

| Name | Kind | Lives in |
|---|---|---|
| `DATABASE_URL` | Neon pooled connection | Vercel env (set by the Neon integration) |
| `DATABASE_URL_UNPOOLED` | Neon direct connection | Vercel env (set by the Neon integration) |
| `PAYLOAD_SECRET` | 32+ random characters | Vercel env, Production |
| `VERCEL_TOKEN` | Vercel access token | GitHub → Settings → Secrets → Actions |
| `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | ids, not secret | GitHub → Settings → Variables → Actions |

## Build it from nothing

1. **Vercel account.** Sign up at vercel.com with GitHub, Hobby plan.
2. **Project.** In the repository: `npx vercel@64.0.2 link` → create a new project named
   `sikora-beauty`. It writes `.vercel/project.json` (git-ignored) with `orgId` and `projectId`.
3. **Database.** Vercel → the project → Storage → Create Database → Neon (Free), region
   Frankfurt (`aws-eu-central-1`), connected to the Production environment. Check that the
   project's environment variables now include `DATABASE_URL` and `DATABASE_URL_UNPOOLED`.
4. **Payload secret.** `openssl rand -hex 32` → password manager → Vercel → Settings →
   Environment Variables → `PAYLOAD_SECRET`, Production only, Sensitive.
5. **Protection.** Vercel → Settings → Deployment Protection → Vercel Authentication on, scope
   **All Deployments**.
6. **Token.** Vercel → Account Settings → Tokens → create one for GitHub Actions, scoped to your
   account, with an expiry → password manager.
7. **GitHub.** Repository → Settings → Secrets and variables → Actions: secret `VERCEL_TOKEN`;
   variables `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` from `.vercel/project.json`.
8. **First deploy.** Re-run the latest `Deploy` workflow on `master` (or push). It turns green
   when Vercel finished the build; the production URL is in the job log.
9. **First admin.** Open the production URL signed in to Vercel → `/admin` → create the first
   user with a password from the password manager. From then on `/admin` shows the login page.

## Check it

- Without signing in, the production URL, `/admin` and `/api/users` do not reach the
  application (Vercel's login page instead).
- Signed in: `/` is Ukrainian, `/en` English, `/admin` the Ukrainian Payload login.

## Take it down

Delete the Vercel project, the Neon database (Neon console), the Vercel token, and the GitHub
secret and variables.
