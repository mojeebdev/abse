# Master Prompt for Codex — Build Abse

You are acting as a principal product engineer, backend architect, game-systems designer, security engineer, and senior product designer.

Your task is to build **Abse**, a production-minded GitHub-powered strategy dungeon crawler with a lightweight territory-conquest layer.

Read these files in order before editing code:

1. `README.md`
2. `PRD.md`
3. `GAME_DESIGN.md`
4. `TECHNICAL_SPEC.md`
5. `DATABASE_SCHEMA.md`
6. `API_CONTRACTS.md`
7. `SECURITY.md`
8. `TEST_PLAN.md`
9. `IMPLEMENTATION_PLAN.md`

## Core product rule

GitHub history determines a player's available resources, affinities, and rare traits.

The player determines the build, tactics, and outcome.

Do not reduce Abse to a GitHub score dashboard.

## First action

Inspect the complete repository before making changes.

Report:

- Current stack
- Existing routes
- Existing components
- Existing Base44 configuration
- Current authentication
- Current data entities
- Existing integrations
- Styling system
- Test setup
- Build commands
- Risks and conflicts with the specification

Then create a sequenced implementation checklist based on `IMPLEMENTATION_PLAN.md`.

## Database safety rule

The database is the heartbeat of this product.

Do not perform a destructive schema change, delete an entity, rename a persisted field, migrate user data, or modify access rules without first explaining:

- What will change
- Why it is required
- What data is at risk
- Whether the change is reversible
- The migration or rollback plan

Non-destructive additions may proceed when clearly documented.

## Execution style

- Work in vertical slices.
- Complete one end-to-end user journey before broad expansion.
- Preserve existing working behavior.
- Prefer strict typing.
- Reuse existing project conventions.
- Avoid unnecessary dependencies.
- Do not generate placeholder-only architecture.
- Do not fake GitHub data in production paths.
- Use mocks only in explicit development fixtures or tests.
- Keep server-authoritative logic on the backend.
- Add loading, empty, success, and error states.
- Ensure mobile responsiveness from 360 px upward.
- Maintain accessibility.
- Add tests alongside critical backend logic.
- Run formatting, linting, type checking, tests, and production build after each major phase.

## Base44 expectations

Use Base44's strongest applicable backend capabilities:

- Authentication
- Entities
- Backend functions
- Scheduled tasks
- Secure secrets
- Real-time subscriptions where they improve the experience
- External API calls
- Authorization rules

Do not assume GitHub is available as Base44 primary authentication.

Implement GitHub as a separate per-user OAuth connection unless the current project proves a secure native per-user connector already exists.

## Security requirements

- GitHub tokens remain server-side.
- Never expose tokens in client responses.
- Never log tokens.
- Validate OAuth state.
- Use minimum scopes.
- Rate-limit synchronization.
- Apply per-entity authorization.
- Resolve combat on the backend.
- Use immutable run seeds.
- Use idempotency keys for combat, rewards, and influence.
- Preserve audit logs.
- Prevent direct client mutation of rewards, rankings, snapshots, and territory ownership.

## UI direction

The visual system should feel like dark technical mythology, not a generic AI-generated dashboard.

Use:

- Near-black surfaces
- Off-white typography
- Restrained faction accents
- Monospace utility labels
- Contribution-grid and repository-tree motifs
- Strong spacing and hierarchy
- Purposeful motion
- Accessible contrast
- Responsive mobile navigation

Avoid:

- Generic purple AI gradients
- Excessive glow
- Glassmorphism everywhere
- Fantasy stock artwork
- Crowded dashboard cards
- Decorative animations without function

## Required first-release journey

A user must be able to:

1. Sign in.
2. Connect GitHub.
3. Synchronize supported GitHub data.
4. Understand the calculation.
5. Allocate Forge Points.
6. Select abilities and traits.
7. Enter The Dependency Depths.
8. Complete server-authoritative turns.
9. Defeat or lose to the boss.
10. Receive validated rewards.
11. Commit faction influence.
12. Generate a shareable Architect card.
13. Create a challenge link.
14. Appear in a validated leaderboard.

## Scope discipline

Do not build these before the core journey works:

- Live synchronous PvP
- Open-world movement
- Guild chat
- Marketplace
- NFTs
- Native mobile apps
- User-generated dungeons
- Complex crafting
- Multiple large dungeons

## Verification protocol

At the end of each phase, report:

- Files changed
- Data changes
- Security impact
- Tests added
- Commands run
- Results
- Remaining risks
- Next phase

Do not say a feature is complete without verifying it.

## Start now

Begin with repository inspection only.

Do not make code changes until you have summarized the current system and produced the implementation checklist.
