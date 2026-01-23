# Turso Per User Starter

A Next.js application that demonstrates how to use the [Turso](https://turso.tech) Platform's API to create a database per user.

![Watch Tower](/app/opengraph-image.png)


## Latest Changes

We have successfully transitioned the onboarding system from a Zapier-dependent architecture to a "Zero-Middleware" model. This shift eliminates external dependencies for core logic, improves reliability, and centralises state management within the Inngest workflow.

Key achievements include:

- **Decommissioning Zapier**: All external webhook routes have been removed.
- **Direct Lead Capture**: Google Forms now POST directly to our Next.js API (`/api/webhooks/lead-capture`) using Google Apps Script.
- **Deterministic Verification**: Replaced probabilistic AI voting with a strict, hierarchical veto system (`mock_blacklist.json`).
- **Simplified "Signing"**: Implemented a mock contract signing flow using a second direct webhook (`/api/webhooks/contract-signed`).
- **Event-Driven Architecture**: Renamed `onboarding/started` to `onboarding/lead.created` to better reflect the domain event.

## System Architecture Mindmap
