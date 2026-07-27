# Abse Technical Specification

## 1. Architecture

### Frontend

Responsibilities:

- Authentication UI
- GitHub connection flow
- Profile explanation
- Architect configuration
- Dungeon presentation
- Combat action submission
- Faction and territory presentation
- Leaderboards
- Share cards
- Responsive navigation

The frontend must not:

- Store GitHub tokens
- Calculate authoritative attributes
- Resolve combat
- Issue rewards
- Modify leaderboard records directly
- Modify territory ownership directly

### Backend

Use Base44 backend resources for:

- Authentication
- Entities
- Serverless backend functions
- Scheduled tasks
- Real-time subscriptions where useful
- Secret storage
- External GitHub API access
- Authorization

## 2. Modules

### Identity module

- Abse user account
- GitHub connection
- GitHub identity uniqueness
- Session and authorization checks

### GitHub ingestion module

- OAuth completion
- Profile fetching
- Repository fetching
- Language aggregation
- Pull-request aggregation
- Contribution/streak calculation
- Caching
- Sync-state management

### Scoring module

- Snapshot validation
- Normalization
- Forge Point calculation
- Affinity calculation
- Trait evaluation
- Versioned calculation output

### Architect module

- Attribute allocation
- Build validation
- Loadout management
- Derived combat statistics

### Dungeon module

- Run creation
- Seed generation
- Room generation
- Combat resolution
- Run completion
- Reward issuance

### Territory module

- Influence commitment
- Territory resolution
- Faction totals
- Seasonal state

### Challenge module

- Share codes
- Challenge creation
- Challenge acceptance
- Expiration
- Result comparison

### Leaderboard module

- Validated score ingestion
- Ranking
- Pagination
- Seasonal snapshots

### Audit module

- Sensitive action logs
- Reward logs
- Rating changes
- Calculation version
- Suspicious events

## 3. Required backend functions

- `connectGitHub`
- `completeGitHubOAuth`
- `syncGitHubProfile`
- `getGitHubSyncStatus`
- `calculateGitHubSnapshot`
- `calculateForgePoints`
- `evaluateRareTraits`
- `generateArchitect`
- `saveArchitectBuild`
- `getArchitect`
- `startDungeonRun`
- `submitCombatAction`
- `getDungeonRun`
- `completeDungeonRun`
- `awardDungeonRewards`
- `commitTerritoryInfluence`
- `resolveTerritories`
- `createChallenge`
- `acceptChallenge`
- `getChallenge`
- `generateShareCard`
- `refreshLeaderboards`
- `flagSuspiciousActivity`

## 4. GitHub OAuth

Use a per-user OAuth flow.

Requirements:

- Generate and validate OAuth state.
- Use PKCE where supported.
- Store token server-side only.
- Encrypt sensitive credentials through supported secret storage.
- Request the minimum scopes required.
- Allow disconnection.
- Revoke or discard credentials upon disconnection where supported.
- Never expose access tokens in logs or API responses.

Do not assume GitHub is available as the primary Base44 login provider. Treat GitHub as a separately connected external identity unless verified otherwise in the current Base44 project.

## 5. GitHub synchronization

### Sync sequence

1. Validate authenticated user.
2. Confirm GitHub connection.
3. Acquire a per-user sync lock.
4. Check rate limits and cooldown.
5. Fetch profile data.
6. Fetch repository and language data.
7. Fetch supported contribution and pull-request data.
8. Normalize source records.
9. Save an immutable GitHub snapshot.
10. Run versioned score calculation.
11. Evaluate traits.
12. Update current Architect eligibility.
13. Release lock.
14. Return safe summary.

### Failure rules

- Never delete the last successful snapshot because of a failed sync.
- Save sync status and error category.
- Retry only safe transient errors.
- Surface permission problems clearly.
- Respect GitHub rate limits.

## 6. Calculation versioning

Every calculation output must include:

- `calculationVersion`
- `snapshotId`
- `formulaConfigId`
- `calculatedAt`
- `inputHash`

Do not silently change existing competitive profiles.

When formulas change:

- New snapshots use the new version.
- Existing profiles are marked eligible for recalculation.
- Seasonal migration behavior must be explicit.

## 7. Dungeon determinism

Each run receives:

- Immutable seed
- Dungeon version
- Enemy version
- Build snapshot
- Calculation version

Each turn derives deterministic random values from:

- Run seed
- Turn number
- Action index

Submitting the same valid action twice must not issue duplicate effects.

Use an idempotency key per turn submission.

## 8. Realtime usage

Use real-time subscriptions for:

- Challenge acceptance state
- Territory influence display
- Faction activity
- Raid health
- Live leaderboard refresh where appropriate

Do not require real-time infrastructure for the core single-player dungeon.

## 9. Scheduled jobs

- GitHub refresh queue processing
- Territory resolution
- Daily faction summaries
- Leaderboard snapshot generation
- Expired challenge cleanup
- Suspicious-activity aggregation
- Season transitions

## 10. Error model

Use stable error codes:

- AUTH_REQUIRED
- GITHUB_NOT_CONNECTED
- GITHUB_PERMISSION_REQUIRED
- GITHUB_RATE_LIMITED
- SYNC_IN_PROGRESS
- SNAPSHOT_NOT_FOUND
- INVALID_BUILD
- RUN_NOT_ACTIVE
- INVALID_ACTION
- TURN_ALREADY_RESOLVED
- REWARD_ALREADY_ISSUED
- INSUFFICIENT_INFLUENCE
- CHALLENGE_EXPIRED
- FORBIDDEN
- INTERNAL_ERROR

Frontend messages must be user-friendly and must not expose stack traces.

## 11. Observability

Log:

- Function name
- Request correlation ID
- Authenticated user ID
- Result category
- Duration
- External API status category
- Calculation version
- Run ID where applicable

Never log:

- OAuth access tokens
- Authorization headers
- Full GitHub API payloads containing unnecessary personal data
- Secret values
