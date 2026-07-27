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

// base44/lib/github.ts
async function github(path, token) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "Abse-Forge/1.0"
    }
  });
  if (response.status === 401 || response.status === 403) {
    const remaining = response.headers.get("x-ratelimit-remaining");
    throw new ApiError(
      remaining === "0" ? "GITHUB_RATE_LIMITED" : "GITHUB_PERMISSION_REQUIRED",
      remaining === "0" ? "GitHub rate limit reached." : "Reconnect GitHub with the required read permissions.",
      429
    );
  }
  if (!response.ok) throw new ApiError("INTERNAL_ERROR", "GitHub returned an unexpected response.", 502);
  return await response.json();
}
async function githubGraphql(token) {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "Abse-Forge/1.0"
    },
    body: JSON.stringify({
      query: `query AbseContributionSnapshot {
        viewer {
          contributionsCollection {
            totalCommitContributions
            totalPullRequestContributions
            contributionCalendar {
              weeks {
                contributionDays { date contributionCount }
              }
            }
          }
        }
      }`
    })
  });
  if (!response.ok) throw new ApiError("INTERNAL_ERROR", "GitHub contribution data is unavailable.", 502);
  const payload = await response.json();
  if (payload.errors?.length || !payload.data) {
    throw new ApiError("GITHUB_PERMISSION_REQUIRED", "GitHub did not return contribution data.", 403);
  }
  return payload.data;
}
function streaks(days) {
  const ordered = [...days].sort((a, b) => a.date.localeCompare(b.date));
  let longest = 0;
  let running = 0;
  for (const day of ordered) {
    running = day.contributionCount > 0 ? running + 1 : 0;
    longest = Math.max(longest, running);
  }
  let current = 0;
  for (let index = ordered.length - 1; index >= 0; index -= 1) {
    if (ordered[index].contributionCount <= 0) break;
    current += 1;
  }
  return { current, longest };
}
async function collectGitHubSnapshot(token) {
  const profile = await github("/user", token);
  const repos = await github("/user/repos?per_page=100&sort=pushed&affiliation=owner,collaborator", token);
  const graph = await githubGraphql(token);
  const meaningful = repos.filter((repo) => !repo.fork && repo.size >= 20);
  const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1e3;
  const maintained = meaningful.filter((repo) => Date.parse(repo.pushed_at) >= oneYearAgo);
  const languageBytes = {};
  for (const repo of meaningful.slice(0, 35)) {
    const path = new URL(repo.languages_url).pathname;
    const languages = await github(path, token);
    for (const [language, bytes] of Object.entries(languages)) {
      languageBytes[language] = (languageBytes[language] ?? 0) + bytes;
    }
  }
  const totalLanguageBytes = Object.values(languageBytes).reduce((sum, value) => sum + value, 0);
  const languageDistribution = Object.fromEntries(
    Object.entries(languageBytes).sort((a, b) => b[1] - a[1]).map(([language, bytes]) => [language, totalLanguageBytes ? bytes / totalLanguageBytes : 0])
  );
  const mergedSearch = await github(
    `/search/issues?q=author:${encodeURIComponent(profile.login)}+type:pr+is:merged&per_page=1`,
    token
  );
  const externalMergedSearch = await github(
    `/search/issues?q=author:${encodeURIComponent(profile.login)}+type:pr+is:merged+-user:${encodeURIComponent(profile.login)}&per_page=1`,
    token
  );
  const releaseLists = await Promise.all(
    meaningful.slice(0, 20).map(
      (repo) => github(`/repos/${repo.full_name}/releases?per_page=100`, token)
    )
  );
  const calendar = graph.viewer.contributionsCollection.contributionCalendar;
  const contributionDays = calendar.weeks.flatMap((week) => week.contributionDays);
  const activeWeeksLastYear = calendar.weeks.filter(
    (week) => week.contributionDays.some((day) => day.contributionCount > 0)
  ).length;
  const contributionStreaks = streaks(contributionDays);
  const commitsLastYear = graph.viewer.contributionsCollection.totalCommitContributions;
  const metrics = {
    accountAgeDays: Math.max(0, Math.floor((Date.now() - Date.parse(profile.created_at)) / 864e5)),
    meaningfulRepoCount: meaningful.length,
    totalVerifiedCommits: commitsLastYear,
    recentVerifiedCommits: commitsLastYear,
    currentStreakDays: contributionStreaks.current,
    longestStreakDays: contributionStreaks.longest,
    activeWeeksLastYear,
    pullRequestsMerged: mergedSearch.total_count,
    externalPullRequestsMerged: externalMergedSearch.total_count,
    releasesCount: releaseLists.reduce((sum, releases) => sum + releases.length, 0),
    maintainedRepoCount: maintained.length,
    languageDistribution
  };
  return { profile, repos, metrics };
}

