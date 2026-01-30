# Migration Reset Report

Date: 2026-01-29
Branch: clickup/Ai-Augmented-Client-Onboarding--CU-869bq46ep

## Overview
- Reset the database and migration history to resolve schema drift and failed migrations.
- Generated a new baseline migration from the current Drizzle schema and applied it.
- Verified the app build after the reset.

## Work Performed
- Dropped all existing tables in the Turso database (data was confirmed as non-essential).
- Cleared the old migration history and snapshots under `migrations/` and `migrations/meta/`.
- Generated a fresh baseline migration: `migrations/0000_ambiguous_wong.sql`.
- Applied migrations with `bun run db:migrate`.
- Verified with `bun run build` (success; existing `metadataBase` warning remains).

## Form Updates Included
The new baseline migration includes the latest form-related tables and constraints:
- `applicant_magiclink_forms`
  - `token_hash` unique index
  - FK to `applicants` and optional FK to `workflows`
  - Status and lifecycle timestamps (`sent_at`, `viewed_at`, `expires_at`, `submitted_at`)
- `applicant_submissions`
  - FK to `applicant_magiclink_forms`, `applicants`, and optional FK to `workflows`
  - Versioned submissions with `submitted_at`

These form tables are now part of the single baseline migration so new environments start with the correct schema.

## WARNING: Merging Old Migrations
If another branch still carries old migration files (e.g. `0001_thick_captain_stacy.sql`, `0002_adorable_king_bedlam.sql`, etc.) or old snapshots in `migrations/meta/`, do NOT merge them as-is. Doing so will reintroduce schema drift and likely break `db:migrate`.

Recommended merge approach for those branches:
- Drop any legacy migration files and legacy snapshots from the branch.
- Keep the new baseline migration and current `migrations/meta/_journal.json`.
- If the branch changes schema, generate a new migration on top of the baseline with `bun run db:generate`.

## Verification
- `bun run db:migrate` succeeded on a fresh database.
- `bun run build` succeeded (warning about `metadataBase` is unrelated).
