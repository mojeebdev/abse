# Abse Database Schema

Use Base44 entities or equivalent collections. Apply least-privilege access rules.

## UserProfile

- id
- userId
- githubLogin
- githubUserId
- githubAvatarUrl
- onboardingStatus
- factionId
- currentSeasonId
- displayName
- createdAt
- updatedAt

Constraints:

- `userId` unique
- `githubUserId` unique when present

## GitHubConnection

- id
- userId
- provider
- connectionStatus
- encryptedCredentialReference
- grantedScopes
- connectedAt
- disconnectedAt
- lastValidatedAt

Access:

- Backend only for credential-related fields

## GitHubSyncJob

- id
- userId
- status
- requestedAt
- startedAt
- completedAt
- errorCode
- rateLimitResetAt
- lockExpiresAt
- correlationId

## GitHubSnapshot

- id
- userId
- capturedAt
- accountCreatedAt
- accountAgeDays
- publicRepoCount
- meaningfulRepoCount
- totalVerifiedCommits
- recentVerifiedCommits
- currentStreakDays
- longestStreakDays
- activeWeeksLastYear
- consistencyScoreInput
- pullRequestsOpened
- pullRequestsMerged
- externalPullRequestsMerged
- releasesCount
- maintainedRepoCount
- languageDistribution
- rawMetricSummary
- sourceVersion
- snapshotHash
- isCurrent

Snapshots are immutable.

## ScoreCalculation

- id
- userId
- snapshotId
- calculationVersion
- formulaConfigId
- forcePotential
- guardPotential
- momentumPotential
- precisionPotential
- insightPotential
- totalForgePoints
- primaryAffinity
- secondaryAffinities
- normalizedMetrics
- appliedCaps
- explanation
- inputHash
- calculatedAt

## TraitDefinition

- id
- key
- name
- description
- rarity
- criteriaVersion
- combatEffectConfig
- enabled

## PlayerTrait

- id
- userId
- traitDefinitionId
- snapshotId
- evidence
- unlockedAt
- active

## Architect

- id
- userId
- scoreCalculationId
- level
- experience
- powerBand
- force
- guard
- momentum
- precision
- insight
- primaryAffinity
- secondaryAffinities
- activeAbilityIds
- passiveTraitIds
- artifactId
- buildVersion
- updatedAt

Constraint:

`force + guard + momentum + precision + insight <= totalForgePoints`

## AbilityDefinition

- id
- key
- name
- affinity
- energyCost
- cooldownTurns
- targetingType
- effectConfig
- enabled
- version

## ArtifactDefinition

- id
- key
- name
- rarity
- effectConfig
- enabled
- version

## PlayerArtifact

- id
- userId
- artifactDefinitionId
- quantity
- acquiredAt
- sourceType
- sourceId

## DungeonDefinition

- id
- key
- name
- version
- roomConfig
- rewardConfig
- enabled

## DungeonRun

- id
- userId
- dungeonDefinitionId
- dungeonVersion
- seed
- status
- currentRoomIndex
- currentTurn
- health
- maxHealth
- energy
- guardMeter
- momentumChain
- statusEffects
- buildSnapshot
- calculationVersion
- rewardStatus
- startedAt
- completedAt
- lastActionAt

## CombatTurn

- id
- dungeonRunId
- turnNumber
- idempotencyKey
- playerAction
- enemyAction
- randomValues
- stateBeforeHash
- stateAfter
- stateAfterHash
- combatLog
- resolvedAt

Constraint:

- `(dungeonRunId, turnNumber)` unique
- `(dungeonRunId, idempotencyKey)` unique

## RewardLedger

- id
- userId
- sourceType
- sourceId
- rewardType
- amount
- metadata
- idempotencyKey
- issuedAt

Constraint:

- `idempotencyKey` unique

## Faction

- id
- key
- name
- primaryAffinity
- totalInfluence
- currentSeasonId
- createdAt

## Territory

- id
- key
- name
- ownerFactionId
- attackInfluenceByFaction
- defenceInfluence
- activeModifier
- stateVersion
- currentSeasonId
- resolvesAt
- updatedAt

## InfluenceLedger

- id
- userId
- factionId
- territoryId
- dungeonRunId
- amount
- actionType
- idempotencyKey
- committedAt

## Challenge

- id
- challengerUserId
- challengedUserId
- shareCode
- challengeType
- challengerSnapshot
- status
- expiresAt
- acceptedAt
- completedAt
- result

Constraint:

- `shareCode` unique

## LeaderboardEntry

- id
- userId
- seasonId
- category
- score
- rank
- sourceVersion
- updatedAt

## AuditLog

- id
- userId
- action
- entityType
- entityId
- correlationId
- metadata
- createdAt

## SuspiciousActivityFlag

- id
- userId
- category
- severity
- evidence
- status
- createdAt
- reviewedAt
