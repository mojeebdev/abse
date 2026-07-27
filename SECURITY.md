# Abse Security Requirements

## 1. Trust boundaries

Treat all frontend input as untrusted.

Authoritative backend responsibilities:

- GitHub token use
- Profile scoring
- Trait evaluation
- Build validation
- Combat resolution
- Reward issuance
- Influence commitment
- Territory resolution
- Leaderboard updates

## 2. OAuth security

- Use state validation.
- Use PKCE where supported.
- Request minimum GitHub scopes.
- Keep tokens server-side.
- Never include tokens in frontend responses.
- Never log tokens.
- Provide disconnect and credential invalidation behavior.
- Bind a GitHub identity to one Abse account.

## 3. Authorization

Every entity read or mutation must verify ownership or public visibility.

Examples:

- A user may read their private snapshot.
- A user may not read another player's token or raw private data.
- Public profile cards expose only approved fields.
- Only backend jobs may update territory ownership.
- Only backend reward functions may create reward-ledger entries.

## 4. Input validation

Validate:

- Attribute totals
- Ability ownership
- Trait eligibility
- Artifact ownership
- Run ownership
- Turn number
- Idempotency key
- Challenge status
- Influence ownership
- Territory availability

## 5. Anti-cheat

- Server-generated dungeon seeds
- Immutable build snapshot for each run
- Server-derived enemy actions
- Unique turn records
- Idempotent reward issuance
- Audit logs
- Rate limits
- Suspicious synchronization detection
- No client-supplied damage values
- No client-supplied reward values

## 6. GitHub abuse protection

- Cap high-frequency commit effects.
- Down-weight empty repositories.
- Down-weight self-generated activity without meaningful repository signals.
- Distinguish forks from original repositories.
- Apply diminishing returns.
- Store evidence used for traits.
- Use cooldowns on profile refresh.
- Detect rapid GitHub identity switching.

## 7. Privacy

- Collect only data needed for gameplay.
- Explain imported GitHub data.
- Do not expose private repository names publicly without explicit permission.
- Support account deletion.
- Support GitHub disconnection.
- Remove or anonymize data according to product policy.
- Keep public profile fields configurable.

## 8. Rate limiting

Apply per-user and per-IP limits to:

- OAuth initiation
- GitHub synchronization
- Combat actions
- Challenge creation
- Share-card generation
- Leaderboard requests

## 9. Secrets

Store:

- GitHub client secret
- Signing secrets
- Internal service keys

Only in Base44-supported secure secret storage.

## 10. Security acceptance tests

- User cannot alter Forge Points from client.
- User cannot submit a combat action for another player's run.
- Duplicate action does not resolve twice.
- Duplicate reward request does not issue twice.
- GitHub token never appears in browser network payloads.
- User cannot allocate unowned ability or trait.
- User cannot commit more influence than earned.
- Territory owner cannot be changed through a public entity update.
