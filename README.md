# Abse — Codex Build Pack

Abse is a GitHub-powered strategy dungeon crawler with a lightweight territory-conquest layer.

## Read order

1. `PRD.md`
2. `GAME_DESIGN.md`
3. `TECHNICAL_SPEC.md`
4. `DATABASE_SCHEMA.md`
5. `API_CONTRACTS.md`
6. `SECURITY.md`
7. `TEST_PLAN.md`
8. `IMPLEMENTATION_PLAN.md`
9. `CODEX_MASTER_PROMPT.md`

## Product principle

GitHub history determines the player's available resources, affinities, and rare traits.

The player determines the build, tactics, and outcome.

## First production vertical slice

The first release must support:

- Base44 account authentication
- Per-user GitHub connection
- GitHub profile synchronization
- Explainable power calculation
- Attribute allocation
- One complete dungeon
- Server-authoritative combat
- Rare traits
- Rewards and progression
- Factions
- Lightweight territory influence
- Leaderboard
- Shareable Architect profile
- Challenge links
- Audit logs and abuse protection

Do not build optional roadmap features before this loop is complete.

## Local development

Requirements:

- Node.js 20.19 or newer
- A Base44 Backend project for live authentication, entities, and functions
- A Base44 app-user GitHub connector (Builder plan or higher)

Commands:

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
```

Copy `.env.example` to `.env.local` and provide the public Base44 app and
connector identifiers. Development fixtures are used only by the local preview
when no Base44 app is configured; production builds do not receive GitHub
credentials or authoritative game state from those fixtures.

## Base44 setup

The repository contains additive entity definitions, least-privilege rules,
backend functions, authentication configuration, and an idempotent Phase 0–5
definition and world seeds under `base44/`.

```bash
npx base44 login
npx base44 link --create --name "abse" --description "GitHub-powered strategy dungeon crawler"
npx base44 types generate
npm run build
npx base44 entities push
npx base44 functions deploy
npx base44 auth push
npx base44 site deploy
```

The published Abse workspace already includes its starter definitions, factions,
and territories. For a fresh workspace, seed these records from a protected
Base44-hosted function; `base44 exec` intentionally runs with the current
user's permissions and cannot bypass admin-only entity rules.

Phase 6–10 adds append-only reward and influence ledgers, faction selection,
six territories, deterministic territory resolution, safe public challenges,
stable seasonal leaderboard projections, analytics hooks, and administrator
audit reads. `resolveTerritories` and `refreshLeaderboards` require an
authenticated Base44 administrator. Do not expose either as an anonymous
scheduled endpoint; enable automation only after the environment provides a
documented authenticated scheduler identity.

Schema pushes require an explicit review because they persist entity access
rules. The Phase 6–10 change is additive: it creates `RewardLedger`, `Faction`,
`Territory`, `InfluenceLedger`, `Challenge`, `LeaderboardEntry`, and
`SuspiciousActivityFlag`. It does not rename persisted fields, remove entities,
change existing entity rules, or migrate user records.

Set `GITHUB_CONNECTOR_ID` as a Base44 runtime value for backend functions and
the matching identifier as `VITE_BASE44_GITHUB_CONNECTOR_ID` for the frontend.
Base44 owns OAuth state validation and encrypted per-user token storage through
the app-user connector. GitHub access tokens are retrieved only inside backend
functions.

### First-time GitHub app-user connector setup

Abse must use an app-user connector so every player authorizes their own GitHub
account. Do not use the shared GitHub integration under an individual app's
Integrations page.

1. Deploy the frontend once to obtain its Base44 live URL.
2. In GitHub, create an OAuth App under **Settings → Developer settings →
   OAuth Apps**.
3. Use the Base44 live URL as the homepage URL.
4. Use `https://YOUR-LIVE-DOMAIN/api/external-auth/callback` as the
   authorization callback URL.
5. In Base44 Workspace Settings, open **Connectors → Connectors For App Users
   → Add Connector → GitHub**.
6. Enter the GitHub OAuth App client ID and client secret. Start with
   `read:user`; add `repo` only if private repository history is required and
   the broader permission is acceptable.
7. Copy the resulting Base44 connector ID. The ID is not the GitHub client
   secret.
8. Add the ID locally:

   ```dotenv
   VITE_BASE44_GITHUB_CONNECTOR_ID=your_connector_id
   ```

9. Configure the same ID for backend functions:

   ```bash
   npx base44 secrets set GITHUB_CONNECTOR_ID=your_connector_id
   ```

10. Rebuild and redeploy the frontend and functions.

The live player flow is Base44 sign-in → Connect personal GitHub → GitHub
authorization → Sync verified history → Forge report.

Do not use `base44 deploy` against an existing environment until its remote
entities and connectors have been inspected. That command fully synchronizes
entities and connectors, so absent remote resources may become inaccessible.
