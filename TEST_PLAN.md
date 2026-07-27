# Abse Test Plan

## 1. Unit tests

### Scoring

- Raw metric normalization
- Caps
- Diminishing returns
- Recency weighting
- Empty-repository filtering
- Language aggregation
- Forge Point total
- Trait eligibility
- Calculation versioning

### Architect validation

- Valid allocation
- Excess allocation rejection
- Negative value rejection
- Unowned ability rejection
- Ineligible trait rejection
- Stale build-version rejection

### Combat

- Damage calculation
- Defence
- Energy cost
- Cooldown
- Status effects
- Deterministic randomness
- Initiative
- Boss phase transition
- Death
- Completion

### Rewards

- Correct reward calculation
- Duplicate reward prevention
- Failed run behavior
- Influence issuance

## 2. Integration tests

- Abse login to GitHub connection
- GitHub callback to stored connection
- GitHub sync to immutable snapshot
- Snapshot to ScoreCalculation
- ScoreCalculation to Architect
- Architect to dungeon run
- Turn submission to CombatTurn
- Run completion to RewardLedger
- Reward to InfluenceLedger
- Challenge link to accepted challenge

## 3. Authorization tests

- Access own profile
- Reject access to another private snapshot
- Reject mutation of another Architect
- Reject action on another run
- Reject direct territory ownership update
- Reject direct reward creation
- Confirm public card exposes safe fields only

## 4. Idempotency tests

- Duplicate combat action
- Duplicate run completion
- Duplicate reward issuance
- Duplicate influence commitment
- Duplicate challenge acceptance

## 5. Failure tests

- GitHub rate limit
- GitHub expired token
- GitHub partial response
- Network timeout
- Base44 function retry
- Interrupted synchronization
- Scheduled territory job retry

## 6. UI tests

- Mobile navigation
- Attribute allocation on small screens
- Keyboard combat
- Loading states
- Empty states
- Error states
- Reduced motion
- Long GitHub username
- Missing avatar
- Slow network
- No horizontal overflow at 360 px

## 7. End-to-end release path

A clean test account must be able to:

1. Sign in.
2. Connect GitHub.
3. Complete synchronization.
4. Review calculation.
5. Save build.
6. Start Dependency Depths.
7. Complete all rooms.
8. Receive rewards.
9. Commit influence.
10. Create challenge.
11. Open share card from a logged-out browser.
