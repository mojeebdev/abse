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
async function jsonBody(req) {
  try {
    return await req.json();
  } catch {
    throw new ApiError("INVALID_ACTION", "The request body is not valid JSON.");
  }
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

// base44/functions/getAdminAudit/entry.ts
serve(async (req) => {
  const { entities, user } = await context(req);
  if (user.role !== "admin") throw new ApiError("ADMIN_REQUIRED", "Administrator access is required.", 403);
  const { category, limit: requestedLimit } = await jsonBody(req);
  const limit = Math.min(100, Math.max(1, Math.floor(requestedLimit ?? 50)));
  const logs = await entities.AuditLog.filter(category ? { action: category } : {}, "-createdAt", limit);
  const flags = await entities.SuspiciousActivityFlag.filter({ status: "open" }, "-createdAt", limit);
  return { logs, flags };
});
