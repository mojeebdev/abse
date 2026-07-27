# Abse Game Design Document

## 1. Core fantasy

The software world has fractured into language-aligned territories. Developers enter as Architects whose capabilities are forged from real GitHub history.

The world is affected by software-born corruption:

- Technical debt
- Broken builds
- Dependency decay
- Merge conflicts
- Abandoned repositories
- Infinite loops
- Scope creep

Players explore corrupted systems, defeat enemies, collect artifacts, and contribute influence to their faction.

## 2. Core loop

Connect GitHub → receive verified resources → configure build → enter dungeon → make combat decisions → earn rewards → commit influence → improve build → challenge others.

## 3. Attribute system

### Force

Controls base damage and offensive scaling.

GitHub signals:

- Meaningful commits
- Recent development activity
- Releases

### Guard

Controls health, damage reduction, and resilience.

GitHub signals:

- Maintained repositories
- Repository longevity
- Issue resolution
- Sustained project ownership

### Momentum

Controls initiative, energy regeneration, and combo tempo.

GitHub signals:

- Active-day streak
- Recent consistency
- Contribution frequency

### Precision

Controls critical chance, counter quality, and action reliability.

GitHub signals:

- Merged pull requests
- Code-review activity
- Repeated successful collaboration

### Insight

Controls ability power, enemy information, and affinity flexibility.

GitHub signals:

- Language diversity
- Meaningful repositories
- Cross-project activity
- Documentation or release signals where measurable

## 4. Forge Point calculation principles

- Do not convert raw metrics linearly.
- Apply logarithmic or square-root normalization.
- Use per-metric caps.
- Use recency weighting.
- Prevent empty-repository farming.
- Prevent same-day commit spam from dominating.
- Preserve calculation evidence.
- Version every formula.

Suggested normalized metric formula:

`normalized = min(cap, log(1 + verified_value) / log(1 + reference_value))`

The exact constants must remain configurable.

## 5. Languages and affinities

Languages affect tactical identity, not universal superiority.

Suggested initial affinities:

- JavaScript — Adaptability
- TypeScript — Precision
- Python — Insight
- Rust — Guard
- Go — Momentum
- Java — Endurance
- C/C++ — Force
- Solidity — Volatility
- Shell — Utility
- HTML/CSS — Construction

Each affinity should provide:

- One passive modifier
- Two unlockable active abilities
- One faction identity
- One weakness or tradeoff

## 6. Rare traits

Traits are unlocked through verified patterns.

### The One-Year Flame

Evidence: exceptional active-day streak.

Effect: consecutive successful turns increase Momentum until interrupted.

### Ancient Maintainer

Evidence: an old repository with recent maintenance.

Effect: gain temporary Guard after surviving a high-damage attack.

### Polyglot Architect

Evidence: meaningful activity across multiple language ecosystems.

Effect: change active affinity once per dungeon.

### Merge Sovereign

Evidence: many merged pull requests in repositories owned by others.

Effect: successful counters trigger a follow-up strike.

### Open-Source Warden

Evidence: sustained maintenance with external contributors.

Effect: summoned or support effects gain increased durability.

### Shipwright

Evidence: repeated tagged releases across maintained repositories.

Effect: begin each run with a temporary crafted artifact.

### Phoenix Committer

Evidence: return to sustained contribution after extended inactivity.

Effect: survive one fatal hit per expedition with partial health.

Rare traits should change playstyle. They must not merely add large static power.

## 7. Combat model

Combat is turn-based and server authoritative.

### Player resources

- Health
- Energy
- Guard meter
- Momentum chain
- Status effects
- Ability cooldowns

### Standard actions

- Attack
- Defend
- Recover
- Ability
- Artifact

### Resolution order

1. Validate run and turn state.
2. Validate requested action.
3. Load immutable run seed.
4. Derive deterministic turn randomness.
5. Determine initiative.
6. Apply status effects.
7. Resolve player action.
8. Resolve enemy action.
9. Apply end-of-turn effects.
10. Persist the full resulting state.
11. Return a presentation-safe combat summary.

### Strategy requirements

- Enemies must telegraph selected attacks.
- Defending must be useful against predictable damage.
- Recovery must carry opportunity cost.
- Abilities must have cooldowns or energy costs.
- Affinity matchups must affect decisions without creating automatic wins.

## 8. First dungeon

# The Dependency Depths

## Room 1 — The Unmaintained Gate

Purpose: Tutorial encounter.

Teaches:

- Attack
- Defend
- Energy
- Enemy telegraphing

## Room 2 — Chamber of Conflicting Versions

Purpose: Tactical event.

The player chooses between:

- Stabilize dependencies and lose time
- Force compatibility and accept a debuff
- Inspect the environment using Insight

## Room 3 — The Deprecated Guardian

Purpose: Elite combat.

Mechanic:

- Gains power when the player repeats the same action.
- Encourages varied strategy.

## Room 4 — Cache of Forgotten Packages

Purpose: Risk and reward.

The player chooses:

- Safe recovery
- Random artifact
- High-risk corrupted package

## Room 5 — The Dependency Phantom

Purpose: Boss.

Mechanics:

- Changes affinity phases
- Applies version-conflict stacks
- Punishes uncontrolled Momentum
- Requires timing, defence, and resource management

## 9. Territory layer

The first release uses a lightweight map with six territories.

Each territory stores:

- Owner faction
- Attack influence
- Defence influence
- Resolution time
- State version
- Active modifier

Players earn influence from validated dungeon results.

They choose to:

- Attack a territory
- Defend an owned territory
- Empower a regional raid objective

Resolution happens on a scheduled cadence.

## 10. Progression

Progression may unlock:

- New abilities
- Build slots
- Artifacts
- Cosmetics
- Profile frames
- Titles
- Challenge modifiers

Progression must not invalidate GitHub-based identity.

Paid systems must not provide competitive power.

## 11. Virality

### Architect card

Contains:

- GitHub avatar
- Architect class
- Primary affinity
- Power band
- Rarest trait
- Attribute distribution
- Faction
- Challenge URL

### Challenge loop

1. User shares card.
2. Viewer opens challenge.
3. Viewer connects GitHub.
4. Viewer builds Architect.
5. Viewer accepts challenge.
6. Both receive a result or comparison.
7. Viewer shares their own card.

## 12. Anti-abuse design

- Empty repositories have negligible weight.
- Suspicious high-frequency commits are capped.
- Forked repositories do not count as original creation by default.
- Private metrics must be handled only with explicit permission.
- Snapshot refreshes are rate-limited.
- Trait evidence is stored.
- Competitive power recalculation is versioned.
