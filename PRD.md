# Abse Product Requirements Document

## 1. Product overview

Abse is a strategy game that transforms a developer's GitHub history into a playable combat profile.

A player's commits, repositories, contribution consistency, pull requests, account age, and programming languages determine the resources and traits available to them. Players then allocate those resources into a strategic character build, enter dungeons, defeat software-themed enemies, earn influence, and support a programming-language faction in a shared territorial conflict.

### Product statement

**Your GitHub history becomes your power. Your strategy decides what you conquer.**

## 2. Problem

Developer-profile products commonly stop at analytics, ranking, or decorative scorecards. They tell users what their GitHub activity looks like, but do not turn that information into an interactive experience.

Existing profile rankings also over-reward popularity, raw commit volume, account age, or follower count. They rarely reward consistency, collaboration, maintenance, or strategic choice.

Abse turns developer history into a game while avoiding a simple popularity leaderboard.

## 3. Target users

### Primary users

- Developers active on GitHub
- Open-source contributors
- Solo builders
- Hackathon participants
- Developer-content creators
- Programming-language communities

### Secondary users

- New developers who want a playful progress system
- Technical communities looking for competitions
- Repository maintainers who want shareable engagement tools

## 4. User value

A user should be able to:

- Discover what makes their GitHub history distinctive
- Understand exactly how GitHub activity affects their profile
- Build a strategic character rather than receive a fixed score
- Play a complete game session immediately
- Earn rare traits based on unusual developer behavior
- Represent a programming-language faction
- Share a profile and challenge another developer
- Return for progression, seasons, faction conflict, and new dungeons

## 5. Product principles

### Explainability

Every score, trait, bonus, and penalty must have a visible explanation.

### Strategy over popularity

GitHub data provides resources and unlocks. It must not automatically decide the winner.

### Rare behavior over raw volume

Unusual consistency, long-term maintenance, collaboration, releases, and recovery should unlock distinctive mechanics.

### Server authority

The client must never calculate authoritative combat results, rewards, ratings, GitHub scores, or territory outcomes.

### Production foundation

The first release must be built as a maintainable foundation, not a disposable hackathon prototype.

## 6. Core user journey

1. User opens Abse.
2. User creates or signs into an Abse account.
3. User connects GitHub.
4. Abse imports supported GitHub data.
5. Abse displays a transparent data summary.
6. Abse calculates Forge Points, language affinities, and eligible rare traits.
7. User allocates attributes.
8. User selects abilities, passives, and an artifact.
9. User enters the Dependency Depths dungeon.
10. User makes turn-based combat decisions.
11. Backend resolves each turn.
12. User completes or fails the run.
13. User receives rewards and influence.
14. User commits influence to a faction territory.
15. User receives a shareable Architect card and challenge link.

## 7. Core functional requirements

### Authentication

- Users can create and access an Abse account.
- User sessions must be securely managed.
- GitHub connection must be separate from the primary Abse account.
- Each GitHub identity may be connected to only one active Abse account unless an administrator resolves the conflict.

### GitHub synchronization

The system must collect supported data required for:

- Account age
- Public repositories
- Contribution activity
- Active-day streaks
- Weekly and monthly consistency
- Programming-language distribution
- Pull requests
- Merged pull requests
- Contributions to repositories not owned by the user
- Releases and tags where available
- Repository maintenance signals

The frontend must never receive a GitHub access token.

### Explainable profile calculation

The user must see:

- Raw metrics used
- Normalized metric values
- Applied caps
- Diminishing-return calculations
- Forge Point total
- Trait eligibility evidence
- Primary and secondary language affinities
- Calculation version and last-sync time

### Architect configuration

The player allocates Forge Points across:

- Force
- Guard
- Momentum
- Precision
- Insight

Rules:

- Allocated points cannot exceed the verified total.
- Every build change must be validated server-side.
- Reallocation may be free before the first run.
- Later reallocation rules must be configurable.

### Dungeon gameplay

The first dungeon is **The Dependency Depths**.

