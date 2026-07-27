import { ApiError, context, jsonBody, serve } from "../../lib/http.ts";

serve(async (req) => {
  const { entities, user } = await context(req);
  if (user.role !== "admin") throw new ApiError("ADMIN_REQUIRED", "Administrator access is required.", 403);
  const { category, limit: requestedLimit } = await jsonBody<{ category?: string; limit?: number }>(req);
  const limit = Math.min(100, Math.max(1, Math.floor(requestedLimit ?? 50)));
  const logs = await entities.AuditLog.filter(category ? { action: category } : {}, "-createdAt", limit);
  const flags = await entities.SuspiciousActivityFlag.filter({ status: "open" }, "-createdAt", limit);
  return { logs, flags };
});
