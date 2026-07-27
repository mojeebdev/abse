import { context, serve } from "../../lib/http.ts";

serve(async (req) => {
  const { entities, user } = await context(req);
  const jobs = await entities.GitHubSyncJob.filter({ userId: user.id }, "-requestedAt", 1);
  const snapshots = await entities.GitHubSnapshot.filter({ userId: user.id, isCurrent: true }, "-capturedAt", 1);
  return {
    status: jobs[0]?.status ?? "idle",
    lastSuccessfulSyncAt: snapshots[0]?.capturedAt ?? null,
    errorCode: jobs[0]?.errorCode ?? null,
  };
});

