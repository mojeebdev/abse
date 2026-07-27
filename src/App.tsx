import {
  Activity,
  ArrowRight,
  Braces,
  Check,
  ChevronRight,
  CircleGauge,
  Code2,
  Github,
  HeartPulse,
  LockKeyhole,
  Map,
  Menu,
  Share2,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  BuildValidationError,
  type ArchitectBuild,
  validateArchitectBuild,
} from "./domain/architect";
import { createDungeonRun, resolveCombatTurn, ROOMS } from "./domain/dungeon";
import { calculateForgeProfile } from "./domain/scoring";
import { ATTRIBUTES, type Attribute, type CombatAction, type CombatState } from "./domain/types";
import {
  developmentInventory,
  developmentFactions,
  developmentLeaderboard,
  developmentMetrics,
  developmentTerritories,
  initialDevelopmentBuild,
} from "./fixtures/development";
import {
  connectGitHub,
  currentUser,
  hasBase44Project,
  hasGitHubConnector,
  invokeAbseFunction,
  redirectToAbseLogin,
  trackAbseEvent,
} from "./services/base44";

type View = "threshold" | "github" | "profile" | "builder" | "dungeon" | "progression" | "world" | "share" | "leaderboard";

function getViewFromPath(pathname: string): View {
  switch (pathname) {
    case "/github-link":
      return "github";
    case "/github-forge":
      return "profile";
    case "/architect":
      return "builder";
    case "/depths":
      return "dungeon";
    case "/progression":
      return "progression";
    case "/faction-map":
      return "world";
    case "/challenge":
      return "share";
    case "/rankings":
      return "leaderboard";
    case "/login":
    default:
      return "threshold";
  }
}

function getPathForView(view: View): string {
  switch (view) {
    case "github":
      return "/github-link";
    case "profile":
      return "/github-forge";
    case "builder":
      return "/architect";
    case "dungeon":
      return "/depths";
    case "progression":
      return "/progression";
    case "world":
      return "/faction-map";
    case "share":
      return "/challenge";
    case "leaderboard":
      return "/rankings";
    case "threshold":
    default:
      return "/";
  }
}

const abilityNames: Record<string, string> = {
  "type-guard": "Type Guard",
  "async-lunge": "Async Lunge",
  "dependency-scan": "Dependency Scan",
  rollback: "Rollback",
};

function Brand() {
  return (
    <div className="brand" aria-label="Abse">
      <span className="brand-mark">A/</span>
      <span>ABSE</span>
    </div>
  );
}

