# Abse Implementation Plan

Build vertically. Do not create every entity and screen before one full journey works.

## Phase 0 — Repository and environment

- Inspect existing codebase.
- Identify framework, routing, state management, styling, and Base44 configuration.
- Create `.env.example`.
- Confirm development and production environments.
- Add formatting, linting, and type checking.
- Add central error handling.
- Add feature flags for incomplete modules.

Verification:

- App runs locally.
- Production build succeeds.
- No secrets are committed.
- Existing behavior remains intact.

## Phase 1 — Foundation

- Implement Base44 authentication.
- Create core entities.
- Add authorization rules.
- Create profile shell and onboarding state.
- Add mobile-responsive application layout.

Verification:

- User can sign in.
- Private profile data is inaccessible to another user.
- Mobile layout has no horizontal overflow.

## Phase 2 — GitHub connection and ingestion

- Implement per-user GitHub OAuth.
- Store credentials server-side.
- Implement synchronization job.
- Save immutable GitHubSnapshot.
- Add sync status UI.
- Add failure and rate-limit states.

Verification:

- Token does not appear in browser payloads.
- Failed sync preserves last good snapshot.
- Duplicate sync lock works.

## Phase 3 — Scoring and explanation

- Implement versioned formulas.
- Normalize metrics.
- Calculate Forge Points.
- Calculate affinities.
- Evaluate rare traits.
- Build explanation UI.

Verification:

- Same snapshot and version produce same result.
- User can see where every point came from.
- Empty repositories do not create meaningful power.

## Phase 4 — Architect builder

- Implement attribute allocation.
- Implement abilities, passives, and artifacts.
- Validate server-side.
- Add build summary and derived statistics.

Verification:

- Impossible allocation is rejected.
- Stale build update is rejected.
- Mobile allocation controls work.

## Phase 5 — Dungeon vertical slice

- Create Dependency Depths definition.
- Implement run creation.
- Implement deterministic combat.
- Implement five rooms.
- Implement boss.
- Persist each turn.
- Add completion and failure.

Verification:

- Duplicate action resolves once.
- Reloading resumes run.
- Client cannot submit damage or rewards.
- Full dungeon can be completed.

## Phase 6 — Rewards and progression

- Add experience.
- Add artifacts.
- Add RewardLedger.
- Add influence.
- Add first-run progression.

Verification:

- Reward issuance is idempotent.
- Failed run receives only intended rewards.
- Influence cannot be forged.

## Phase 7 — Factions and territories

- Add faction selection.
- Create six territories.
- Implement influence commitment.
- Add scheduled resolution.
- Add real-time territory presentation where useful.

Verification:

- User cannot commit excess influence.
- Scheduled job is deterministic.
- Direct territory mutation is forbidden.

## Phase 8 — Sharing and challenges

- Generate Architect card.
- Create challenge link.
- Add public safe profile.
- Accept challenge.
- Add asynchronous score comparison.

Verification:

- Public page reveals no private GitHub data.
- Expired challenge cannot be accepted.
- Challenge links work while logged out.

## Phase 9 — Leaderboards and analytics

- Add seasonal leaderboard.
- Add pagination.
- Add analytics events.
- Add audit views for administrators.

Verification:

- Only validated records affect rank.
- Pagination is stable.
- Sensitive data is excluded from analytics.

## Phase 10 — Hardening

- Run test suite.
- Perform authorization review.
- Perform mobile review.
- Add empty/loading/error states.
- Add observability.
- Validate production configuration.
- Remove dead code and mock data.
- Update README and deployment notes.

## Build priority

P0:

- Authentication
- GitHub connection
- Snapshot
- Scoring
- Architect builder
- One complete dungeon
- Rewards
- Share card

P1:

- Factions
- Territory influence
- Challenge
- Leaderboard

P2:

- Realtime enhancements
- Additional traits
- Additional artifacts
- Expanded analytics

## Non-negotiable engineering rules

- Never edit the database schema destructively without explaining the change first.
- Never delete user data automatically.
- Never place GitHub credentials in client code.
- Never trust client-calculated game state.
- Never skip verification after a phase.
- Never replace working code with placeholders.
- Never mark a phase complete while type checks or tests fail.
