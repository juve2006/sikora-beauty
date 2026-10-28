---
id: adr-20261028-media-on-vercel-blob
type: adr
status: accepted
date: 2026-10-28
domains:
  - catalog
paths:
  - src/payload.config.ts
  - src/env.ts
  - src/catalog/collections.ts
summary: Product photos go to a public Vercel Blob store, token required on Vercel, until the production host moves them to R2
reviewed_at: 2026-10-28
---
# Until the production host exists, uploaded photos live in a public Vercel Blob store

## Context

Products need photos from the first catalog task on. A Vercel function has no disk that outlives
the request, so Payload's default — files next to the application — loses every upload. The spec
puts media in Cloudflare R2 (adr-20261028-hetzner-coolify-hosting), but that host does not exist
yet: development runs on Vercel Hobby (adr-20261028-vercel-git-deploys), and R2 now means a
Cloudflare account, a bucket and access keys for a deployment that will move anyway. Source: task
`catalog-model`, the developer's approval of 2026-10-28.

## Decision

- The `media` collection is stored by `@payloadcms/storage-vercel-blob` in the public store
  `sikora-beauty-media` (fra1), connected to Production, Preview and Development; Vercel sets
  `BLOB_READ_WRITE_TOKEN` itself.
- `src/env.ts` requires the token whenever `VERCEL` is set. Without it the adapter turns itself off
  and uploads would go to a disk Vercel throws away; the build fails instead. Locally the token is
  optional, and photos go to `./media` (gitignored).
- `clientUploads: true`: the browser uploads straight to Blob, past the 4.5 MB body limit of a
  Vercel function. `alwaysInsertFields: true` keeps the schema identical with and without the
  token, so a migration made locally matches Vercel.
- No `sharp` and no `imageSizes`: `next/image` resizes on the storefront.
- This ends with the roadmap item `production host`: the files are copied to R2 and the adapter is
  swapped, together with the database move.

## Alternatives

- **Cloudflare R2 now** — the destination already, but an account, a bucket and keys before there
  is a server, and the S3 adapter's credentials to keep in step on every environment.
- **UploadThing** — an official Payload adapter, but another account and vendor whose free tier
  terms we have not checked, and a move at the production host all the same.
- **The local disk** — nothing to set up, but every upload is lost on Vercel.

## Consequences

- Every photo has a public URL, a draft's included. One uploaded in the admin sits under a random
  folder (`<store>.public.blob.vercel-storage.com/<uuid>/<file name>`) and cannot be guessed; one
  uploaded through the API keeps its plain file name. `media` is readable by anyone, so
  `/api/media` lists every photo; until launch Vercel Authentication hides that too. Product
  photos are not secret.
- Usage is bounded by what Vercel Hobby includes for Blob; at a few hundred products' photos
  that is not expected to bind.
- The move to R2 is one more step of `production host`: copy the files, rewrite the stored URLs,
  swap the adapter.
- A Preview shares the store with Production, as it shares the database.
