import { calculateForgeProfile } from "../../../src/domain/scoring.ts";
import { ApiError, audit, context, serve, sha256 } from "../../lib/http.ts";

interface ImportPublicGitHubProfileInput {
  username: string;
}

serve(async (req) => {
  const { entities, user, correlationId } = await context(req);
  const body = await req.json() as ImportPublicGitHubProfileInput;
  const username = String(body?.username ?? "").trim().replace(/^@+/, "").trim();

  if (!username) throw new ApiError("INVALID_USERNAME", "A GitHub username is required.", 400);
  if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38}[a-zA-Z0-9])?$/.test(username)) {
    throw new ApiError("INVALID_USERNAME", "Enter a valid GitHub username.", 400);
  }

  const source = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "Abse-Forge/1.0",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (source.status === 404) throw new ApiError("USER_NOT_FOUND", "That GitHub username could not be found publicly.", 404);
  if (!source.ok) throw new ApiError("GITHUB_UNAVAILABLE", "GitHub could not be reached for profile validation.", 502);

  const profile = await source.json() as { login?: string; id?: number; avatar_url?: string; created_at?: string; public_repos?: number };
  if (!profile.login) throw new ApiError("USER_NOT_FOUND", "That GitHub username could not be found publicly.", 404);

  const profilePayload = await fetch(`https://api.github.com/users/${encodeURIComponent(profile.login)}/repos?per_page=100&sort=pushed`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "Abse-Forge/1.0",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!profilePayload.ok) throw new ApiError("GITHUB_UNAVAILABLE", "GitHub could not provide repository data.", 502);

  const repos = await profilePayload.json() as Array<{
    name: string;
    full_name: string;
    fork: boolean;
    size: number;
    pushed_at: string;
    languages_url: string;
  }>;

  const meaningful = repos.filter((repo) => !repo.fork && repo.size >= 20);
  const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
  const maintained = meaningful.filter((repo) => Date.parse(repo.pushed_at) >= oneYearAgo);

  const languageBytes: Record<string, number> = {};
  for (const repo of meaningful.slice(0, 35)) {
    const languageResponse = await fetch(`https://api.github.com${new URL(repo.languages_url).pathname}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "Abse-Forge/1.0",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (languageResponse.ok) {
      const languages = await languageResponse.json() as Record<string, number>;
      for (const [language, bytes] of Object.entries(languages)) {
        languageBytes[language] = (languageBytes[language] ?? 0) + bytes;
      }
    }
  }
  const totalLanguageBytes = Object.values(languageBytes).reduce((sum, value) => sum + value, 0);
  const languageDistribution = Object.fromEntries(
    Object.entries(languageBytes)
      .sort((a, b) => b[1] - a[1])
      .map(([language, bytes]) => [language, totalLanguageBytes ? bytes / totalLanguageBytes : 0]),
  );

  const metrics = {
    accountAgeDays: Math.max(0, Math.floor((Date.now() - Date.parse(profile.created_at ?? new Date().toISOString())) / 86_400_000)),
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
    languageDistribution,
  };

  const forgeProfile = calculateForgeProfile(metrics);
  const capturedAt = new Date().toISOString();
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
      repositoriesScannedForReleases: Math.min(20, metrics.meaningfulRepoCount),
    },
    sourceVersion: "public-github-profile-2026.07",
    snapshotHash,
    isCurrent: true,
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
    lastValidatedAt: capturedAt,
  };
  if (connections[0]) await entities.GitHubConnection.update(connections[0].id, connectionData);
  else await entities.GitHubConnection.create(connectionData);

  const profiles = await entities.UserProfile.filter({ userId: user.id }, "-updatedAt", 1);
  const profileData = {
    githubLogin: profile.login,
    githubUserId: String(profile.id ?? username),
    githubAvatarUrl: profile.avatar_url,
    onboardingStatus: "profile_ready",
    updatedAt: capturedAt,
  };
  if (profiles[0]) await entities.UserProfile.update(profiles[0].id, profileData);
  else await entities.UserProfile.create({
    userId: user.id,
    ...profileData,
    displayName: user.full_name ?? profile.login,
    createdAt: capturedAt,
  });

  await audit(entities, {
    userId: user.id,
    action: "github_profile_imported",
    entityType: "GitHubSnapshot",
    entityId: snapshot.id,
    correlationId,
    metadata: { username, sourceVersion: "public-github-profile-2026.07" },
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
      traits: forgeProfile.traits,
    },
  };
});
