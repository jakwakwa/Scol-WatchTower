 # GitHub Copilot Instructions for SCOL Watchtower

## Project Overview

SCOL Watchtower (StratCol Onboard AI) is a Zero-Middleware onboarding automation platform for managing applicant lifecycles, risk assessment, and contract workflows. The platform uses a modern event-driven architecture with direct ingestion from Google Forms to Next.js, eliminating Zapier dependencies.

## Tech Stack

### Core Technologies
- **Framework**: Next.js 15 (App Router, Turbo)
- **Language**: TypeScript (strict mode)
- **Runtime**: Node.js 20+ or Bun 1.0+ (Bun preferred)
- **Package Manager**: **Bun only** (do not use npm, yarn, or pnpm)

### Backend & Data
- **Database**: Turso (LibSQL)
- **ORM**: Drizzle ORM
- **Authentication**: Clerk
- **Background Jobs**: Inngest (event-driven workflows)

### Frontend & UI
- **Styling**: Tailwind CSS 4
- **Components**: Shadcn UI, Radix UI
- **Icons**: Remix Icons
- **State Management**: Zustand, TanStack React Query
- **Validation**: Zod
- **Charts**: Recharts

## Architecture Principles

### Event-Driven Design
- Direct webhook ingestion from Google Apps Script to `/api/webhooks/lead-capture`
- Inngest workflows orchestrate complex business logic
- Domain events like `onboarding/lead.created` and `contract/signed`
- No polling - use event-driven state management

### Zero-Middleware Philosophy
- Eliminate external dependencies for core logic
- Direct communication between capture sources and backend
- Centralized state management within Inngest workflows

## Code Style and Conventions

### General TypeScript Patterns
- Write concise, technical TypeScript code with accurate examples
- Use functional and declarative programming patterns; **avoid classes**
- Favor iteration and modularization over code duplication
- Use descriptive variable names with auxiliary verbs (e.g., `isLoading`, `hasError`)
- Implement early returns for error conditions
- Use guard clauses for preconditions and invalid states

### File Structure
- Structure files with: exported components, subcomponents, helpers, static content, types
- Use lowercase with dashes for directory names (e.g., `components/auth-wizard`)
- Place types in separate `.types.ts` files when appropriate

### Next.js Best Practices
- **Minimize** the use of `'use client'`, `useEffect`, and `setState`
- **Favor** React Server Components (RSC) and Next.js SSR features
- Implement dynamic imports for code splitting
- Use responsive design with mobile-first approach
- Optimize images: WebP format, size data, lazy loading

### Middleware Configuration
- For Next.js ≥16, use `proxy.ts` (not `middleware.ts`)
- Implement `clerkMiddleware()` in `proxy.ts` with proper matchers
- Skip Next.js internals and static files in middleware matcher

### Error Handling
- Prioritize error handling and edge cases
- Use early returns and guard clauses
- Implement custom error types for consistent error handling
- Wrap async operations in try/catch blocks

### State Management
- Use Zustand for global state
- Use TanStack React Query for data fetching
- Implement Zod schemas for runtime validation
- Avoid unnecessary client-side state

## Development Commands

### Package Management
**CRITICAL**: Always use Bun - never use npm, yarn, or pnpm

```bash
# Install dependencies
bun install

# Development server (with Turbo)
bun dev

# Build
bun run build

# Lint
bun run lint

# Database migrations
bun run db:generate
bun run db:migrate
bun run db:studio
```

### Testing
```bash
# E2E tests with Playwright
bun run test:e2e
bun run test:e2e:ui
bun run test:e2e:headed
bun run test:e2e:debug

# Reset test database
bun run test:db:reset
```

### Development Setup
```bash
# Start all services
./setup-dev.sh
```

## Testing Approach

- **E2E Testing**: Playwright for end-to-end tests
- Test files located in `/e2e` directory
- Focus on testing critical user flows and workflows
- Use test database for isolated testing

## Code Quality Tools

- **Linter**: Biome (configured in `biome.json`)
- Always run `bun run lint` before committing
- Follow existing formatting conventions

## API Patterns

### Route Handlers
- Use Route Handlers (`route.ts`) for API endpoints
- Handle different HTTP methods explicitly (GET, POST, etc.)
- Return proper HTTP status codes
- Implement proper error handling with try/catch

### Webhooks
- Webhook endpoints in `/api/webhooks/`
- Validate webhook signatures (Svix for Clerk webhooks)
- Trigger Inngest events from webhooks
- Return appropriate status codes quickly

## Database Patterns

### Drizzle ORM
- Define schemas in `/db/schema/` directory
- Use Drizzle's query API for type-safe queries
- Leverage Turso's LibSQL features
- Run migrations with `bun run db:migrate`

## Inngest Workflows

- Define functions in `/inngest/functions/`
- Use domain-specific event names
- Implement proper error handling and retries
- Keep workflows idempotent
- Use `step.run()` for individual steps
- Leverage `step.waitForEvent()` for event-driven flows

## UI/UX Guidelines

- Use Shadcn UI components as base
- Implement consistent design patterns
- Follow Tailwind CSS utility-first approach
- Ensure mobile responsiveness
- Use Remix Icons for consistent iconography
- Implement loading states and error boundaries

## Authentication (Clerk)

- Use Clerk components and hooks
- Implement proper middleware protection
- Use `auth()` helper in Server Components
- Use `useAuth()` hook in Client Components
- Handle authentication states properly

## Documentation

- Provide clear JSDoc comments for complex functions
- Document component props with TypeScript types
- Keep inline comments concise and meaningful
- Update README.md for architectural changes

## Security Best Practices

- Validate all user input with Zod schemas
- Implement proper authentication checks
- Use environment variables for secrets
- Never commit sensitive data
- Follow secure coding practices for data handling

## Performance Optimization

- Minimize client-side JavaScript
- Use Server Components by default
- Implement code splitting with dynamic imports
- Optimize images and assets
- Reduce load times and improve rendering efficiency

## Common Patterns

### Server Actions
```typescript
'use server'
import { auth } from '@clerk/nextjs/server'

export async function myServerAction() {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')
  // Implementation
}
```

### Form Handling
```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  // schema definition
})

const form = useForm({
  resolver: zodResolver(schema),
})
```

### Inngest Event Triggering
```typescript
import { inngest } from '@/inngest/client'

await inngest.send({
  name: 'onboarding/lead.created',
  data: { /* event data */ }
})
```

## What NOT to Do

❌ Do not use npm, yarn, or pnpm - only use Bun
❌ Do not use class-based components
❌ Do not overuse `'use client'` directive
❌ Do not use `middleware.ts` (use `proxy.ts` instead)
❌ Do not implement polling - use event-driven patterns
❌ Do not add Zapier dependencies
❌ Do not commit sensitive data or API keys
❌ Do not ignore TypeScript errors or use `any` type unnecessarily

## Key Files and Directories

- `/app` - Next.js app router pages and layouts
- `/components` - Reusable React components
- `/lib` - Utility functions and helpers
- `/db` - Database schemas and client configuration
- `/inngest` - Inngest functions and client
- `/api` - API routes and webhooks
- `/e2e` - End-to-end tests
- `proxy.ts` - Clerk middleware configuration
- `biome.json` - Linter configuration
- `drizzle.config.ts` - Database configuration
- `playwright.config.ts` - E2E test configuration

## Getting Help

- Review existing code patterns in similar components
- Check `/docs` directory for additional documentation
- Refer to `.agent/rules/` for detailed coding guidelines
- Consult official docs: Next.js, Clerk, Inngest, Drizzle, Turso