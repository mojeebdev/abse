# Abse API Contracts

These are logical contracts. Adapt syntax to Base44 backend functions.

## POST /github/connect

Response:

```json
{
  "authorizationUrl": "string",
  "stateExpiresAt": "ISO-8601"
}
```

## POST /github/sync

Request:

```json
{
  "forceRefresh": false
}
```

Response:

```json
{
  "jobId": "string",
  "status": "queued"
}
```

## GET /github/sync-status

Response:

```json
{
  "status": "idle|queued|running|completed|failed",
  "lastSuccessfulSyncAt": "ISO-8601|null",
  "errorCode": "string|null"
}
```

## GET /profile/calculation

Response:

```json
{
  "snapshotId": "string",
  "calculationVersion": "string",
  "totalForgePoints": 100,
  "potentials": {
    "force": 20,
    "guard": 20,
    "momentum": 25,
    "precision": 18,
    "insight": 17
  },
  "affinities": {
    "primary": "typescript",
    "secondary": ["python"]
  },
  "traits": [],
  "explanation": [],
  "calculatedAt": "ISO-8601"
}
```

## PUT /architect/build

Request:

```json
{
  "force": 20,
  "guard": 20,
  "momentum": 25,
  "precision": 18,
  "insight": 17,
  "activeAbilityIds": ["ability_1", "ability_2", "ability_3"],
  "passiveTraitIds": ["trait_1", "trait_2"],
  "artifactId": "artifact_1",
  "buildVersion": 3
}
```

Response:

```json
{
  "architectId": "string",
  "buildVersion": 4,
  "derivedStats": {}
}
```

## POST /dungeons/:dungeonId/runs

Request:

```json
{
  "architectBuildVersion": 4
}
```

Response:

```json
{
  "runId": "string",
  "status": "active",
  "room": {},
  "combatState": {}
}
```

## POST /dungeon-runs/:runId/actions

Headers:

`Idempotency-Key: unique-client-generated-value`

Request:

```json
{
  "turnNumber": 3,
  "action": {
    "type": "attack|defend|recover|ability|artifact",
    "abilityId": "optional",
    "artifactId": "optional",
    "targetId": "optional"
  }
}
```

Response:

```json
{
  "turnNumber": 3,
  "combatLog": [],
  "state": {},
  "runStatus": "active|completed|failed"
}
```

## POST /territories/:territoryId/influence

Headers:

`Idempotency-Key: unique-client-generated-value`

Request:

```json
{
  "amount": 25,
  "actionType": "attack|defend",
  "sourceDungeonRunId": "string"
}
```

Response:

```json
{
  "territoryId": "string",
  "remainingInfluence": 0,
  "territoryStateVersion": 8
}
```

## POST /challenges

Request:

```json
{
  "challengeType": "dungeon_score"
}
```

Response:

```json
{
  "challengeId": "string",
  "shareCode": "string",
  "shareUrl": "string",
  "expiresAt": "ISO-8601"
}
```

## POST /challenges/:shareCode/accept

Response:

```json
{
  "challengeId": "string",
  "status": "accepted"
}
```

## Error response

```json
{
  "error": {
    "code": "INVALID_BUILD",
    "message": "Your allocated attributes exceed your available Forge Points.",
    "correlationId": "string"
  }
}
```