It contains:

1. The Unmaintained Gate
2. Chamber of Conflicting Versions
3. The Deprecated Guardian
4. Cache of Forgotten Packages
5. The Dependency Phantom

The player selects:

- Three active abilities
- Two passive traits
- One artifact
- One primary affinity

Each combat turn supports:

- Attack
- Defend
- Recover
- Use ability
- Use artifact where permitted

### Rewards

A completed run may award:

- Experience
- Seasonal rating
- Faction influence
- Artifacts
- Cosmetic profile elements
- Achievement progress

Rewards must be issued only by backend functions.

### Factions and territories

Initial factions are based on broad language affinities.

Initial map scope:

- Six territories
- One owner per territory
- Attack influence
- Defence influence
- Scheduled resolution
- Seasonal reset or partial reset

### Challenges

A player can generate a shareable challenge link.

The challenged player may:

- Connect GitHub
- Build an Architect
- Accept the challenge
- Play an asynchronous comparison battle or competitive dungeon score challenge

Direct real-time PvP is not required for the first release.

### Leaderboards

Support:

- Global dungeon score
- Seasonal rating
- Faction contribution
- Rare-trait showcase
- Streak category

Leaderboards must be generated from validated backend records.

## 8. Non-functional requirements

### Security

- No secrets in frontend code
- Server-side token storage
- Rate-limited GitHub synchronization
- Server-authoritative combat
- Immutable combat seeds after run creation
- Audit records for rewards and ranking changes
- Entity-level authorization
- Input validation for every backend function

### Reliability

- GitHub API failure must not corrupt existing snapshots.
- Profile calculations must be reproducible from a saved snapshot and calculation version.
- Combat turns must be idempotent.
- Reward issuance must be idempotent.
- Territory resolution must be deterministic for a given state version.

### Performance

Targets for the first release:

- Core app initial load under 3 seconds on a typical broadband connection
- Cached profile load under 1 second
- Combat action response under 700 ms where infrastructure permits
- Leaderboard pagination rather than full-table loading
- GitHub synchronization performed asynchronously where supported

### Accessibility

- Keyboard-accessible combat controls
- Visible focus states
- Sufficient contrast
- Reduced-motion support
- Text alternatives for icons
- Do not communicate faction or rarity using color alone

### Responsive design

Must support:

- Mobile widths from 360 px
- Tablet
- Desktop
- No horizontal overflow
- Touch targets of at least 44 px
- Mobile navigation using a drawer or compact menu
- Combat actions usable with one hand on mobile

## 9. Analytics events

Track:

- account_created
- github_connect_started
- github_connect_completed
- github_sync_completed
- github_sync_failed
- architect_generated
- build_saved
- dungeon_started
- combat_action_submitted
- dungeon_completed
- dungeon_failed
- trait_unlocked
- influence_committed
- share_card_created
- challenge_created
- challenge_accepted

Do not send secrets or sensitive GitHub data to analytics.

## 10. Success metrics

### Activation

- Percentage of signed-in users who connect GitHub
- Percentage of connected users who finish Architect setup
- Percentage of configured users who start a dungeon
- Percentage who complete their first dungeon

### Engagement

- Average dungeon runs per active user
- Return rate after profile generation
- Share-card generation rate
- Challenge acceptance rate
- Faction influence participation

### Quality

- GitHub synchronization failure rate
- Combat idempotency failures
- Duplicate reward incidents
- Unauthorized access attempts
- Client-visible calculation mismatches

## 11. First-release exclusions

- Open-world movement
- Synchronous live PvP
- Guild chat
- Trading marketplace
- NFT or blockchain features
- User-generated dungeons
- Native mobile apps
- AI-controlled game balancing
- Voice features
- Complex crafting
- More than one fully polished dungeon
- More than six territories

## 12. Acceptance criteria

The release is acceptable when a new user can connect GitHub, understand their calculated profile, configure an Architect, complete a server-authoritative dungeon run, receive validated rewards, commit influence, and share a challenge without administrator intervention.
