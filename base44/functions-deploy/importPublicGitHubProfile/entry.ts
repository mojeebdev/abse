// src/domain/scoring.ts
var CALCULATION_VERSION = "forge-2026.1";
var RULES = [
  { key: "totalVerifiedCommits", label: "Verified commits", reference: 900, cap: 1, weight: 18, attribute: "force" },
  { key: "releasesCount", label: "Shipped releases", reference: 24, cap: 1, weight: 8, attribute: "force" },
  { key: "maintainedRepoCount", label: "Maintained repositories", reference: 12, cap: 1, weight: 18, attribute: "guard" },
  { key: "accountAgeDays", label: "Account longevity", reference: 3650, cap: 1, weight: 8, attribute: "guard" },
  { key: "activeWeeksLastYear", label: "Active weeks", reference: 48, cap: 1, weight: 16, attribute: "momentum" },
  { key: "longestStreakDays", label: "Longest active streak", reference: 120, cap: 1, weight: 10, attribute: "momentum" },
  { key: "pullRequestsMerged", label: "Merged pull requests", reference: 120, cap: 1, weight: 13, attribute: "precision" },
  { key: "externalPullRequestsMerged", label: "External merges", reference: 60, cap: 1, weight: 10, attribute: "precision" },
  { key: "meaningfulRepoCount", label: "Meaningful repositories", reference: 35, cap: 1, weight: 10, attribute: "insight" }
];
function normalizeMetric(value, reference, cap = 1) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(cap, Math.log1p(value) / Math.log1p(reference));
}
function round(value) {
  return Math.round(value * 100) / 100;
}
function calculateForgeProfile(metrics) {
  const potentials = { force: 0, guard: 0, momentum: 0, precision: 0, insight: 0 };
  const explanation = RULES.map((rule) => {
    const raw = metrics[rule.key];
    const normalized = normalizeMetric(raw, rule.reference, rule.cap);
    const points = round(normalized * rule.weight);
    potentials[rule.attribute] += points;
    return { key: rule.key, label: rule.label, raw, normalized: round(normalized), cap: rule.cap, points };
  });
  const languageCount = Object.values(metrics.languageDistribution).filter((share) => share >= 0.08).length;
  const languagePoints = round(normalizeMetric(languageCount, 6) * 9);
  potentials.insight += languagePoints;
  explanation.push({
    key: "languageBreadth",
    label: "Language breadth",
    raw: languageCount,
    normalized: round(normalizeMetric(languageCount, 6)),
    cap: 1,
    points: languagePoints
  });
  for (const attribute of Object.keys(potentials)) {
    potentials[attribute] = Math.round(potentials[attribute]);
  }
  const languages = Object.entries(metrics.languageDistribution).sort((a, b) => b[1] - a[1]);
  const totalForgePoints = Object.values(potentials).reduce((sum, value) => sum + value, 0);
  return {
    calculationVersion: CALCULATION_VERSION,
    totalForgePoints,
    potentials,
    primaryAffinity: (languages[0]?.[0] ?? "utility").toLowerCase(),
    secondaryAffinities: languages.slice(1, 3).map(([language]) => language.toLowerCase()),
    explanation,
    traits: evaluateRareTraits(metrics)
  };
}
function evaluateRareTraits(metrics) {
  const traits = [];
  if (metrics.longestStreakDays >= 180) {
    traits.push({
      key: "one-year-flame",
      name: "The One-Year Flame",
      description: "Successful consecutive turns build extra Momentum.",
      evidence: `${metrics.longestStreakDays}-day verified contribution streak`
    });
  }
  if (metrics.externalPullRequestsMerged >= 40) {
    traits.push({
      key: "merge-sovereign",
      name: "Merge Sovereign",
      description: "Successful counters trigger a follow-up strike.",
      evidence: `${metrics.externalPullRequestsMerged} merged pull requests outside owned repositories`
    });
  }
  if (Object.values(metrics.languageDistribution).filter((share) => share >= 0.08).length >= 4) {
    traits.push({
      key: "polyglot-architect",
      name: "Polyglot Architect",
      description: "Change active affinity once per dungeon.",
      evidence: "Meaningful activity across four or more language ecosystems"
    });
  }
  if (metrics.releasesCount >= 18 && metrics.maintainedRepoCount >= 5) {
    traits.push({
      key: "shipwright",
      name: "Shipwright",
      description: "Begin each run with a temporary crafted artifact.",
      evidence: `${metrics.releasesCount} releases across maintained repositories`
    });
  }
  return traits;
}