// base44/functions/syncGitHubProfile/entry.ts
serve(async (req) => {
  const { base44, entities, user, correlationId } = await context(req);
  const connectorId = Deno.env.get("GITHUB_CONNECTOR_ID");
  if (!connectorId) throw new ApiError("GITHUB_NOT_CONNECTED", "The GitHub connector is not configured.", 503);
  const now = /* @__PURE__ */ new Date();
  const activeJobs = await entities.GitHubSyncJob.filter(
    {
      userId: user.id,
      status: { $in: ["queued", "running"] },
      lockExpiresAt: { $gt: now.toISOString() }
    },
    "-requestedAt",
    1
  );
  if (activeJobs.length) throw new ApiError("SYNC_IN_PROGRESS", "A GitHub sync is already running.", 409);
  const job = await entities.GitHubSyncJob.create({
    userId: user.id,
    status: "running",
    requestedAt: now.toISOString(),
    startedAt: now.toISOString(),
    lockExpiresAt: new Date(now.getTime() + 10 * 6e4).toISOString(),
    correlationId
  });
  try {
    const { accessToken } = await base44.asServiceRole.connectors.getCurrentAppUserConnection(connectorId);
    const source = await collectGitHubSnapshot(accessToken);
    const capturedAt = (/* @__PURE__ */ new Date()).toISOString();
    const snapshotInput = { ...source.metrics, githubUserId: String(source.profile.id), capturedAt };
    const snapshotHash = await sha256(snapshotInput);
    const conflictingProfiles = await entities.UserProfile.filter({
      githubUserId: String(source.profile.id),
      userId: { $ne: user.id }
    }, "-updatedAt", 1);
    if (conflictingProfiles[0]) {
      throw new ApiError("FORBIDDEN", "This GitHub identity is already connected to another Abse account.", 409);
    }
    const previous = await entities.GitHubSnapshot.filter({ userId: user.id, isCurrent: true });
    const snapshot = await entities.GitHubSnapshot.create({
      userId: user.id,
      capturedAt,
      accountCreatedAt: source.profile.created_at,
      publicRepoCount: source.profile.public_repos,
      ...source.metrics,
      consistencyScoreInput: source.metrics.activeWeeksLastYear,
      pullRequestsOpened: source.metrics.pullRequestsMerged,
      rawMetricSummary: {
        repositoryCount: source.repos.length,
        contributionWindow: "rolling-one-year",
        repositoriesScannedForLanguages: Math.min(35, source.metrics.meaningfulRepoCount),
        repositoriesScannedForReleases: Math.min(20, source.metrics.meaningfulRepoCount)
      },
      sourceVersion: "github-rest-2022-11-28",
      snapshotHash,
      isCurrent: true
    });
    for (const item of previous) await entities.GitHubSnapshot.update(item.id, { isCurrent: false });
    const connections = await entities.GitHubConnection.filter({ userId: user.id, provider: "github" }, "-connectedAt", 1);
    const connectionData = {
      userId: user.id,
      provider: "github",
      connectionStatus: "connected",
      encryptedCredentialReference: connectorId,
      grantedScopes: ["read:user"],
      connectedAt: capturedAt,
      lastValidatedAt: capturedAt
    };
    if (connections[0]) await entities.GitHubConnection.update(connections[0].id, connectionData);
    else await entities.GitHubConnection.create(connectionData);
    const profiles = await entities.UserProfile.filter({ userId: user.id }, "-updatedAt", 1);
    const profileData = {
      githubLogin: source.profile.login,
      githubUserId: String(source.profile.id),
      githubAvatarUrl: source.profile.avatar_url,
      onboardingStatus: "profile_ready",
      updatedAt: capturedAt
    };
    if (profiles[0]) await entities.UserProfile.update(profiles[0].id, profileData);
    else await entities.UserProfile.create({
      userId: user.id,
      ...profileData,
      displayName: user.full_name ?? source.profile.login,
      createdAt: capturedAt
    });
    await entities.GitHubSyncJob.update(job.id, { status: "completed", completedAt: capturedAt });
    await audit(entities, {
      userId: user.id,
      action: "github_sync_completed",
      entityType: "GitHubSnapshot",
      entityId: snapshot.id,
      correlationId,
      metadata: { sourceVersion: "github-rest-2022-11-28" }
    });
    return { jobId: job.id, status: "completed", snapshotId: snapshot.id };
  } catch (error) {
    await entities.GitHubSyncJob.update(job.id, {
      status: "failed",
      completedAt: (/* @__PURE__ */ new Date()).toISOString(),
      errorCode: error instanceof ApiError ? error.code : "INTERNAL_ERROR"
    });
    throw error;
  }
});