function Shell({
  view,
  onNavigate,
  children,
}: {
  view: View;
  onNavigate: (view: View) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const items: Array<{ key: View; label: string }> = [
    { key: "threshold", label: "Threshold" },
    { key: "github", label: "GitHub link" },
    { key: "profile", label: "GitHub forge" },
    { key: "builder", label: "Architect" },
    { key: "dungeon", label: "Depths" },
    { key: "progression", label: "Progression" },
    { key: "world", label: "Faction map" },
    { key: "share", label: "Challenge" },
    { key: "leaderboard", label: "Rankings" },
  ];

  return (
    <div className="app-shell">
      <header className="topbar">
        <Brand />
        <div className="system-status"><span /> FORGE ONLINE</div>
        <button
          className="icon-button mobile-only"
          aria-label={open ? "Close navigation" : "Open navigation"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>
      <aside className={open ? "sidebar open" : "sidebar"}>
        <p className="utility-label">EXPEDITION INDEX</p>
        <nav aria-label="Primary navigation">
          {items.map((item, index) => (
            <button
              key={item.key}
              className={view === item.key ? "nav-item active" : "nav-item"}
              onClick={() => {
                onNavigate(item.key);
                setOpen(false);
              }}
            >
              <span>0{index + 1}</span>
              {item.label}
              <ChevronRight size={15} />
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <LockKeyhole size={16} />
          <p>Combat and rewards resolve beyond the client boundary.</p>
        </div>
      </aside>
      <main>{children}</main>
    </div>
  );
}

function Threshold({ onEnter }: { onEnter: () => void }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const enter = async () => {
    if (!hasBase44Project) {
      onEnter();
      return;
    }
    setBusy(true);
    try {
      await redirectToAbseLogin();
    } catch {
      setMessage("The sign-in boundary is unavailable. Check the Base44 project configuration.");
      setBusy(false);
    }
  };

  return (
    <section className="threshold page">
      <div className="corridor" aria-hidden="true">
        <div className="branch branch-one" />
        <div className="branch branch-two" />
        <div className="branch branch-three" />
        {Array.from({ length: 30 }).map((_, index) => <i key={index} />)}
      </div>
      <div className="hero-copy">
        <p className="eyebrow"><span>ORIGIN</span> GITHUB HISTORY VERIFIED</p>
        <h1>Your history<br />opens the <em>Depths.</em></h1>
        <p className="hero-lede">
          Contributions become resources. Languages become affinities. Your decisions—not
          your follower count—decide what survives.
        </p>
        <div className="hero-actions">
          <button className="primary-button" onClick={enter} disabled={busy}>
            <Github size={18} />
            {busy ? "Opening forge…" : hasBase44Project ? "Sign in to Abse" : "Enter development forge"}
            <ArrowRight size={18} />
          </button>
          <span className="safe-note"><Shield size={15} /> GitHub credentials stay server-side</span>
        </div>
        {message && <p className="error-message" role="alert">{message}</p>}
      </div>
      <div className="thesis-strip">
        <p><span>01</span> Verified history supplies the material</p>
        <p><span>02</span> You shape the Architect</p>
        <p><span>03</span> The server resolves the outcome</p>
      </div>
    </section>
  );
}

function GitHubOnboarding({ onComplete }: { onComplete: () => void }) {
  const [status, setStatus] = useState<"idle" | "checking" | "connecting" | "syncing" | "ready" | "error">("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!hasBase44Project || !hasGitHubConnector) {
      setStatus("idle");
      return;
    }
    void invokeAbseFunction<{ status: string; lastSuccessfulSyncAt: string | null; errorCode: string | null }>(
      "getGitHubSyncStatus",
    ).then((result) => {
      if (result.lastSuccessfulSyncAt) setStatus("ready");
      else {
        setStatus(result.status === "running" ? "syncing" : "idle");
        if (result.errorCode) setMessage(`Last sync stopped with ${result.errorCode}. Reconnect and try again.`);
      }
    }).catch(() => setStatus("idle"));
  }, []);

  const beginConnection = async () => {
    setStatus("connecting");
    setMessage("");
    try {
      trackAbseEvent("github_connect_started");
      await connectGitHub();
    } catch {
      setStatus("error");
      setMessage("GitHub authorization could not start. Check the app-user connector configuration.");
    }
  };

  const sync = async () => {
    setStatus("syncing");
    setMessage("");
    try {
      await invokeAbseFunction("syncGitHubProfile");
      await invokeAbseFunction("calculateForgePoints");
      trackAbseEvent("github_sync_completed");
      setStatus("ready");
    } catch (error) {
      const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
      setStatus("error");
      setMessage(code === "GITHUB_NOT_CONNECTED"
        ? "Connect GitHub first, then return here and sync your history."
        : `GitHub sync stopped with ${code}. Your last good snapshot was preserved.`);
    }
  };

  return (
    <section className="page content-page github-onboarding">
      <header className="page-heading">
        <div>
          <p className="eyebrow"><span>LINK / GITHUB</span> PERSONAL OAUTH CONNECTION</p>
          <h1>Bring your history across</h1>
          <p>Abse reads contribution evidence through your own GitHub authorization. Your token stays inside Base44.</p>
        </div>
        <Github className="heading-mark" size={58} />
      </header>
      <div className="connector-layout">
        <article className="panel connector-sequence">
          {[
            ["01", "Sign in to Abse", "Your game account is already authenticated."],
            ["02", "Authorize GitHub", "GitHub asks you to approve the configured read access."],
            ["03", "Sync the forge", "The server creates an immutable, versioned history snapshot."],
          ].map(([number, title, copy], index) => (
            <div className={index === 1 ? "connector-step active" : "connector-step"} key={number}>
              <i>{number}</i><span><strong>{title}</strong><small>{copy}</small></span>
              {index === 0 ? <Check size={17} /> : <ChevronRight size={17} />}
            </div>
          ))}
        </article>
        <article className="panel connector-control">
          <div className="connector-sigil"><Github size={38} /></div>
          <span>APP USER CONNECTOR</span>
          <h2>{hasGitHubConnector ? "Your GitHub, your evidence" : "Connector setup pending"}</h2>
          <p>{hasGitHubConnector
            ? "Authorize your personal account. After GitHub returns you to Abse, run the verified history sync."
            : "The app owner must add the workspace connector ID before players can authorize GitHub."}</p>
          <button className="primary-button" onClick={beginConnection} disabled={!hasGitHubConnector || status === "connecting" || status === "syncing"}>
            <Github size={18} />{status === "connecting" ? "Opening GitHub…" : "Connect personal GitHub"}
          </button>
          <button className="secondary-button" onClick={sync} disabled={!hasGitHubConnector || status === "syncing"}>
            <Activity size={18} />{status === "syncing" ? "Syncing verified history…" : "I connected — sync history"}
          </button>
          {status === "ready" && <button className="text-button" onClick={onComplete}>Open forge report <ArrowRight size={17} /></button>}
          {message && <p className="error-message" role="alert">{message}</p>}
          <small><LockKeyhole size={14} /> Tokens are never returned to the browser or stored in Abse entities.</small>
        </article>
      </div>
    </section>
  );
}

function Profile({ onContinue }: { onContinue: () => void }) {
  const score = useMemo(() => calculateForgeProfile(developmentMetrics), []);
  return (
    <section className="page content-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow"><span>SYNC / 7E3A</span> VERIFIED SNAPSHOT</p>
          <h1>Forge report</h1>
          <p>Every point below is reproducible from the saved snapshot and formula version.</p>
        </div>
        <div className="forge-total">
          <span>AVAILABLE</span>
          <strong>{score.totalForgePoints}</strong>
          <small>FORGE POINTS</small>
        </div>
      </header>

      <div className="profile-grid">
        <article className="panel contribution-panel">
          <div className="panel-heading">
            <div><Activity size={18} /><h2>Contribution signal</h2></div>
            <span>LAST 52 WEEKS</span>
          </div>
          <div className="contribution-map" aria-label="Decorative contribution activity map">
            {Array.from({ length: 91 }).map((_, index) => (
              <i key={index} data-level={(index * 7 + index % 5) % 5} />
            ))}
          </div>
          <div className="metric-row">
            <div><strong>{developmentMetrics.totalVerifiedCommits.toLocaleString()}</strong><span>verified commits</span></div>
            <div><strong>{developmentMetrics.activeWeeksLastYear}</strong><span>active weeks</span></div>
            <div><strong>{developmentMetrics.externalPullRequestsMerged}</strong><span>external merges</span></div>
          </div>
        </article>

        <article className="panel affinity-panel">
          <div className="panel-heading">
            <div><Code2 size={18} /><h2>Affinity trace</h2></div>
            <span>PRIMARY</span>
          </div>
          <strong className="affinity-name">{score.primaryAffinity}</strong>
          <p>Precision affinity · strong action reliability · measured tempo</p>
          <div className="language-bar">
            {Object.entries(developmentMetrics.languageDistribution).map(([language, share]) => (
              <i key={language} style={{ width: `${share * 100}%` }} title={`${language} ${share * 100}%`} />
            ))}
          </div>
          <small>Secondary: {score.secondaryAffinities.join(" / ")}</small>
        </article>
      </div>

      <article className="panel explanation-panel">
        <div className="panel-heading">
          <div><Braces size={18} /><h2>Calculation trace</h2></div>
          <span>{score.calculationVersion}</span>
        </div>
        <div className="explanation-table">
          {score.explanation.map((metric) => (
            <div className="explanation-row" key={metric.key}>
              <span>{metric.label}</span>
              <div className="bar-track"><i style={{ width: `${metric.normalized * 100}%` }} /></div>
              <code>{metric.raw.toLocaleString()}</code>
              <strong>+{metric.points}</strong>
            </div>
          ))}
        </div>
      </article>

      <div className="traits-block">
        <p className="utility-label">RARE PATTERNS DETECTED</p>
        <div className="trait-list">
          {score.traits.map((trait) => (
            <article key={trait.key}>
              <Zap size={18} />
              <div><strong>{trait.name}</strong><p>{trait.evidence}</p></div>
            </article>
          ))}
        </div>
      </div>

      <div className="continue-row">
        <span>Snapshot captured · immutable source evidence</span>
        <button className="primary-button" onClick={onContinue}>Shape Architect <ArrowRight size={18} /></button>
      </div>
    </section>
  );
}

function Builder({
  build,
  onBuildChange,
  onStart,
}: {
  build: ArchitectBuild;
  onBuildChange: (build: ArchitectBuild) => void;
  onStart: () => void;
}) {
  const score = useMemo(() => calculateForgeProfile(developmentMetrics), []);
  const [error, setError] = useState("");
  const allocated = Object.values(build.attributes).reduce((sum, value) => sum + value, 0);
  const remaining = score.totalForgePoints - allocated;

  const updateAttribute = (attribute: Attribute, value: number) => {
    const next = { ...build.attributes, [attribute]: value };
    const total = Object.values(next).reduce((sum, item) => sum + item, 0);
    if (total <= score.totalForgePoints) onBuildChange({ ...build, attributes: next });
  };

  const start = () => {
    try {
      validateArchitectBuild(build, score, developmentInventory, 1);
      setError("");
      onStart();
    } catch (caught) {
      setError(caught instanceof BuildValidationError ? caught.message : "The build could not be validated.");
    }
  };

  return (
    <section className="page content-page builder-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow"><span>BUILD / 01</span> SERVER VALIDATED</p>
          <h1>Shape your Architect</h1>
          <p>GitHub opened the resource pool. Allocation is your tactical decision.</p>
        </div>
        <div className="forge-total compact">
          <span>UNSPENT</span><strong>{remaining}</strong><small>OF {score.totalForgePoints}</small>
        </div>
      </header>

      <div className="builder-grid">
        <article className="panel attribute-panel">
          <div className="panel-heading"><div><CircleGauge size={18} /><h2>Attribute lattice</h2></div></div>
          {ATTRIBUTES.map((attribute) => (
            <label className="attribute-control" key={attribute}>
              <div><span>{attribute}</span><strong>{build.attributes[attribute]}</strong></div>
              <input
                type="range"
                min="0"
                max={score.potentials[attribute] + 10}
                value={build.attributes[attribute]}
                onChange={(event) => updateAttribute(attribute, Number(event.target.value))}
              />
              <small>Verified potential {score.potentials[attribute]}</small>
            </label>
          ))}
        </article>

        <div className="loadout-stack">
          <article className="panel">
            <div className="panel-heading"><div><Swords size={18} /><h2>Active loadout</h2></div><span>3 / 3</span></div>
            <div className="loadout-list">
              {build.activeAbilityIds.map((id, index) => (
                <div key={id}><code>0{index + 1}</code><span><strong>{abilityNames[id]}</strong><small>{index === 0 ? "Guard conversion" : index === 1 ? "Momentum strike" : "Reveal enemy intent"}</small></span><Check size={17} /></div>
              ))}
            </div>
          </article>
          <article className="panel artifact-card">
            <div className="artifact-glyph"><LockKeyhole size={24} /></div>
            <div><span>BOUND ARTIFACT</span><h3>Lockfile Sigil</h3><p>Spend 1 energy to absorb an unstable dependency attack.</p></div>
          </article>
          <article className="panel build-summary">
            <div><span>Affinity</span><strong>{build.primaryAffinity}</strong></div>
            <div><span>Passives</span><strong>{build.passiveTraitIds.length} bound</strong></div>
            <div><span>Build hash</span><strong>7E3A–B{allocated}</strong></div>
          </article>
        </div>
      </div>
      {error && <p className="error-message" role="alert">{error}</p>}
      <div className="continue-row">
        <span>Build snapshot locks when the expedition begins.</span>
        <button className="primary-button danger" onClick={start}>Enter Dependency Depths <ArrowRight size={18} /></button>
      </div>
    </section>
  );
}

function Dungeon({
  build,
  state,
  onAction,
  onRestart,
}: {
  build: ArchitectBuild;
  state: CombatState;
  onAction: (action: CombatAction) => void;
  onRestart: () => void;
}) {
  const room = ROOMS[state.roomIndex];
  const hp = (state.health / state.maxHealth) * 100;
  const enemyHp = (state.enemyHealth / state.enemyMaxHealth) * 100;
  const abilitiesAvailable = state.energy >= 2;
  const abilityCooldown = state.cooldowns["async-lunge"] ?? 0;
  return (
    <section className="page dungeon-page">
      <header className="dungeon-header">
        <div>
          <p className="eyebrow"><span>ROOM {state.roomIndex + 1} / 5</span> TURN {state.turn}</p>
          <h1>{room.name}</h1>
        </div>
        <div className="seed-label">SEED <code>{state.seed}</code></div>
      </header>
      <div className="room-track" aria-label="Dungeon progress">
        {ROOMS.map((item, index) => (
          <div key={item.name} className={index < state.roomIndex ? "done" : index === state.roomIndex ? "current" : ""}>
            <i>{index < state.roomIndex ? <Check size={12} /> : index + 1}</i>
            <span>{item.name}</span>
          </div>
        ))}
      </div>

      <div className="combat-stage">
        <article className="combatant player-card">
          <div className="combatant-label"><span>ARCHITECT</span><strong>{build.primaryAffinity}</strong></div>
          <div className="entity-glyph architect-glyph"><Braces size={44} /></div>
          <div className="vital"><span><HeartPulse size={15} /> INTEGRITY</span><strong>{state.health} / {state.maxHealth}</strong></div>
          <div className="vital-bar"><i style={{ width: `${hp}%` }} /></div>
          <div className="resource-line"><span><Zap size={14} /> ENERGY {state.energy}</span><span>CHAIN {state.momentumChain}</span></div>
        </article>

        <div className="versus"><span>RESOLUTION</span><strong>×</strong><small>SERVER AUTHORITY</small></div>

        <article className="combatant enemy-card">
          <div className="combatant-label"><span>{room.kind === "boss" ? "BOSS PROCESS" : "HOSTILE PROCESS"}</span><strong>corrupted</strong></div>
          <div className="entity-glyph phantom-glyph"><Code2 size={48} /></div>
          <div className="vital"><span>PROCESS HEALTH</span><strong>{state.enemyHealth} / {state.enemyMaxHealth}</strong></div>
          <div className="vital-bar enemy"><i style={{ width: `${Math.max(0, enemyHp)}%` }} /></div>
          <div className={`intent intent-${state.enemyIntent}`}>
            <Activity size={15} /><span>NEXT: {state.enemyIntent.toUpperCase()}</span>
          </div>
        </article>
      </div>

      {state.status === "active" && state.eventPending ? (
        <div className="action-console event-console">
          <div className="action-heading">
            <span>{state.eventPending === "conflicts" ? "RESOLVE VERSION GRAPH" : "CHOOSE CACHE PATH"}</span>
            <small>The choice is persisted with this run.</small>
          </div>
          <div className="action-grid event-actions">
            {state.eventPending === "conflicts" ? (
              <>
                <button onClick={() => onAction({ type: "event", choice: "stabilize" })}><Shield /><strong>Stabilize</strong><small>Recover integrity</small></button>
                <button onClick={() => onAction({ type: "event", choice: "force" })}><Swords /><strong>Force</strong><small>Accept conflict stacks</small></button>
                <button onClick={() => onAction({ type: "event", choice: "inspect" })}><Braces /><strong>Inspect</strong><small>Insight grants energy</small></button>
              </>
            ) : (
              <>
                <button onClick={() => onAction({ type: "event", choice: "recover" })}><HeartPulse /><strong>Safe recovery</strong><small>Restore integrity</small></button>
                <button onClick={() => onAction({ type: "event", choice: "package" })}><LockKeyhole /><strong>Signed package</strong><small>Gain 3 energy</small></button>
                <button onClick={() => onAction({ type: "event", choice: "corrupted" })}><Zap /><strong>Corrupted cache</strong><small>Risk integrity for energy</small></button>
              </>
            )}
          </div>
        </div>
      ) : state.status === "active" ? (
        <div className="action-console">
          <div className="action-heading"><span>SELECT COMMIT</span><small>Idempotency key generated per action</small></div>
          <div className="action-grid">
            <button onClick={() => onAction({ type: "attack" })}><Swords /><strong>Attack</strong><small>Reliable damage</small></button>
            <button onClick={() => onAction({ type: "defend" })}><Shield /><strong>Defend</strong><small>Read the telegraph</small></button>
            <button onClick={() => onAction({ type: "recover" })}><HeartPulse /><strong>Recover</strong><small>Trade tempo for health</small></button>
            <button disabled={!abilitiesAvailable || abilityCooldown > 0} onClick={() => onAction({ type: "ability", abilityId: "async-lunge" })}><Zap /><strong>Async Lunge</strong><small>{abilityCooldown ? `${abilityCooldown} turn cooldown` : "2 energy · heavy damage"}</small></button>
            <button onClick={() => onAction({ type: "artifact", artifactId: "lockfile-sigil" })}><LockKeyhole /><strong>Lockfile Sigil</strong><small>1 energy · 18 guard</small></button>
          </div>
        </div>
      ) : (
        <div className={`run-result ${state.status}`}>
          <span>{state.status === "completed" ? "EXPEDITION VERIFIED" : "PROCESS TERMINATED"}</span>
          <h2>{state.status === "completed" ? "The Depths compile cleanly." : "The dependency graph consumed this build."}</h2>
          <button className="primary-button" onClick={onRestart}>Rebuild expedition <ArrowRight size={18} /></button>
        </div>
      )}

      <aside className="combat-log" aria-live="polite">
        <span>COMBAT TRACE</span>
        {state.actionHistory.slice(0, 4).map((entry, index) => <p key={`${entry}-${index}`}><code>{String(state.turn - index).padStart(2, "0")}</code>{entry}</p>)}
      </aside>
    </section>
  );
}

function Progression() {
  const experience = 1480;
  const nextLevel = 1600;
  return (
    <section className="page content-page">
      <header className="page-heading">
        <div><p className="eyebrow"><span>PHASE 06</span> VERIFIED REWARD LEDGER</p><h1>Architect progression</h1><p>Rewards are derived from completed server state and can only be issued once.</p></div>
        <div className="forge-total"><span>LEVEL</span><strong>4</strong><small>ASCENDANT</small></div>
      </header>
      <div className="progression-grid">
        <article className="panel level-core">
          <Sparkles size={28} /><span>EXPERIENCE TRACE</span><strong>{experience.toLocaleString()} XP</strong>
          <div className="bar-track"><i style={{ width: `${experience / nextLevel * 100}%` }} /></div>
          <small>{nextLevel - experience} XP until level 5</small>
        </article>
        <article className="panel reward-stack">
          <div><span>SEASON RATING</span><strong>2,715</strong><small>+37 last expedition</small></div>
          <div><span>UNCOMMITTED INFLUENCE</span><strong>34</strong><small>Available for territory action</small></div>
          <div><span>DUNGEON SCORE</span><strong>1,384</strong><small>Validated under rewards-2026.1</small></div>
        </article>
      </div>
      <article className="panel ledger-panel">
        <div className="panel-heading"><div><Activity size={18} /><h2>Immutable reward trace</h2></div><span>LAST 3 ENTRIES</span></div>
        {[
          ["EXPERIENCE", "+174", "Dependency Depths / run 7E3A"],
          ["SEASONAL RATING", "+37", "Health and turn efficiency"],
          ["INFLUENCE", "+34", "Awaiting faction commitment"],
        ].map(([label, amount, source]) => <div className="ledger-row" key={label}><span>{label}</span><strong>{amount}</strong><small>{source}</small></div>)}
      </article>
    </section>
  );
}

function World() {
  const [selected, setSelected] = useState(0);
  return (
    <section className="page content-page world-page">
      <header className="page-heading">
        <div><p className="eyebrow"><span>PHASE 07</span> SEASON 01 / RESOLVES 24H</p><h1>The contested graph</h1><p>Commit earned influence to defend your faction or attack a rival territory.</p></div>
        <div className="forge-total compact"><span>BALANCE</span><strong>34</strong><small>INFLUENCE</small></div>
      </header>
      <div className="world-layout">
        <div className="territory-map" aria-label="Faction territory map">
          <svg viewBox="0 0 600 360" aria-hidden="true"><path d="M105 90L300 55 495 100 470 275 290 315 110 260Z M105 90L290 315 M300 55L470 275 M495 100L110 260" /></svg>
          {developmentTerritories.map((territory, index) => (
            <button key={territory.key} className={`territory-node node-${index + 1} ${selected === index ? "selected" : ""}`} onClick={() => setSelected(index)}>
              <i>{String(index + 1).padStart(2, "0")}</i><strong>{territory.name}</strong><small>{territory.owner}</small>
            </button>
          ))}
        </div>
        <article className="panel territory-inspector">
          <Map size={20} /><span>SELECTED TERRITORY</span><h2>{developmentTerritories[selected].name}</h2>
          <p>Held by <strong>{developmentTerritories[selected].owner}</strong>. Current pressure is {developmentTerritories[selected].pressure}%.</p>
          <div className="bar-track danger-track"><i style={{ width: `${developmentTerritories[selected].pressure}%` }} /></div>
          <button className="primary-button" onClick={() => trackAbseEvent("territory_commit_intent", { territory: developmentTerritories[selected].key })}>Commit influence <ArrowRight size={17} /></button>
          <small>Final ownership is resolved from the append-only ledger. Defence wins ties.</small>
        </article>
      </div>
      <div className="faction-ribbon">{developmentFactions.map((faction, index) => <div key={faction.id}><i>0{index + 1}</i><span>{faction.name}</span><strong>{faction.influence.toLocaleString()}</strong></div>)}</div>
    </section>
  );
}

function ShareChallenge() {
  const shareUrl = `${window.location.origin}/challenge/7e3a9f1c`;
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard?.writeText(shareUrl);
    setCopied(true);
    trackAbseEvent("challenge_link_copied");
  };
  return (
    <section className="page content-page">
      <header className="page-heading"><div><p className="eyebrow"><span>PHASE 08</span> SAFE PUBLIC SNAPSHOT</p><h1>Issue a challenge</h1><p>Share the proof of a run without exposing private repository or account data.</p></div></header>
      <div className="share-layout">
        <article className="share-card">
          <div className="share-brand"><Brand /><span>VERIFIED RUN</span></div>
          <p>DEPENDENCY DEPTHS</p><strong className="share-score">1,384</strong><span>DUNGEON SCORE</span>
          <div className="share-stats"><div><small>ARCHITECT</small><strong>MOJEEB.ETH</strong></div><div><small>AFFINITY</small><strong>TYPESCRIPT</strong></div><div><small>TURNS</small><strong>31</strong></div></div>
          <footer>REWARDS-2026.1 <i /> SERVER VALIDATED</footer>
        </article>
        <article className="panel challenge-panel">
          <Share2 size={21} /><h2>Seven-day challenge link</h2><p>Another Architect can accept this exact score target. Their result is compared by score, then turns, then remaining integrity.</p>
          <code>{shareUrl}</code>
          <button className="primary-button" onClick={copy}>{copied ? <Check size={18} /> : <Share2 size={18} />}{copied ? "Copied" : "Copy challenge link"}</button>
        </article>
      </div>
    </section>
  );
}

function Leaderboard() {
  return (
    <section className="page content-page">
      <header className="page-heading"><div><p className="eyebrow"><span>PHASE 09</span> SEASON 01</p><h1>Verified rankings</h1><p>Only server-issued seasonal rating contributes to this projection.</p></div><Trophy className="heading-mark" size={56} /></header>
      <article className="panel ranking-table">
        <div className="ranking-head"><span>RANK</span><span>ARCHITECT</span><span>FACTION</span><span>RATING</span></div>
        {developmentLeaderboard.map(([name, faction, score], index) => <div className={name === "mojeeb.eth" ? "ranking-row current" : "ranking-row"} key={name}><strong>0{index + 1}</strong><span>{name}</span><small>{faction}</small><code>{score.toLocaleString()}</code></div>)}
      </article>
      <p className="projection-note"><Shield size={15} /> Rankings are projections. Reward and influence ledgers remain the authority.</p>
    </section>
  );
}

export function App() {
  const [view, setView] = useState<View>(() => getViewFromPath(window.location.pathname));
  const [build, setBuild] = useState<ArchitectBuild>(initialDevelopmentBuild);
  const [run, setRun] = useState<CombatState | null>(null);
  const [authStatus, setAuthStatus] = useState<"loading" | "authenticated" | "unauthenticated">(
    !hasBase44Project ? "authenticated" : "loading",
  );

  useEffect(() => {
    if (!hasBase44Project) return;

    let cancelled = false;
    setAuthStatus("loading");

    void currentUser().then((user) => {
      if (cancelled) return;
      const nextStatus = user ? "authenticated" : "unauthenticated";
      setAuthStatus(nextStatus);
      if (user) {
        setView((current) => current === "threshold" ? "github" : current);
        const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        if (currentPath === "/" || currentPath === "/login") {
          window.history.replaceState(null, "", "/github-link");
        }
      }
    }).catch(() => {
      if (!cancelled) setAuthStatus("unauthenticated");
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const nextPath = getPathForView(view);
    const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (currentPath !== nextPath) {
      window.history.replaceState(null, "", nextPath);
    }
  }, [view]);

  useEffect(() => {
    const handlePopState = () => {
      setView(getViewFromPath(window.location.pathname));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const startRun = () => {
    setRun(createDungeonRun("run-development", "7E3A9F1C", build));
    setView("dungeon");
  };
  const act = (action: CombatAction) => {
    setRun((current) => current
      ? resolveCombatTurn(current, action, build, `${current.runId}:${current.turn}:${crypto.randomUUID()}`)
      : current);
  };

  return (
    <Shell view={view} onNavigate={(next) => {
      if (hasBase44Project && authStatus === "loading") {
        return;
      }
      if (hasBase44Project && authStatus !== "authenticated") {
        void redirectToAbseLogin();
        return;
      }
      if (next === "dungeon" && !run) startRun();
      else {
        setView(next);
        const nextPath = getPathForView(next);
        window.history.pushState(null, "", nextPath);
      }
    }}>
      {view === "threshold" && <Threshold onEnter={() => setView("profile")} />}
      {view === "github" && <GitHubOnboarding onComplete={() => setView("profile")} />}
      {view === "profile" && <Profile onContinue={() => setView("builder")} />}
      {view === "builder" && <Builder build={build} onBuildChange={setBuild} onStart={startRun} />}
      {view === "dungeon" && run && <Dungeon build={build} state={run} onAction={act} onRestart={startRun} />}
      {view === "progression" && <Progression />}
      {view === "world" && <World />}
      {view === "share" && <ShareChallenge />}
      {view === "leaderboard" && <Leaderboard />}
    </Shell>
  );
}