// base44/lib/http.ts
import { createClientFromRequest } from "npm:@base44/sdk";
var ApiError = class extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
};
async function context(req) {
  const base44 = createClientFromRequest(req);
  let user;
  try {
    user = await base44.auth.me();
  } catch {
    throw new ApiError("AUTH_REQUIRED", "Sign in to continue.", 401);
  }
  if (!user) throw new ApiError("AUTH_REQUIRED", "Sign in to continue.", 401);
  return {
    base44,
    entities: base44.asServiceRole.entities,
    user,
    correlationId: req.headers.get("x-correlation-id") ?? crypto.randomUUID()
  };
}
function serve(handler) {
  Deno.serve(async (req) => {
    const started = performance.now();
    try {
      const result = await handler(req);
      return Response.json(result);
    } catch (error) {
      const safe = error instanceof ApiError ? error : new ApiError("INTERNAL_ERROR", "The operation could not be completed.", 500);
      console.error(JSON.stringify({
        category: safe.code,
        durationMs: Math.round(performance.now() - started)
      }));
      return Response.json(
        { error: { code: safe.code, message: safe.message } },
        { status: safe.status }
      );
    }
  });
}
async function audit(entities, input) {
  await entities.AuditLog.create({
    ...input,
    metadata: input.metadata ?? {},
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  });
}
async function sha256(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// base44/functions/importPublicGitHubProfile/entry.ts
serve(async (req) => {
  const { entities, user, correlationId } = await context(req);
  const body = await req.json();
  const username = String(body?.username ?? "").trim().replace(/^@+/, "").trim();
  if (!username) throw new ApiError("INVALID_USERNAME", "A GitHub username is required.", 400);
  if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38}[a-zA-Z0-9])?$/.test(username)) {
    throw new ApiError("INVALID_USERNAME", "Enter a valid GitHub username.", 400);
  }
  const source = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "Abse-Forge/1.0",
      "X-GitHub-Api-Version": "2022-11-28"
    }
  });
  if (source.status === 404) throw new ApiError("USER_NOT_FOUND", "That GitHub username could not be found publicly.", 404);
  if (!source.ok) throw new ApiError("GITHUB_UNAVAILABLE", "GitHub could not be reached for profile validation.", 502);
  const profile = await source.json();
  if (!profile.login) throw new ApiError("USER_NOT_FOUND", "That GitHub username could not be found publicly.", 404);
  const profilePayload = await fetch(`https://api.github.com/users/${encodeURIComponent(profile.login)}/repos?per_page=100&sort=pushed`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "Abse-Forge/1.0",
      "X-GitHub-Api-Version": "2022-11-28"
    }
  });
  if (!profilePayload.ok) throw new ApiError("GITHUB_UNAVAILABLE", "GitHub could not provide repository data.", 502);
  const repos = await profilePayload.json();
  const meaningful = repos.filter((repo) => !repo.fork && repo.size >= 20);
  const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1e3;
  const maintained = meaningful.filter((repo) => Date.parse(repo.pushed_at) >= oneYearAgo);
  const languageBytes = {};
  for (const repo of meaningful.slice(0, 35)) {
    const languageResponse = await fetch(`https://api.github.com${new URL(repo.languages_url).pathname}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "Abse-Forge/1.0",
        "X-GitHub-Api-Version": "2022-11-28"
      }
    });
    if (languageResponse.ok) {
      const languages = await languageResponse.json();
      for (const [language, bytes] of Object.entries(languages)) {
        languageBytes[language] = (languageBytes[language] ?? 0) + bytes;
      }
    }
  }
  const totalLanguageBytes = Object.values(languageBytes).reduce((sum, value) => sum + value, 0);
  const languageDistribution = Object.fromEntries(
    Object.entries(languageBytes).sort((a, b) => b[1] - a[1]).map(([language, bytes]) => [language, totalLanguageBytes ? bytes / totalLanguageBytes : 0])
  );
  const metrics = {
    accountAgeDays: Math.max(0, Math.floor((Date.now() - Date.parse(profile.created_at ?? (/* @__PURE__ */ new Date()).toISOString())) / 864e5)),
    meaningfulRepoCount: meaningful.length,
    totalVerifiedCommits: 0,
    recentVerifiedCommits: 0,
    currentStreakDays: 0,
    longestStreakDays: 0,
    activeWeeksLastYear: 0,
    pullRequestsMerged: 0,
    externalPullRequestsMerged: 0,
    releasesCount: 0,
    maintainedRepoCount: maintained.length,
    languageDistribution
  };
  const forgeProfile = calculateForgeProfile(metrics);
  const capturedAt = (/* @__PURE__ */ new Date()).toISOString();
  const snapshotHash = await sha256({ username, profile, metrics });
  const previous = await entities.GitHubSnapshot.filter({ userId: user.id, isCurrent: true });
  const snapshot = await entities.GitHubSnapshot.create({
    userId: user.id,
    capturedAt,
    accountCreatedAt: profile.created_at,
    publicRepoCount: profile.public_repos,
    ...metrics,
    consistencyScoreInput: metrics.activeWeeksLastYear,
    pullRequestsOpened: metrics.pullRequestsMerged,
    rawMetricSummary: {
      repositoryCount: repos.length,
      contributionWindow: "public-profile-only",
      repositoriesScannedForLanguages: Math.min(35, metrics.meaningfulRepoCount),
      repositoriesScannedForReleases: Math.min(20, metrics.meaningfulRepoCount)
    },
    sourceVersion: "public-github-profile-2026.07",
    snapshotHash,
    isCurrent: true
  });
  for (const item of previous) await entities.GitHubSnapshot.update(item.id, { isCurrent: false });
  const connections = await entities.GitHubConnection.filter({ userId: user.id, provider: "github" }, "-connectedAt", 1);
  const connectionData = {
    userId: user.id,
    provider: "github",
    connectionStatus: "connected",
    encryptedCredentialReference: `public:${username}`,
    grantedScopes: ["public_profile"],
    connectedAt: capturedAt,
    lastValidatedAt: capturedAt
  };
  if (connections[0]) await entities.GitHubConnection.update(connections[0].id, connectionData);
  else await entities.GitHubConnection.create(connectionData);
  const profiles = await entities.UserProfile.filter({ userId: user.id }, "-updatedAt", 1);
  const profileData = {
    githubLogin: profile.login,
    githubUserId: String(profile.id ?? username),
    githubAvatarUrl: profile.avatar_url,
    onboardingStatus: "profile_ready",
    updatedAt: capturedAt
  };
  if (profiles[0]) await entities.UserProfile.update(profiles[0].id, profileData);
  else await entities.UserProfile.create({
    userId: user.id,
    ...profileData,
    displayName: user.full_name ?? profile.login,
    createdAt: capturedAt
  });
  await audit(entities, {
    userId: user.id,
    action: "github_profile_imported",
    entityType: "GitHubSnapshot",
    entityId: snapshot.id,
    correlationId,
    metadata: { username, sourceVersion: "public-github-profile-2026.07" }
  });
  return {
    status: "ready",
    username: profile.login,
    metrics,
    forgeProfile: {
      calculationVersion: forgeProfile.calculationVersion,
      totalForgePoints: forgeProfile.totalForgePoints,
      primaryAffinity: forgeProfile.primaryAffinity,
      secondaryAffinities: forgeProfile.secondaryAffinities,
      potentials: forgeProfile.potentials,
      explanation: forgeProfile.explanation,
      traits: forgeProfile.traits
    }
  };
});
