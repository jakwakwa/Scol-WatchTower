---
title: "feat: Migrate from Turso (SQLite) to PostgreSQL with Drizzle ORM"
type: refactor
status: active
date: 2026-03-14
---

# feat: Migrate from Turso (SQLite) to PostgreSQL with Drizzle ORM

## Overview

The project currently uses Turso (libSQL/SQLite) as the primary database with Drizzle ORM. Moving to PostgreSQL is required because it handles typing, connections, and migrations in a fundamentally different (and stricter) manner than SQLite. SQLite is highly permissive with data types, but PostgreSQL is strictly typed. A connection pool must also be set up, and migrations must be completely reset.

## Problem Statement / Motivation

SQL dialects between Turso (SQLite) and PostgreSQL differ. To transition smoothly:
- The whole Drizzle schema needs to switch from `drizzle-orm/sqlite-core` to `drizzle-orm/pg-core`.
- The `getDatabaseClient` initialization script needs a Postgres `Pool` instance to avoid exhaustion.
- The local development environment must be updated with `docker-compose.yml` and `.env` to spawn a PostgreSQL container locally.

## Proposed Solution

- **Docker & Env Setup**: Create a local `docker-compose.yml` to spin up PostgreSQL 16. Update `.env` and `.env.test` to replace `TURSO_*` variables with `DATABASE_URL` and `TEST_DATABASE_URL` standard postgres strings.
- **Dependencies**: Remove `@libsql/client`, `@tursodatabase/api`. Add `pg` and `@types/pg`.
- **Drizzle Config**: Reconfigure both `drizzle.config.ts` and `drizzle.test.config.ts` to `postgresql` dialect, using connection strings instead of `authToken`.
- **Database Client**: Refactor `app/utils.ts` and `scripts/reset-db.ts` to instantiate a `pg` `Pool`.
- **Schema**: Globally find and replace `drizzle-orm/sqlite-core` with `drizzle-orm/pg-core` in `db/schema.ts`. Convert `integer` primary keys to `serial`, and transform SQLite simulated timestamps and booleans to native `timestamp` and `boolean`.
- **Migrations Reset**: `rm -rf migrations/`. Generate `.sql` using `bun run db:generate` to produce `0000_initial.sql` in the PostgreSQL dialect, followed by `bun run db:migrate`.

## Technical Approach

### Phase 1: Local Docker Setup & Dependencies
- Tasks:
  - Add `docker-compose.yml` with `POSTGRES_USER=postgres`, `POSTGRES_DB=controltower`.
  - Update `.env` / `.env.test` locally.
  - Swap `bun` dependencies (`@libsql/client` out, `pg` in).

### Phase 2: Schema and Connection Refactor
- Tasks:
  - Change `drizzle.config.ts` dialect.
  - Replace `sqliteTable` with `pgTable`.
  - Instantiate `Pool` in `app/utils.ts`.

### Phase 3: Migration Generation
- Tasks:
  - Delete old `./migrations` folder.
  - Apply `bun run db:generate` and `bun run db:migrate`.

## Acceptance Criteria

- [ ] A `docker-compose.yml` exists to easily provision database infrastructure.
- [ ] Drizzle configuration correctly uses PostgreSQL credentials and `dialect: "postgresql"`.
- [ ] Environment references `DATABASE_URL` and `TEST_DATABASE_URL` strings instead of Turso tokens.
- [ ] `bun run build` and `bun run lint` successfully pass with no type mismatched DB queries.
- [ ] `bun run test:e2e` passes against the PostgreSQL test database natively injected.

## Dependencies & Risks
- **Total Data Loss in Local DB**: SQLite development databases will be flushed outright as old migrations are destroyed. Test databases will be rebuilt via the `0000_initial.sql` reset. 

## References & Research
- Current schema definitions: `db/schema.ts`
- Current config file: `drizzle.config.ts`
- Affected module: `app/utils.ts`
