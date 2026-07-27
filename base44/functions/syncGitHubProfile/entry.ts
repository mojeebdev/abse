import { collectGitHubSnapshot } from "../../lib/github.ts";
import { ApiError, audit, context, serve, sha256 } from "../../lib/http.ts";

serve(async (req) => {
  const { base44, entities, user, correlationId } = await context(req);
  const connectorId = Deno.env.get("GITHUB_CONNECTOR_ID");
  if (!connectorId) throw new ApiError("GITHUB_NOT_CONNECTED", "The GitHub connector is not configured.", 503);
  const now = new Date();

  const activeJobs = await entities.GitHubSyncJob.filter(
    {
      userId: user.id,
      status: { $in: ["queued", "running"] },
      lockExpiresAt: { $gt: now.toISOString() },
    },
    "-requestedAt",
    1,
  );
  if (activeJobs.length) throw new ApiError("SYNC_IN_PROGRESS", "A GitHub sync is already running.", 409);

  const job = await entities.GitHubSyncJob.create({
    userId: user.id,
    status: "running",
    requestedAt: now.toISOString(),
    startedAt: now.toISOString(),
    lockExpiresAt: new Date(now.getTime() + 10 * 60_000).toISOString(),
    correlationId,
  });

  try {
    const { accessToken } = await base44.asServiceRole.connectors.getCurrentAppUserConnection(connectorId);
    const source = await collectGitHubSnapshot(accessToken);
    const capturedAt = new Date().toISOString();
    const snapshotInput = { ...source.metrics, githubUserId: String(source.profile.id), capturedAt };
    const snapshotHash = await sha256(snapshotInput);

    const conflictingProfiles = await entities.UserProfile.filter({
      githubUserId: String(source.profile.id),
      userId: { $ne: user.id },
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
        repositoriesScannedForReleases: Math.min(20, source.metrics.meaningfulRepoCount),
      },
      sourceVersion: "github-rest-2022-11-28",
      snapshotHash,
      isCurrent: true,
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
      lastValidatedAt: capturedAt,
    };
    if (connections[0]) await entities.GitHubConnection.update(connections[0].id, connectionData);
    else await entities.GitHubConnection.create(connectionData);

    const profiles = await entities.UserProfile.filter({ userId: user.id }, "-updatedAt", 1);
    const profileData = {
      githubLogin: source.profile.login,
      githubUserId: String(source.profile.id),
      githubAvatarUrl: source.profile.avatar_url,
      onboardingStatus: "profile_ready",
      updatedAt: capturedAt,
    };
    if (profiles[0]) await entities.UserProfile.update(profiles[0].id, profileData);
    else await entities.UserProfile.create({
      userId: user.id,
      ...profileData,
      displayName: user.full_name ?? source.profile.login,
      createdAt: capturedAt,
    });

    await entities.GitHubSyncJob.update(job.id, { status: "completed", completedAt: capturedAt });
    await audit(entities, {
      userId: user.id,
      action: "github_sync_completed",
      entityType: "GitHubSnapshot",
      entityId: snapshot.id,
      correlationId,
      metadata: { sourceVersion: "github-rest-2022-11-28" },
    });
    return { jobId: job.id, status: "completed", snapshotId: snapshot.id };
  } catch (error) {
    await entities.GitHubSyncJob.update(job.id, {
      status: "failed",
      completedAt: new Date().toISOString(),
      errorCode: error instanceof ApiError ? error.code : "INTERNAL_ERROR",
    });
    throw error;
  }
});
